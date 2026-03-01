import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function GroupDetail() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const loadGroup = () =>
    api.get('/groups').then((r) => {
      const g = (r.data || []).find((x) => String(x.id) === String(groupId));
      setGroup(g || null);
    });
  const loadSubjects = () => api.get(`/subjects?groupId=${groupId}`).then((r) => setSubjects(r.data || []));
  const load = () => {
    setLoading(true);
    Promise.all([loadGroup(), loadSubjects()]).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [groupId]);

  const create = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    api
      .post('/subjects', { groupId: parseInt(groupId, 10), name: name.trim() })
      .then(() => {
        setName('');
        loadSubjects();
      })
      .catch((err) => alert(err?.error || 'Ошибка'));
  };

  const update = (id) => {
    if (!editName.trim()) return;
    api
      .patch(`/subjects/${id}`, { name: editName.trim() })
      .then(() => {
        setEditingId(null);
        loadSubjects();
      })
      .catch((err) => alert(err?.error || 'Ошибка'));
  };

  const remove = (id) => {
    if (!confirm('Удалить предмет?')) return;
    api.delete(`/subjects/${id}`).then(() => loadSubjects()).catch((err) => alert(err?.error || 'Ошибка'));
  };

  if (loading) return <div className="content">Загрузка...</div>;
  if (!group)
    return (
      <div className="content">
        <p className="empty-state">Группа не найдена.</p>
        <Link to="/groups" className="btn btn-secondary">
          К группам
        </Link>
      </div>
    );

  return (
    <>
      <nav className="breadcrumb">
        <Link to="/groups">Группы</Link>
        <span>{group.name}</span>
      </nav>
      <h1 className="page-title">Предметы: {group.name}</h1>
      {isAdmin && (
        <form onSubmit={create} className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Добавить предмет</h3>
          <div className="form-group" style={{ maxWidth: 300 }}>
            <label>Название</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название предмета" />
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
              {subjects.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>
                    {editingId === s.id ? (
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="inline-edit" />
                    ) : (
                      s.name
                    )}
                  </td>
                  <td>
                    {editingId === s.id ? (
                      <>
                        <button type="button" className="btn btn-primary" onClick={() => update(s.id)}>Сохранить</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>Отмена</button>
                      </>
                    ) : (
                      <>
                        <Link to={`/groups/${groupId}/subjects/${s.id}`} className="btn btn-primary">Открыть</Link>
                        <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(s.id); setEditName(s.name); }}>Изменить</button>
                        {isAdmin && <button type="button" className="btn btn-danger" onClick={() => remove(s.id)}>Удалить</button>}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {subjects.length === 0 && <p className="empty-state">Нет предметов. Добавьте предмет выше.</p>}
      </div>
    </>
  );
}
