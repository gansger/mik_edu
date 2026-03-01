import { Router } from 'express';
import pool from '../config/db.js';
import { authRequired, adminOnly } from '../middleware/auth.js';
import { canTeacherAccessSubject } from '../middleware/teacherModule.js';

const router = Router();

async function teacherModuleAccess(req, res, next) {
  if (req.role === 'admin') return next();
  if (req.role !== 'teacher') return res.status(403).json({ error: 'Доступ запрещён' });
  const subjectId = req.body?.subjectId || req.query?.subjectId;
  if (subjectId) {
    const ok = await canTeacherAccessSubject(subjectId, req.userId);
    if (!ok) return res.status(403).json({ error: 'Нет доступа к этому предмету' });
    return next();
  }
  const mod = await pool.query('SELECT subject_id FROM modules WHERE id = $1', [req.params.id]);
  if (!mod.rows[0]) return res.status(404).json({ error: 'Модуль не найден' });
  const ok = await canTeacherAccessSubject(mod.rows[0].subject_id, req.userId);
  if (!ok) return res.status(403).json({ error: 'Нет доступа к этому модулю' });
  next();
}

router.get('/', authRequired, async (req, res) => {
  const { subjectId } = req.query;
  if (!subjectId) return res.status(400).json({ error: 'Укажите subjectId' });
  if (req.role === 'teacher') {
    const ok = await canTeacherAccessSubject(subjectId, req.userId);
    if (!ok) return res.status(403).json({ error: 'Нет доступа к этому предмету' });
  } else if (req.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещён' });
  const r = await pool.query(
    'SELECT id, subject_id, name, order_index, created_at FROM modules WHERE subject_id = $1 ORDER BY order_index, id',
    [subjectId]
  );
  res.json(r.rows);
});

router.post('/', authRequired, teacherModuleAccess, async (req, res) => {
  const { subjectId, name, orderIndex } = req.body;
  if (!subjectId || !name?.trim()) return res.status(400).json({ error: 'Укажите предмет и название' });
  const r = await pool.query(
    'INSERT INTO modules (subject_id, name, order_index) VALUES ($1, $2, COALESCE($3, 0)) RETURNING id, subject_id, name, order_index, created_at',
    [subjectId, name.trim(), orderIndex]
  );
  res.status(201).json(r.rows[0]);
});

router.patch('/:id', authRequired, teacherModuleAccess, async (req, res) => {
  const { name, orderIndex } = req.body;
  const updates = [];
  const values = [];
  let i = 1;
  if (name !== undefined) {
    updates.push(`name = $${i++}`);
    values.push(name.trim());
  }
  if (orderIndex !== undefined) {
    updates.push(`order_index = $${i++}`);
    values.push(orderIndex);
  }
  if (updates.length === 0) return res.status(400).json({ error: 'Нечего обновлять' });
  values.push(req.params.id);
  await pool.query(`UPDATE modules SET ${updates.join(', ')} WHERE id = $${i}`, values);
  const r = await pool.query('SELECT id, subject_id, name, order_index, created_at FROM modules WHERE id = $1', [req.params.id]);
  res.json(r.rows[0] || {});
});

router.delete('/:id', authRequired, teacherModuleAccess, async (req, res) => {
  await pool.query('DELETE FROM modules WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

export default router;
