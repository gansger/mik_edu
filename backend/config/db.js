import pg from 'pg';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const useSqlite = !process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('sqlite');

let pool;

if (useSqlite) {
  const dataDir = join(__dirname, '..', 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const dbPath = process.env.SQLITE_PATH || join(dataDir, 'mik_edu.db');
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  function convertSql(sql) {
    return sql.replace(/\$(\d+)/g, '?');
  }

  pool = {
    query(sql, params = []) {
      const converted = convertSql(sql);
      const stmt = db.prepare(converted);
      const isSelect = /^\s*select/i.test(sql.trim());
      const hasReturning = /returning/i.test(sql);
      try {
        if (isSelect) {
          const rows = stmt.all(...params);
          return Promise.resolve({ rows });
        }
        const result = stmt.run(...params);
        if (hasReturning && result.lastInsertRowid) {
          const tableMatch = sql.match(/into\s+(\w+)/i);
          const table = tableMatch ? tableMatch[1] : null;
          if (table) {
            const id = result.lastInsertRowid;
            const select = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
            const row = select.get(id);
            return Promise.resolve({ rows: row ? [row] : [] });
          }
        }
        return Promise.resolve({ rows: [] });
      } catch (err) {
        return Promise.reject(err);
      }
    },
  };
} else {
  const { Pool } = pg;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

export default pool;
