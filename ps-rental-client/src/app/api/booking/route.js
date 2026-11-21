import { NextResponse } from 'next/server';
import { dbGet, dbRun, sqlNow } from '@/lib/db';

function toSqlDateTime(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = String(body.customer_name || '').trim();
    const phone = String(body.customer_phone || '').trim();
    const nik = String(body.customer_nik || '').trim() || null;
    const address = String(body.customer_address || '').trim() || null;
    const unitId = Number(body.unit_id || 0);
    const duration = Math.max(1, Number(body.duration_hours || 2));
    const promoCode = String(body.promo_code || '').trim().toUpperCase();
    const paymentMethod = String(body.payment_method || 'qris');
    const isHomeRental = Boolean(body.is_home_rental);
    const addonsReq = Array.isArray(body.addons) ? body.addons : [];

    if (!name || !phone) {
      return NextResponse.json({ error: 'Nama lengkap dan nomor WhatsApp/HP wajib diisi.' }, { status: 400 });
    }

    const unit = await dbGet('SELECT * FROM units WHERE id = ?', [unitId]);
    if (!unit) {
      return NextResponse.json({ error: 'Pilih unit PlayStation terlebih dahulu.' }, { status: 400 });
    }
    if (unit.status !== 'Tersedia') {
      return NextResponse.json({ error: `Maaf, unit ${unit.name} baru saja ${unit.status}. Silakan pilih unit lain.` }, { status: 400 });
    }

    // Cari atau daftarkan pelanggan otomatis ke tabel customers
    let cust = await dbGet('SELECT * FROM customers WHERE phone = ?', [phone]);
    let customerId;
    if (cust) {
      customerId = cust.id;
      if (nik || address) {
        await dbRun(
          'UPDATE customers SET nik = COALESCE(?, nik), address = COALESCE(?, address) WHERE id = ?',
          [nik, address, customerId]
        );
      }
    } else {
      const cIns = await dbRun(
        'INSERT INTO customers (name, nik, phone, address, points, created_at) VALUES (?, ?, ?, ?, 0, ?)',
        [name, nik, phone, address, sqlNow()]
      );
      customerId = cIns.lastInsertRowid;
    }

    const now = new Date();
    const startStr = toSqlDateTime(now);
    const hoursMultiplier = isHomeRental ? duration * 24 : duration;
    const endStr = toSqlDateTime(new Date(now.getTime() + hoursMultiplier * 3600000));

    const rate = Number(unit.price_per_hour || 0);
    const rentSubtotal = rate * duration;

    let addonsTotal = 0;
    const resolvedAddons = [];
    for (const ad of addonsReq) {
      const qty = Math.max(1, Number(ad.qty || 1));
      const st = await dbGet('SELECT * FROM stock WHERE id = ?', [Number(ad.stock_id)]);
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

    const total = Math.max(0, subtotal - discount);
    const paymentStatus = paymentMethod === 'cash' ? 'Belum Lunas' : 'Lunas';
    const invoiceCode = (isHomeRental ? 'HOME-' : 'TRX-') + Date.now().toString().slice(-6);
    const source = isHomeRental ? 'Home Rental' : 'Client Online';

    const ins = await dbRun(
      `INSERT INTO transactions
        (invoice_code, customer_id, customer_name, customer_phone, unit_id, unit_name, booking_source, start_time, end_time, return_time, duration_hours, price_per_hour, addons_total, subtotal, discount, penalty, total, payment_status, payment_method, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'client-web', ?)`,
      [
        invoiceCode,
        customerId,
        name,
        phone,
        unit.id,
        unit.name,
        source,
        startStr,
        endStr,
        duration,
        rate,
        addonsTotal,
        subtotal,
        discount,
        total,
        paymentStatus,
        paymentMethod,
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

    // Tambah poin member otomatis
    const earnedPoints = Math.max(10, Math.floor(total / 10000) * 10);
    await dbRun('UPDATE customers SET points = points + ? WHERE id = ?', [earnedPoints, customerId]);

    // Update status unit otomatis jadi Disewa (FR-10)
    await dbRun("UPDATE units SET status = 'Disewa' WHERE id = ?", [unit.id]);

    if (isHomeRental) {
      await dbRun(
        "INSERT INTO deposits (invoice_code, unit_name, customer_name, customer_nik, deposit_amount, status, notes, created_at) VALUES (?, ?, ?, ?, 500000, 'Ditahan', ?, ?)",
        [invoiceCode, unit.name, name, nik || '-', `Alamat antar: ${address || '-'}`, sqlNow()]
      );
    }

    await dbRun(
      'INSERT INTO activity_logs (username, action, detail, created_at) VALUES (?, ?, ?, ?)',
      ['client-web', source, `${invoiceCode} • ${unit.name} dibooking oleh ${name} (${phone}) sebesar Rp${total}`, sqlNow()]
    );

    return NextResponse.json({
      ok: true,
      invoice_code: invoiceCode,
      total,
      earned_points: earnedPoints,
      payment_status: paymentStatus,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal memproses booking.' }, { status: 500 });
  }
}
