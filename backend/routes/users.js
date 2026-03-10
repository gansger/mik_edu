import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { authRequired, adminOnly } from '../middleware/auth.js';

const router = Router();
router.use(authRequired, adminOnly);

router.get('/', async (req, res) => {
  const { groupId } = req.query;
  let q = `SELECT u.id, u.login, u.role, u.full_name, u.group_id, u.created_at, g.name as group_name
     FROM users u LEFT JOIN groups g ON u.group_id = g.id WHERE 1=1`;
  const params = [];
  if (groupId) {
    q += ' AND u.group_id = $1';
    params.push(groupId);
  }
  q += ' ORDER BY u.full_name, u.login, u.id';
  const r = await pool.query(q, params);
  const list = r.rows.map((row) => ({
    id: row.id,
    login: row.login,
    role: row.role,
    fullName: row.full_name,
    groupId: row.group_id,
    groupName: row.group_name,
    createdAt: row.created_at,
  }));
  for (const u of list) {
    if (u.role === 'teacher') {
      const a = await pool.query(
        'SELECT group_id, subject_id FROM teacher_assignments WHERE teacher_id = $1',
        [u.id]
      );
      u.assignments = a.rows.map((r) => ({ groupId: r.group_id, subjectId: r.subject_id }));
    }
  }
  res.json(list);
});

router.post('/', async (req, res) => {
  const { login, password, role, fullName, groupId, assignments } = req.body;
  if (!login || !password || !role) {
    return res.status(400).json({ error: 'Нужны логин, пароль и роль' });
  }
  if (!['admin', 'student', 'teacher'].includes(role)) {
    return res.status(400).json({ error: 'Роль: admin, student или teacher' });
  }
  if (role === 'student' && !groupId) {
    return res.status(400).json({ error: 'Для студента укажите группу' });
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    const r = await pool.query(
      `INSERT INTO users (login, password_hash, role, full_name, group_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, login, role, full_name, group_id`,
      [login.trim(), hash, role, fullName || null, role === 'student' ? groupId : null]
    );
    const user = r.rows[0];
    if (role === 'teacher' && Array.isArray(assignments) && assignments.length > 0) {
      for (const { groupId: gid, subjectId: sid } of assignments) {
        if (gid && sid) {
          await pool.query(
            'INSERT INTO teacher_assignments (teacher_id, group_id, subject_id) VALUES ($1, $2, $3)',
            [user.id, gid, sid]
          );
        }
      }
    }
    res.status(201).json(user);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Логин уже занят' });
    throw e;
  }
});

