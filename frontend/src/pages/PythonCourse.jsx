import React from 'react';

/**
 * Курс Python в одном статическом файле (public/python-quest.html).
 * Требование ТЗ: логика курса без сборщика — внутри HTML; здесь только встраивание в приложение.
 */
export default function PythonCourse() {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const src = `${base}/python-quest.html`;

  return (
    <div className="python-course-wrap">
      <h1 className="page-title" style={{ marginTop: 0 }}>Курс Python для студентов</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Интерактивные задания: прогресс сохраняется в вашем аккаунте (и дублируется в браузере). После прохождения всех уровней отображается сертификат и конфетти.
        В журнале успеваемости преподаватель и администратор видят прогресс группы в режиме «Курс Python Quest».
      </p>
      <iframe
        title="Python Quest"
        src={src}
        style={{
          width: '100%',
          minHeight: 'min(85vh, 900px)',
          border: '1px solid var(--border, rgba(255,255,255,0.12))',
          borderRadius: '12px',
          background: '#0c1222',
        }}
      />
    </div>
  );
}
