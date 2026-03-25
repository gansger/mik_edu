import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  document.body.innerHTML = '<p style="font-family:sans-serif;padding:2rem">Нет элемента #root в index.html</p>';
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
