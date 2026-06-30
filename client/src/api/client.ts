// Axios instance + auth wiring. Every request carries the stored JWT; a 401 on a
// non-auth call means the session expired, so we drop the token and bounce to login.

import axios from 'axios';

const TOKEN_KEY = 'relay_token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Attach the bearer token to every outgoing request.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On an unexpected 401 (expired/invalid token), log out and redirect. Login and
// register legitimately return 401/409, so those are left for the form to handle.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url: string = error.config?.url ?? '';
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthCall) {
      setToken(null);
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

// Download a JWT-protected attachment: fetch as a blob (so the auth header is
// sent), then trigger a normal browser download under the original name.
export async function downloadAttachment(filename: string, originalName: string): Promise<void> {
  const res = await api.get(`/attachments/${filename}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = originalName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
