import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function SubjectDetail() {
  const { groupId, subjectId } = useParams();
  const [group, setGroup] = useState(null);
  const [subject, setSubject] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');

  const loadGroup = () => api.get('/groups').then((r) => {
    const g = (r.data || []).find((x) => String(x.id) === String(groupId));
    setGroup(g || null);
  });
  const loadSubject = () => api.get(`/subjects?groupId=${groupId}`).then((r) => {
    const s = (r.data || []).find((x) => String(x.id) === String(subjectId));
    setSubject(s || null);
  });
  const loadModules = () => api.get(`/modules?subjectId=${subjectId}`).then((r) => setModules(r.data || []));
  const load = () => {
    setLoading(true);
    Promise.all([loadGroup(), loadSubject(), loadModules()]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [groupId, subjectId]);

  const create = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    api.post('/modules', { subjectId: parseInt(subjectId, 10), name: name.trim() })
      .then(() => { setName(''); loadModules(); })
      .catch((err) => alert(err?.error || 'Ошибка'));
  };

  const remove = (id) => {
    if (!confirm('Удалить модуль?')) return;
    api.delete(`/modules/${id}`).then(() => loadModules()).catch((err) => alert(err?.error || 'Ошибка'));
  };

  if (loading) return <div className="content">Загрузка...</div>;
  if (!group || !subject) return <div className="content"><p className="empty-state">Группа или предмет не найдены.</p><Link to="/groups" className="btn btn-secondary">← К группам</Link></div>;

  return (
    <>
      <nav className="breadcrumb">
        <Link to="/groups">Группы</Link>
        <Link to={`/groups/${groupId}`}>{group.name}</Link>
        <span>{subject.name}</span>
      </nav>
      <h1 className="page-title">Модули: {subject.name}</h1>
      <form onSubmit={create} className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Добавить модуль</h3>
        <div className="form-group" style={{ maxWidth: 300 }}>
          <label>Название модуля</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" />
        </div>
        <button type="submit" className="btn btn-primary">Добавить</button>
      </form>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Название</th>
                <th>Порядок</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  <td>{m.name}</td>
                  <td>{m.order_index ?? 0}</td>
                  <td>
                    <Link to={`/groups/${groupId}/subjects/${subjectId}/modules/${m.id}`} className="btn btn-primary">Открыть</Link>
                    <button type="button" className="btn btn-danger" onClick={() => remove(m.id)}>Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {modules.length === 0 && <p className="empty-state">Нет модулей. Добавьте модуль выше.</p>}
      </div>
    </>
  );
}
