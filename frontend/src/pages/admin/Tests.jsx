import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';

export default function AdminTests() {
  const [groups, setGroups] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [tests, setTests] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [testDetail, setTestDetail] = useState(null);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionPoints, setNewQuestionPoints] = useState(1);
  const [newOptionText, setNewOptionText] = useState({});
  const [newOptionCorrect, setNewOptionCorrect] = useState({});
  const navigate = useNavigate();

  useEffect(() => { api.get('/groups').then((r) => setGroups(r.data || [])); }, []);
  useEffect(() => {
    if (!groupId) { setSubjects([]); setSubjectId(''); setModuleId(''); return; }
    api.get(`/subjects?groupId=${groupId}`).then((r) => setSubjects(r.data || []));
  }, [groupId]);
  useEffect(() => {
    if (!subjectId) { setModules([]); setModuleId(''); return; }
    api.get(`/modules?subjectId=${subjectId}`).then((r) => setModules(r.data || []));
  }, [subjectId]);
  useEffect(() => {
    if (!moduleId) { setTests([]); setLoading(false); setSelectedTestId(null); return; }
    setLoading(true);
    api.get(`/tests?moduleId=${moduleId}`).then((r) => setTests(r.data || [])).finally(() => setLoading(false));
  }, [moduleId]);
  useEffect(() => {
    if (!selectedTestId) { setTestDetail(null); return; }
    api.get(`/tests/${selectedTestId}`).then((r) => setTestDetail(r.data)).catch(() => setTestDetail(null));
  }, [selectedTestId]);

  const createTest = (e) => {
    e.preventDefault();
    if (!moduleId || !title.trim()) return;
    api.post('/tests', { moduleId: parseInt(moduleId, 10), title: title.trim() })
      .then((r) => {
        setTitle('');
        const testId = r.data?.id;
        if (testId) navigate(`/edit-test/${testId}`);
        return api.get(`/tests?moduleId=${moduleId}`);
      })
      .then((r) => setTests(r.data || []))
      .catch((err) => alert(err.error || 'Ошибка'));
  };

  const addQuestion = (e) => {
    e.preventDefault();
    if (!selectedTestId || !newQuestionText.trim()) return;
    api.post(`/tests/${selectedTestId}/questions`, { text: newQuestionText.trim(), points: newQuestionPoints })
      .then(() => { setNewQuestionText(''); setNewQuestionPoints(1); return api.get(`/tests/${selectedTestId}`); })
      .then((r) => setTestDetail(r.data))
      .catch((err) => alert(err.error || 'Ошибка'));
  };

  const addOption = (e, questionId) => {
    e.preventDefault();
    const text = newOptionText[questionId];
    const isCorrect = newOptionCorrect[questionId];
    if (!text?.trim()) return;
    api.post(`/tests/questions/${questionId}/options`, { text: text.trim(), isCorrect: !!isCorrect })
      .then(() => {
        setNewOptionText((prev) => ({ ...prev, [questionId]: '' }));
        setNewOptionCorrect((prev) => ({ ...prev, [questionId]: false }));
        return api.get(`/tests/${selectedTestId}`);
      })
      .then((r) => setTestDetail(r.data))
      .catch((err) => alert(err.error || 'Ошибка'));
  };

  const removeQuestion = (qid) => {
    if (!confirm('Удалить вопрос?')) return;
    api.delete(`/tests/questions/${qid}`).then(() => api.get(`/tests/${selectedTestId}`).then((r) => setTestDetail(r.data))).catch((err) => alert(err.error));
  };

  const removeOption = (oid) => {
    if (!confirm('Удалить вариант?')) return;
    api.delete(`/tests/options/${oid}`).then(() => api.get(`/tests/${selectedTestId}`).then((r) => setTestDetail(r.data))).catch((err) => alert(err.error));
  };

  const removeTest = (tid) => {
    if (!confirm('Удалить тест и все вопросы?')) return;
    api.delete(`/tests/${tid}`).then(() => { setSelectedTestId(null); return api.get(`/tests?moduleId=${moduleId}`); }).then((r) => setTests(r.data || [])).catch((err) => alert(err.error));
  };

  return (
    <>
      <h1 className="page-title">Тестирование</h1>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ maxWidth: 180 }}>
            <label>Группа</label>
            <select value={groupId} onChange={(e) => { setGroupId(e.target.value); setSubjectId(''); setModuleId(''); }}>
              <option value="">— Группа —</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ maxWidth: 200 }}>
            <label>Предмет</label>
            <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setModuleId(''); }} disabled={!groupId}>
              <option value="">— Предмет —</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ maxWidth: 220 }}>
            <label>Модуль</label>
            <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} disabled={!subjectId}>
              <option value="">— Модуль —</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {moduleId && (
        <>
          <form onSubmit={createTest} className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginTop: 0 }}>Добавить тест в модуль</h3>
            <div className="form-group" style={{ maxWidth: 400 }}>
              <label>Название теста</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название" />
            </div>
            <button type="submit" className="btn btn-primary">Создать тест</button>
          </form>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            {loading ? 'Загрузка...' : (
              <>
                <h3 style={{ marginTop: 0 }}>Тесты модуля</h3>
                {tests.length === 0 ? (
                  <p className="empty-state">Нет тестов. Создайте тест выше.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {tests.map((t) => (
                      <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', padding: '0.5rem', background: selectedTestId === t.id ? 'var(--surface-hover)' : 'transparent', borderRadius: 8 }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setSelectedTestId(selectedTestId === t.id ? null : t.id)}>Вопросы</button>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate(`/edit-test/${t.id}`)}>Редактировать</button>
                        <span>{t.title}</span>
                        <button type="button" className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={() => removeTest(t.id)}>Удалить</button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {testDetail && (
            <div className="card">
              <h3>Вопросы теста: {testDetail.title}</h3>
              <form onSubmit={addQuestion} style={{ marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label>Новый вопрос</label>
                  <input value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} placeholder="Текст вопроса" />
                </div>
                <div className="form-group" style={{ maxWidth: 100 }}>
                  <label>Баллы</label>
                  <input type="number" min={1} value={newQuestionPoints} onChange={(e) => setNewQuestionPoints(parseInt(e.target.value, 10) || 1)} />
                </div>
                <button type="submit" className="btn btn-primary">Добавить вопрос</button>
              </form>

              {testDetail.questions?.map((q) => (
                <div key={q.id} className="card" style={{ marginBottom: '1rem', background: 'var(--bg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p><strong>{q.text}</strong> <span className="badge">({q.points} б.)</span></p>
                    <button type="button" className="btn btn-danger" onClick={() => removeQuestion(q.id)}>Удалить</button>
                  </div>
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem' }}>
                    {q.options?.map((opt) => (
                      <li key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {opt.text} {opt.is_correct ? <span className="badge badge-student">✓ верный</span> : ''}
                        <button type="button" className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.85rem' }} onClick={() => removeOption(opt.id)}>✕</button>
                      </li>
                    ))}
                  </ul>
                  <form onSubmit={(e) => addOption(e, q.id)} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '0.5rem' }}>
                    <input
                      placeholder="Вариант ответа"
                      value={newOptionText[q.id] || ''}
                      onChange={(e) => setNewOptionText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      style={{ flex: '1', minWidth: 150, padding: '0.4rem' }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" checked={!!newOptionCorrect[q.id]} onChange={(e) => setNewOptionCorrect((prev) => ({ ...prev, [q.id]: e.target.checked }))} />
                      Верный
                    </label>
                    <button type="submit" className="btn btn-secondary">Добавить вариант</button>
                  </form>
                </div>
              ))}
              {(!testDetail.questions || testDetail.questions.length === 0) && <p className="empty-state">Добавьте вопросы выше.</p>}
            </div>
          )}
        </>
      )}
    </>
  );
}
