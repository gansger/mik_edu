/**
 * Скрипт заполнения: 5 групп, в каждой 15 предметов и 25 студентов.
 * Запуск: node scripts/seedGroupsStudents.js
 */
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const DEFAULT_PASSWORD = 'student';

async function seed() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const groupNames = ['Группа 1', 'Группа 2', 'Группа 3', 'Группа 4', 'Группа 5'];

  console.log('Создание 5 групп...');
  const groupIds = [];
  for (const name of groupNames) {
    const r = await pool.query(
      'INSERT INTO groups (name) VALUES ($1) RETURNING id',
      [name]
    );
    groupIds.push(r.rows[0].id);
  }

  console.log('В каждой группе — 15 предметов (Предмет 1 … Предмет 15)...');
  for (let g = 0; g < groupIds.length; g++) {
    const groupId = groupIds[g];
    for (let s = 1; s <= 15; s++) {
      await pool.query(
        'INSERT INTO subjects (group_id, name) VALUES ($1, $2)',
        [groupId, `Предмет ${s}`]
      );
    }
  }

  console.log('В каждой группе — 25 студентов (логин g{N}_u{1-25}, пароль: student)...');
  for (let g = 0; g < groupIds.length; g++) {
    const groupId = groupIds[g];
    const groupNum = g + 1;
    for (let u = 1; u <= 25; u++) {
      const login = `g${groupNum}_u${u}`;
      const fullName = `Студент ${u}, группа ${groupNum}`;
      await pool.query(
        `INSERT INTO users (login, password_hash, role, full_name, group_id)
         VALUES ($1, $2, 'student', $3, $4)
         ON CONFLICT (login) DO NOTHING`,
        [login, passwordHash, fullName, groupId]
      );
    }
  }

  console.log('Готово: 5 групп, по 15 предметов и по 25 студентов в каждой.');
  console.log('Пароль всех студентов:', DEFAULT_PASSWORD);
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
