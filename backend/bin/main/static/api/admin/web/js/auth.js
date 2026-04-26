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
  location.href = '/api/admin/web/';
}

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken(),
  };
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { ...apiHeaders(), ...(options.headers || {}) },
  });
  if (res.status === 401 || res.status === 403) {
    logout();
    throw new Error('인증 만료');
  }
  return res;
}

async function apiJson(path, options) {
  const res = await api(path, options);
  if (!res.ok) throw new Error(await res.text() || `Error ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
