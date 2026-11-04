const API_URL = import.meta.env.VITE_API_URL || '/api';

// Não há token em localStorage: a sessão é o cookie compartilhado `saga_session`,
// definido pelo saga. O fetch sempre manda `credentials: 'include'` para que o
// cookie vá junto, e o backend decide se a sessão está viva.
async function request(path, { method = 'GET', body, headers = {}, isForm = false } = {}) {
  const opts = { method, credentials: 'include', headers: { ...headers } };

  if (body !== undefined) {
    if (isForm) {
      opts.body = body;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_URL}${path}`, opts);
  const data = res.status === 204 ? null : await res.json().catch(() => null);

  // 401 e 503 são caminhos distintos: o plugin decide o que fazer com cada um
  // (401 → redirect para o saga; 503 → página de erro própria).
  if (res.status === 401 || res.status === 503) {
    window.dispatchEvent(new CustomEvent('sgoa:auth', { detail: { status: res.status, body: data } }));
  }

  if (!res.ok) {
    const err = new Error(data?.message || data?.erro || `Erro ${res.status} na requisição a ${path}`);
    err.status = res.status;
    err.code = data?.code;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData, isForm: true }),
};

export function getDownloadUrl(path) {
  return `${API_URL}${path}`;
}
