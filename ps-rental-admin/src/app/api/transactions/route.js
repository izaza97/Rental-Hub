export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { dbAll, dbGet, dbRun, dbTx, sqlNow, isUniqueViolation, serverError } from '@/lib/db';
import { getAuthUser, canRole, logActivity } from '@/lib/auth';

function toSqlDateTime(input) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function GET(request) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (id) {
      const trx = await dbGet('SELECT * FROM transactions WHERE id = $1', [Number(id)]);
      if (!trx) return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 });
      const addons = await dbAll('SELECT * FROM transaction_addons WHERE transaction_id = $1', [Number(id)]);
      return NextResponse.json({ transaction: trx, addons });
    }

    const date = (searchParams.get('date') || '').trim();
    const customer = (searchParams.get('customer') || '').trim();
    const status = (searchParams.get('status') || '').trim();

    const where = [];
    const params = [];
    if (date) {
      where.push(`to_char(created_at, 'YYYY-MM-DD') LIKE $${params.length + 1}`);
      params.push(`${date}%`);
    }
    if (customer) {
      where.push(`(customer_name ILIKE $${params.length + 1} OR invoice_code ILIKE $${params.length + 1})`);
      params.push(`%${customer}%`);
    }
    if (status) {
      where.push(`payment_status = $${params.length + 1}`);
      params.push(status);
    }

    const sql = `SELECT * FROM transactions${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC`;
    const transactions = await dbAll(sql, params);
    return NextResponse.json({ transactions });
  } catch (err) {
    return NextResponse.json(serverError(err, 'transactions GET'), { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request);
    if (!user || !canRole(user.role, 'pos')) {
      return NextResponse.json({ error: 'Role Anda tidak memiliki akses membuat transaksi (RBAC).' }, { status: 403 });
    }

    const body = await request.json();
    const customerId = Number(body.customer_id || 0);
    const walkinName = String(body.walkin_name || '').trim();
    const unitId = Number(body.unit_id || 0);
    const duration = Math.max(0.5, Number(body.duration_hours || 1));
    const promoCode = String(body.promo_code || '').trim().toUpperCase();
    const paymentStatus = body.payment_status === 'Belum Lunas' ? 'Belum Lunas' : 'Lunas';
    const paymentMethod = String(body.payment_method || 'cash');
    const addonsReq = Array.isArray(body.addons) ? body.addons : [];

    let customerName = walkinName;
    let customerPhone = null;
    if (customerId > 0) {
      const cust = await dbGet('SELECT * FROM customers WHERE id = $1', [customerId]);
      if (cust) {
        customerName = cust.name;
        customerPhone = cust.phone;
      }
    }
    if (!customerName) {
      return NextResponse.json({ error: 'Pilih pelanggan terdaftar atau isi nama walk-in.' }, { status: 400 });
    }

    const unit = await dbGet('SELECT * FROM units WHERE id = $1', [unitId]);
    if (!unit) {
      return NextResponse.json({ error: 'Pilih unit PlayStation terlebih dahulu.' }, { status: 400 });
    }
    if (unit.status !== 'Tersedia') {
      return NextResponse.json({ error: `Unit ${unit.name} sedang ${unit.status} — tidak dapat disewa.` }, { status: 400 });
    }

    const startStr = toSqlDateTime(body.start_time) || sqlNow();
    const startMs = new Date(startStr.replace(' ', 'T')).getTime();
    const endMs = startMs + Math.round(duration * 3600000);
    const endStr = toSqlDateTime(new Date(endMs));

    const rate = Number(unit.price_per_hour || 0);
    const rentSubtotal = rate * duration;

    let addonsTotal = 0;
    const resolvedAddons = [];
    for (const item of addonsReq) {
      const qty = Math.max(1, Number(item.qty || 1));
      const st = await dbGet('SELECT * FROM stock WHERE id = $1', [Number(item.stock_id)]);
      if (st && st.qty >= qty) {
        const sub = Number(st.price) * qty;
        addonsTotal += sub;
        resolvedAddons.push({ stock_id: st.id, item_name: st.name, price: Number(st.price), qty, subtotal: sub });
      }
    }

    const subtotal = rentSubtotal + addonsTotal;

    let discount = 0;
    let promo = null;
    if (promoCode) {
      promo = await dbGet('SELECT * FROM promos WHERE code = $1', [promoCode]);
      if (promo) {
        discount = Math.round(subtotal * (Number(promo.discount_percent) / 100));
      }
    }

    let penalty = 0;
    const returnStr = toSqlDateTime(body.return_time);
    if (returnStr) {
      const retMs = new Date(returnStr.replace(' ', 'T')).getTime();
      if (retMs > endMs) {
        const lateHours = Math.ceil((retMs - endMs) / 3600000);
        penalty = lateHours * rate;
      }
    }

    const total = Math.max(0, subtotal - discount + penalty);
    const invoiceCode = 'TRX-' + Date.now().toString().slice(-6);

    // Satu transaksi DB: insert trx + addon + stok + poin + status unit + promo
    // (atomic — bila salah satu langkah gagal, tidak ada data setengah jadi)
    const newId = await dbTx(async (tx) => {
      const ins = await tx.run(
        `INSERT INTO transactions
          (invoice_code, customer_id, customer_name, customer_phone, unit_id, unit_name, booking_source, start_time, end_time, return_time, duration_hours, price_per_hour, addons_total, subtotal, discount, penalty, total, payment_status, payment_method, created_by, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, 'Admin POS', $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          RETURNING id`,
        [
          invoiceCode,
          customerId > 0 ? customerId : null,
          customerName,
          customerPhone,
          unit.id,
          unit.name,
          startStr,
          endStr,
          returnStr,
          duration,
          rate,
          addonsTotal,
          subtotal,
          discount,
          penalty,
          total,
          paymentStatus,
          paymentMethod,
          user.username,
          sqlNow(),
        ]
      );

      for (const ad of resolvedAddons) {
        await tx.run(
          'INSERT INTO transaction_addons (transaction_id, stock_id, item_name, price, qty, subtotal) VALUES ($1, $2, $3, $4, $5, $6)',
          [ins.lastInsertRowid, ad.stock_id, ad.item_name, ad.price, ad.qty, ad.subtotal]
        );
        await tx.run('UPDATE stock SET qty = qty - $1, sold = sold + $1 WHERE id = $2', [ad.qty, ad.stock_id]);
      }

      if (promo) {
        await tx.run('UPDATE promos SET used_count = used_count + 1 WHERE id = $1', [promo.id]);
      }

      if (customerId > 0) {
        await tx.run('UPDATE customers SET points = points + $1 WHERE id = $2', [
          Math.floor(total / 10000) * 10,
          customerId,
        ]);
      }

      await tx.run('UPDATE units SET status = $1 WHERE id = $2', [returnStr ? 'Tersedia' : 'Disewa', unit.id]);

      return ins.lastInsertRowid;
    });

    await logActivity(user.username, 'Transaksi Baru', `${invoiceCode} • ${unit.name} • ${customerName} • Rp${total} (${paymentStatus})`);

    return NextResponse.json({ ok: true, id: newId, invoice_code: invoiceCode });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: 'Kode nota duplikat, coba lagi.' }, { status: 409 });
    }
    return NextResponse.json(serverError(err, 'transactions POST'), { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = getAuthUser(request);
    if (!user || user.role === 'Pemilik') {
      return NextResponse.json({ error: 'Akses ditolak (RBAC).' }, { status: 403 });
    }

    const body = await request.json();
    const id = Number(body.id);
    const action = body.action;
    const trx = await dbGet('SELECT * FROM transactions WHERE id = $1', [id]);
    if (!trx) return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 });

    if (action === 'lunasi') {
      await dbRun("UPDATE transactions SET payment_status = 'Lunas' WHERE id = $1", [id]);
      await logActivity(user.username, 'Pelunasan', `${trx.invoice_code} ditandai Lunas`);
      return NextResponse.json({ ok: true });
    }

    if (action === 'selesai') {
      const retStr = sqlNow();
      const retMs = new Date(retStr.replace(' ', 'T')).getTime();
      const endMs = new Date(String(trx.end_time).replace(' ', 'T')).getTime();
      let penalty = Number(trx.penalty || 0);
      if (retMs > endMs) {
        const lateHours = Math.ceil((retMs - endMs) / 3600000);
        penalty = lateHours * Number(trx.price_per_hour || 0);
      }
      const newTotal = Math.max(0, Number(trx.subtotal) - Number(trx.discount) + penalty);

      await dbTx(async (tx) => {
        await tx.run('UPDATE transactions SET return_time = $1, penalty = $2, total = $3 WHERE id = $4', [
          retStr,
          penalty,
          newTotal,
          id,
        ]);
        if (trx.unit_id) {
          await tx.run("UPDATE units SET status = 'Tersedia' WHERE id = $1", [trx.unit_id]);
        }
      });

      await logActivity(user.username, 'Selesai Sewa', `${trx.invoice_code} selesai • Denda Rp${penalty} • Unit kembali Tersedia`);
      return NextResponse.json({ ok: true, penalty, total: newTotal });
    }

    return NextResponse.json({ error: 'Action tidak dikenal.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(serverError(err, 'transactions PATCH'), { status: 500 });
  }
}
