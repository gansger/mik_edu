import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function GroupsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const load = () => api.get('/groups').then((r) => setList(r.data || [])).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const create = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    api.post('/groups', { name: name.trim() })
      .then(() => { setName(''); load(); })
      .catch((err) => alert(err?.error || 'Ошибка'));
  };

  const update = (id) => {
    if (!editName.trim()) return;
    api.patch(`/groups/${id}`, { name: editName.trim() })
      .then(() => { setEditingId(null); load(); })
      .catch((err) => alert(err?.error || 'Ошибка'));
  };

  const remove = (id) => {
    if (!confirm('Удалить группу?')) return;
    api.delete(`/groups/${id}`).then(() => load()).catch((err) => alert(err?.error || 'Ошибка'));
  };

  if (loading) return <div className="content">Загрузка...</div>;

  return (
    <>
      <h1 className="page-title">Группы</h1>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <Link to="/journal" className="btn btn-secondary">Журнал успеваемости</Link>
      </div>
      {isAdmin && (
        <form onSubmit={create} className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Добавить группу</h3>
          <div className="form-group" style={{ maxWidth: 300 }}>
            <label>Название</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: ИС-21" />
          </div>
          <button type="submit" className="btn btn-primary">Добавить</button>
        </form>
      )}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Название</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((g) => (
                <tr key={g.id}>
                  <td>{g.id}</td>
                  <td>
                    {editingId === g.id ? (
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="inline-edit" />
                    ) : (
                      g.name
                    )}
                  </td>
                  <td>
                    {editingId === g.id ? (
                      <>
                        <button type="button" className="btn btn-primary" onClick={() => update(g.id)}>Сохранить</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>Отмена</button>
                      </>
                    ) : (
                      <>
                        <Link to={`/groups/${g.id}`} className="btn btn-primary">Открыть</Link>
                        {isAdmin && (
                          <>
                            <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(g.id); setEditName(g.name); }}>Изменить</button>
                            <button type="button" className="btn btn-danger" onClick={() => remove(g.id)}>Удалить</button>
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length === 0 && <p className="empty-state">Нет групп. Добавьте группу выше.</p>}
      </div>
    </>
  );
}
