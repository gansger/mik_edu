import pool from '../config/db.js';

/** Проверяет, есть ли у преподавателя доступ к модулю (по назначению группа+предмет). */
export async function canTeacherAccessModule(moduleId, userId) {
  const r = await pool.query(
    `SELECT 1 FROM modules m
     JOIN subjects s ON m.subject_id = s.id
     JOIN teacher_assignments ta ON ta.group_id = s.group_id AND ta.subject_id = s.id
     WHERE m.id = $1 AND ta.teacher_id = $2`,
    [moduleId, userId]
  );
  return r.rows?.length > 0;
}

/** Проверяет, есть ли у преподавателя доступ к предмету (по назначению). */
export async function canTeacherAccessSubject(subjectId, userId) {
  const r = await pool.query(
    `SELECT 1 FROM subjects s
     JOIN teacher_assignments ta ON ta.group_id = s.group_id AND ta.subject_id = s.id
     WHERE s.id = $1 AND ta.teacher_id = $2`,
    [subjectId, userId]
  );
  return r.rows?.length > 0;
}

/** Проверяет доступ: админ или преподаватель по своему модулю. moduleId из body.moduleId или по id (тест/лекция). */
export async function requireAdminOrTeacherModule(req, res, next) {
  if (req.role === 'admin') return next();
  if (req.role !== 'teacher') return res.status(403).json({ error: 'Доступ запрещён' });
  let moduleId = req.body?.moduleId || req.moduleId;
  if (!moduleId && req.params?.id) {
    let r = await pool.query('SELECT module_id FROM tests WHERE id = $1', [req.params.id]);
    if (r.rows[0]) moduleId = r.rows[0].module_id;
    else {
      r = await pool.query('SELECT module_id FROM lectures WHERE id = $1', [req.params.id]);
      if (r.rows[0]) moduleId = r.rows[0].module_id;
    }
  }
  if (!moduleId && req.params?.qid) {
    const q = await pool.query('SELECT test_id FROM test_questions WHERE id = $1', [req.params.qid]);
    if (q.rows[0]) {
      const t = await pool.query('SELECT module_id FROM tests WHERE id = $1', [q.rows[0].test_id]);
      if (t.rows[0]) moduleId = t.rows[0].module_id;
    }
  }
  if (!moduleId && req.params?.oid) {
    const o = await pool.query('SELECT question_id FROM test_options WHERE id = $1', [req.params.oid]);
    if (o.rows[0]) {
      const q = await pool.query('SELECT test_id FROM test_questions WHERE id = $1', [o.rows[0].question_id]);
      if (q.rows[0]) {
        const t = await pool.query('SELECT module_id FROM tests WHERE id = $1', [q.rows[0].test_id]);
        if (t.rows[0]) moduleId = t.rows[0].module_id;
      }
    }
  }
  if (!moduleId) return res.status(400).json({ error: 'Укажите модуль' });
  const ok = await canTeacherAccessModule(moduleId, req.userId);
  if (!ok) return res.status(403).json({ error: 'Нет доступа к этому модулю' });
  next();
}
