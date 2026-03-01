const BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export const api = {
  get(url) {
    return fetch(BASE + url, { headers: getHeaders() }).then((r) => {
      if (r.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(new Error('Unauthorized'));
      }
      const j = r.json();
      if (!r.ok) return j.then((e) => Promise.reject(e));
      return j;
    }).then((data) => ({ data }));
  },
  post(url, body, isForm) {
    const headers = getHeaders();
    if (isForm) delete headers['Content-Type'];
    const options = {
      method: 'POST',
      headers,
      body: isForm ? body : JSON.stringify(body),
    };
    if (!isForm) options.headers['Content-Type'] = 'application/json';
    return fetch(BASE + url, options).then((r) => {
      if (r.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(new Error('Unauthorized'));
      }
      const j = r.json().catch(() => ({}));
      if (!r.ok) return j.then((e) => Promise.reject(e || { error: 'Ошибка' }));
      return j.then((data) => ({ data }));
    });
  },
  patch(url, body) {
    return fetch(BASE + url, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }).then((r) => {
      if (r.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(new Error('Unauthorized'));
      }
      const j = r.json();
      if (!r.ok) return j.then((e) => Promise.reject(e));
      return j.then((data) => ({ data }));
    });
  },
  delete(url) {
    return fetch(BASE + url, { method: 'DELETE', headers: getHeaders() }).then((r) => {
      if (r.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(new Error('Unauthorized'));
      }
      if (r.status === 204) return { data: null };
      return r.json().then((e) => Promise.reject(e));
    });
  },
};

export function lectureFileUrl(lectureId) {
  const token = localStorage.getItem('token');
  return `${BASE}/files/lecture/${lectureId}?token=${encodeURIComponent(token || '')}`;
}
