import { Router } from 'express';
import pool from '../config/db.js';
import { authRequired, adminOnly } from '../middleware/auth.js';
import { requireAdminOrTeacherModule, canTeacherAccessModule } from '../middleware/teacherModule.js';

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Список тестов модуля (админ или преподаватель по своему модулю)
router.get('/', authRequired, async (req, res) => {
  const { moduleId } = req.query;
  if (!moduleId) return res.status(400).json({ error: 'Укажите moduleId' });
  if (req.role === 'teacher') {
    const ok = await canTeacherAccessModule(moduleId, req.userId);
    if (!ok) return res.status(403).json({ error: 'Нет доступа к этому модулю' });
  } else if (req.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещён' });
  const r = await pool.query(
    'SELECT id, module_id, title, created_at FROM tests WHERE module_id = $1 ORDER BY id',
    [moduleId]
  );
  res.json(r.rows);
});

// Создать тест (админ или преподаватель по модулю). Если createTenQuestions — 10 вопросов.
const QUESTIONS_PER_TEST = 10;
router.post('/', authRequired, wrap(requireAdminOrTeacherModule), async (req, res, next) => {
  try {
    const { moduleId, title, createTenQuestions } = req.body;
    if (!moduleId || !title?.trim()) return res.status(400).json({ error: 'Укажите модуль и название' });
    const r = await pool.query(
      'INSERT INTO tests (module_id, title) VALUES ($1, $2) RETURNING id, module_id, title, created_at',
      [moduleId, title.trim()]
    );
    const test = r.rows[0];
    if (createTenQuestions && test?.id) {
      for (let i = 1; i <= QUESTIONS_PER_TEST; i++) {
        await pool.query(
          'INSERT INTO test_questions (test_id, text, points, order_index) VALUES ($1, $2, 1, $3)',
          [test.id, `Вопрос ${i}`, i]
        );
      }
    }
    res.status(201).json(test);
  } catch (err) {
    next(err);
  }
});

// Вопросы и варианты (админ или преподаватель по модулю)
router.post('/:id/questions', authRequired, wrap(requireAdminOrTeacherModule), async (req, res) => {
  const { text, points } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Укажите текст вопроса' });
  const r = await pool.query(
    'INSERT INTO test_questions (test_id, text, points) VALUES ($1, $2, COALESCE($3, 1)) RETURNING id, test_id, text, points, order_index',
    [req.params.id, text.trim(), points != null ? parseInt(points, 10) : 1]
  );
  res.status(201).json(r.rows[0]);
});

router.patch('/questions/:qid', authRequired, wrap(requireAdminOrTeacherModule), async (req, res) => {
  const { text, points } = req.body;
  const updates = [];
  const values = [];
  let i = 1;
  if (text !== undefined) { updates.push(`text = $${i++}`); values.push(text.trim()); }
  if (points !== undefined) { updates.push(`points = $${i++}`); values.push(parseInt(points, 10)); }
  if (updates.length === 0) return res.status(400).json({ error: 'Нечего обновлять' });
  values.push(req.params.qid);
  await pool.query(`UPDATE test_questions SET ${updates.join(', ')} WHERE id = $${i}`, values);
  const r = await pool.query('SELECT id, test_id, text, points, order_index FROM test_questions WHERE id = $1', [req.params.qid]);
  res.json(r.rows[0] || {});
});

router.delete('/questions/:qid', authRequired, wrap(requireAdminOrTeacherModule), async (req, res) => {
  await pool.query('DELETE FROM test_questions WHERE id = $1', [req.params.qid]);
  res.status(204).send();
});

router.post('/questions/:qid/options', authRequired, wrap(requireAdminOrTeacherModule), async (req, res) => {
  const { text, isCorrect } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Укажите текст варианта' });
  const r = await pool.query(
    'INSERT INTO test_options (question_id, text, is_correct) VALUES ($1, $2, $3) RETURNING id, question_id, text, is_correct, order_index',
    [req.params.qid, text.trim(), isCorrect ? 1 : 0]
  );
  res.status(201).json(r.rows[0]);
});

router.patch('/options/:oid', authRequired, wrap(requireAdminOrTeacherModule), async (req, res) => {
  const { text, isCorrect } = req.body;
  const updates = [];
  const values = [];
  let i = 1;
  if (text !== undefined) { updates.push(`text = $${i++}`); values.push(text.trim()); }
  if (isCorrect !== undefined) { updates.push(`is_correct = $${i++}`); values.push(isCorrect ? 1 : 0); }
  if (updates.length === 0) return res.status(400).json({ error: 'Нечего обновлять' });
  values.push(req.params.oid);
  await pool.query(`UPDATE test_options SET ${updates.join(', ')} WHERE id = $${i}`, values);
  const r = await pool.query('SELECT id, question_id, text, is_correct, order_index FROM test_options WHERE id = $1', [req.params.oid]);
  res.json(r.rows[0] || {});
});

router.delete('/options/:oid', authRequired, wrap(requireAdminOrTeacherModule), async (req, res) => {
  await pool.query('DELETE FROM test_options WHERE id = $1', [req.params.oid]);
  res.status(204).send();
});

// Тест по id: студент — для прохождения (без is_correct); админ/преподаватель — для редактирования (с is_correct)
router.get('/:id', authRequired, async (req, res) => {
  const testId = req.params.id;
  const tr = await pool.query(
    `SELECT t.id, t.module_id, t.title, s.group_id FROM tests t
     JOIN modules m ON t.module_id = m.id JOIN subjects s ON m.subject_id = s.id WHERE t.id = $1`,
    [testId]
  );
  const test = tr.rows[0];
  if (!test) return res.status(404).json({ error: 'Тест не найден' });
  const forStudent = req.role === 'student';
  if (forStudent) {
    if (test.group_id !== req.groupId) return res.status(403).json({ error: 'Нет доступа к этому тесту' });
  } else if (req.role === 'teacher') {
    const ok = await canTeacherAccessModule(test.module_id, req.userId);
    if (!ok) return res.status(403).json({ error: 'Нет доступа' });
  } else if (req.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }
  const q = await pool.query(
    'SELECT id, test_id, text, points, order_index FROM test_questions WHERE test_id = $1 ORDER BY order_index, id',
    [testId]
  );
  const questions = q.rows;
  const withOptions = [];
  for (const qu of questions) {
    const cols = forStudent ? 'id, question_id, text, order_index' : 'id, question_id, text, order_index, is_correct';
    const opt = await pool.query(
      `SELECT ${cols} FROM test_options WHERE question_id = $1 ORDER BY order_index, id`,
      [qu.id]
    );
    withOptions.push({ ...qu, options: opt.rows });
  }
  res.json({ id: test.id, moduleId: test.module_id, title: test.title, questions: withOptions });
});

router.patch('/:id', authRequired, wrap(requireAdminOrTeacherModule), async (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Укажите название' });
  await pool.query('UPDATE tests SET title = $1 WHERE id = $2', [title.trim(), req.params.id]);
  const r = await pool.query('SELECT id, module_id, title, created_at FROM tests WHERE id = $1', [req.params.id]);
  res.json(r.rows[0] || {});
});

router.delete('/:id', authRequired, wrap(requireAdminOrTeacherModule), async (req, res) => {
  await pool.query('DELETE FROM tests WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

// Прохождение теста: отправить ответы, записать баллы в журнал
router.post('/:id/submit', authRequired, async (req, res) => {
  const testId = req.params.id;
  const { answers } = req.body; // [{ questionId, optionId }, ...]
  if (!Array.isArray(answers)) return res.status(400).json({ error: 'Укажите массив answers' });
  const tr = await pool.query(
    `SELECT t.id, t.module_id, m.subject_id, s.group_id FROM tests t
     JOIN modules m ON t.module_id = m.id JOIN subjects s ON m.subject_id = s.id WHERE t.id = $1`,
    [testId]
  );
  const test = tr.rows[0];
  if (!test) return res.status(404).json({ error: 'Тест не найден' });
  if (req.role === 'student' && test.group_id !== req.groupId) return res.status(403).json({ error: 'Нет доступа к этому тесту' });
  if (req.role === 'teacher') {
    const ta = await pool.query('SELECT 1 FROM teacher_assignments WHERE teacher_id = $1 AND group_id = $2 AND subject_id = $3', [req.userId, test.group_id, test.subject_id]);
    if (!ta.rows.length) return res.status(403).json({ error: 'Нет доступа' });
  }
  const questions = await pool.query('SELECT id, points FROM test_questions WHERE test_id = $1', [testId]);
  let maxScore = 0;
  let score = 0;
  const answerMap = new Map(answers.map((a) => [Number(a.questionId), Number(a.optionId)]));
  for (const q of questions.rows) {
    maxScore += Number(q.points) || 1;
    const chosenOptionId = answerMap.get(q.id);
    if (chosenOptionId) {
      const correct = await pool.query('SELECT 1 FROM test_options WHERE id = $1 AND question_id = $2 AND is_correct = 1', [chosenOptionId, q.id]);
      if (correct.rows.length) score += Number(q.points) || 1;
    }
  }
  await pool.query(
    'INSERT INTO grades (user_id, test_id, score) VALUES ($1, $2, $3)',
    [req.userId, testId, score]
  );
  res.json({ score, maxScore, success: true });
});

export default router;
