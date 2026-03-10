import { Router } from 'express';
import * as XLSX from 'xlsx';
import pool from '../config/db.js';
import { authRequired, adminOnly } from '../middleware/auth.js';

const router = Router();

// Структура «Моя успеваемость» для студента: предметы/модули группы + оценки студента
router.get('/my-journal', authRequired, async (req, res) => {
  if (req.role !== 'student' || !req.groupId) {
    return res.json({ columns: [], gradeMap: {} });
  }
  const groupId = req.groupId;
  const subjects = await pool.query(
    'SELECT id, name FROM subjects WHERE group_id = $1 ORDER BY name',
    [groupId]
  );
  const columns = [];
  for (const sub of subjects.rows) {
    const modules = await pool.query(
      'SELECT id, name, order_index FROM modules WHERE subject_id = $1 ORDER BY order_index, id',
      [sub.id]
    );
    for (let i = 0; i < modules.rows.length; i++) {
      const mod = modules.rows[i];
      const tests = await pool.query('SELECT id FROM tests WHERE module_id = $1 ORDER BY id', [mod.id]);
      const testId = tests.rows[0]?.id || null;
      columns.push({
        subjectId: sub.id,
        subjectName: sub.name,
        moduleId: mod.id,
        moduleNum: i + 1,
        moduleName: mod.name,
        testId,
      });
    }
  }
  const grades = await pool.query(
    'SELECT test_id, MAX(score) as score FROM grades WHERE user_id = $1 AND test_id IS NOT NULL GROUP BY test_id',
    [req.userId]
  );
  const gradeMap = {};
  for (const row of grades.rows) {
    gradeMap[row.test_id] = row.score;
  }
  res.json({
    subjects: subjects.rows.map((s) => ({ id: s.id, name: s.name })),
    columns,
    gradeMap,
  });
});

// Student: my grades (список)
router.get('/my', authRequired, async (req, res) => {
  const r = await pool.query(
    `SELECT g.id, g.lecture_id, g.test_id, g.score, g.completed_at,
            l.title as lecture_title, t.title as test_title
     FROM grades g
     LEFT JOIN lectures l ON g.lecture_id = l.id
     LEFT JOIN tests t ON g.test_id = t.id
     WHERE g.user_id = $1 ORDER BY g.completed_at DESC`,
    [req.userId]
  );
  res.json(r.rows);
});

// Admin / Teacher: grades by group or user. Student: only own.
router.get('/', authRequired, async (req, res) => {
  const { groupId, userId } = req.query;
  if (req.role === 'student') {
    const r = await pool.query(
      `SELECT g.id, g.lecture_id, g.test_id, g.score, g.completed_at, l.title as lecture_title, t.title as test_title
       FROM grades g LEFT JOIN lectures l ON g.lecture_id = l.id LEFT JOIN tests t ON g.test_id = t.id WHERE g.user_id = $1 ORDER BY g.completed_at DESC`,
      [req.userId]
    );
    return res.json(r.rows);
  }
  if (req.role === 'teacher') {
    if (!groupId) return res.status(400).json({ error: 'Укажите группу' });
    const allowed = await pool.query('SELECT 1 FROM teacher_assignments WHERE teacher_id = $1 AND group_id = $2', [req.userId, groupId]);
    if (allowed.rows.length === 0) return res.status(403).json({ error: 'Нет доступа к этой группе' });
  }
  let q = `
    SELECT g.id, g.user_id, g.lecture_id, g.test_id, g.score, g.completed_at,
           u.full_name, u.login, l.title as lecture_title, t.title as test_title
    FROM grades g
    JOIN users u ON g.user_id = u.id
    LEFT JOIN lectures l ON g.lecture_id = l.id
    LEFT JOIN tests t ON g.test_id = t.id
    WHERE 1=1
  `;
  const params = [];
  let i = 1;
  if (groupId) {
    q += ` AND u.group_id = $${i++}`;
    params.push(groupId);
  }
  if (userId) {
    q += ` AND g.user_id = $${i++}`;
    params.push(userId);
  }
  q += ' ORDER BY g.completed_at DESC';
  const r = await pool.query(q, params);
  res.json(r.rows);
});

