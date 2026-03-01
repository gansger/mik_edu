import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Materials() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const groupId = searchParams.get('groupId');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [assignments, setAssignments] = useState([]); // для преподавателя
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    if (isAdmin) api.get('/groups').then((r) => setGroups(r.data || [])).catch(() => {});
    if (isTeacher) api.get('/materials/my-assignments').then((r) => setAssignments(r.data || [])).catch(() => setAssignments([]));
  }, [isAdmin, isTeacher]);

  useEffect(() => {
    let gid = groupId;
    if (!isAdmin && !isTeacher) gid = user?.groupId;
    if (!gid && (isAdmin || isTeacher)) {
      setLoading(false);
      return;
    }
    if (!gid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = (isAdmin || isTeacher) && gid ? `?groupId=${gid}` : '';
    api.get(`/materials/tree${params}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [user?.groupId, groupId, isAdmin, isTeacher]);

  if (loading) return <div className="content">Загрузка...</div>;
  if (isTeacher && !groupId && assignments.length > 0) {
    return (
      <>
        <h1 className="page-title">Материалы</h1>
        <div className="form-group" style={{ maxWidth: 400 }}>
          <label>Группа и предмет</label>
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) setSearchParams({ groupId: v });
            }}
          >
            <option value="">— Выберите группу и предмет —</option>
            {assignments.map((a) => (
              <option key={`${a.groupId}-${a.subjectId}`} value={a.groupId}>
                {a.groupName} — {a.subjectName}
              </option>
            ))}
          </select>
        </div>
        {groupId && <MaterialsTree groupId={groupId} canAdd={isTeacher} />}
      </>
    );
  }
  if (isTeacher && !groupId) {
    return (
      <>
        <h1 className="page-title">Материалы</h1>
        <p className="empty-state">Вам пока не назначены группы и предметы. Обратитесь к администратору.</p>
      </>
    );
  }
  if (isAdmin && !groupId && groups.length > 0) {
    return (
      <>
        <h1 className="page-title">Материалы группы</h1>
        <div className="form-group" style={{ maxWidth: 300 }}>
          <label>Выберите группу</label>
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) setSearchParams({ groupId: v });
            }}
          >
            <option value="">— Группа —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        {groupId && <MaterialsTree groupId={groupId} canAdd={isAdmin} />}
      </>
    );
  }
  if (isAdmin && !groupId) {
    return (
      <>
        <h1 className="page-title">Материалы</h1>
        <p className="empty-state">Выберите группу выше или добавьте группы в разделе «Группы».</p>
      </>
    );
  }
  if (!data && !groupId) return <p className="empty-state">Нет данных. У вас не назначена группа.</p>;

  return (
    <>
      <h1 className="page-title">Материалы {data?.group?.name ? `— ${data.group.name}` : ''}</h1>
      {isAdmin && groups.length > 0 && (
        <div className="form-group" style={{ maxWidth: 300, marginBottom: '1rem' }}>
          <label>Группа</label>
          <select
            value={data?.group?.id ?? ''}
            onChange={(e) => setSearchParams(e.target.value ? { groupId: e.target.value } : {})}
          >
            <option value="">— Выберите группу —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}
      {isTeacher && assignments.length > 0 && (
        <div className="form-group" style={{ maxWidth: 400, marginBottom: '1rem' }}>
          <label>Группа и предмет</label>
          <select
            value={data?.group?.id ?? ''}
            onChange={(e) => setSearchParams(e.target.value ? { groupId: e.target.value } : {})}
          >
            <option value="">— Выберите —</option>
            {assignments.map((a) => (
              <option key={`${a.groupId}-${a.subjectId}`} value={a.groupId}>{a.groupName} — {a.subjectName}</option>
            ))}
          </select>
        </div>
      )}
      <MaterialsTree data={data} canAdd={isAdmin || isTeacher} />
    </>
  );
}

function MaterialsTree({ data, groupId, canAdd }) {
  const [localData, setLocalData] = useState(data);
  const [addTestModuleId, setAddTestModuleId] = useState(null);
  const [addTestTitle, setAddTestTitle] = useState('');
  const [addLectureModuleId, setAddLectureModuleId] = useState(null);
  const [addLectureTitle, setAddLectureTitle] = useState('');
  const [addLectureFile, setAddLectureFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (groupId && !data) {
      api.get(`/materials/tree?groupId=${groupId}`)
        .then((r) => setLocalData(r.data))
        .catch(() => setLocalData(null));
    } else {
      setLocalData(data);
    }
  }, [data, groupId]);

  const createTest = async (e, moduleId) => {
    e.preventDefault();
    if (!addTestTitle.trim() || !moduleId) return;
    setSubmitting(true);
    try {
      const { data: created } = await api.post('/tests', { moduleId, title: addTestTitle.trim(), createTenQuestions: true });
      setAddTestModuleId(null);
      setAddTestTitle('');
      if (created?.id) navigate(`/edit-test/${created.id}`);
      if (groupId && !data) api.get(`/materials/tree?groupId=${groupId}`).then((r) => setLocalData(r.data));
      else if (data) api.get(`/materials/tree?groupId=${data.group?.id}`).then((r) => setLocalData(r.data));
    } catch (err) {
      const msg = err?.error || err?.message || 'Не удалось создать тест. Проверьте доступ к модулю.';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const createLecture = async (e, moduleId) => {
    e.preventDefault();
    if (!addLectureTitle.trim() || !addLectureFile || !moduleId) return;
    setSubmitting(true);
    const form = new FormData();
    form.append('moduleId', moduleId);
    form.append('title', addLectureTitle.trim());
    form.append('file', addLectureFile);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch('/api/lectures', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
      const json = await r.json();
      if (json.error) throw new Error(json.error);
      setAddLectureModuleId(null);
      setAddLectureTitle('');
      setAddLectureFile(null);
      if (groupId && !data) api.get(`/materials/tree?groupId=${groupId}`).then((res) => setLocalData(res.data));
      else if (data) api.get(`/materials/tree?groupId=${data.group?.id}`).then((res) => setLocalData(res.data));
    } catch (err) {
      alert(err.message || err.error || 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  if (!localData?.subjects?.length) {
    return <p className="empty-state">Нет предметов и лекций.</p>;
  }

  return (
    <div className="materials-tree">
      {localData.subjects.map((sub) => (
        <div key={sub.id} className="card">
          <h3 style={{ marginTop: 0 }}>{sub.name}</h3>
          {sub.modules.map((mod) => (
            <div key={mod.id} className="module-block">
              <h4 className="module-title">Модуль: {mod.name}</h4>
              <ul className="lecture-list">
                {mod.lectures.map((lec) => (
                  <li key={`l-${lec.id}`}>
                    <Link to={`/lecture/${lec.id}`}>
                      {lec.title}
                      {lec.fileType && <span className="file-type-badge">{lec.fileType}</span>}
                    </Link>
                  </li>
                ))}
                {(mod.tests || []).map((t) => (
                  <li key={`t-${t.id}`}>
                    <Link to={`/test/${t.id}`} className="test-link">
                      📝 {t.title} <span className="file-type-badge">тест</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {canAdd && (
                <div className="module-add-actions">
                  {addTestModuleId === mod.id ? (
                    <form onSubmit={(e) => createTest(e, mod.id)} className="add-inline-form">
                      <input value={addTestTitle} onChange={(e) => setAddTestTitle(e.target.value)} placeholder="Название теста" required />
                      <button type="submit" className="btn btn-primary" disabled={submitting}>Создать (10 вопросов)</button>
                      <button type="button" className="btn btn-secondary" onClick={() => { setAddTestModuleId(null); setAddTestTitle(''); }}>Отмена</button>
                    </form>
                  ) : (
                    <button type="button" className="btn btn-secondary add-btn" onClick={() => setAddTestModuleId(mod.id)}>+ Добавить тест</button>
                  )}
                  {addLectureModuleId === mod.id ? (
                    <form onSubmit={(e) => createLecture(e, mod.id)} className="add-inline-form">
                      <input value={addLectureTitle} onChange={(e) => setAddLectureTitle(e.target.value)} placeholder="Название лекции" required />
                      <input type="file" accept=".pdf,.docx,.doc,.md,.txt" onChange={(e) => setAddLectureFile(e.target.files?.[0])} required />
                      <button type="submit" className="btn btn-primary" disabled={submitting}>Загрузить</button>
                      <button type="button" className="btn btn-secondary" onClick={() => { setAddLectureModuleId(null); setAddLectureTitle(''); setAddLectureFile(null); }}>Отмена</button>
                    </form>
                  ) : (
                    <button type="button" className="btn btn-secondary add-btn" onClick={() => setAddLectureModuleId(mod.id)}>+ Добавить лекцию</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
