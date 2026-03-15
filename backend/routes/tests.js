import { Router } from 'express';
import fetch from 'node-fetch';
import pool from '../config/db.js';
import { authRequired, adminOnly } from '../middleware/auth.js';
import { requireAdminOrTeacherModule, canTeacherAccessModule } from '../middleware/teacherModule.js';

const QWEN_API_KEY = process.env.QWEN_API_KEY || '';
const QWEN_API_URL = process.env.QWEN_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen/qwen3-32b';

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

// Создать тест (админ или преподаватель по модулю). Вопросы добавляются в редакторе теста.
router.post('/', authRequired, wrap(requireAdminOrTeacherModule), async (req, res, next) => {
  try {
    const { moduleId, title } = req.body;
    if (!moduleId || !title?.trim()) return res.status(400).json({ error: 'Укажите модуль и название' });
    const r = await pool.query(
      'INSERT INTO tests (module_id, title) VALUES ($1, $2) RETURNING id, module_id, title, created_at',
      [moduleId, title.trim()]
    );
    res.status(201).json(r.rows[0]);
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

// Сгенерировать вопросы теста с помощью Qwen (админ или преподаватель по модулю)
router.post('/:id/generate-questions', authRequired, wrap(requireAdminOrTeacherModule), async (req, res) => {
  if (!QWEN_API_KEY) {
    return res.status(503).json({ error: 'Генерация ИИ не настроена. Задайте QWEN_API_KEY в backend/.env' });
  }
  const testId = req.params.id;
  const { topic, count = 5 } = req.body;
  const theme = (topic || '').trim();
  if (!theme) return res.status(400).json({ error: 'Укажите тему (topic) для генерации вопросов' });
  const num = Math.min(10, Math.max(1, parseInt(count, 10) || 5));

  const testRow = await pool.query(
    'SELECT id, title FROM tests WHERE id = $1',
    [testId]
  );
  if (!testRow.rows[0]) return res.status(404).json({ error: 'Тест не найден' });

  const sysPrompt = `Ты — помощник по созданию тестов. Отвечай только валидным JSON без markdown и пояснений.
Формат ответа: { "questions": [ { "text": "Текст вопроса", "points": 1, "options": [ { "text": "Вариант ответа", "isCorrect": true или false } ] } ] }
У каждого вопроса 2–4 варианта ответа, ровно один isCorrect: true. Текст на русском.`;

  const userPrompt = `Сгенерируй ${num} вопросов с вариантами ответов по теме: «${theme}». Верни только JSON в указанном формате.`;

  try {
    const resp = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!resp.ok) {
      const errBody = await resp.text();
      console.error('Groq/Qwen API error:', resp.status, errBody);
      let errMsg = 'Ошибка API';
      try {
        const errJson = JSON.parse(errBody);
        errMsg = errJson.error?.message || errJson.message || errMsg;
      } catch (_) {}
      return res.status(502).json({ error: errMsg });
    }
    const dataRaw = await resp.json();
    const content = dataRaw.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: 'ИИ не вернул ответ' });

    let data;
    try {
      data = JSON.parse(content);
    } catch {
      return res.status(502).json({ error: 'ИИ вернул невалидный JSON' });
    }

    const questions = Array.isArray(data.questions) ? data.questions : [];
    const created = [];

    for (const q of questions) {
      const text = (q.text || '').trim();
      const points = Math.max(1, parseInt(q.points, 10) || 1);
      const options = Array.isArray(q.options) ? q.options : [];
      if (!text) continue;

      const qr = await pool.query(
        'INSERT INTO test_questions (test_id, text, points) VALUES ($1, $2, $3) RETURNING id',
        [testId, text, points]
      );
      const questionId = qr.rows[0]?.id;
      if (!questionId) continue;

      let hasCorrect = false;
      for (const o of options) {
        const optionText = (o.text || '').trim();
        if (!optionText) continue;
        const isCorrect = !!o.isCorrect;
        if (isCorrect) hasCorrect = true;
        await pool.query(
          'INSERT INTO test_options (question_id, text, is_correct) VALUES ($1, $2, $3)',
          [questionId, optionText, isCorrect ? 1 : 0]
        );
      }
      if (!hasCorrect && options.length > 0) {
        await pool.query(
          `UPDATE test_options SET is_correct = 1 WHERE question_id = $1 AND id = (SELECT id FROM test_options WHERE question_id = $1 LIMIT 1)`,
          [questionId, questionId]
        );
      }
      created.push({ questionId, text, optionsCount: options.length });
    }

    return res.status(201).json({ generated: created.length, questions: created });
  } catch (err) {
    console.error('Qwen error:', err);
    return res.status(502).json({ error: 'Ошибка ИИ: ' + (err.message || 'неизвестная') });
  }
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
  const payload = { id: test.id, moduleId: test.module_id, title: test.title, questions: withOptions };
  if (forStudent) {
    const attempts = await pool.query(
      'SELECT COUNT(*) as cnt FROM grades WHERE user_id = $1 AND test_id = $2',
      [req.userId, testId]
    );
    const attemptsUsed = Number(attempts.rows[0]?.cnt ?? 0);
    const maxAttempts = 1;
    payload.attemptsUsed = attemptsUsed;
    payload.attemptsLeft = Math.max(0, maxAttempts - attemptsUsed);
    payload.maxAttempts = maxAttempts;
  }
  res.json(payload);
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
  const questions = await pool.query('SELECT id, points FROM test_questions WHERE test_id = $1 ORDER BY order_index, id', [testId]);
  if (!questions.rows.length) {
    return res.status(400).json({ error: 'В тесте нет вопросов' });
  }
  const questionIds = questions.rows.map((q) => Number(q.id));
  const inPlaceholders = questionIds.map((_, i) => `$${i + 1}`).join(',');
  const correctOptions = await pool.query(
    `SELECT id, question_id FROM test_options WHERE question_id IN (${inPlaceholders}) AND (is_correct = 1 OR is_correct = true)`,
    questionIds
  );
  const correctSet = new Set(
    correctOptions.rows.map((r) => `${Number(r.question_id)}-${Number(r.id)}`)
  );
  let maxScore = 0;
  let score = 0;
  const answerMap = new Map(answers.map((a) => [Number(a.questionId), Number(a.optionId)]));
  for (const q of questions.rows) {
    const qId = Number(q.id);
    const points = Number(q.points) || 1;
    maxScore += points;
    const chosenOptionId = answerMap.get(qId);
    if (chosenOptionId != null && correctSet.has(`${qId}-${chosenOptionId}`)) {
      score += points;
    }
  }
  const MAX_ATTEMPTS = 1;
  const userId = Number(req.userId);
  const testIdNum = Number(testId);
  const attempts = await pool.query(
    'SELECT COUNT(*) as cnt FROM grades WHERE user_id = $1 AND test_id = $2',
    [userId, testIdNum]
  );
  const attemptCount = Number(attempts.rows[0]?.cnt ?? 0);
  if (attemptCount >= MAX_ATTEMPTS) {
    return res.status(400).json({
      error: `Доступ к тесту закрыт. Использована 1 попытка.`,
      attemptsUsed: MAX_ATTEMPTS,
    });
  }
  // Процент = (полученные баллы / максимальные баллы) * 100
  const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
  let grade = 2;
  if (percent >= 80) grade = 5;
  else if (percent >= 60) grade = 4;
  else if (percent >= 40) grade = 3;
  // Атомарная вставка: вставить только если попыток ещё 0 (защита от гонки)
  await pool.query(
    `INSERT INTO grades (user_id, test_id, score)
     SELECT $1, $2, $3 WHERE (SELECT COUNT(*) FROM grades WHERE user_id = $4 AND test_id = $5) < 1`,
    [userId, testIdNum, grade, userId, testIdNum]
  );
  const afterAttempts = await pool.query(
    'SELECT COUNT(*) as cnt FROM grades WHERE user_id = $1 AND test_id = $2',
    [userId, testIdNum]
  );
  const afterCount = Number(afterAttempts.rows[0]?.cnt ?? 0);
  if (afterCount <= attemptCount) {
    return res.status(400).json({
      error: `Доступ к тесту закрыт. Использована 1 попытка.`,
      attemptsUsed: MAX_ATTEMPTS,
    });
  }
  res.json({
    score,
    maxScore,
    grade,
    percent: Math.round(percent * 10) / 10,
    success: true,
    attempt: afterCount,
    attemptsLeft: MAX_ATTEMPTS - afterCount,
  });
});

export default router;