// Массовое добавление: { users: [ { login, password, fullName, role, groupId } ] }. groupId — id группы или не указан для admin/teacher.
router.post('/bulk', async (req, res) => {
  const { users: raw } = req.body;
  if (!Array.isArray(raw) || raw.length === 0) {
    return res.status(400).json({ error: 'Передайте массив users: [{ login, password, fullName, role, groupId }]' });
  }
  const groups = await pool.query('SELECT id, name FROM groups');
  const groupByName = new Map(groups.rows.map((g) => [g.name.toLowerCase().trim(), g.id]));
  const created = [];
  const errors = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    const login = row.login?.toString().trim();
    const password = row.password?.toString();
    const fullName = row.fullName != null ? String(row.fullName).trim() : (row.full_name != null ? String(row.full_name).trim() : '');
    let role = (row.role || 'student').toString().toLowerCase().trim();
    if (role === 'админ' || role === 'admin') role = 'admin';
    if (role === 'преподаватель' || role === 'teacher') role = 'teacher';
    if (role === 'студент' || role === 'student') role = 'student';
    if (!login || !password) {
      errors.push({ row: i + 1, login: login || '(пусто)', error: 'Нужны логин и пароль' });
      continue;
    }
    if (!['admin', 'student', 'teacher'].includes(role)) {
      errors.push({ row: i + 1, login, error: 'Роль: admin, student или teacher' });
      continue;
    }
    let groupId = row.groupId != null ? row.groupId : null;
    if (role === 'student') {
      if (groupId == null && row.group != null) {
        const gName = String(row.group).trim().toLowerCase();
        groupId = groupByName.get(gName) ?? null;
      }
      if (groupId == null && row.groupName != null) {
        const gName = String(row.groupName).trim().toLowerCase();
        groupId = groupByName.get(gName) ?? null;
      }
      if (!groupId) {
        errors.push({ row: i + 1, login, error: 'Для студента укажите группу (groupId или group)' });
        continue;
      }
    }
    try {
      const hash = await bcrypt.hash(password, 10);
      const r = await pool.query(
        `INSERT INTO users (login, password_hash, role, full_name, group_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, login, role, full_name, group_id`,
        [login, hash, role, fullName || null, role === 'student' ? groupId : null]
      );
      created.push(r.rows[0]);
    } catch (e) {
      if (e.code === '23505') errors.push({ row: i + 1, login, error: 'Логин уже занят' });
      else errors.push({ row: i + 1, login, error: e.message || 'Ошибка' });
    }
  }
  res.status(201).json({ created: created.length, errors, users: created });
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { password, fullName, groupId, assignments } = req.body;
  const updates = [];
  const values = [];
  let i = 1;
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    updates.push(`password_hash = $${i++}`);
    values.push(hash);
  }
  if (fullName !== undefined) {
    updates.push(`full_name = $${i++}`);
    values.push(fullName);
  }
  if (groupId !== undefined) {
    updates.push(`group_id = $${i++}`);
    values.push(groupId);
  }
  if (updates.length === 0 && assignments === undefined) return res.status(400).json({ error: 'Нечего обновлять' });
  if (updates.length > 0) {
    values.push(id);
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${i}`,
      values
    );
  }
  if (assignments !== undefined) {
    const u = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (u.rows[0]?.role === 'teacher') {
      await pool.query('DELETE FROM teacher_assignments WHERE teacher_id = $1', [id]);
      if (Array.isArray(assignments)) {
        for (const { groupId: gid, subjectId: sid } of assignments) {
          if (gid && sid) {
            await pool.query(
              'INSERT INTO teacher_assignments (teacher_id, group_id, subject_id) VALUES ($1, $2, $3)',
              [id, gid, sid]
            );
          }
        }
      }
    }
  }
  const r = await pool.query('SELECT id, login, role, full_name, group_id FROM users WHERE id = $1', [id]);
  const row = r.rows[0] || {};
  if (row.role === 'teacher') {
    const a = await pool.query('SELECT group_id, subject_id FROM teacher_assignments WHERE teacher_id = $1', [id]);
    row.assignments = a.rows.map((x) => ({ groupId: x.group_id, subjectId: x.subject_id }));
  }
  res.json(row);
});

router.get('/:id', async (req, res) => {
  const r = await pool.query(
    'SELECT u.id, u.login, u.role, u.full_name, u.group_id, g.name as group_name FROM users u LEFT JOIN groups g ON u.group_id = g.id WHERE u.id = $1',
    [req.params.id]
  );
  const row = r.rows[0];
  if (!row) return res.status(404).json({ error: 'Пользователь не найден' });
  const user = { id: row.id, login: row.login, role: row.role, fullName: row.full_name, groupId: row.group_id, groupName: row.group_name };
  if (row.role === 'teacher') {
    const a = await pool.query(
      `SELECT ta.group_id, ta.subject_id, g.name as group_name, s.name as subject_name
       FROM teacher_assignments ta
       JOIN groups g ON ta.group_id = g.id
       JOIN subjects s ON ta.subject_id = s.id
       WHERE ta.teacher_id = $1`,
      [row.id]
    );
    user.assignments = a.rows.map((x) => ({ groupId: x.group_id, subjectId: x.subject_id, groupName: x.group_name, subjectName: x.subject_name }));
  }
  res.json(user);
});

router.delete('/:id', async (req, res) => {
  if (Number(req.params.id) === req.userId) {
    return res.status(400).json({ error: 'Нельзя удалить себя' });
  }
  await pool.query('DELETE FROM teacher_assignments WHERE teacher_id = $1', [req.params.id]);
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

export default router;
