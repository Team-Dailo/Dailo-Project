function getToken() { return localStorage.getItem('token'); }
function getRole() { return localStorage.getItem('role'); }

function requireAuth() {
  if (!getToken() || getRole() !== 'ADMIN') {
    location.href = '/';
    return false;
  }
  return true;
}

function logout() {
  localStorage.clear();
  location.href = '/';
}

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken(),
  };
}

async function api(path, options = {}) {
  const res = await fetch('/proxy' + path, {
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
