import { Router } from 'express';
import pool from '../config/db.js';
import { authRequired, adminOnly } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, async (req, res) => {
  if (req.role === 'teacher') {
    const r = await pool.query(
      `SELECT DISTINCT g.id, g.name, g.created_at FROM groups g
       JOIN teacher_assignments ta ON ta.group_id = g.id WHERE ta.teacher_id = $1 ORDER BY g.name`,
      [req.userId]
    );
    return res.json(r.rows);
  }
  if (req.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещён' });
  const r = await pool.query('SELECT id, name, created_at FROM groups ORDER BY name');
  res.json(r.rows);
});

router.post('/', authRequired, adminOnly, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Укажите название группы' });
  const r = await pool.query(
    'INSERT INTO groups (name) VALUES ($1) RETURNING id, name, created_at',
    [name.trim()]
  );
  res.status(201).json(r.rows[0]);
});

router.patch('/:id', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Укажите название' });
  await pool.query('UPDATE groups SET name = $1 WHERE id = $2', [name.trim(), req.params.id]);
  const r = await pool.query('SELECT id, name, created_at FROM groups WHERE id = $1', [req.params.id]);
  res.json(r.rows[0] || {});
});

router.delete('/:id', authRequired, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM groups WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

export default router;
