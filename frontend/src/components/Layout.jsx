import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const navStudent = (
    <>
      <NavLink to="/materials" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>Материалы</NavLink>
      <NavLink to="/courses/python" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>Курсы: Python</NavLink>
      <NavLink to="/grades" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>Моя успеваемость</NavLink>
    </>
  );
  const navTeacher = (
    <>
      <NavLink to="/groups" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>Группы</NavLink>
      <NavLink to="/journal" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>Журнал успеваемости</NavLink>
    </>
  );

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <NavLink to="/" className="logo" onClick={closeMenu}>МИК-ОБРАЗОВАНИЕ</NavLink>
          <button type="button" className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Меню">
            <span className="mobile-menu-icon">{menuOpen ? '✕' : '☰'}</span>
          </button>
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
      <div className={`nav-overlay ${menuOpen ? 'nav-overlay-visible' : ''}`} onClick={closeMenu} aria-hidden={!menuOpen} />
      <div className={`nav-dropdown ${menuOpen ? 'nav-dropdown-open' : ''}`}>
        {user?.role === 'student' && navStudent}
        {(isAdmin || user?.role === 'teacher') && navTeacher}
        {isAdmin && <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>Пользователи</NavLink>}
      </div>
      <div className="layout">
        <aside className="sidebar">
          {user?.role === 'student' && navStudent}
          {(isAdmin || user?.role === 'teacher') && navTeacher}
          {isAdmin && <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'active' : ''}>Пользователи</NavLink>}
        </aside>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
