export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { dbAll, dbGet, dbRun, sqlNow } from '@/lib/db';
import { getAuthUser, canRole, logActivity } from '@/lib/auth';

export async function GET(request) {
  const user = getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const status = (searchParams.get('status') || '').trim();
  const psType = (searchParams.get('ps_type') || '').trim();

  const where = [];
  const params = [];
  if (q) {
    where.push('(name LIKE ? OR code LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (psType) {
    where.push('ps_type = ?');
    params.push(psType);
  }

  const sql = `SELECT * FROM units${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY id ASC`;
  const units = await dbAll(sql, params);
  return NextResponse.json({ units });
}

export async function POST(request) {
  const user = getAuthUser(request);
  if (!user || !canRole(user.role, 'units')) {
    return NextResponse.json({ error: 'Akses ditolak (RBAC).' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const code = String(body.code || '').trim().toUpperCase();
    const name = String(body.name || '').trim();
    const ps_type = ['PS4', 'PS5'].includes(body.ps_type) ? body.ps_type : 'PS5';
    const room_type = ['VIP Room', 'Reguler', 'VR Corner', 'Home Rental'].includes(body.room_type) ? body.room_type : 'Reguler';
    const price_per_hour = Math.max(0, Number(body.price_per_hour || 0));
    const status = ['Tersedia', 'Disewa', 'Maintenance'].includes(body.status) ? body.status : 'Tersedia';
    const features = String(body.features || 'TV 4K • 2 Controller').trim();

    if (!code || !name) {
      return NextResponse.json({ error: 'Kode unit dan nama unit wajib diisi.' }, { status: 400 });
    }

    await dbRun(
      'INSERT INTO units (code, name, ps_type, room_type, price_per_hour, status, features, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [code, name, ps_type, room_type, price_per_hour, status, features, sqlNow()]
    );
    await logActivity(user.username, 'Tambah Unit', `${name} (${code}) - ${ps_type} - Rp${price_per_hour}/jam`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Kode unit sudah digunakan atau data tidak valid.' }, { status: 400 });
  }
}

export async function PUT(request) {
  const user = getAuthUser(request);
  if (!user || !canRole(user.role, 'units')) {
    return NextResponse.json({ error: 'Akses ditolak (RBAC).' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const id = Number(body.id);
    const existing = await dbGet('SELECT * FROM units WHERE id = ?', [id]);
    if (!existing) return NextResponse.json({ error: 'Unit tidak ditemukan.' }, { status: 404 });

    const code = String(body.code ?? existing.code).trim().toUpperCase();
    const name = String(body.name ?? existing.name).trim();
    const ps_type = ['PS4', 'PS5'].includes(body.ps_type) ? body.ps_type : existing.ps_type;
    const room_type = ['VIP Room', 'Reguler', 'VR Corner', 'Home Rental'].includes(body.room_type) ? body.room_type : existing.room_type;
    const price_per_hour = body.price_per_hour !== undefined ? Math.max(0, Number(body.price_per_hour)) : existing.price_per_hour;
    const status = ['Tersedia', 'Disewa', 'Maintenance'].includes(body.status) ? body.status : existing.status;
    const features = String(body.features ?? existing.features ?? '').trim();

    await dbRun(
      'UPDATE units SET code = ?, name = ?, ps_type = ?, room_type = ?, price_per_hour = ?, status = ?, features = ? WHERE id = ?',
      [code, name, ps_type, room_type, price_per_hour, status, features, id]
    );
    await logActivity(user.username, 'Ubah Unit', `${name} (${code}) → Status: ${status}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal memperbarui unit: kode mungkin duplikat.' }, { status: 400 });
  }
}

export async function DELETE(request) {
  const user = getAuthUser(request);
  if (!user || !canRole(user.role, 'deleteMaster')) {
    return NextResponse.json({ error: 'Role Anda tidak memiliki izin hapus master (NFR-07).' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get('id'));
  const unit = await dbGet('SELECT * FROM units WHERE id = ?', [id]);
  if (!unit) return NextResponse.json({ error: 'Unit tidak ditemukan.' }, { status: 404 });
  if (unit.status === 'Disewa') {
    return NextResponse.json({ error: 'Unit sedang Disewa, tidak dapat dihapus.' }, { status: 400 });
  }

  await dbRun('DELETE FROM units WHERE id = ?', [id]);
  await logActivity(user.username, 'Hapus Unit', `${unit.name} (${unit.code})`);
  return NextResponse.json({ ok: true });
}
