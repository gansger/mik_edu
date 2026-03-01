import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'Укажите логин и пароль' });
  }
  const r = await pool.query(
    'SELECT id, login, password_hash, role, full_name, group_id FROM users WHERE login = $1',
    [login.trim()]
  );
  const user = r.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      groupId: user.group_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({
    token,
    user: {
      id: user.id,
      login: user.login,
      role: user.role,
      fullName: user.full_name,
      groupId: user.group_id,
    },
  });
});

router.get('/me', authRequired, async (req, res) => {
  const r = await pool.query(
    'SELECT id, login, role, full_name, group_id FROM users WHERE id = $1',
    [req.userId]
  );
  const user = r.rows[0];
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({
    id: user.id,
    login: user.login,
    role: user.role,
    fullName: user.full_name,
    groupId: user.group_id,
  });
});

export default router;
