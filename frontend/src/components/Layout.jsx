import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <NavLink to="/" className="logo">МИК-ОБРАЗОВАНИЕ</NavLink>
          <div className="header-right">
            <span className="user-info">
              {user?.fullName || user?.login} <span className={`badge badge-${user?.role}`}>{user?.role === 'admin' ? 'Админ' : user?.role === 'teacher' ? 'Преподаватель' : 'Студент'}</span>
            </span>
            <button type="button" className="btn btn-secondary" onClick={() => { logout(); navigate('/login'); }}>
              Выйти
            </button>
          </div>
        </div>
      </header>
      <div className="layout">
        <aside className="sidebar">
          {user?.role === 'student' && (
            <>
              <NavLink to="/materials" className={({ isActive }) => isActive ? 'active' : ''}>Материалы</NavLink>
              <NavLink to="/grades" className={({ isActive }) => isActive ? 'active' : ''}>Моя успеваемость</NavLink>
            </>
          )}
          {(isAdmin || user?.role === 'teacher') && (
            <>
              <NavLink to="/groups" className={({ isActive }) => isActive ? 'active' : ''}>Группы</NavLink>
              <NavLink to="/journal" className={({ isActive }) => isActive ? 'active' : ''}>Журнал успеваемости</NavLink>
            </>
          )}
          {isAdmin && <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'active' : ''}>Пользователи</NavLink>}
        </aside>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
