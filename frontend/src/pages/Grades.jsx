import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Grades() {
  const { user } = useAuth();
  const [structure, setStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  useEffect(() => {
    if (isTeacher) {
      api.get('/materials/my-assignments').then((r) => setAssignments(r.data || [])).catch(() => setAssignments([]));
      return;
    }
    if (isStudent) {
      setLoading(true);
      api
        .get('/grades/my-journal')
        .then((r) => setStructure(r.data))
        .catch(() => setStructure(null))
        .finally(() => setLoading(false));
      return;
    }
    setLoading(false);
  }, [isTeacher, isStudent]);

  useEffect(() => {
    if (!isTeacher || !selectedGroupId) return;
    setSubjectId('');
    setLoading(true);
    const params = new URLSearchParams({ groupId: selectedGroupId });
    api
      .get(`/grades/journal-structure?${params}`)
      .then((r) => setStructure(r.data))
      .catch(() => setStructure(null))
      .finally(() => setLoading(false));
  }, [isTeacher, selectedGroupId]);

  const uniqueGroups = assignments.reduce((acc, a) => (acc.some((x) => x.groupId === a.groupId) ? acc : [...acc, { groupId: a.groupId, groupName: a.groupName }]), []);

  const columnsBySubject = structure?.columns?.reduce((acc, col) => {
    const key = col.subjectId;
    if (!acc[key]) acc[key] = { name: col.subjectName, modules: [] };
    acc[key].modules.push(col);
    return acc;
  }, {}) || {};
  const allSubjectList = Object.values(columnsBySubject);
  const subjectList = subjectId
    ? allSubjectList.filter((s) => s.modules[0] && String(s.modules[0].subjectId) === String(subjectId))
    : allSubjectList;
  const subjectsForSelect = structure?.subjects || (structure?.columns ? [...new Map(structure.columns.map((c) => [c.subjectId, { id: c.subjectId, name: c.subjectName }])).values()] : []);

  const avg = (scores) => {
    const nums = scores.filter((n) => n != null && !Number.isNaN(Number(n)));
    if (!nums.length) return null;
    return (nums.reduce((a, b) => a + Number(b), 0) / nums.length).toFixed(1);
  };

  if (isTeacher && !selectedGroupId && uniqueGroups.length > 0) {
    return (
      <>
        <h1 className="page-title">Успеваемость группы</h1>
        <div className="form-group" style={{ maxWidth: 300 }}>
          <label>Группа</label>
          <select value="" onChange={(e) => setSelectedGroupId(e.target.value)}>
            <option value="">— Выберите группу —</option>
            {uniqueGroups.map((g) => (
              <option key={g.groupId} value={g.groupId}>{g.groupName}</option>
            ))}
          </select>
        </div>
      </>
    );
  }

  if (isTeacher && !selectedGroupId) {
    return (
      <>
        <h1 className="page-title">Успеваемость</h1>
        <p className="empty-state">Вам не назначены группы. Обратитесь к администратору.</p>
      </>
    );
  }

  if (loading) return <div className="content">Загрузка...</div>;

  if (isStudent) {
    const hasColumns = structure?.columns?.length > 0;
    const studentScores = subjectList.flatMap((sub) =>
      sub.modules.map((col) => (col.testId ? structure.gradeMap[col.testId] : null))
    );
    const studentAvg = avg(studentScores);
    return (
      <>
        <h1 className="page-title">Моя успеваемость</h1>
        <p className="text-muted" style={{ marginBottom: '1rem' }}>
          Оценки выставляются автоматически по тестам: 0–39,9% → 2, 40–59,9% → 3, 60–79,9% → 4, 80–100% → 5.
        </p>
        {hasColumns && subjectsForSelect.length > 0 && (
          <div className="card journal-filters" style={{ marginBottom: '1rem' }}>
            <div className="form-group" style={{ maxWidth: 280 }}>
              <label>Предмет</label>
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">— Все предметы —</option>
                {subjectsForSelect.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div className="card">
          {!hasColumns ? (
            <p className="empty-state">Пока нет предметов и модулей с тестами в вашей группе.</p>
          ) : (
            <div className="table-wrap journal-table-wrap">
              <table className="journal-table">
                <thead>
                  <tr>
                    <th className="journal-col-student">Студент</th>
                    {subjectList.map((sub) => (
                      <th key={sub.name} colSpan={sub.modules.length} className="journal-subject">
                        {sub.name}
                      </th>
                    ))}
                    <th rowSpan={2} className="journal-avg-col">В среднем</th>
                  </tr>
                  <tr>
                    <th className="journal-col-student"></th>
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
                  <tr>
                    <td className="journal-col-student">
                      <span className="journal-student-name">{user?.fullName || user?.login}</span>
                      <span className="journal-student-login">{user?.login}</span>
                    </td>
                    {subjectList.map((sub) =>
                      sub.modules.map((col) => {
                        const score = col.testId ? structure.gradeMap[col.testId] : null;
                        return (
                          <td key={col.moduleId} className="journal-cell">
                            {score != null ? score : '—'}
                          </td>
                        );
                      })
                    )}
                    <td className="journal-cell journal-avg-cell">{studentAvg != null ? studentAvg : '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  }

  if (isTeacher && structure) {
    const hasStudents = structure.students?.length > 0;
    const hasColumns = structure.columns?.length > 0;
    const subjectAvgs = subjectList.map((sub) => {
      const scores = [];
      structure.students?.forEach((stu) => {
        sub.modules.forEach((col) => {
          const v = col.testId ? structure.gradeMap[`${stu.id}-${col.testId}`] : null;
          if (v != null && !Number.isNaN(Number(v))) scores.push(Number(v));
        });
      });
      return avg(scores);
    });
    const overallAvg = avg(subjectAvgs.filter((a) => a != null));
    return (
      <>
        <h1 className="page-title">Успеваемость группы</h1>
        <p className="text-muted" style={{ marginBottom: '1rem' }}>
          Оценки выставляются автоматически по тестам: 0–39,9% → 2, 40–59,9% → 3, 60–79,9% → 4, 80–100% → 5.
        </p>
        {uniqueGroups.length > 0 && (
          <div className="card journal-filters" style={{ marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ maxWidth: 300 }}>
              <label>Группа</label>
              <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
                <option value="">— Группа —</option>
                {uniqueGroups.map((g) => (
                  <option key={g.groupId} value={g.groupId}>{g.groupName}</option>
                ))}
              </select>
            </div>
            {hasColumns && subjectsForSelect.length > 0 && (
              <div className="form-group" style={{ maxWidth: 280 }}>
                <label>Предмет</label>
                <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                  <option value="">— Все предметы —</option>
                  {subjectsForSelect.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        <div className="card">
          {!hasColumns ? (
            <p className="empty-state">Нет предметов и модулей с тестами в этой группе.</p>
          ) : !hasStudents ? (
            <p className="empty-state">В этой группе нет студентов.</p>
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
                    {subjectList.map((sub) => (
                      <td key={sub.modules[0]?.subjectId} colSpan={sub.modules.length} className="journal-cell journal-avg-cell">
                        {subjectAvgs[subjectList.indexOf(sub)] ?? '—'}
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

  return (
    <>
      <h1 className="page-title">Успеваемость</h1>
      <p className="empty-state">Нет данных.</p>
    </>
  );
}
