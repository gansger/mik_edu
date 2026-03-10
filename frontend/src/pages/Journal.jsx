import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Journal() {
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [structure, setStructure] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get('/groups').then((r) => setGroups(r.data || []));
  }, []);

  useEffect(() => {
    if (!groupId) {
      setStructure(null);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ groupId });
    if (subjectId) params.set('subjectId', subjectId);
    api
      .get(`/grades/journal-structure?${params}`)
      .then((r) => setStructure(r.data))
      .catch(() => setStructure(null))
      .finally(() => setLoading(false));
  }, [groupId, subjectId]);

  const handleExportXlsx = () => {
    if (!groupId) return;
    setExporting(true);
    const params = new URLSearchParams({ groupId });
    if (subjectId) params.set('subjectId', subjectId);
    const token = localStorage.getItem('token');
    fetch(`/api/grades/export?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Ошибка выгрузки');
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = subjectId ? `journal-${groupId}-${subjectId}.xlsx` : `journal-${groupId}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => alert('Не удалось выгрузить файл'))
      .finally(() => setExporting(false));
  };

  const columnsBySubject = structure?.columns?.reduce((acc, col) => {
    const key = col.subjectId;
    if (!acc[key]) acc[key] = { name: col.subjectName, modules: [] };
    acc[key].modules.push(col);
    return acc;
  }, {}) || {};
  const subjectList = Object.values(columnsBySubject);
  const subjects = structure?.subjects || [];

  const avg = (scores) => {
    const nums = scores.filter((n) => n != null && !Number.isNaN(Number(n)));
    if (!nums.length) return null;
    return (nums.reduce((a, b) => a + Number(b), 0) / nums.length).toFixed(1);
  };
  const subjectAvgs = structure?.students && structure?.gradeMap ? subjectList.map((sub) => {
    const scores = [];
    structure.students.forEach((stu) => {
      sub.modules.forEach((col) => {
        const v = col.testId ? structure.gradeMap[`${stu.id}-${col.testId}`] : null;
        if (v != null && !Number.isNaN(Number(v))) scores.push(Number(v));
      });
    });
    return avg(scores);
  }) : [];
  const overallAvg = subjectAvgs.length ? avg(subjectAvgs) : null;
  const showAvgPerSubjectOnly = !subjectId && subjectList.length > 0;

  return (
    <>
      <h1 className="page-title">Журнал успеваемости</h1>
      <p className="text-muted" style={{ marginBottom: '1rem' }}>
        Оценки выставляются автоматически по тестам: 0–39,9% → 2, 40–59,9% → 3, 60–79,9% → 4, 80–100% → 5.
      </p>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="journal-filters">
          <div className="form-group" style={{ maxWidth: 280 }}>
            <label>Группа</label>
            <select value={groupId} onChange={(e) => { setGroupId(e.target.value); setSubjectId(''); }}>
              <option value="">— Выберите группу —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          {groupId && subjects.length > 0 && (
            <div className="form-group" style={{ maxWidth: 280 }}>
              <label>Предмет</label>
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">— Все предметы —</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          {groupId && (
            <div className="form-group" style={{ alignSelf: 'flex-end' }}>
              <button type="button" className="btn btn-primary" onClick={handleExportXlsx} disabled={exporting}>
                {exporting ? 'Выгрузка...' : 'Выгрузить в XLSX'}
              </button>
            </div>
          )}
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
        ) : showAvgPerSubjectOnly ? (
          <div className="table-wrap journal-table-wrap">
            <table className="journal-table">
              <thead>
                <tr>
                  <th className="journal-col-student">Студент</th>
                  {subjectList.map((sub) => (
                    <th key={sub.modules[0]?.subjectId} className="journal-subject journal-avg-col">
                      {sub.name}
                    </th>
                  ))}
                  <th className="journal-avg-col">Средний балл</th>
                </tr>
              </thead>
              <tbody>
                {structure.students.map((stu) => {
                  const perSubjectScores = subjectList.map((sub) => {
                    const scores = sub.modules
                      .map((col) => (col.testId ? structure.gradeMap[`${stu.id}-${col.testId}`] : null))
                      .filter((n) => n != null && !Number.isNaN(Number(n)));
                    return scores.length ? (scores.reduce((a, b) => a + Number(b), 0) / scores.length).toFixed(1) : null;
                  });
                  const rowScores = subjectList.flatMap((sub) =>
                    sub.modules.map((col) => (col.testId ? structure.gradeMap[`${stu.id}-${col.testId}`] : null))
                  );
                  const rowAvg = avg(rowScores);
                  return (
                    <tr key={stu.id}>
                      <td className="journal-col-student">
                        <span className="journal-student-name">{stu.fullName || stu.login}</span>
                        <span className="journal-student-login">{stu.login}</span>
                      </td>
                      {perSubjectScores.map((val, idx) => (
                        <td key={subjectList[idx].modules[0]?.subjectId} className="journal-cell journal-avg-cell">
                          {val ?? '—'}
                        </td>
                      ))}
                      <td className="journal-cell journal-avg-cell">{rowAvg != null ? rowAvg : '—'}</td>
                    </tr>
                  );
                })}
                <tr className="journal-avg-row">
                  <td className="journal-col-student text-muted">Средний по предмету</td>
                  {subjectAvgs.map((val, idx) => (
                    <td key={subjectList[idx]?.modules[0]?.subjectId} className="journal-cell journal-avg-cell">
                      {val ?? '—'}
                    </td>
                  ))}
                  <td className="journal-cell journal-avg-cell">{overallAvg ?? '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
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
                  <th rowSpan="2" className="journal-avg-col">Средний балл</th>
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
                {structure.students.map((stu) => {
                  const rowScores = subjectList.flatMap((sub) =>
                    sub.modules.map((col) => (col.testId ? structure.gradeMap[`${stu.id}-${col.testId}`] : null))
                  );
                  const rowAvg = avg(rowScores);
                  return (
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
                      <td className="journal-cell journal-avg-cell">{rowAvg != null ? rowAvg : '—'}</td>
                    </tr>
                  );
                })}
                <tr className="journal-avg-row">
                  <td className="journal-col-student text-muted">Средний по предмету</td>
                  {subjectList.map((sub, idx) => (
                    <td key={sub.modules[0]?.subjectId} colSpan={sub.modules.length} className="journal-cell journal-avg-cell">
                      {subjectAvgs[idx] ?? '—'}
                    </td>
                  ))}
                  <td className="journal-cell journal-avg-cell">{overallAvg ?? '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
