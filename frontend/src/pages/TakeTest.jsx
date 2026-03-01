import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function TakeTest() {
  const { id } = useParams();
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/tests/${id}`)
      .then((r) => setTest(r.data))
      .catch((e) => setError(e.error || 'Тест не найден'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const answersList = Object.entries(answers).filter(([, optId]) => optId).map(([questionId, optionId]) => ({ questionId: Number(questionId), optionId: Number(optionId) }));
    setSubmitting(true);
    api.post(`/tests/${id}/submit`, { answers: answersList })
      .then((r) => setResult(r.data))
      .catch((e) => setError(e.error || 'Ошибка отправки'))
      .finally(() => setSubmitting(false));
  };

  if (loading) return <div className="content">Загрузка теста...</div>;
  if (error) return <div className="content"><p className="empty-state">{error}</p><Link to="/materials" className="btn btn-secondary">К материалам</Link></div>;
  if (result) {
    return (
      <div className="content">
        <div className="card">
          <h2>Результат теста</h2>
          <p style={{ fontSize: '1.25rem', margin: '1rem 0' }}>
            Вы набрали <strong>{result.score}</strong> из <strong>{result.maxScore}</strong> баллов.
          </p>
          <p style={{ color: 'var(--text-muted)' }}>Результат сохранён в журнал успеваемости.</p>
          <Link to="/materials" className="btn btn-primary">К материалам</Link>
          <Link to="/grades" className="btn btn-secondary" style={{ marginLeft: '0.5rem' }}>Моя успеваемость</Link>
        </div>
      </div>
    );
  }

  const questionCount = test?.questions?.length ?? 0;
  if (questionCount === 0) {
    return (
      <div className="content">
        <p className="empty-state">В этом тесте пока нет вопросов.</p>
        <Link to="/materials" className="btn btn-secondary">К материалам</Link>
      </div>
    );
  }
  if (questionCount < 10) {
    return (
      <div className="content">
        <p className="empty-state">Тест должен содержать 10 вопросов. Сейчас: {questionCount}. Дождитесь, пока преподаватель добавит все вопросы.</p>
        <Link to="/materials" className="btn btn-secondary">К материалам</Link>
      </div>
    );
  }

  return (
    <div className="content">
      <Link to="/materials" className="btn btn-secondary" style={{ marginBottom: '1rem' }}>← К материалам</Link>
      <div className="card">
        <h1 className="page-title" style={{ marginTop: 0 }}>{test.title}</h1>
        <form onSubmit={handleSubmit}>
          {test.questions.map((q) => (
            <div key={q.id} className="test-question card" style={{ marginBottom: '1.25rem' }}>
              <p className="test-question-text"><strong>{q.text}</strong> {q.points > 1 && <span className="test-points">({q.points} б.)</span>}</p>
              <div className="test-options">
                {q.options.map((opt) => (
                  <label key={opt.id} className="test-option-label">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt.id}
                      checked={answers[q.id] === opt.id}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                    />
                    <span>{opt.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Отправка...' : 'Отправить ответы'}</button>
        </form>
      </div>
    </div>
  );
}
