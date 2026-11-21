import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { dbGet, dbRun, sqlNow } from '@/lib/db';
import { signToken, logActivity } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi.' }, { status: 400 });
    }

    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!user || !valid) {
      await logActivity(username || 'unknown', 'Login Gagal', 'Percobaan login ditolak: kredensial tidak valid (FR-2)');
      return NextResponse.json({ error: 'Username atau password salah. Silakan coba lagi.' }, { status: 401 });
    }

    if (user.status !== 'Aktif') {
      await logActivity(username, 'Login Ditolak', 'Akun berstatus Nonaktif');
      return NextResponse.json({ error: 'Akun Anda sedang dinonaktifkan. Hubungi Super Admin.' }, { status: 403 });
    }

    await dbRun('UPDATE users SET last_active = ? WHERE id = ?', [sqlNow(), user.id]);
    const sessionUser = { id: user.id, username: user.username, name: user.name, role: user.role };
    const token = signToken(sessionUser);

    await logActivity(user.username, 'Login', `${user.name} (${user.role}) berhasil login (FR-1)`);

    const isHttps = (request.headers.get('x-forwarded-proto') || '').includes('https');
    const res = NextResponse.json({ token, user: sessionUser });
    res.cookies.set('ps_admin_token', token, {
      path: '/',
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
      maxAge: 86400 * 7,
    });
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
