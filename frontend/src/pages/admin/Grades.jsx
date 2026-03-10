import React, { useState, useEffect } from 'react';
import { api } from '../../api';

export default function AdminGrades() {
  const [groups, setGroups] = useState([]);
  const [list, setList] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/groups').then((r) => setGroups(r.data || [])); }, []);

  useEffect(() => {
    if (!groupId && !userId) { setList([]); return; }
    setLoading(true);
    const params = new URLSearchParams();
    if (groupId) params.set('groupId', groupId);
    if (userId) params.set('userId', userId);
    api.get(`/grades?${params}`).then((r) => setList(r.data || [])).catch(() => setList([])).finally(() => setLoading(false));
  }, [groupId, userId]);

  return (
    <>
      <h1 className="page-title">Успеваемость (все)</h1>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ maxWidth: 200 }}>
            <label>Группа</label>
            <select value={groupId} onChange={(e) => { setGroupId(e.target.value); setUserId(''); }}>
              <option value="">— Все группы —</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ maxWidth: 200 }}>
            <label>ID пользователя (опционально)</label>
            <input type="number" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="ID" />
          </div>
        </div>
      </div>
      <div className="card">
        {loading ? 'Загрузка...' : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Студент</th>
                    <th>Логин</th>
                    <th>Лекция / тест</th>
                    <th>Оценка</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr key={row.id}>
                      <td>{row.full_name || '—'}</td>
                      <td>{row.login}</td>
                      <td>{row.lecture_title || row.test_title || '—'}</td>
                      <td>{row.score != null ? row.score : '—'}</td>
                      <td>{row.completed_at ? new Date(row.completed_at).toLocaleDateString('ru') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {list.length === 0 && <p className="empty-state">Нет записей. Оценки выставляются автоматически по результатам тестов (шкала 2–5).</p>}
          </>
        )}
      </div>
    </>
  );
}
