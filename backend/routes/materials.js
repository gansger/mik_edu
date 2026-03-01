import { Router } from 'express';
import pool from '../config/db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// Список назначений преподавателя (группа + предмет) для выбора
router.get('/my-assignments', authRequired, async (req, res) => {
  if (req.role !== 'teacher') return res.status(403).json({ error: 'Только для преподавателей' });
  const r = await pool.query(
    `SELECT ta.group_id, ta.subject_id, g.name as group_name, s.name as subject_name
     FROM teacher_assignments ta
     JOIN groups g ON ta.group_id = g.id
     JOIN subjects s ON ta.subject_id = s.id
     WHERE ta.teacher_id = $1 ORDER BY g.name, s.name`,
    [req.userId]
  );
  res.json(r.rows.map((x) => ({ groupId: x.group_id, subjectId: x.subject_id, groupName: x.group_name, subjectName: x.subject_name })));
});

// Student: tree for my group. Teacher: tree for assigned group (groupId must be in assignments). Admin: any group
router.get('/tree', authRequired, async (req, res) => {
  let groupId = req.query.groupId;
  if (req.role === 'student') {
    if (!req.groupId) return res.json({ group: null, subjects: [] });
    groupId = req.groupId;
  }
  if (req.role === 'teacher') {
    if (!groupId) return res.status(400).json({ error: 'Укажите группу' });
    const allowed = await pool.query('SELECT 1 FROM teacher_assignments WHERE teacher_id = $1 AND group_id = $2', [req.userId, groupId]);
    if (allowed.rows.length === 0) return res.status(403).json({ error: 'Нет доступа к этой группе' });
  }
  if (req.role === 'admin' && !groupId) return res.status(400).json({ error: 'Укажите группу' });
  if (!groupId) return res.json({ group: null, subjects: [] });
  const groups = await pool.query('SELECT id, name FROM groups WHERE id = $1', [groupId]);
  if (groups.rows.length === 0) return res.json({ group: null, subjects: [] });
  let subjects = await pool.query(
    'SELECT id, name FROM subjects WHERE group_id = $1 ORDER BY name',
    [groupId]
  );
  // Преподаватель видит только предметы, по которым у него есть назначение
  if (req.role === 'teacher') {
    const allowed = await pool.query(
      'SELECT subject_id FROM teacher_assignments WHERE teacher_id = $1 AND group_id = $2',
      [req.userId, groupId]
    );
    const allowedIds = new Set(allowed.rows.map((r) => r.subject_id));
    subjects = { ...subjects, rows: subjects.rows.filter((s) => allowedIds.has(s.id)) };
  }
  const result = {
    group: groups.rows[0],
    subjects: [],
  };
  for (const sub of subjects.rows) {
    const modules = await pool.query(
      'SELECT id, name, order_index FROM modules WHERE subject_id = $1 ORDER BY order_index, id',
      [sub.id]
    );
    result.subjects.push({
      id: sub.id,
      name: sub.name,
      modules: await Promise.all(
        modules.rows.map(async (mod) => {
          const [lectures, tests] = await Promise.all([
            pool.query('SELECT id, title, file_type, order_index FROM lectures WHERE module_id = $1 ORDER BY order_index, id', [mod.id]),
            pool.query('SELECT id, title FROM tests WHERE module_id = $1 ORDER BY id', [mod.id]),
          ]);
          return {
            id: mod.id,
            name: mod.name,
            orderIndex: mod.order_index,
            lectures: lectures.rows.map((l) => ({
              id: l.id,
              title: l.title,
              fileType: l.file_type,
              orderIndex: l.order_index,
            })),
            tests: tests.rows.map((t) => ({ id: t.id, title: t.title })),
          };
        })
      ),
    });
  }
  res.json(result);
});

export default router;
