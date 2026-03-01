import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, lectureFileUrl } from '../api';

export default function ModuleDetail() {
  const { groupId, subjectId, moduleId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [subject, setSubject] = useState(null);
  const [module, setModule] = useState(null);
  const [tests, setTests] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testTitle, setTestTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureFile, setLectureFile] = useState(null);
  const [lectureSubmitting, setLectureSubmitting] = useState(false);

  const loadGroup = () => api.get('/groups').then((r) => {
    const g = (r.data || []).find((x) => String(x.id) === String(groupId));
    setGroup(g || null);
  });
  const loadSubject = () => api.get(`/subjects?groupId=${groupId}`).then((r) => {
    const s = (r.data || []).find((x) => String(x.id) === String(subjectId));
    setSubject(s || null);
  });
  const loadModule = () => api.get(`/modules?subjectId=${subjectId}`).then((r) => {
    const m = (r.data || []).find((x) => String(x.id) === String(moduleId));
    setModule(m || null);
  });
  const loadTests = () => api.get(`/tests?moduleId=${moduleId}`).then((r) => setTests(r.data || []));
  const loadLectures = () => api.get(`/lectures?moduleId=${moduleId}`).then((r) => setLectures(r.data || []));
  const load = () => {
    setLoading(true);
    Promise.all([loadGroup(), loadSubject(), loadModule(), loadTests(), loadLectures()]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [groupId, subjectId, moduleId]);

  const createTest = (e) => {
    e.preventDefault();
    if (!testTitle.trim()) return;
    setSubmitting(true);
    api.post('/tests', { moduleId: parseInt(moduleId, 10), title: testTitle.trim(), createTenQuestions: true })
      .then((r) => {
        setTestTitle('');
        const id = r.data?.id;
        if (id) navigate(`/edit-test/${id}`);
        return loadTests();
      })
      .catch((err) => alert(err?.error || err?.message || 'Ошибка создания теста'))
      .finally(() => setSubmitting(false));
  };

  const removeTest = (id) => {
    if (!confirm('Удалить тест и все вопросы?')) return;
    api.delete(`/tests/${id}`).then(() => loadTests()).catch((err) => alert(err?.error || 'Ошибка'));
  };

  const addLecture = (e) => {
    e.preventDefault();
    if (!lectureTitle.trim() || !lectureFile) {
      alert('Укажите название и выберите файл');
      return;
    }
    setLectureSubmitting(true);
    const form = new FormData();
    form.append('moduleId', moduleId);
    form.append('title', lectureTitle.trim());
    form.append('file', lectureFile);
    api.post('/lectures', form, true)
      .then(() => {
        setLectureTitle('');
        setLectureFile(null);
        loadLectures();
      })
      .catch((err) => alert(err?.error || err?.message || 'Ошибка загрузки'))
      .finally(() => setLectureSubmitting(false));
  };

  const removeLecture = (id) => {
    if (!confirm('Удалить лекцию?')) return;
    api.delete(`/lectures/${id}`).then(() => loadLectures()).catch((err) => alert(err?.error || 'Ошибка'));
  };

  if (loading) return <div className="content">Загрузка...</div>;
  if (!group || !subject || !module) return <div className="content"><p className="empty-state">Группа, предмет или модуль не найдены.</p><Link to="/groups" className="btn btn-secondary">← К группам</Link></div>;

  return (
    <>
      <nav className="breadcrumb">
        <Link to="/groups">Группы</Link>
        <Link to={`/groups/${groupId}`}>{group.name}</Link>
        <Link to={`/groups/${groupId}/subjects/${subjectId}`}>{subject.name}</Link>
        <span>{module.name}</span>
      </nav>
      <h1 className="page-title">Модуль: {module.name}</h1>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Лекции (файлы TXT, DOCX, PPTX, PDF и др.)</h3>
        <form onSubmit={addLecture} className="add-inline-form" style={{ marginBottom: '1rem' }}>
          <input value={lectureTitle} onChange={(e) => setLectureTitle(e.target.value)} placeholder="Название лекции" required style={{ minWidth: 180 }} />
          <input type="file" accept=".pdf,.doc,.docx,.txt,.md,.ppt,.pptx,.xls,.xlsx" onChange={(e) => setLectureFile(e.target.files?.[0] || null)} />
          <button type="submit" className="btn btn-primary" disabled={lectureSubmitting}>{lectureSubmitting ? 'Загрузка...' : 'Добавить лекцию'}</button>
        </form>
        {lectures.length === 0 ? (
          <p className="empty-state" style={{ padding: '0.5rem 0' }}>Нет лекций. Загрузите файл выше.</p>
        ) : (
          <ul className="module-test-list">
            {lectures.map((lec) => (
              <li key={lec.id}>
                <span>
                  <a href={lectureFileUrl(lec.id)} target="_blank" rel="noopener noreferrer">{lec.title}</a>
                  {lec.file_type && <span className="file-type-badge">{lec.file_type}</span>}
                </span>
                <span style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-danger" onClick={() => removeLecture(lec.id)}>Удалить</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={createTest} className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Создать тестирование</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Будет создан тест с 10 вопросами (их можно отредактировать после создания).</p>
        <div className="form-group" style={{ maxWidth: 400 }}>
          <label>Название теста</label>
          <input value={testTitle} onChange={(e) => setTestTitle(e.target.value)} placeholder="Название теста" required />
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Создание...' : 'Создать тест (10 вопросов)'}</button>
      </form>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Тесты модуля</h3>
        {tests.length === 0 ? (
          <p className="empty-state">Нет тестов. Создайте тестирование выше.</p>
        ) : (
          <ul className="module-test-list">
            {tests.map((t) => (
              <li key={t.id}>
                <span>{t.title}</span>
                <span style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link to={`/edit-test/${t.id}`} className="btn btn-secondary">Редактировать</Link>
                  <button type="button" className="btn btn-danger" onClick={() => removeTest(t.id)}>Удалить</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
