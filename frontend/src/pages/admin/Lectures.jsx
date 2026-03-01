import React, { useState, useEffect } from 'react';
import { api } from '../../api';

export default function AdminLectures() {
  const [groups, setGroups] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [list, setList] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

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
    if (!moduleId) { setList([]); setLoading(false); return; }
    setLoading(true);
    api.get(`/lectures?moduleId=${moduleId}`).then((r) => setList(r.data || [])).finally(() => setLoading(false));
  }, [moduleId]);

  const create = (e) => {
    e.preventDefault();
    if (!moduleId || !title.trim() || !file) return;
    setUploading(true);
    const form = new FormData();
    form.append('moduleId', moduleId);
    form.append('title', title.trim());
    form.append('file', file);
    const token = localStorage.getItem('token');
    fetch('/api/lectures', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTitle('');
        setFile(null);
        document.getElementById('lecture-file').value = '';
        return api.get(`/lectures?moduleId=${moduleId}`);
      })
      .then((r) => setList(r.data || []))
      .catch((err) => alert(err.message || err.error || 'Ошибка загрузки'))
      .finally(() => setUploading(false));
  };

  const remove = (id) => {
    if (!confirm('Удалить лекцию?')) return;
    api.delete(`/lectures/${id}`).then(() => api.get(`/lectures?moduleId=${moduleId}`).then((r) => setList(r.data || []))).catch((err) => alert(err.error));
  };

  return (
    <>
      <h1 className="page-title">Лекции</h1>
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
          <form onSubmit={create} className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginTop: 0 }}>Добавить лекцию (PDF / DOCX / MD)</h3>
            <div className="form-group" style={{ maxWidth: 400 }}>
              <label>Название</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название лекции" />
            </div>
            <div className="form-group" style={{ maxWidth: 400 }}>
              <label>Файл</label>
              <input id="lecture-file" type="file" accept=".pdf,.docx,.doc,.md,.txt" onChange={(e) => setFile(e.target.files?.[0])} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={uploading}>{uploading ? 'Загрузка...' : 'Загрузить'}</button>
          </form>
          <div className="card">
            {loading ? 'Загрузка...' : (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>ID</th><th>Название</th><th>Тип</th><th></th></tr>
                    </thead>
                    <tbody>
                      {list.map((l) => (
                        <tr key={l.id}>
                          <td>{l.id}</td>
                          <td>{l.title}</td>
                          <td>{l.file_type}</td>
                          <td><button type="button" className="btn btn-danger" onClick={() => remove(l.id)}>Удалить</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {list.length === 0 && <p className="empty-state">Нет лекций в этом модуле.</p>}
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
