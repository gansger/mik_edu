import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

const EXPECTED_QUESTIONS = 10;

export default function EditTest() {
  const { id } = useParams();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [newOptionText, setNewOptionText] = useState({});
  const [newOptionCorrect, setNewOptionCorrect] = useState({});

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

  if (loading) return <div className="content">Загрузка...</div>;
  if (!test) return <div className="content"><p className="empty-state">Тест не найден.</p><Link to="/groups" className="btn btn-secondary">← К группам</Link></div>;

  const questions = test.questions || [];
  const hasAll10 = questions.length >= EXPECTED_QUESTIONS;

  return (
    <div className="content">
      <Link to="/groups" className="btn btn-secondary" style={{ marginBottom: '1rem' }}>← К группам</Link>
      <div className="card">
        <h1 className="page-title" style={{ marginTop: 0 }}>Редактирование теста: {test.title}</h1>
        {!hasAll10 && <p className="empty-state" style={{ padding: '0.5rem 0' }}>В тесте должно быть 10 вопросов. Сейчас: {questions.length}. Добавьте вопросы в админке или создайте тест заново с кнопкой «Создать (10 вопросов)».</p>}
        {questions.slice(0, EXPECTED_QUESTIONS).map((q, idx) => (
          <div key={q.id} className="card edit-test-question" style={{ background: 'var(--bg)', marginBottom: '1rem' }}>
            <div className="edit-q-header">
              <strong>Вопрос {idx + 1}</strong>
              <span className="test-points">({q.points} б.)</span>
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
        {questions.length < EXPECTED_QUESTIONS && questions.length > 0 && (
          <p className="empty-state">Добавьте ещё вопросов в разделе «Тестирование» (админ) до 10.</p>
        )}
      </div>
    </div>
  );
}
