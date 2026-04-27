function getToken() { return localStorage.getItem('admin_token'); }
function getRole() { return localStorage.getItem('admin_role'); }

function requireAuth() {
  if (!getToken() || getRole() !== 'ADMIN') {
    location.href = '/api/admin/web/';
    return false;
  }
  return true;
}

function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_role');
  localStorage.removeItem('admin_email');
  localStorage.removeItem('admin_id');
  location.href = '/api/admin/web/';
}

function apiHeaders() {
  const h = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken(),
  };
  const uid = localStorage.getItem('admin_id');
  if (uid) h['X-User-Id'] = uid;
  return h;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { ...apiHeaders(), ...(options.headers || {}) },
  });
  if (res.status === 401) {
    logout();
    throw new Error('인증 만료 — 다시 로그인하세요');
  }
  if (res.status === 403) {
    throw new Error('권한이 없습니다 (403)');
  }
  return res;
}

async function apiJson(path, options) {
  const res = await api(path, options);
  if (!res.ok) throw new Error(await res.text() || `Error ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