// Структура журнала по группе: студенты, предметы с модулями (тестами), оценки. subjectId — опционально (журнал по одному предмету).
router.get('/journal-structure', authRequired, async (req, res) => {
  const { groupId, subjectId } = req.query;
  if (!groupId) return res.status(400).json({ error: 'Укажите groupId' });
  if (req.role === 'teacher') {
    const allowed = await pool.query('SELECT 1 FROM teacher_assignments WHERE teacher_id = $1 AND group_id = $2', [req.userId, groupId]);
    if (allowed.rows.length === 0) return res.status(403).json({ error: 'Нет доступа к этой группе' });
  } else if (req.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещён' });

  const students = await pool.query(
    `SELECT id, login, full_name FROM users WHERE group_id = $1 AND role = 'student' ORDER BY full_name, login`,
    [groupId]
  );
  const subjects = await pool.query(
    'SELECT id, name FROM subjects WHERE group_id = $1 ORDER BY name',
    [groupId]
  );
  const columns = [];
  for (const sub of subjects.rows) {
    if (subjectId && String(sub.id) !== String(subjectId)) continue;
    const modules = await pool.query(
      'SELECT id, name, order_index FROM modules WHERE subject_id = $1 ORDER BY order_index, id',
      [sub.id]
    );
    for (let i = 0; i < modules.rows.length; i++) {
      const mod = modules.rows[i];
      const tests = await pool.query('SELECT id, title FROM tests WHERE module_id = $1 ORDER BY id', [mod.id]);
      const testId = tests.rows[0]?.id || null;
      columns.push({
        subjectId: sub.id,
        subjectName: sub.name,
        moduleId: mod.id,
        moduleNum: i + 1,
        moduleName: mod.name,
        testId,
      });
    }
  }
  const grades = await pool.query(
    `SELECT g.user_id, g.test_id, MAX(g.score) as score FROM grades g
     JOIN users u ON g.user_id = u.id WHERE u.group_id = $1 AND g.test_id IS NOT NULL
     GROUP BY g.user_id, g.test_id`,
    [groupId]
  );
  const gradeMap = {};
  for (const row of grades.rows) {
    const key = `${row.user_id}-${row.test_id}`;
    gradeMap[key] = row.score;
  }
  res.json({
    students: students.rows.map((s) => ({ id: s.id, login: s.login, fullName: s.full_name || s.login })),
    subjects: subjects.rows.map((s) => ({ id: s.id, name: s.name })),
    columns,
    gradeMap,
  });
});

// Export journal to xlsx (admin/teacher)
router.get('/export', authRequired, async (req, res) => {
  const { groupId, subjectId } = req.query;
  if (!groupId) return res.status(400).json({ error: 'Укажите groupId' });
  if (req.role === 'teacher') {
    const allowed = await pool.query('SELECT 1 FROM teacher_assignments WHERE teacher_id = $1 AND group_id = $2', [req.userId, groupId]);
    if (allowed.rows.length === 0) return res.status(403).json({ error: 'Нет доступа к этой группе' });
  } else if (req.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещён' });

  const students = await pool.query(
    `SELECT id, login, full_name FROM users WHERE group_id = $1 AND role = 'student' ORDER BY full_name, login`,
    [groupId]
  );
  const subjects = await pool.query(
    'SELECT id, name FROM subjects WHERE group_id = $1 ORDER BY name',
    [groupId]
  );
  const columns = [];
  for (const sub of subjects.rows) {
    if (subjectId && String(sub.id) !== String(subjectId)) continue;
    const modules = await pool.query(
      'SELECT id, name, order_index FROM modules WHERE subject_id = $1 ORDER BY order_index, id',
      [sub.id]
    );
    for (let i = 0; i < modules.rows.length; i++) {
      const mod = modules.rows[i];
      const tests = await pool.query('SELECT id, title FROM tests WHERE module_id = $1 ORDER BY id', [mod.id]);
      const testId = tests.rows[0]?.id || null;
      columns.push({
        subjectId: sub.id,
        subjectName: sub.name,
        moduleId: mod.id,
        moduleNum: i + 1,
        moduleName: mod.name,
        testId,
      });
    }
  }
  const grades = await pool.query(
    `SELECT g.user_id, g.test_id, MAX(g.score) as score FROM grades g
     JOIN users u ON g.user_id = u.id WHERE u.group_id = $1 AND g.test_id IS NOT NULL
     GROUP BY g.user_id, g.test_id`,
    [groupId]
  );
  const gradeMap = {};
  for (const row of grades.rows) {
    const key = `${row.user_id}-${row.test_id}`;
    gradeMap[key] = row.score;
  }

  const columnsBySubject = columns.reduce((acc, col) => {
    const key = col.subjectId;
    if (!acc[key]) acc[key] = { name: col.subjectName, modules: [] };
    acc[key].modules.push(col);
    return acc;
  }, {});
  const subjectList = Object.values(columnsBySubject);

  const header1 = ['Студент', 'Логин'];
  const header2 = ['', ''];
  subjectList.forEach((sub) => {
    sub.modules.forEach((col, i) => {
      header1.push(i === 0 ? sub.name : '');
      header2.push(`М${col.moduleNum}`);
    });
  });
  const data = [header1, header2];
  for (const stu of students.rows) {
    const fullName = stu.full_name || stu.login || '';
    const row = [fullName, stu.login];
    subjectList.forEach((sub) => {
      sub.modules.forEach((col) => {
        const key = `${stu.id}-${col.testId}`;
        row.push(gradeMap[key] ?? '');
      });
    });
    data.push(row);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Успеваемость');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = subjectId
    ? `grades-group-${groupId}-subject-${subjectId}.xlsx`
    : `grades-group-${groupId}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// Оценки выставляются только автоматически при сдаче теста (см. POST /api/tests/:id/submit).
// Ручное выставление отключено; шкала: 0–39,9% → 2, 40–59,9% → 3, 60–79,9% → 4, 80–100% → 5.

export default router;
