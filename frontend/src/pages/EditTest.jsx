import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function EditTest() {
  const { id } = useParams();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [newOptionText, setNewOptionText] = useState({});
  const [newOptionCorrect, setNewOptionCorrect] = useState({});
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionPoints, setNewQuestionPoints] = useState(1);
  const [addQuestionSaving, setAddQuestionSaving] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    api.get(`/tests/${id}`)
      .then((r) => setTest(r.data))
      .catch(() => setTest(null))
      .finally(() => setLoading(false));
  }, [id]);

  const updateQuestion = (qid, field, value) => {
    setSaving((s) => ({ ...s, [qid]: true }));
    const body = field === 'text' ? { text: value } : { points: value };
    api.patch(`/tests/questions/${qid}`, body)
      .then(() => setTest((t) => ({
        ...t,
        questions: t.questions.map((q) => (q.id === qid ? { ...q, ...body } : q)),
      })))
      .catch((err) => alert(err.error || 'Ошибка'))
      .finally(() => setSaving((s) => ({ ...s, [qid]: false })));
  };

  const addOption = (e, questionId) => {
    e.preventDefault();
    const text = newOptionText[questionId];
    const isCorrect = newOptionCorrect[questionId];
    if (!text?.trim()) return;
    setSaving((s) => ({ ...s, [`opt-${questionId}`]: true }));
    api.post(`/tests/questions/${questionId}/options`, { text: text.trim(), isCorrect: !!isCorrect })
      .then(() => {
        setNewOptionText((p) => ({ ...p, [questionId]: '' }));
        setNewOptionCorrect((p) => ({ ...p, [questionId]: false }));
        return api.get(`/tests/${id}`);
      })
      .then((r) => setTest(r.data))
      .catch((err) => alert(err.error || 'Ошибка'))
      .finally(() => setSaving((s) => ({ ...s, [`opt-${questionId}`]: false })));
  };

  const removeOption = (oid) => {
    if (!confirm('Удалить вариант?')) return;
    api.delete(`/tests/options/${oid}`)
      .then(() => api.get(`/tests/${id}`))
      .then((r) => setTest(r.data))
      .catch((err) => alert(err.error));
  };

  const addQuestion = (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    setAddQuestionSaving(true);
    api.post(`/tests/${id}/questions`, { text: newQuestionText.trim(), points: newQuestionPoints || 1 })
      .then(() => {
        setNewQuestionText('');
        setNewQuestionPoints(1);
        return api.get(`/tests/${id}`);
      })
      .then((r) => setTest(r.data))
      .catch((err) => alert(err.error || 'Ошибка'))
      .finally(() => setAddQuestionSaving(false));
  };

  const removeQuestion = (qid) => {
    if (!confirm('Удалить вопрос и все варианты ответов?')) return;
    setSaving((s) => ({ ...s, [`q-${qid}`]: true }));
    api.delete(`/tests/questions/${qid}`)
      .then(() => api.get(`/tests/${id}`))
      .then((r) => setTest(r.data))
      .catch((err) => alert(err.error))
      .finally(() => setSaving((s) => ({ ...s, [`q-${qid}`]: false })));
  };

  const generateWithAi = (e) => {
    e.preventDefault();
    const topic = (aiTopic || '').trim();
    if (!topic) {
      setAiError('Введите тему для генерации');
      return;
    }
    setAiError(null);
    setAiLoading(true);
    api.post(`/tests/${id}/generate-questions`, { topic, count: aiCount })
      .then((r) => {
        setAiTopic('');
        return api.get(`/tests/${id}`);
      })
      .then((r) => setTest(r.data))
      .catch((err) => setAiError(err?.error || err?.message || 'Ошибка генерации'))
      .finally(() => setAiLoading(false));
  };

  if (loading) return <div className="content">Загрузка...</div>;
  if (!test) return <div className="content"><p className="empty-state">Тест не найден.</p><Link to="/groups" className="btn btn-secondary">← К группам</Link></div>;

  const questions = test.questions || [];

  return (
    <div className="content">
      <Link to="/groups" className="btn btn-secondary" style={{ marginBottom: '1rem' }}>← К группам</Link>
      <div className="card">
        <h1 className="page-title" style={{ marginTop: 0 }}>Редактирование теста: {test.title}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Вопросов: {questions.length}. Добавьте вопросы и варианты ответов ниже.</p>
        {questions.map((q, idx) => (
          <div key={q.id} className="card edit-test-question" style={{ background: 'var(--bg)', marginBottom: '1rem' }}>
            <div className="edit-q-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span><strong>Вопрос {idx + 1}</strong> <span className="test-points">({q.points} б.)</span></span>
              <button type="button" className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} onClick={() => removeQuestion(q.id)} disabled={!!saving[`q-${q.id}`]}>Удалить вопрос</button>
            </div>
            <div className="form-group">
              <input
                value={q.text}
                onChange={(e) => setTest((t) => ({ ...t, questions: t.questions.map((qu) => (qu.id === q.id ? { ...qu, text: e.target.value } : qu)) }))}
                onBlur={(e) => { if (e.target.value.trim() && e.target.value !== q.text) updateQuestion(q.id, 'text', e.target.value.trim()); }}
                placeholder="Текст вопроса"
                disabled={!!saving[q.id]}
              />
            </div>
            <div className="form-group" style={{ maxWidth: 80 }}>
              <label>Баллы</label>
              <input type="number" min={1} value={q.points} onChange={(e) => updateQuestion(q.id, 'points', parseInt(e.target.value, 10) || 1)} />
            </div>
            <ul className="test-options-list">
              {q.options?.map((opt) => (
                <li key={opt.id}>
                  {opt.text} {opt.is_correct ? <span className="badge badge-student">✓ верный</span> : ''}
                  <button type="button" className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.85rem' }} onClick={() => removeOption(opt.id)}>✕</button>
                </li>
              ))}
            </ul>
            <form onSubmit={(e) => addOption(e, q.id)} className="add-option-form">
              <input
                placeholder="Вариант ответа"
                value={newOptionText[q.id] || ''}
                onChange={(e) => setNewOptionText((p) => ({ ...p, [q.id]: e.target.value }))}
              />
              <label className="correct-cb">
                <input type="checkbox" checked={!!newOptionCorrect[q.id]} onChange={(e) => setNewOptionCorrect((p) => ({ ...p, [q.id]: e.target.checked }))} />
                Верный
              </label>
              <button type="submit" className="btn btn-primary" disabled={!!saving[`opt-${q.id}`]}>Добавить</button>
            </form>
          </div>
        ))}
        <div className="card" style={{ background: 'var(--surface)', marginTop: '1rem', border: '1px solid var(--border)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Сгенерировать вопросы с помощью ИИ</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Укажите тему — ИИ создаст вопросы с вариантами ответов и добавит их в тест.
          </p>
          <form onSubmit={generateWithAi} className="add-inline-form" style={{ flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end' }}>
            <input
              placeholder="Тема (например: основы SQL)"
              value={aiTopic}
              onChange={(e) => { setAiTopic(e.target.value); setAiError(null); }}
              style={{ minWidth: 200, flex: 1 }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              Вопросов:
              <select value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))} style={{ padding: '0.35rem' }}>
                {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <button type="submit" className="btn btn-primary" disabled={aiLoading || !aiTopic.trim()}>
              {aiLoading ? 'Генерация...' : 'Сгенерировать с ИИ'}
            </button>
          </form>
          {aiError && <p style={{ color: 'var(--danger)', marginTop: '0.5rem', marginBottom: 0 }}>{aiError}</p>}
        </div>
        <div className="card" style={{ background: 'var(--surface-hover)', marginTop: '1rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Добавить вопрос вручную</h3>
          <form onSubmit={addQuestion} className="add-inline-form" style={{ flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end' }}>
            <input
              placeholder="Текст вопроса"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              style={{ minWidth: 200, flex: 1 }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              Баллы:
              <input type="number" min={1} value={newQuestionPoints} onChange={(e) => setNewQuestionPoints(parseInt(e.target.value, 10) || 1)} style={{ width: 60 }} />
            </label>
            <button type="submit" className="btn btn-primary" disabled={addQuestionSaving || !newQuestionText.trim()}>{addQuestionSaving ? 'Добавление...' : 'Добавить вопрос'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
