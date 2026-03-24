import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { createReadStream, existsSync } from 'fs';
import { join, extname } from 'path';
import pool from '../config/db.js';

const router = Router();
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function authForFile(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.role = decoded.role;
    req.groupId = decoded.groupId;
    next();
  } catch {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
}

// Get file for lecture: student only if lecture belongs to their group
router.get('/lecture/:id', authForFile, wrap(async (req, res) => {
  const lectureId = req.params.id;
  const r = await pool.query(
    `SELECT l.id, l.file_path, l.file_type, l.title, l.link_url, m.subject_id, s.group_id
     FROM lectures l
     JOIN modules m ON l.module_id = m.id
     JOIN subjects s ON m.subject_id = s.id
     WHERE l.id = $1`,
    [lectureId]
  );
  const lecture = r.rows[0];
  if (!lecture) return res.status(404).json({ error: 'Лекция не найдена' });
  if (req.role === 'student' && lecture.group_id !== req.groupId) {
    return res.status(403).json({ error: 'Доступ к материалам другой группы запрещён' });
  }
  if (req.role === 'teacher') {
    const ta = await pool.query(
      'SELECT 1 FROM teacher_assignments WHERE teacher_id = $1 AND group_id = $2 AND subject_id = $3',
      [req.userId, lecture.group_id, lecture.subject_id]
    );
    if (!ta.rows.length) return res.status(403).json({ error: 'Нет доступа к этому материалу' });
  }

  if (lecture.file_type === 'link' && lecture.link_url) {
    return res.redirect(302, lecture.link_url);
  }

  const filePath = join(uploadDir, lecture.file_path);
  if (!existsSync(filePath)) return res.status(404).json({ error: 'Файл не найден' });
  const type = lecture.file_type;
  if (type === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(lecture.title)}.pdf"`);
  } else if (type === 'md') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  } else if (type === 'video') {
    const ext = extname(lecture.file_path).toLowerCase();
    const videoMime = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska' }[ext] || 'video/mp4';
    res.setHeader('Content-Type', videoMime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(lecture.title)}"`);
  } else {
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(lecture.title)}"`);
  }
  const stream = createReadStream(filePath);
  stream.on('error', (err) => {
    console.error('File stream error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ошибка чтения файла' });
    } else {
      res.destroy(err);
    }
  });
  stream.pipe(res);
}));

export default router;
