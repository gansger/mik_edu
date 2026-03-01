import React, { useState, useEffect } from 'react';
import { api } from '../../api';

export default function AdminUsers() {
  const [list, setList] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [fullName, setFullName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [addGroupId, setAddGroupId] = useState('');
  const [addSubjectId, setAddSubjectId] = useState('');
  const [subjectsForGroup, setSubjectsForGroup] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editAssignments, setEditAssignments] = useState([]);
  const [editAddGroupId, setEditAddGroupId] = useState('');
  const [editAddSubjectId, setEditAddSubjectId] = useState('');
  const [editSubjectsForGroup, setEditSubjectsForGroup] = useState([]);
  const [editProfileId, setEditProfileId] = useState(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const load = () => api.get('/users').then((r) => setList(r.data || [])).finally(() => setLoading(false));

  useEffect(() => { load(); api.get('/groups').then((r) => setGroups(r.data || [])); }, []);

  useEffect(() => {
    if (!addGroupId) { setSubjectsForGroup([]); setAddSubjectId(''); return; }
    api.get(`/subjects?groupId=${addGroupId}`).then((r) => setSubjectsForGroup(r.data || []));
  }, [addGroupId]);

  useEffect(() => {
    if (!editAddGroupId) { setEditSubjectsForGroup([]); setEditAddSubjectId(''); return; }
    api.get(`/subjects?groupId=${editAddGroupId}`).then((r) => setEditSubjectsForGroup(r.data || []));
  }, [editAddGroupId]);

  const addAssignment = () => {
    if (!addGroupId || !addSubjectId) return;
    const g = groups.find((x) => x.id === parseInt(addGroupId, 10));
    const s = subjectsForGroup.find((x) => x.id === parseInt(addSubjectId, 10));
    if (assignments.some((a) => a.groupId === parseInt(addGroupId, 10) && a.subjectId === parseInt(addSubjectId, 10))) return;
    setAssignments([...assignments, { groupId: parseInt(addGroupId, 10), subjectId: parseInt(addSubjectId, 10), groupName: g?.name, subjectName: s?.name }]);
    setAddGroupId(''); setAddSubjectId('');
  };

  const removeAssignment = (idx) => {
    setAssignments(assignments.filter((_, i) => i !== idx));
  };

  const addEditAssignment = () => {
    if (!editAddGroupId || !editAddSubjectId) return;
    const g = groups.find((x) => x.id === parseInt(editAddGroupId, 10));
    const s = editSubjectsForGroup.find((x) => x.id === parseInt(editAddSubjectId, 10));
    if (editAssignments.some((a) => a.groupId === parseInt(editAddGroupId, 10) && a.subjectId === parseInt(editAddSubjectId, 10))) return;
    setEditAssignments([...editAssignments, { groupId: parseInt(editAddGroupId, 10), subjectId: parseInt(editAddSubjectId, 10), groupName: g?.name, subjectName: s?.name }]);
    setEditAddGroupId(''); setEditAddSubjectId('');
  };

  const removeEditAssignment = (idx) => {
    setEditAssignments(editAssignments.filter((_, i) => i !== idx));
  };

  const startEdit = (u) => {
    if (u.role !== 'teacher') { setEditingId(u.id); setEditAssignments([]); return; }
    api.get(`/users/${u.id}`).then((r) => {
      setEditingId(u.id);
      setEditAssignments(r.data.assignments || []);
    });
  };

  const openEditProfile = (u) => {
    setEditProfileId(u.id);
    setEditFullName(u.fullName || '');
    setEditPassword('');
  };

  const saveEditProfile = (e) => {
    e.preventDefault();
    if (!editProfileId) return;
    const body = { fullName: editFullName.trim() };
    if (editPassword.trim()) body.password = editPassword.trim();
    api.patch(`/users/${editProfileId}`, body)
      .then(() => { setEditProfileId(null); setEditFullName(''); setEditPassword(''); load(); })
      .catch((err) => alert(err?.error || 'Ошибка'));
  };

  const saveEditAssignments = () => {
    if (!editingId) return;
    api.patch(`/users/${editingId}`, { assignments: editAssignments.map((a) => ({ groupId: a.groupId, subjectId: a.subjectId })) })
      .then(() => { setEditingId(null); load(); })
      .catch((err) => alert(err.error || 'Ошибка'));
  };

  const create = (e) => {
    e.preventDefault();
    if (!login.trim() || !password) return;
    if (role === 'student' && !groupId) return alert('Для студента выберите группу');
    api.post('/users', {
      login: login.trim(),
      password,
      role,
      fullName: fullName.trim() || undefined,
      groupId: role === 'student' ? parseInt(groupId, 10) : undefined,
      assignments: role === 'teacher' ? assignments.map((a) => ({ groupId: a.groupId, subjectId: a.subjectId })) : undefined,
    })
      .then(() => { setLogin(''); setPassword(''); setFullName(''); setGroupId(''); setAssignments([]); load(); })
      .catch((err) => alert(err.error || 'Ошибка'));
  };

  const remove = (id) => {
    if (!confirm('Удалить пользователя?')) return;
    api.delete(`/users/${id}`).then(() => load()).catch((err) => alert(err.error || 'Ошибка'));
  };

  const roleLabel = (r) => (r === 'admin' ? 'Админ' : r === 'teacher' ? 'Преподаватель' : 'Студент');

  if (loading) return <div className="content">Загрузка...</div>;

  return (
    <>
      <h1 className="page-title">Пользователи</h1>
      <form onSubmit={create} className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Создать учётную запись</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label>Логин</label>
            <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Логин" required />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" required />
          </div>
          <div className="form-group">
            <label>Роль</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">Администратор</option>
              <option value="teacher">Преподаватель</option>
              <option value="student">Студент</option>
            </select>
          </div>
          <div className="form-group">
            <label>ФИО</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ФИО" />
          </div>
          {role === 'student' && (
            <div className="form-group">
              <label>Группа</label>
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)} required={role === 'student'}>
                <option value="">— Группа —</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
        </div>
        {role === 'teacher' && (
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Назначения (группа + предмет)</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <select value={addGroupId} onChange={(e) => setAddGroupId(e.target.value)} style={{ minWidth: 140 }}>
                <option value="">— Группа —</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select value={addSubjectId} onChange={(e) => setAddSubjectId(e.target.value)} disabled={!addGroupId} style={{ minWidth: 180 }}>
                <option value="">— Предмет —</option>
                {subjectsForGroup.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button type="button" className="btn btn-secondary" onClick={addAssignment}>Добавить</button>
            </div>
            {assignments.length > 0 && (
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem' }}>
                {assignments.map((a, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    {a.groupName || a.groupId} — {a.subjectName || a.subjectId}
                    <button type="button" className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.85rem' }} onClick={() => removeAssignment(i)}>✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <button type="submit" className="btn btn-primary">Создать</button>
      </form>

      {editProfileId && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Редактировать пользователя (ID {editProfileId})</h3>
          <form onSubmit={saveEditProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400 }}>
            <div className="form-group">
              <label>ФИО</label>
              <input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} placeholder="ФИО" />
            </div>
            <div className="form-group">
              <label>Новый пароль (оставьте пустым, чтобы не менять)</label>
              <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Пароль" autoComplete="new-password" />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary">Сохранить</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setEditProfileId(null); setEditFullName(''); setEditPassword(''); }}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      {editingId && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>Назначения преподавателя (ID {editingId})</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
            <select value={editAddGroupId} onChange={(e) => setEditAddGroupId(e.target.value)} style={{ minWidth: 140 }}>
              <option value="">— Группа —</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <select value={editAddSubjectId} onChange={(e) => setEditAddSubjectId(e.target.value)} disabled={!editAddGroupId} style={{ minWidth: 180 }}>
              <option value="">— Предмет —</option>
              {editSubjectsForGroup.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button type="button" className="btn btn-secondary" onClick={addEditAssignment}>Добавить</button>
          </div>
          {editAssignments.length > 0 && (
            <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem' }}>
              {editAssignments.map((a, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {a.groupName || a.groupId} — {a.subjectName || a.subjectId}
                  <button type="button" className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.85rem' }} onClick={() => removeEditAssignment(i)}>✕</button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn btn-primary" onClick={saveEditAssignments}>Сохранить назначения</button>
          <button type="button" className="btn btn-secondary" style={{ marginLeft: '0.5rem' }} onClick={() => setEditingId(null)}>Закрыть</button>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Логин</th>
                <th>Роль</th>
                <th>ФИО</th>
                <th>Группа / назначения</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.login}</td>
                  <td><span className={`badge badge-${u.role}`}>{roleLabel(u.role)}</span></td>
                  <td>{u.fullName || '—'}</td>
                  <td>
                    {u.role === 'student' && (u.groupName || '—')}
                    {u.role === 'teacher' && (u.assignments?.length ? `${u.assignments.length} назнач.` : '—')}
                    {u.role === 'admin' && '—'}
                  </td>
                  <td>
                    <button type="button" className="btn btn-secondary" style={{ marginRight: '0.25rem' }} onClick={() => openEditProfile(u)}>ФИО / пароль</button>
                    {u.role === 'teacher' && <button type="button" className="btn btn-secondary" style={{ marginRight: '0.25rem' }} onClick={() => startEdit(u)}>Назначения</button>}
                    <button type="button" className="btn btn-danger" onClick={() => remove(u.id)}>Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length === 0 && <p className="empty-state">Нет пользователей.</p>}
      </div>
    </>
  );
}
