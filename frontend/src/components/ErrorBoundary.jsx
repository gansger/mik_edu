import React from 'react';

/** Ловит падение React при рендере — вместо пустого белого экрана */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err) {
    return { hasError: true, message: err?.message || String(err) };
  }

  componentDidCatch(err, info) {
    console.error('ErrorBoundary:', err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
            background: '#0f1419',
            color: '#e6edf3',
          }}
        >
          <h1 style={{ fontSize: '1.25rem' }}>Ошибка при отображении страницы</h1>
          <p style={{ color: '#8b9cb3', marginTop: '0.5rem' }}>
            Откройте консоль браузера (F12 → Console). Частые причины: не загрузились JS-файлы (проверьте вкладку Network), устаревший кэш — попробуйте жёсткое обновление (Ctrl+Shift+R).
          </p>
          <pre
            style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#1a2332',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '13px',
            }}
          >
            {this.state.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
