import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export function authRequired(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
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

export function adminOnly(req, res, next) {
  if (req.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ только для администратора' });
  }
  next();
}

export async function loadUser(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const r = await pool.query(
      'SELECT id, login, role, full_name, group_id FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (r.rows[0]) {
      req.user = r.rows[0];
    }
  } catch (_) {}
  next();
}
