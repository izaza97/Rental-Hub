import crypto from 'crypto';
import { cookies } from 'next/headers';
import { dbRun, sqlNow } from './db';

const SECRET = process.env.AUTH_SECRET || 'ps-rental-hub-secret-key-kelompok-12-unindra';

export const RBAC = {
  'Super Admin': { dashboard: true, units: true, customers: true, pos: true, history: true, extras: true, users: true, logs: true, deleteMaster: true },
  Manajer:       { dashboard: true, units: true, customers: true, pos: true, history: true, extras: true, users: false, logs: true, deleteMaster: true },
  Operator:      { dashboard: true, units: true, customers: true, pos: true, history: true, extras: true, users: false, logs: false, deleteMaster: false },
  Pemilik:       { dashboard: true, units: false, customers: false, pos: false, history: true, extras: false, users: false, logs: false, deleteMaster: false },
};

export function canRole(role, feature) {
  return Boolean(RBAC[role]?.[feature]);
}

export function signToken(payload) {
  const data = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export function getAuthUser(request) {
  // 1. Custom header X-Admin-Token (tidak di-strip oleh reverse proxy seperti Authorization)
  const customHeader = request?.headers?.get('x-admin-token') || '';
  if (customHeader) {
    const u = verifyToken(customHeader.trim());
    if (u) return u;
  }

  // 2. Standard Authorization: Bearer <token>
  const authHeader = request?.headers?.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const u = verifyToken(authHeader.slice(7).trim());
    if (u) return u;
  }

  // 3. Query parameter fallback ?_token=...
  if (request?.url) {
    try {
      const { searchParams } = new URL(request.url);
      const qp = searchParams.get('_token');
      if (qp) {
        const u = verifyToken(qp.trim());
        if (u) return u;
      }
    } catch {
      // ignore
    }
  }

  // 4. Cookie fallback
  try {
    const cookieStore = cookies();
    const c = cookieStore.get('ps_admin_token')?.value;
    if (c) return verifyToken(c);
  } catch {
    // ignore outside request context
  }
  return null;
}

export async function logActivity(username, action, detail = '') {
  try {
    await dbRun(
      'INSERT INTO activity_logs (username, action, detail, created_at) VALUES ($1, $2, $3, $4)',
      [username || 'system', action, detail, sqlNow()]
    );
  } catch (err) {
    // Audit trail tidak boleh menjatuhkan request utama
    console.error('logActivity error:', err?.message || err);
  }
}
