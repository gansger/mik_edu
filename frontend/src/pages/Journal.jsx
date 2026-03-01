import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Journal() {
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [structure, setStructure] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/groups').then((r) => setGroups(r.data || []));
  }, []);

  useEffect(() => {
    if (!groupId) {
      setStructure(null);
      return;
    }
    setLoading(true);
    api
      .get(`/grades/journal-structure?groupId=${groupId}`)
      .then((r) => setStructure(r.data))
      .catch(() => setStructure(null))
      .finally(() => setLoading(false));
  }, [groupId]);

  const columnsBySubject = structure?.columns?.reduce((acc, col) => {
    const key = col.subjectId;
    if (!acc[key]) acc[key] = { name: col.subjectName, modules: [] };
    acc[key].modules.push(col);
    return acc;
  }, {}) || {};
  const subjectList = Object.values(columnsBySubject);

  return (
    <>
      <h1 className="page-title">Журнал успеваемости</h1>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="form-group" style={{ maxWidth: 280 }}>
          <label>Группа</label>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">— Выберите группу —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="card">
        {loading ? (
          'Загрузка...'
        ) : !groupId ? (
          <p className="empty-state">Выберите группу.</p>
        ) : !structure?.students?.length ? (
          <p className="empty-state">В этой группе нет студентов.</p>
        ) : !structure?.columns?.length ? (
          <p className="empty-state">Нет предметов и модулей с тестами.</p>
        ) : (
          <div className="table-wrap journal-table-wrap">
            <table className="journal-table">
              <thead>
                <tr>
                  <th rowSpan="2" className="journal-col-student">Студент</th>
                  {subjectList.map((sub) => (
                    <th key={sub.name} colSpan={sub.modules.length} className="journal-subject">
                      {sub.name}
                    </th>
                  ))}
                </tr>
                <tr>
                  {subjectList.map((sub) =>
                    sub.modules.map((col) => (
                      <th key={`${col.moduleId}-${col.testId}`} className="journal-module">
                        М{col.moduleNum}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {structure.students.map((stu) => (
                  <tr key={stu.id}>
                    <td className="journal-col-student">
                      <span className="journal-student-name">{stu.fullName || stu.login}</span>
                      <span className="journal-student-login">{stu.login}</span>
                    </td>
                    {subjectList.map((sub) =>
                      sub.modules.map((col) => {
                        const key = `${stu.id}-${col.testId}`;
                        const score = col.testId ? structure.gradeMap[key] : null;
                        return (
                          <td key={`${stu.id}-${col.moduleId}`} className="journal-cell">
                            {score != null ? score : '—'}
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
