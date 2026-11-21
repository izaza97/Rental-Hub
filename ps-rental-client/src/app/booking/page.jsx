'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

function rp(n) {
  return 'Rp' + Math.round(Number(n || 0)).toLocaleString('id-ID');
}

export default function BookingPage() {
  const [units, setUnits] = useState([]);
  const [stock, setStock] = useState([]);
  const [promos, setPromos] = useState([]);
  const [roomFilter, setRoomFilter] = useState('Semua');
  const [selectedUnit, setSelectedUnit] = useState(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [duration, setDuration] = useState(2);
  const [promoCode, setPromoCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('qris');
  const [cart, setCart] = useState({});
  const [err, setErr] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadCatalog() {
    const r = await fetch('/api/catalog');
    const d = await r.json();
    setUnits((d.units || []).filter((u) => u.room_type !== 'Home Rental'));
    setStock(d.stock || []);
    setPromos(d.promos || []);
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  const filteredUnits = roomFilter === 'Semua' ? units : units.filter((u) => u.room_type === roomFilter);
  const rate = Number(selectedUnit?.price_per_hour || 0);
  const rentSub = rate * Number(duration || 1);
  const addonsSub = Object.entries(cart).reduce((s, [id, q]) => {
    const it = stock.find((x) => String(x.id) === String(id));
    return s + (it ? Number(it.price) * q : 0);
  }, 0);
  const subtotal = rentSub + addonsSub;
  const promoObj = promos.find((p) => p.code === promoCode.trim().toUpperCase());
  const discount = promoObj ? Math.round(subtotal * (Number(promoObj.discount_percent) / 100)) : 0;
  const total = Math.max(0, subtotal - discount);

  async function handleBook(e) {
    e.preventDefault();
    setErr('');
    if (!selectedUnit) {
      setErr('Klik salah satu bilik PlayStation berstatus Tersedia terlebih dahulu.');
      return;
    }
    setLoading(true);
    try {
      const addons = Object.entries(cart).map(([stock_id, qty]) => ({ stock_id: Number(stock_id), qty }));
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name,
          customer_phone: phone,
          unit_id: selectedUnit.id,
          duration_hours: Number(duration),
          promo_code: promoCode,
          payment_method: paymentMethod,
          addons,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || 'Booking gagal.');
      } else {
        setReceipt({ ...data, unit_name: selectedUnit.name, customer_name: name, customer_phone: phone });
        setSelectedUnit(null);
        setCart({});
        loadCatalog();
      }
    } catch {
      setErr('Gagal menghubungi server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>🎮 Interactive Floor Plan & Booking Online</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Pilih bilik yang berstatus <b>Tersedia</b>. Begitu Anda booking, bilik otomatis dikunci di sistem Admin & Kasir!
        </p>
      </div>

      {err && <div className="alert alert-error">❌ {err}</div>}

      {receipt && (
        <div className="card" style={{ border: '2px solid #10b981', background: '#ecfdf5', marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#065f46' }}>🎉 Booking Berhasil Dikonfirmasi!</h3>
          <p style={{ fontSize: 13.5, color: '#047857', marginTop: 4 }}>
            Kode Booking: <b>{receipt.invoice_code}</b> • Unit: <b>{receipt.unit_name}</b> • Total: <b>{rp(receipt.total)}</b> ({receipt.payment_status}) • Bonus Poin: <b>+{receipt.earned_points} pts</b>
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <Link href={`/status?q=${encodeURIComponent(receipt.invoice_code)}`} className="btn btn-primary btn-sm">
              🧾 Lihat Struk & Status Member →
            </Link>
            <button className="btn btn-white btn-sm" onClick={() => setReceipt(null)}>Tutup</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {['Semua', 'VIP Room', 'Reguler', 'VR Corner'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setRoomFilter(tab)}
            className={`btn btn-sm ${roomFilter === tab ? 'btn-primary' : 'btn-white'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 18 }}>
          <div className="grid grid-2" style={{ gap: 12 }}>
            {filteredUnits.map((u) => {
              const avail = u.status === 'Tersedia';
              const isSel = selectedUnit?.id === u.id;
              return (
                <div
                  key={u.id}
                  onClick={() => avail && setSelectedUnit(u)}
                  className={`floor-card ${u.status.toLowerCase()} ${isSel ? 'selected' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ fontSize: 16 }}>{u.name}</b>
                    <span className="pill pill-blue">{u.ps_type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{u.room_type}</div>
                  <div style={{ marginTop: 8 }}>
                    <span className={`pill ${avail ? 'pill-green' : u.status === 'Disewa' ? 'pill-red' : 'pill-orange'}`}>
                      {avail ? '● Tersedia' : `⛔ ${u.status}`}
                    </span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#1d4ed8', marginTop: 10 }}>{rp(u.price_per_hour)}<span style={{ fontSize: 12, fontWeight: 600 }}>/jam</span></div>
                  <div style={{ fontSize: 11.5, color: '#475569', marginTop: 6 }}>{u.features}</div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>🍿 Pesan Snack & Stik Tambahan ke Bilik (Opsional)</h3>
            <div className="grid grid-2" style={{ gap: 10 }}>
              {stock.map((s) => {
                const q = cart[s.id] || 0;
                return (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{rp(s.price)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {q > 0 && (
                        <button
                          type="button"
                          className="btn btn-white btn-sm"
                          onClick={() => {
                            const c = { ...cart };
                            if (q <= 1) delete c[s.id]; else c[s.id] = q - 1;
                            setCart(c);
                          }}
                        >-</button>
                      )}
                      {q > 0 && <b style={{ fontSize: 13 }}>{q}</b>}
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => q < s.qty && setCart({ ...cart, [s.id]: q + 1 })}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <form onSubmit={handleBook} className="card" style={{ position: 'sticky', top: 88 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 14 }}>📝 Form Checkout Booking</h3>

          <div style={{ marginBottom: 12 }}>
            <label className="label">Bilik PlayStation Dipilih</label>
            <div style={{ padding: '10px 12px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', fontWeight: 800, color: '#1d4ed8', fontSize: 14 }}>
              {selectedUnit ? `${selectedUnit.name} (${selectedUnit.ps_type} • ${rp(rate)}/jam)` : 'Klik bilik hijau di sebelah kiri'}
            </div>
          </div>

          <div className="grid grid-2" style={{ marginBottom: 12 }}>
            <div>
              <label className="label">Nama Lengkap *</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Anda" required />
            </div>
            <div>
              <label className="label">Nomor WhatsApp / HP *</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812xxxxxxxx" required />
            </div>
            <div>
              <label className="label">Durasi Main (Jam)</label>
              <select className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>{h} Jam</option>)}
              </select>
            </div>
            <div>
              <label className="label">Kode Promo</label>
              <input className="input" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="HAPPYHOUR / NEWBIE50" />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Metode Pembayaran</label>
            <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="qris">QRIS Instan (Otomatis Lunas)</option>
              <option value="gopay">GoPay (Otomatis Lunas)</option>
              <option value="ovo">OVO (Otomatis Lunas)</option>
              <option value="cash">Bayar Tunai di Kasir (Belum Lunas)</option>
            </select>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, fontSize: 13.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Sewa Bilik ({duration} jam)</span><b>{rp(rentSub)}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Snack & Aksesori</span><b>{rp(addonsSub)}</b></div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#047857' }}>
                <span>Diskon Promo ({promoObj.code})</span><b>-{rp(discount)}</b>
              </div>
            )}
            <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 19, fontWeight: 900, color: '#1d4ed8' }}>
              <span>Total Bayar</span><span>{rp(total)}</span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 13, marginTop: 16 }} disabled={loading}>
            {loading ? 'Memproses Booking...' : '🚀 Konfirmasi Booking Sekarang'}
          </button>
        </form>
      </div>
    </div>
  );
}
