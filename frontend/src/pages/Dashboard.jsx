import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  return (
    <>
      <h1 className="page-title">Главная</h1>
      <div className="card">
        <h2>Добро пожаловать, {user?.fullName || user?.login}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          {isAdmin
            ? 'Вы вошли как администратор. Вы можете управлять группами, предметами, модулями, лекциями и пользователями.'
            : isTeacher
              ? 'Вы вошли как преподаватель. Доступны материалы и успеваемость по назначенным группам и предметам.'
              : 'Здесь вы можете просматривать материалы своей группы и успеваемость.'}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/materials" className="btn btn-primary">Перейти к материалам</Link>
          <Link to="/grades" className="btn btn-secondary">{isTeacher ? 'Успеваемость групп' : 'Моя успеваемость'}</Link>
          {isAdmin && (
            <>
              <Link to="/admin/groups" className="btn btn-secondary">Группы</Link>
              <Link to="/admin/users" className="btn btn-secondary">Пользователи</Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
