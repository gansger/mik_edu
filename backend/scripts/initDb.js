import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const useSqlite = !process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('sqlite');

const SQL_SQLITE = `
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'student', 'teacher')),
  full_name VARCHAR(255),
  group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lectures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(20) NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS test_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lecture_id INTEGER REFERENCES lectures(id) ON DELETE CASCADE,
  test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
  score REAL,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (lecture_id IS NOT NULL OR test_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_users_group ON users(group_id);
CREATE INDEX IF NOT EXISTS idx_subjects_group ON subjects(group_id);
CREATE INDEX IF NOT EXISTS idx_modules_subject ON modules(subject_id);
CREATE INDEX IF NOT EXISTS idx_lectures_module ON lectures(module_id);
CREATE INDEX IF NOT EXISTS idx_grades_user ON grades(user_id);

CREATE TABLE IF NOT EXISTS teacher_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE(teacher_id, group_id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_assignments(teacher_id);
`;

const SQL_PG = `
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  login VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'student', 'teacher')),
  full_name VARCHAR(255),
  group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modules (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lectures (
  id SERIAL PRIMARY KEY,
  module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(20) NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tests (
  id SERIAL PRIMARY KEY,
  module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_questions (
  id SERIAL PRIMARY KEY,
  test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS test_options (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grades (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lecture_id INTEGER REFERENCES lectures(id) ON DELETE CASCADE,
  test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
  score NUMERIC(5,2),
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_grade_target CHECK (lecture_id IS NOT NULL OR test_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_users_group ON users(group_id);
CREATE INDEX IF NOT EXISTS idx_subjects_group ON subjects(group_id);
CREATE INDEX IF NOT EXISTS idx_modules_subject ON modules(subject_id);
CREATE INDEX IF NOT EXISTS idx_lectures_module ON lectures(module_id);
CREATE INDEX IF NOT EXISTS idx_grades_user ON grades(user_id);

CREATE TABLE IF NOT EXISTS teacher_assignments (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE(teacher_id, group_id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_assignments(teacher_id);
`;

async function initDb() {
  const { default: pool } = await import('../config/db.js');

  const SQL = useSqlite ? SQL_SQLITE : SQL_PG;

  if (useSqlite) {
    const dataDir = join(__dirname, '..', 'data');
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    const statements = SQL.split(';').map((s) => s.trim()).filter(Boolean);
    for (const stmt of statements) await pool.query(stmt);
    // Миграция SQLite (один раз): добавить роль teacher в users
    await pool.query(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY)`);
    const m = await pool.query(`SELECT 1 FROM _migrations WHERE name = $1`, ['users_teacher_role']);
    const hasUsers = await pool.query(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'`);
    if (!m.rows?.length && hasUsers.rows?.length > 0) {
      await pool.query(`DROP TABLE IF EXISTS teacher_assignments`);
      await pool.query(`DROP TABLE IF EXISTS users_new`);
      await pool.query(`CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'student', 'teacher')),
        full_name VARCHAR(255),
        group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      await pool.query(`INSERT INTO users_new SELECT * FROM users`);
      await pool.query(`DROP TABLE users`);
      await pool.query(`ALTER TABLE users_new RENAME TO users`);
      await pool.query(`CREATE TABLE IF NOT EXISTS teacher_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        UNIQUE(teacher_id, group_id, subject_id)
      )`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_assignments(teacher_id)`);
      await pool.query(`INSERT OR IGNORE INTO _migrations (name) VALUES ($1)`, ['users_teacher_role']);
      console.log('Миграция: добавлена роль преподавателя (teacher)');
    }
    const m2 = await pool.query(`SELECT 1 FROM _migrations WHERE name = $1`, ['test_questions']);
    const hasTests = await pool.query(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='tests'`);
    if (!m2.rows?.length && hasTests.rows?.length > 0) {
      await pool.query(`CREATE TABLE IF NOT EXISTS test_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE, text TEXT NOT NULL, points INTEGER DEFAULT 1, order_index INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
      await pool.query(`CREATE TABLE IF NOT EXISTS test_options (id INTEGER PRIMARY KEY AUTOINCREMENT, question_id INTEGER NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE, text TEXT NOT NULL, is_correct INTEGER DEFAULT 0, order_index INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
      await pool.query(`INSERT OR IGNORE INTO _migrations (name) VALUES ($1)`, ['test_questions']);
      console.log('Миграция: созданы таблицы тестирования');
    }
  } else {
    await pool.query(SQL);
  }

  const { rows } = await pool.query("SELECT 1 FROM users WHERE role = 'admin'");
  if (!rows || rows.length === 0) {
    const hash = await bcrypt.hash('admin', 10);
    await pool.query(
      "INSERT INTO users (login, password_hash, role, full_name) VALUES ($1, $2, 'admin', 'Администратор')",
      ['admin', hash]
    );
    console.log('Создан пользователь admin / пароль: admin');
  }
  console.log('База данных инициализирована.', useSqlite ? '(SQLite)' : '(PostgreSQL)');
  if (useSqlite) process.exit(0);
  else await pool.end();
}

initDb().catch((e) => {
  console.error(e);
  process.exit(1);
});
