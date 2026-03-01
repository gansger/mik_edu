import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import pool from './config/db.js';
import auth from './routes/auth.js';
import users from './routes/users.js';
import groups from './routes/groups.js';
import subjects from './routes/subjects.js';
import modules from './routes/modules.js';
import lectures from './routes/lectures.js';
import grades from './routes/grades.js';
import materials from './routes/materials.js';
import files from './routes/files.js';
import tests from './routes/tests.js';
import { runMigrations } from './scripts/runMigrations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const useSqlite = !process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('sqlite');

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth', auth);
app.use('/api/users', users);
app.use('/api/groups', groups);
app.use('/api/subjects', subjects);
app.use('/api/modules', modules);
app.use('/api/lectures', lectures);
app.use('/api/grades', grades);
app.use('/api/materials', materials);
app.use('/api/files', files);
app.use('/api/tests', tests);

const distPath = join(__dirname, 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(distPath, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  if (err.message && err.message.includes('Разрешены')) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Ошибка сервера' });
});

async function start() {
  if (useSqlite) {
    try {
      await runMigrations(pool);
    } catch (e) {
      console.error('Миграции БД:', e.message);
      process.exit(1);
    }
  }
  app.listen(PORT, () => {
    console.log(`МИК-ОБРАЗОВАНИЕ API: http://localhost:${PORT}`);
  });
}

start();
