import { NextResponse } from 'next/server';
import { dbGet, dbRun, dbTx, sqlNow, isUniqueViolation, serverError } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

    const unit = await dbGet('SELECT * FROM units WHERE id = $1', [unitId]);
    if (!unit) {
      return NextResponse.json({ error: 'Pilih unit PlayStation terlebih dahulu.' }, { status: 400 });
    }
    if (unit.status !== 'Tersedia') {
      return NextResponse.json(
        { error: `Maaf, unit ${unit.name} baru saja ${unit.status}. Silakan pilih unit lain.` },
        { status: 400 }
      );
    }

    // Cari pelanggan berdasarkan HP (ILIKE tidak perlu — pencocokan nomor tepat)
    let cust = await dbGet('SELECT * FROM customers WHERE phone = $1', [phone]);

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
      const st = await dbGet('SELECT * FROM stock WHERE id = $1', [Number(ad.stock_id)]);
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

    const total = Math.max(0, subtotal - discount);
    const paymentStatus = paymentMethod === 'cash' ? 'Belum Lunas' : 'Lunas';
    const invoiceCode = (isHomeRental ? 'HOME-' : 'TRX-') + Date.now().toString().slice(-6);
    const source = isHomeRental ? 'Home Rental' : 'Client Online';
    const earnedPoints = Math.max(10, Math.floor(total / 10000) * 10);

    // Satu transaksi DB atomic: pelanggan + transaksi + addon + stok + poin
    // + status unit + deposit + audit log (aman bila terjadi kegagalan di tengah jalan)
    const result = await dbTx(async (tx) => {
      let customerId;
      if (cust) {
        customerId = cust.id;
        if (nik || address) {
          await tx.run('UPDATE customers SET nik = COALESCE($1, nik), address = COALESCE($2, address) WHERE id = $3', [
            nik,
            address,
            customerId,
          ]);
        }
      } else {
        const cIns = await tx.run(
          'INSERT INTO customers (name, nik, phone, address, points, created_at) VALUES ($1, $2, $3, $4, 0, $5) RETURNING id',
          [name, nik, phone, address, sqlNow()]
        );
        customerId = cIns.lastInsertRowid;
      }

      const ins = await tx.run(
        `INSERT INTO transactions
          (invoice_code, customer_id, customer_name, customer_phone, unit_id, unit_name, booking_source, start_time, end_time, return_time, duration_hours, price_per_hour, addons_total, subtotal, discount, penalty, total, payment_status, payment_method, created_by, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, $10, $11, $12, $13, $14, 0, $15, $16, $17, 'client-web', $18)
          RETURNING id`,
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
        await tx.run(
          'INSERT INTO transaction_addons (transaction_id, stock_id, item_name, price, qty, subtotal) VALUES ($1, $2, $3, $4, $5, $6)',
          [ins.lastInsertRowid, ad.stock_id, ad.item_name, ad.price, ad.qty, ad.subtotal]
        );
        await tx.run('UPDATE stock SET qty = qty - $1, sold = sold + $1 WHERE id = $2', [ad.qty, ad.stock_id]);
      }

      if (promo) {
        await tx.run('UPDATE promos SET used_count = used_count + 1 WHERE id = $1', [promo.id]);
      }

      // Tambah poin member otomatis
      await tx.run('UPDATE customers SET points = points + $1 WHERE id = $2', [earnedPoints, customerId]);

      // Update status unit otomatis jadi Disewa
      await tx.run("UPDATE units SET status = 'Disewa' WHERE id = $1", [unit.id]);

      if (isHomeRental) {
        await tx.run(
          "INSERT INTO deposits (invoice_code, unit_name, customer_name, customer_nik, deposit_amount, status, notes, created_at) VALUES ($1, $2, $3, $4, 500000, 'Ditahan', $5, $6)",
          [invoiceCode, unit.name, name, nik || '-', `Alamat antar: ${address || '-'}`, sqlNow()]
        );
      }

      await tx.run('INSERT INTO activity_logs (username, action, detail, created_at) VALUES ($1, $2, $3, $4)', [
        'client-web',
        source,
        `${invoiceCode} • ${unit.name} dibooking oleh ${name} (${phone}) sebesar Rp${total}`,
        sqlNow(),
      ]);

      return { id: ins.lastInsertRowid };
    });

    return NextResponse.json({
      ok: true,
      invoice_code: invoiceCode,
      total,
      earned_points: earnedPoints,
      payment_status: paymentStatus,
      id: result.id,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: 'Kode nota bentrok, silakan coba lagi.' }, { status: 409 });
    }
    return NextResponse.json(serverError(err, 'booking POST'), { status: 500 });
  }
}
