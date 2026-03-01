import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import GroupsPage from './pages/GroupsPage';
import GroupDetail from './pages/GroupDetail';
import SubjectDetail from './pages/SubjectDetail';
import ModuleDetail from './pages/ModuleDetail';
import Journal from './pages/Journal';
import AdminUsers from './pages/admin/Users';
import EditTest from './pages/EditTest';
import StudentMaterials from './pages/StudentMaterials';
import TakeTest from './pages/TakeTest';
import Grades from './pages/Grades';

function PrivateRoute({ children, adminOnly, adminOrTeacher }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="content" style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  if (adminOrTeacher && user.role !== 'admin' && user.role !== 'teacher') return <Navigate to="/" replace />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role === 'admin' || user?.role === 'teacher') return <Navigate to="/groups" replace />;
  if (user?.role === 'student') return <Navigate to="/materials" replace />;
  return (
    <div className="content">
      <h1 className="page-title">Главная</h1>
      <p className="empty-state">Доступ только для администратора или преподавателя.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<HomeRedirect />} />
        <Route path="groups" element={<PrivateRoute adminOrTeacher><GroupsPage /></PrivateRoute>} />
        <Route path="groups/:groupId" element={<PrivateRoute adminOrTeacher><GroupDetail /></PrivateRoute>} />
        <Route path="groups/:groupId/subjects/:subjectId" element={<PrivateRoute adminOrTeacher><SubjectDetail /></PrivateRoute>} />
        <Route path="groups/:groupId/subjects/:subjectId/modules/:moduleId" element={<PrivateRoute adminOrTeacher><ModuleDetail /></PrivateRoute>} />
        <Route path="journal" element={<PrivateRoute adminOrTeacher><Journal /></PrivateRoute>} />
        <Route path="admin/users" element={<PrivateRoute adminOnly><AdminUsers /></PrivateRoute>} />
        <Route path="edit-test/:id" element={<PrivateRoute adminOrTeacher><EditTest /></PrivateRoute>} />
        <Route path="materials" element={<StudentMaterials />} />
        <Route path="grades" element={<Grades />} />
        <Route path="test/:id" element={<TakeTest />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
