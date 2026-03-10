import { Router } from 'express';
import multer from 'multer';
import { join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import pool from '../config/db.js';
import { authRequired, adminOnly } from '../middleware/auth.js';
import { requireAdminOrTeacherModule, canTeacherAccessModule } from '../middleware/teacherModule.js';

const router = Router();
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = extname(file.originalname) || '.bin';
    const name = `lec_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(pdf|docx?|md|txt|pptx?|xlsx?|mp4|webm|mov|avi|mkv)$/i.test(file.originalname);
    if (allowed) cb(null, true);
    else cb(new Error('Разрешены: PDF, DOC/DOCX, TXT, MD, PPT/PPTX, XLS/XLSX, видео (MP4, WebM, MOV, AVI, MKV). Макс. 10 МБ'));
  },
});

// Список лекций модуля (админ или преподаватель по своему модулю)
router.get('/', authRequired, async (req, res) => {
  const { moduleId } = req.query;
  if (!moduleId) return res.status(400).json({ error: 'Укажите moduleId' });
  if (req.role === 'teacher') {
    const ok = await canTeacherAccessModule(moduleId, req.userId);
    if (!ok) return res.status(403).json({ error: 'Нет доступа к этому модулю' });
  } else if (req.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещён' });
  const r = await pool.query(
    'SELECT id, module_id, title, file_path, file_type, order_index, created_at FROM lectures WHERE module_id = $1 ORDER BY order_index, id',
    [moduleId]
  );
  res.json(r.rows);
});

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function isUrl(s) {
  const t = (s || '').trim();
  return t.startsWith('http://') || t.startsWith('https://');
}

// Админ или преподаватель (по своему модулю): создать лекцию (файл до 10 МБ или ссылка)
router.post('/', authRequired, upload.single('file'), wrap(requireAdminOrTeacherModule), async (req, res) => {
  const { moduleId, title, orderIndex, link } = req.body;
  if (!moduleId || !title?.trim()) return res.status(400).json({ error: 'Укажите модуль и название' });

  const linkUrl = typeof link === 'string' ? link.trim() : '';
  if (linkUrl) {
    if (!isUrl(linkUrl)) return res.status(400).json({ error: 'Ссылка должна начинаться с http:// или https://' });
    const r = await pool.query(
      `INSERT INTO lectures (module_id, title, file_path, file_type, order_index, link_url)
       VALUES ($1, $2, '', 'link', COALESCE($3, 0), $4) RETURNING id, module_id, title, file_path, file_type, order_index, created_at`,
      [moduleId, title.trim(), orderIndex ? parseInt(orderIndex, 10) : 0, linkUrl]
    );
    return res.status(201).json(r.rows[0]);
  }

  if (!req.file) return res.status(400).json({ error: 'Загрузите файл (до 10 МБ) или укажите ссылку' });
  const ext = extname(req.file.originalname).toLowerCase();
  let fileType = 'other';
  if (ext === '.pdf') fileType = 'pdf';
  else if (ext === '.md') fileType = 'md';
  else if (/\.docx?$/.test(ext)) fileType = 'docx';
  else if (/\.pptx?$/.test(ext)) fileType = 'pptx';
  else if (/\.xlsx?$/.test(ext)) fileType = 'xlsx';
  else if (ext === '.txt') fileType = 'txt';
  else if (/\.(mp4|webm|mov|avi|mkv)$/.test(ext)) fileType = 'video';
  const r = await pool.query(
    `INSERT INTO lectures (module_id, title, file_path, file_type, order_index)
     VALUES ($1, $2, $3, $4, COALESCE($5, 0)) RETURNING id, module_id, title, file_path, file_type, order_index, created_at`,
    [moduleId, title.trim(), req.file.filename, fileType, orderIndex ? parseInt(orderIndex, 10) : 0]
  );
  res.status(201).json(r.rows[0]);
});

router.patch('/:id', authRequired, wrap(requireAdminOrTeacherModule), async (req, res) => {
  const { title, orderIndex } = req.body;
  const updates = [];
  const values = [];
  let i = 1;
  if (title !== undefined) {
    updates.push(`title = $${i++}`);
    values.push(title.trim());
  }
  if (orderIndex !== undefined) {
    updates.push(`order_index = $${i++}`);
    values.push(parseInt(orderIndex, 10));
  }
  if (updates.length === 0) return res.status(400).json({ error: 'Нечего обновлять' });
  values.push(req.params.id);
  await pool.query(`UPDATE lectures SET ${updates.join(', ')} WHERE id = $${i}`, values);
  const r = await pool.query('SELECT id, module_id, title, file_path, file_type, order_index, created_at FROM lectures WHERE id = $1', [req.params.id]);
  res.json(r.rows[0] || {});
});

router.delete('/:id', authRequired, wrap(requireAdminOrTeacherModule), async (req, res) => {
  await pool.query('DELETE FROM lectures WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

export default router;
