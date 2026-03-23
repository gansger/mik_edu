import { Router } from 'express';
import pool from '../config/db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

/** Должно совпадать с количеством уровней в public/python-quest-data.js */
export const PYTHON_QUEST_TOTAL_LEVELS = 28;
export const PYTHON_QUEST_COURSE_KEY = 'python-quest';

async function teacherCanAccessGroup(req, groupId) {
  if (req.role === 'admin') return true;
  if (req.role !== 'teacher') return false;
  const r = await pool.query(
    'SELECT 1 FROM teacher_assignments WHERE teacher_id = $1 AND group_id = $2',
    [req.userId, groupId]
  );
  return Boolean(r.rows?.length);
}

/** Мой прогресс (любой авторизованный пользователь) */
router.get('/me', authRequired, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT current_level_index, completed, completed_at, updated_at
       FROM python_course_progress
       WHERE user_id = $1 AND course_key = $2`,
      [req.userId, PYTHON_QUEST_COURSE_KEY]
    );
    const row = r.rows[0];
    res.json({
      totalLevels: PYTHON_QUEST_TOTAL_LEVELS,
      hasServerRecord: Boolean(row),
      currentLevelIndex: row ? Number(row.current_level_index) : 0,
      completed: row ? Boolean(row.completed) : false,
      completedAt: row?.completed_at || null,
      updatedAt: row?.updated_at || null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Не удалось загрузить прогресс' });
  }
});

/** Сохранить прогресс */
router.put('/progress', authRequired, async (req, res) => {
  try {
    let { currentLevelIndex } = req.body || {};
    if (typeof currentLevelIndex !== 'number' || Number.isNaN(currentLevelIndex)) {
      return res.status(400).json({ error: 'Укажите currentLevelIndex (число)' });
    }
    currentLevelIndex = Math.floor(currentLevelIndex);
    if (currentLevelIndex < 0 || currentLevelIndex > PYTHON_QUEST_TOTAL_LEVELS) {
      return res.status(400).json({ error: 'Недопустимый уровень' });
    }

    const completed = currentLevelIndex >= PYTHON_QUEST_TOTAL_LEVELS ? 1 : 0;

    const existing = await pool.query(
      `SELECT id, completed, completed_at FROM python_course_progress
       WHERE user_id = $1 AND course_key = $2`,
      [req.userId, PYTHON_QUEST_COURSE_KEY]
    );
    const prev = existing.rows[0];
    let completedAt = null;
    if (completed) {
      if (prev?.completed && prev.completed_at) {
        completedAt = prev.completed_at;
      } else {
        completedAt = new Date().toISOString();
      }
    }

    if (prev) {
      await pool.query(
        `UPDATE python_course_progress
         SET current_level_index = $1, completed = $2, completed_at = $3, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $4 AND course_key = $5`,
        [currentLevelIndex, completed, completedAt, req.userId, PYTHON_QUEST_COURSE_KEY]
      );
    } else {
      await pool.query(
        `INSERT INTO python_course_progress (user_id, course_key, current_level_index, completed, completed_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [req.userId, PYTHON_QUEST_COURSE_KEY, currentLevelIndex, completed, completed ? completedAt : null]
      );
    }

    res.json({
      ok: true,
      totalLevels: PYTHON_QUEST_TOTAL_LEVELS,
      currentLevelIndex,
      completed: Boolean(completed),
      completedAt,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Не удалось сохранить прогресс' });
  }
});

/** Сброс прогресса */
router.delete('/progress', authRequired, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM python_course_progress WHERE user_id = $1 AND course_key = $2`,
      [req.userId, PYTHON_QUEST_COURSE_KEY]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Не удалось сбросить прогресс' });
  }
});

/** Журнал: прогресс студентов группы по курсу Python (админ / преподаватель с доступом к группе) */
router.get('/admin', authRequired, async (req, res) => {
  if (req.role !== 'admin' && req.role !== 'teacher') {
    return res.status(403).json({ error: 'Доступ только для администратора или преподавателя' });
  }
  const groupId = req.query.groupId;
  if (!groupId) return res.status(400).json({ error: 'Укажите groupId' });

  const allowed = await teacherCanAccessGroup(req, groupId);
  if (!allowed) return res.status(403).json({ error: 'Нет доступа к этой группе' });

  try {
    const r = await pool.query(
      `SELECT u.id, u.login, u.full_name,
              p.current_level_index, p.completed, p.completed_at, p.updated_at
       FROM users u
       LEFT JOIN python_course_progress p ON p.user_id = u.id AND p.course_key = $2
       WHERE u.group_id = $1 AND u.role = 'student'
       ORDER BY u.full_name, u.login`,
      [groupId, PYTHON_QUEST_COURSE_KEY]
    );
    res.json({
      totalLevels: PYTHON_QUEST_TOTAL_LEVELS,
      students: r.rows.map((row) => ({
        userId: row.id,
        login: row.login,
        fullName: row.full_name,
        currentLevelIndex: row.current_level_index != null ? Number(row.current_level_index) : 0,
        completed: Boolean(row.completed),
        completedAt: row.completed_at || null,
        updatedAt: row.updated_at || null,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Не удалось загрузить данные' });
  }
});

export default router;
