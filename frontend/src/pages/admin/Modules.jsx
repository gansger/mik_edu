import React, { useState, useEffect } from 'react';
import { api } from '../../api';

export default function AdminModules() {
  const [groups, setGroups] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [list, setList] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');

  useEffect(() => { api.get('/groups').then((r) => setGroups(r.data || [])); }, []);

  useEffect(() => {
    if (!groupId) { setSubjects([]); setSubjectId(''); return; }
    api.get(`/subjects?groupId=${groupId}`).then((r) => setSubjects(r.data || []));
  }, [groupId]);

  useEffect(() => {
    if (!subjectId) { setList([]); setLoading(false); return; }
    setLoading(true);
    api.get(`/modules?subjectId=${subjectId}`).then((r) => setList(r.data || [])).finally(() => setLoading(false));
  }, [subjectId]);

  const create = (e) => {
    e.preventDefault();
    if (!subjectId || !name.trim()) return;
    api.post('/modules', { subjectId: parseInt(subjectId, 10), name: name.trim() })
      .then(() => { setName(''); api.get(`/modules?subjectId=${subjectId}`).then((r) => setList(r.data || [])); })
      .catch((err) => alert(err.error || 'Ошибка'));
  };

  const remove = (id) => {
    if (!confirm('Удалить модуль?')) return;
    api.delete(`/modules/${id}`).then(() => api.get(`/modules?subjectId=${subjectId}`).then((r) => setList(r.data || []))).catch((err) => alert(err.error));
  };

  return (
    <>
      <h1 className="page-title">Модули</h1>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ maxWidth: 200 }}>
            <label>Группа</label>
            <select value={groupId} onChange={(e) => { setGroupId(e.target.value); setSubjectId(''); }}>
              <option value="">— Группа —</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ maxWidth: 250 }}>
            <label>Предмет</label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!groupId}>
              <option value="">— Предмет —</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>
      {subjectId && (
        <>
          <form onSubmit={create} className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginTop: 0 }}>Добавить модуль</h3>
            <div className="form-group" style={{ maxWidth: 300 }}>
              <label>Название модуля</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" />
            </div>
            <button type="submit" className="btn btn-primary">Добавить</button>
          </form>
          <div className="card">
            {loading ? 'Загрузка...' : (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>ID</th><th>Название</th><th>Порядок</th><th></th></tr>
                    </thead>
                    <tbody>
                      {list.map((m) => (
                        <tr key={m.id}>
                          <td>{m.id}</td>
                          <td>{m.name}</td>
                          <td>{m.order_index}</td>
                          <td><button type="button" className="btn btn-danger" onClick={() => remove(m.id)}>Удалить</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {list.length === 0 && <p className="empty-state">Нет модулей. Добавьте модуль выше.</p>}
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
