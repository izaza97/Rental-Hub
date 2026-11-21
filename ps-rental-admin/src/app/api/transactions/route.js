export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { dbAll, dbGet, dbRun, sqlNow } from '@/lib/db';
import { getAuthUser, canRole, logActivity } from '@/lib/auth';

function toSqlDateTime(input) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function GET(request) {
  const user = getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (id) {
    const trx = await dbGet('SELECT * FROM transactions WHERE id = ?', [Number(id)]);
    if (!trx) return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 });
    const addons = await dbAll('SELECT * FROM transaction_addons WHERE transaction_id = ?', [Number(id)]);
    return NextResponse.json({ transaction: trx, addons });
  }

  const date = (searchParams.get('date') || '').trim();
  const customer = (searchParams.get('customer') || '').trim();
  const status = (searchParams.get('status') || '').trim();

  const where = [];
  const params = [];
  if (date) {
    where.push('created_at LIKE ?');
    params.push(`${date}%`);
  }
  if (customer) {
    where.push('(customer_name LIKE ? OR invoice_code LIKE ?)');
    params.push(`%${customer}%`, `%${customer}%`);
  }
  if (status) {
    where.push('payment_status = ?');
    params.push(status);
  }

  const sql = `SELECT * FROM transactions${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC`;
  const transactions = await dbAll(sql, params);
  return NextResponse.json({ transactions });
}

export async function POST(request) {
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
    const cust = await dbGet('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (cust) {
      customerName = cust.name;
      customerPhone = cust.phone;
    }
  }
  if (!customerName) {
    return NextResponse.json({ error: 'Pilih pelanggan terdaftar atau isi nama walk-in (FR-14).' }, { status: 400 });
  }

  const unit = await dbGet('SELECT * FROM units WHERE id = ?', [unitId]);
  if (!unit) {
    return NextResponse.json({ error: 'Pilih unit PlayStation terlebih dahulu (FR-14).' }, { status: 400 });
  }
  if (unit.status !== 'Tersedia') {
    return NextResponse.json({ error: `Unit ${unit.name} sedang ${unit.status} — tidak dapat disewa (NFR-10).` }, { status: 400 });
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
    const st = await dbGet('SELECT * FROM stock WHERE id = ?', [Number(item.stock_id)]);
    if (st && st.qty >= qty) {
      const sub = Number(st.price) * qty;
      addonsTotal += sub;
      resolvedAddons.push({ stock_id: st.id, item_name: st.name, price: Number(st.price), qty, subtotal: sub });
    }
  }

  const subtotal = rentSubtotal + addonsTotal;

  let discount = 0;
  if (promoCode) {
    const promo = await dbGet('SELECT * FROM promos WHERE code = ?', [promoCode]);
    if (promo) {
      discount = Math.round(subtotal * (Number(promo.discount_percent) / 100));
      await dbRun('UPDATE promos SET used_count = used_count + 1 WHERE id = ?', [promo.id]);
    }
  }

  let penalty = 0;
  const returnStr = toSqlDateTime(body.return_time);
  if (returnStr) {
    const retMs = new Date(returnStr.replace(' ', 'T')).getTime();
    if (retMs > endMs) {
      const lateHours = Math.ceil((retMs - endMs) / 3600000);
      penalty = lateHours * rate; // FR-20 & NFR-11
    }
  }

  const total = Math.max(0, subtotal - discount + penalty);
  const invoiceCode = 'TRX-' + Date.now().toString().slice(-6);

  const ins = await dbRun(
    `INSERT INTO transactions
      (invoice_code, customer_id, customer_name, customer_phone, unit_id, unit_name, booking_source, start_time, end_time, return_time, duration_hours, price_per_hour, addons_total, subtotal, discount, penalty, total, payment_status, payment_method, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'Admin POS', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    await dbRun(
      'INSERT INTO transaction_addons (transaction_id, stock_id, item_name, price, qty, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
      [ins.lastInsertRowid, ad.stock_id, ad.item_name, ad.price, ad.qty, ad.subtotal]
    );
    await dbRun('UPDATE stock SET qty = qty - ?, sold = sold + ? WHERE id = ?', [ad.qty, ad.qty, ad.stock_id]);
  }

  if (customerId > 0) {
    await dbRun('UPDATE customers SET points = points + ? WHERE id = ?', [Math.floor(total / 10000) * 10, customerId]);
  }

  // FR-10: otomatis Disewa saat mulai, Tersedia jika langsung dikembalikan
  await dbRun('UPDATE units SET status = ? WHERE id = ?', [returnStr ? 'Tersedia' : 'Disewa', unit.id]);
  await logActivity(user.username, 'Transaksi Baru', `${invoiceCode} • ${unit.name} • ${customerName} • Rp${total} (${paymentStatus})`);

  return NextResponse.json({ ok: true, id: ins.lastInsertRowid, invoice_code: invoiceCode });
}

export async function PATCH(request) {
  const user = getAuthUser(request);
  if (!user || user.role === 'Pemilik') {
    return NextResponse.json({ error: 'Akses ditolak (RBAC).' }, { status: 403 });
  }

  const body = await request.json();
  const id = Number(body.id);
  const action = body.action;
  const trx = await dbGet('SELECT * FROM transactions WHERE id = ?', [id]);
  if (!trx) return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 });

  if (action === 'lunasi') {
    await dbRun("UPDATE transactions SET payment_status = 'Lunas' WHERE id = ?", [id]);
    await logActivity(user.username, 'Pelunasan', `${trx.invoice_code} ditandai Lunas (FR-17)`);
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
    await dbRun('UPDATE transactions SET return_time = ?, penalty = ?, total = ? WHERE id = ?', [retStr, penalty, newTotal, id]);
    if (trx.unit_id) {
      await dbRun("UPDATE units SET status = 'Tersedia' WHERE id = ?", [trx.unit_id]); // FR-10
    }
    await logActivity(user.username, 'Selesai Sewa', `${trx.invoice_code} selesai • Denda Rp${penalty} • Unit kembali Tersedia`);
    return NextResponse.json({ ok: true, penalty, total: newTotal });
  }

  return NextResponse.json({ error: 'Action tidak dikenal.' }, { status: 400 });
}
