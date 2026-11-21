'use client';

export const RBAC_CLIENT = {
  'Super Admin': { dashboard: true, units: true, customers: true, pos: true, history: true, extras: true, users: true, logs: true, deleteMaster: true },
  Manajer:       { dashboard: true, units: true, customers: true, pos: true, history: true, extras: true, users: false, logs: true, deleteMaster: true },
  Operator:      { dashboard: true, units: true, customers: true, pos: true, history: true, extras: true, users: false, logs: false, deleteMaster: false },
  Pemilik:       { dashboard: true, units: false, customers: false, pos: false, history: true, extras: false, users: false, logs: false, deleteMaster: false },
};

export function saveAuthSession(token, user) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ps_admin_token', token);
  localStorage.setItem('ps_admin_user', JSON.stringify(user));
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('ps_admin_token');
  localStorage.setItem('ps_admin_user', '');
  localStorage.removeItem('ps_admin_user');
}

export function getSavedUser() {
  if (typeof window === 'undefined') return null;
  try {
    const token = localStorage.getItem('ps_admin_token');
    const raw = localStorage.getItem('ps_admin_user');
    if (!token || !raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function canUser(user, feature) {
  if (!user) return false;
  return Boolean(RBAC_CLIENT[user.role]?.[feature]);
}

export async function apiFetch(url, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ps_admin_token') : null;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers['X-Admin-Token'] = token;
  }

  let finalUrl = url;
  if (token) {
    const sep = url.includes('?') ? '&' : '?';
    finalUrl = `${url}${sep}_token=${encodeURIComponent(token)}`;
  }

  const res = await fetch(finalUrl, {
    ...options,
    headers,
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== 'undefined') {
    clearAuthSession();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error(data.error || 'Sesi berakhir, silakan login kembali.');
  }
  if (!res.ok) {
    throw new Error(data.error || `Request gagal (${res.status})`);
  }
  return data;
}

export function rupiah(n) {
  return 'Rp' + Math.round(Number(n || 0)).toLocaleString('id-ID');
}
