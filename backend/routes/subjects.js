import { Router } from 'express';
import pool from '../config/db.js';
import { authRequired, adminOnly } from '../middleware/auth.js';
import { canTeacherAccessSubject } from '../middleware/teacherModule.js';

const router = Router();

router.get('/', authRequired, async (req, res) => {
  const { groupId } = req.query;
  if (!groupId) return res.status(400).json({ error: 'Укажите groupId' });
  if (req.role === 'teacher') {
    const r = await pool.query(
      `SELECT s.id, s.group_id, s.name, s.created_at FROM subjects s
       JOIN teacher_assignments ta ON ta.group_id = s.group_id AND ta.subject_id = s.id
       WHERE ta.teacher_id = $1 AND s.group_id = $2 ORDER BY s.name`,
      [req.userId, groupId]
    );
    return res.json(r.rows);
  }
  if (req.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещён' });
  const r = await pool.query(
    'SELECT id, group_id, name, created_at FROM subjects WHERE group_id = $1 ORDER BY name',
    [groupId]
  );
  res.json(r.rows);
});

router.post('/', authRequired, adminOnly, async (req, res) => {
  const { groupId, name } = req.body;
  if (!groupId || !name?.trim()) return res.status(400).json({ error: 'Укажите группу и название' });
  const r = await pool.query(
    'INSERT INTO subjects (group_id, name) VALUES ($1, $2) RETURNING id, group_id, name, created_at',
    [groupId, name.trim()]
  );
  res.status(201).json(r.rows[0]);
});

router.patch('/:id', authRequired, async (req, res) => {
  if (req.role !== 'admin') {
    if (req.role !== 'teacher') return res.status(403).json({ error: 'Доступ запрещён' });
    const ok = await canTeacherAccessSubject(req.params.id, req.userId);
    if (!ok) return res.status(403).json({ error: 'Нет доступа к этому предмету' });
  }
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Укажите название' });
  await pool.query('UPDATE subjects SET name = $1 WHERE id = $2', [name.trim(), req.params.id]);
  const r = await pool.query('SELECT id, group_id, name, created_at FROM subjects WHERE id = $1', [req.params.id]);
  res.json(r.rows[0] || {});
});

router.delete('/:id', authRequired, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM subjects WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

export default router;
