export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { dbAll, dbGet, dbRun, sqlNow, isForeignKeyViolation, serverError } from '@/lib/db';
import { getAuthUser, canRole, logActivity } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    let customers;
    if (q) {
      // ILIKE = case-insensitive (setara LIKE MySQL/SQLite lama)
      customers = await dbAll(
        'SELECT * FROM customers WHERE name ILIKE $1 OR phone ILIKE $1 OR nik ILIKE $1 ORDER BY id DESC',
        [`%${q}%`]
      );
    } else {
      customers = await dbAll('SELECT * FROM customers ORDER BY id DESC');
    }
    return NextResponse.json({ customers });
  } catch (err) {
    return NextResponse.json(serverError(err, 'customers GET'), { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request);
    if (!user || !canRole(user.role, 'customers')) {
      return NextResponse.json({ error: 'Akses ditolak (RBAC).' }, { status: 403 });
    }

    const body = await request.json();
    const name = String(body.name || '').trim();
    const nik = String(body.nik || '').trim() || null;
    const phone = String(body.phone || '').trim() || null;
    const address = String(body.address || '').trim() || null;

    if (!name) return NextResponse.json({ error: 'Nama pelanggan wajib diisi.' }, { status: 400 });

    await dbRun(
      'INSERT INTO customers (name, nik, phone, address, points, created_at) VALUES ($1, $2, $3, $4, 0, $5) RETURNING id',
      [name, nik, phone, address, sqlNow()]
    );
    await logActivity(user.username, 'Tambah Pelanggan', `${name} (${phone || '-'})`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return NextResponse.json({ error: 'Data relasi tidak valid.' }, { status: 400 });
    }
    return NextResponse.json(serverError(err, 'customers POST'), { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = getAuthUser(request);
    if (!user || !canRole(user.role, 'customers')) {
      return NextResponse.json({ error: 'Akses ditolak (RBAC).' }, { status: 403 });
    }

    const body = await request.json();
    const id = Number(body.id);
    const existing = await dbGet('SELECT * FROM customers WHERE id = $1', [id]);
    if (!existing) return NextResponse.json({ error: 'Pelanggan tidak ditemukan.' }, { status: 404 });

    const name = String(body.name || '').trim();
    const nik = String(body.nik || '').trim() || null;
    const phone = String(body.phone || '').trim() || null;
    const address = String(body.address || '').trim() || null;
    if (!name) return NextResponse.json({ error: 'Nama pelanggan wajib diisi.' }, { status: 400 });

    await dbRun(
      'UPDATE customers SET name = $1, nik = $2, phone = $3, address = $4 WHERE id = $5',
      [name, nik, phone, address, id]
    );
    await logActivity(user.username, 'Ubah Pelanggan', `${name} (${phone || '-'})`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(serverError(err, 'customers PUT'), { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = getAuthUser(request);
    if (!user || !canRole(user.role, 'deleteMaster')) {
      return NextResponse.json({ error: 'Role Anda tidak memiliki izin hapus master (NFR-07).' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    const cust = await dbGet('SELECT * FROM customers WHERE id = $1', [id]);
    if (!cust) return NextResponse.json({ error: 'Pelanggan tidak ditemukan.' }, { status: 404 });

    const trxCount = await dbGet('SELECT COUNT(*) AS c FROM transactions WHERE customer_id = $1', [id]);
    if (Number(trxCount?.c || 0) > 0) {
      return NextResponse.json({ error: 'Pelanggan memiliki riwayat transaksi, tidak dapat dihapus.' }, { status: 400 });
    }

    await dbRun('DELETE FROM customers WHERE id = $1', [id]);
    await logActivity(user.username, 'Hapus Pelanggan', cust.name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return NextResponse.json({ error: 'Pelanggan masih memiliki relasi data lain dan tidak dapat dihapus.' }, { status: 400 });
    }
    return NextResponse.json(serverError(err, 'customers DELETE'), { status: 500 });
  }
}
