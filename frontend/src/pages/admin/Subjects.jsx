import React, { useState, useEffect } from 'react';
import { api } from '../../api';

export default function AdminSubjects() {
  const [groups, setGroups] = useState([]);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupId, setGroupId] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    api.get('/groups').then((r) => setGroups(r.data || []));
  }, []);

  useEffect(() => {
    if (!groupId) { setList([]); setLoading(false); return; }
    setLoading(true);
    api.get(`/subjects?groupId=${groupId}`).then((r) => setList(r.data || [])).finally(() => setLoading(false));
  }, [groupId]);

  const create = (e) => {
    e.preventDefault();
    if (!groupId || !name.trim()) return;
    api.post('/subjects', { groupId: parseInt(groupId, 10), name: name.trim() })
      .then(() => { setName(''); api.get(`/subjects?groupId=${groupId}`).then((r) => setList(r.data || [])); })
      .catch((err) => alert(err.error || 'Ошибка'));
  };

  const remove = (id) => {
    if (!confirm('Удалить предмет?')) return;
    api.delete(`/subjects/${id}`).then(() => api.get(`/subjects?groupId=${groupId}`).then((r) => setList(r.data || []))).catch((err) => alert(err.error));
  };

  return (
    <>
      <h1 className="page-title">Предметы</h1>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="form-group" style={{ maxWidth: 300 }}>
          <label>Группа</label>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">— Выберите группу —</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>
      {groupId && (
        <>
          <form onSubmit={create} className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginTop: 0 }}>Добавить предмет</h3>
            <div className="form-group" style={{ maxWidth: 300 }}>
              <label>Название</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название предмета" />
            </div>
            <button type="submit" className="btn btn-primary">Добавить</button>
          </form>
          <div className="card">
            {loading ? 'Загрузка...' : (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>ID</th><th>Название</th><th></th></tr>
                    </thead>
                    <tbody>
                      {list.map((s) => (
                        <tr key={s.id}>
                          <td>{s.id}</td>
                          <td>{s.name}</td>
                          <td><button type="button" className="btn btn-danger" onClick={() => remove(s.id)}>Удалить</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {list.length === 0 && <p className="empty-state">Нет предметов в этой группе.</p>}
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
