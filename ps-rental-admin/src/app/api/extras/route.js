export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { dbAll, dbGet, dbRun, sqlNow, isUniqueViolation, serverError } from '@/lib/db';
import { getAuthUser, canRole, logActivity } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [stock, promos, deposits, gameRequests] = await Promise.all([
      dbAll('SELECT * FROM stock ORDER BY id ASC'),
      dbAll('SELECT * FROM promos ORDER BY id DESC'),
      dbAll('SELECT * FROM deposits ORDER BY id DESC'),
      dbAll('SELECT * FROM game_requests ORDER BY id DESC'),
    ]);

    return NextResponse.json({ stock, promos, deposits, gameRequests });
  } catch (err) {
    return NextResponse.json(serverError(err, 'extras GET'), { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request);
    if (!user || !canRole(user.role, 'extras')) {
      return NextResponse.json({ error: 'Akses ditolak (RBAC).' }, { status: 403 });
    }

    const body = await request.json();
    const type = body.type;

    if (type === 'stock') {
      const name = String(body.name || '').trim();
      const price = Math.max(0, Number(body.price || 0));
      const qty = Math.max(0, Number(body.qty || 0));
      const category = ['Aksesori', 'Makanan', 'Minuman'].includes(body.category) ? body.category : 'Aksesori';
      if (!name) return NextResponse.json({ error: 'Nama item wajib diisi.' }, { status: 400 });
      await dbRun(
        'INSERT INTO stock (name, price, qty, category, sold, created_at) VALUES ($1, $2, $3, $4, 0, $5) RETURNING id',
        [name, price, qty, category, sqlNow()]
      );
      await logActivity(user.username, 'Tambah Stok', `${name} (${qty} pcs)`);
      return NextResponse.json({ ok: true });
    }

    if (type === 'restock') {
      const id = Number(body.id);
      const addQty = Math.max(1, Number(body.add_qty || 10));
      await dbRun('UPDATE stock SET qty = qty + $1 WHERE id = $2', [addQty, id]);
      await logActivity(user.username, 'Restock Item', `Stock ID #${id} +${addQty} pcs`);
      return NextResponse.json({ ok: true });
    }

    if (type === 'promo') {
      const code = String(body.code || '').trim().toUpperCase();
      const discount_percent = Math.min(100, Math.max(1, Number(body.discount_percent || 10)));
      const description = String(body.description || '').trim();
      const expired_at = String(body.expired_at || '2027-12-31').trim();
      if (!code) return NextResponse.json({ error: 'Kode promo wajib diisi.' }, { status: 400 });
      try {
        await dbRun(
          'INSERT INTO promos (code, discount_percent, description, expired_at, used_count, created_at) VALUES ($1, $2, $3, $4, 0, $5) RETURNING id',
          [code, discount_percent, description, expired_at, sqlNow()]
        );
        await logActivity(user.username, 'Tambah Promo', `${code} (${discount_percent}%)`);
        return NextResponse.json({ ok: true });
      } catch (err) {
        if (isUniqueViolation(err)) {
          return NextResponse.json({ error: 'Kode promo sudah ada.' }, { status: 400 });
        }
        throw err;
      }
    }

    if (type === 'refund_deposit') {
      const id = Number(body.id);
      const dep = await dbGet('SELECT * FROM deposits WHERE id = $1', [id]);
      if (dep) {
        await dbRun("UPDATE deposits SET status = 'Dikembalikan', return_date = $1 WHERE id = $2", [
          sqlNow().slice(0, 10),
          id,
        ]);
        await logActivity(user.username, 'Refund Deposit', `${dep.customer_name} (${dep.unit_name}) - Rp${dep.deposit_amount}`);
      }
      return NextResponse.json({ ok: true });
    }

    if (type === 'game_request_status') {
      const id = Number(body.id);
      const status = ['Menunggu', 'Disetujui', 'Selesai'].includes(body.status) ? body.status : 'Disetujui';
      await dbRun('UPDATE game_requests SET status = $1 WHERE id = $2', [status, id]);
      await logActivity(user.username, 'Update Request Game', `Request #${id} → ${status}`);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Tipe operasi tidak valid.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(serverError(err, 'extras POST'), { status: 500 });
  }
}
