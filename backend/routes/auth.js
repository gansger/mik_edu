import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const password = req.body?.password;
    const loginOrEmail = req.body?.login ?? req.body?.email;
    const login = typeof loginOrEmail === 'string' ? loginOrEmail.trim() : '';
    if (!login || !password) {
      return res.status(400).json({ error: 'Укажите логин (или email) и пароль' });
    }
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET не задан в окружении');
      return res.status(500).json({ error: 'Сервер не настроен (JWT_SECRET)' });
    }
    const r = await pool.query(
      'SELECT id, login, password_hash, role, full_name, group_id FROM users WHERE login = $1',
      [login]
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
  } catch (err) {
    console.error('POST /api/auth/login:', err);
    return res.status(500).json({ error: 'Ошибка сервера при входе' });
  }
});

router.get('/me', authRequired, async (req, res) => {
  try {
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
  } catch (err) {
    console.error('GET /api/auth/me:', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
