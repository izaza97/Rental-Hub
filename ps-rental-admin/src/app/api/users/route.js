export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { dbAll, dbGet, dbRun, sqlNow } from '@/lib/db';
import { getAuthUser, canRole, logActivity } from '@/lib/auth';

export async function GET(request) {
  const user = getAuthUser(request);
  if (!user || !canRole(user.role, 'users')) {
    return NextResponse.json({ error: 'Akses khusus Super Admin (NFR-07).' }, { status: 403 });
  }
  const users = await dbAll('SELECT id, username, name, role, status, last_active, created_at FROM users ORDER BY id ASC');
  return NextResponse.json({ users });
}

export async function POST(request) {
  const user = getAuthUser(request);
  if (!user || !canRole(user.role, 'users')) {
    return NextResponse.json({ error: 'Akses khusus Super Admin (NFR-07).' }, { status: 403 });
  }

  const body = await request.json();
  const username = String(body.username || '').trim().toLowerCase();
  const name = String(body.name || '').trim();
  const password = String(body.password || '');
  const role = ['Super Admin', 'Manajer', 'Operator', 'Pemilik'].includes(body.role) ? body.role : 'Operator';

  if (!username || !name || password.length < 6) {
    return NextResponse.json({ error: 'Username, nama, dan password (minimal 6 karakter) wajib diisi.' }, { status: 400 });
  }

  try {
    const hash = await bcrypt.hash(password, 10); // NFR-06
    await dbRun(
      "INSERT INTO users (username, password_hash, name, role, status, created_at) VALUES (?, ?, ?, ?, 'Aktif', ?)",
      [username, hash, name, role, sqlNow()]
    );
    await logActivity(user.username, 'Tambah User', `${username} (${role})`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Username sudah terdaftar.' }, { status: 400 });
  }
}

export async function PATCH(request) {
  const user = getAuthUser(request);
  if (!user || !canRole(user.role, 'users')) {
    return NextResponse.json({ error: 'Akses khusus Super Admin (NFR-07).' }, { status: 403 });
  }

  const body = await request.json();
  const id = Number(body.id);
  if (id === Number(user.id)) {
    return NextResponse.json({ error: 'Tidak dapat menonaktifkan akun sendiri.' }, { status: 400 });
  }

  const targetUser = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
  if (!targetUser) return NextResponse.json({ error: 'User tidak ditemukan.' }, { status: 404 });

  const nextStatus = targetUser.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
  await dbRun('UPDATE users SET status = ? WHERE id = ?', [nextStatus, id]);
  await logActivity(user.username, 'Ubah Status User', `${targetUser.username} → ${nextStatus}`);
  return NextResponse.json({ ok: true });
}
