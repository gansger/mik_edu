import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, lectureFileUrl } from '../api';

export default function StudentMaterials() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/materials/tree')
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="content">Загрузка...</div>;
  if (!data?.group) {
    return (
      <div className="content">
        <h1 className="page-title">Материалы</h1>
        <p className="empty-state">Вам не назначена группа. Обратитесь к администратору.</p>
      </div>
    );
  }

  const { group, subjects } = data;
  const hasContent = subjects?.some((s) => s.modules?.some((m) => (m.lectures?.length || 0) + (m.tests?.length || 0) > 0));

  return (
    <div className="content">
      <h1 className="page-title">Материалы — {group.name}</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Предметы, модули, лекции и тесты вашей группы.
      </p>
      {!subjects?.length ? (
        <p className="empty-state">Нет предметов в вашей группе.</p>
      ) : !hasContent ? (
        <p className="empty-state">Пока нет лекций и тестов. Материалы появятся после добавления преподавателем.</p>
      ) : (
        <div className="materials-tree">
          {subjects.map((sub) => (
            <div key={sub.id} className="card">
              <h3 style={{ marginTop: 0 }}>{sub.name}</h3>
              {sub.modules?.map((mod) => (
                <div key={mod.id} className="module-block">
                  <h4 className="module-title">Модуль: {mod.name}</h4>
                  <ul className="lecture-list">
                    {(mod.lectures || []).map((lec) => (
                      <li key={`l-${lec.id}`}>
                        <a href={lectureFileUrl(lec.id)} target="_blank" rel="noopener noreferrer">
                          {lec.title}
                          {lec.fileType && <span className="file-type-badge">{lec.fileType}</span>}
                        </a>
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
                  {(!mod.lectures?.length && !mod.tests?.length) && (
                    <p className="empty-state" style={{ padding: '0.25rem 0', margin: 0, fontSize: '0.9rem' }}>Нет материалов</p>
                  )}
                </div>
              ))}
              {(!sub.modules?.length || sub.modules.every((m) => !m.lectures?.length && !m.tests?.length)) && (
                <p className="empty-state" style={{ padding: '0.5rem 0', margin: 0, fontSize: '0.9rem' }}>Нет модулей с материалами</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
