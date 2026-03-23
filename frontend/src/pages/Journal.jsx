import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Journal() {
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [structure, setStructure] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  /** subjects — оценки по тестам; python — прогресс по интерактивному курсу */
  const [journalMode, setJournalMode] = useState('subjects');
  const [pythonData, setPythonData] = useState(null);
  const [loadingPython, setLoadingPython] = useState(false);

  useEffect(() => {
    api.get('/groups').then((r) => setGroups(r.data || []));
  }, []);

  useEffect(() => {
    if (!groupId || journalMode !== 'subjects') {
      if (!groupId) setStructure(null);
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
  }, [groupId, subjectId, journalMode]);

  useEffect(() => {
    if (!groupId || journalMode !== 'python') {
      setPythonData(null);
      return;
    }
    setLoadingPython(true);
    api
      .get(`/python-course/admin?groupId=${encodeURIComponent(groupId)}`)
      .then((r) => setPythonData(r.data))
      .catch(() => setPythonData(null))
      .finally(() => setLoadingPython(false));
  }, [groupId, journalMode]);

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

  const totalPy = pythonData?.totalLevels ?? 28;

  return (
    <>
      <h1 className="page-title">Журнал успеваемости</h1>
      <p className="text-muted" style={{ marginBottom: '1rem' }}>
        {journalMode === 'subjects'
          ? 'Оценки выставляются автоматически по тестам: 0–39,9% → 2, 40–59,9% → 3, 60–79,9% → 4, 80–100% → 5.'
          : 'Прогресс по интерактивному курсу Python Quest: уровни заданий и дата выдачи сертификата (после прохождения).'}
      </p>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        {groupId ? (
          <div
            className="journal-mode-switch"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            <button
              type="button"
              className={journalMode === 'subjects' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setJournalMode('subjects')}
            >
              Предметы и тесты
            </button>
            <button
              type="button"
              className={journalMode === 'python' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setJournalMode('python')}
            >
              Курс Python Quest
            </button>
          </div>
        ) : null}
        <div className="journal-filters">
          <div className="form-group" style={{ maxWidth: 280 }}>
            <label>Группа</label>
            <select
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                setSubjectId('');
              }}
            >
              <option value="">— Выберите группу —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          {groupId && journalMode === 'subjects' && subjects.length > 0 && (
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
          {groupId && journalMode === 'subjects' && (
            <div className="form-group" style={{ alignSelf: 'flex-end' }}>
              <button type="button" className="btn btn-primary" onClick={handleExportXlsx} disabled={exporting}>
                {exporting ? 'Выгрузка...' : 'Выгрузить в XLSX'}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="card">
        {journalMode === 'python' ? (
          loadingPython ? (
            'Загрузка...'
          ) : !groupId ? (
            <p className="empty-state">Выберите группу.</p>
          ) : !pythonData?.students?.length ? (
            <p className="empty-state">В этой группе нет студентов.</p>
          ) : (
            <div className="table-wrap journal-table-wrap">
              <table className="journal-table">
                <thead>
                  <tr>
                    <th className="journal-col-student">Студент</th>
                    <th>Прогресс (уровни)</th>
                    <th>Статус</th>
                    <th>Дата завершения</th>
                  </tr>
                </thead>
                <tbody>
                  {pythonData.students.map((row) => {
                    const done = row.completed;
                    const passed = done ? totalPy : Math.min(row.currentLevelIndex, totalPy);
                    const progressLabel = `${passed} из ${totalPy}`;
                    const completedAt = row.completedAt
                      ? new Date(row.completedAt).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—';
                    return (
                      <tr key={row.userId}>
                        <td className="journal-col-student">
                          <span className="journal-student-name">{row.fullName || row.login}</span>
                          <span className="journal-student-login">{row.login}</span>
                        </td>
                        <td className="journal-cell">{progressLabel}</td>
                        <td className="journal-cell">{done ? 'Курс пройден' : 'В процессе'}</td>
                        <td className="journal-cell">{done ? completedAt : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : loading ? (
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
