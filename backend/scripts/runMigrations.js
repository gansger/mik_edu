/**
 * Запуск миграций для SQLite при старте сервера.
 * Добавляет роль teacher в users и создаёт таблицы test_questions, test_options.
 */
export async function runMigrations(pool) {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY)`);

    const m = await pool.query(`SELECT 1 FROM _migrations WHERE name = $1`, ['users_teacher_role']);
    const hasUsers = await pool.query(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'`);
    if ((!m.rows || m.rows.length === 0) && hasUsers.rows?.length > 0) {
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
      console.log('[Миграция] Добавлена роль преподавателя (teacher)');
    }

    const m2 = await pool.query(`SELECT 1 FROM _migrations WHERE name = $1`, ['test_questions']);
    const hasTests = await pool.query(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='tests'`);
    if ((!m2.rows || m2.rows.length === 0) && hasTests.rows?.length > 0) {
      await pool.query(`CREATE TABLE IF NOT EXISTS test_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        points INTEGER DEFAULT 1,
        order_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      await pool.query(`CREATE TABLE IF NOT EXISTS test_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        is_correct INTEGER DEFAULT 0,
        order_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      await pool.query(`INSERT OR IGNORE INTO _migrations (name) VALUES ($1)`, ['test_questions']);
      console.log('[Миграция] Созданы таблицы тестирования (test_questions, test_options)');
    }
  } catch (err) {
    console.error('[Миграция] Ошибка:', err.message);
    throw err;
  }
}
