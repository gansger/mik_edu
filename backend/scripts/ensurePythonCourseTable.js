/**
 * Таблица прогресса по курсу Python Quest (SQLite и PostgreSQL).
 * Вызывается при старте сервера.
 */
import pool from '../config/db.js';

const useSqlite = !process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('sqlite');

const SQL_SQLITE = `
CREATE TABLE IF NOT EXISTS python_course_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_key VARCHAR(50) NOT NULL DEFAULT 'python-quest',
  current_level_index INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, course_key)
)`;

const SQL_PG = `
CREATE TABLE IF NOT EXISTS python_course_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_key VARCHAR(50) NOT NULL DEFAULT 'python-quest',
  current_level_index INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, course_key)
)`;

const IDX = 'CREATE INDEX IF NOT EXISTS idx_python_course_progress_user ON python_course_progress(user_id)';

export async function ensurePythonCourseTable() {
  await pool.query(useSqlite ? SQL_SQLITE : SQL_PG);
  await pool.query(IDX);
}
