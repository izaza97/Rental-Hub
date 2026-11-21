'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, rupiah } from '@/lib/clientAuth';

function localIsoNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PosPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [units, setUnits] = useState([]);
  const [stock, setStock] = useState([]);
  const [promos, setPromos] = useState([]);

  const [customerId, setCustomerId] = useState('0');
  const [walkinName, setWalkinName] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(2);
  const [returnTime, setReturnTime] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Lunas');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cart, setCart] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStartTime(localIsoNow());
    Promise.all([
      apiFetch('/api/customers'),
      apiFetch('/api/units'),
      apiFetch('/api/extras'),
    ]).then(([cRes, uRes, eRes]) => {
      setCustomers(cRes.customers || []);
      setUnits(uRes.units || []);
      setStock(eRes.stock || []);
      setPromos(eRes.promos || []);
    }).catch((e) => setErr(e.message));
  }, []);

  const rate = Number(selectedUnit?.price_per_hour || 0);
  const rentSubtotal = rate * Number(duration || 0);
  const addonsTotal = Object.entries(cart).reduce((sum, [sid, qty]) => {
    const item = stock.find((s) => String(s.id) === String(sid));
    return sum + (item ? Number(item.price) * qty : 0);
  }, 0);
  const subtotal = rentSubtotal + addonsTotal;

  const matchedPromo = promos.find((p) => p.code === promoCode.trim().toUpperCase());
  const discount = matchedPromo ? Math.round(subtotal * (Number(matchedPromo.discount_percent) / 100)) : 0;

  let penalty = 0;
  if (startTime && returnTime && rate > 0) {
    const endMs = new Date(startTime).getTime() + Number(duration) * 3600000;
    const retMs = new Date(returnTime).getTime();
    if (retMs > endMs) {
      penalty = Math.ceil((retMs - endMs) / 3600000) * rate;
    }
  }
  const total = Math.max(0, subtotal - discount + penalty);

  function addCart(item) {
    const cur = cart[item.id] || 0;
    if (cur + 1 > item.qty) return;
    setCart({ ...cart, [item.id]: cur + 1 });
  }

  function removeCart(item) {
    const cur = cart[item.id] || 0;
    if (cur <= 1) {
      const copy = { ...cart };
      delete copy[item.id];
      setCart(copy);
    } else {
      setCart({ ...cart, [item.id]: cur - 1 });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!selectedUnit) {
      setErr('Pilih unit PlayStation yang berstatus Tersedia terlebih dahulu (FR-14).');
      return;
    }
    setSaving(true);
    try {
      const addons = Object.entries(cart).map(([stock_id, qty]) => ({ stock_id: Number(stock_id), qty }));
      const res = await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: Number(customerId),
          walkin_name: walkinName,
          unit_id: selectedUnit.id,
          duration_hours: Number(duration),
          start_time: startTime,
          return_time: returnTime || null,
          promo_code: promoCode,
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          addons,
        }),
      });
      router.push(`/invoice/${res.id}`);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Transaksi Rental Baru (POS Kasir)</h1>
          <p className="page-sub">FR-14 s/d FR-20: Pilih pelanggan & unit tersedia, jam mulai otomatis, hitung durasi, add-ons, diskon & denda</p>
        </div>
      </div>

      {err && <div className="alert alert-error">❌ {err}</div>}

      <form onSubmit={handleSubmit} className="grid grid-2" style={{ alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>1️⃣ Pilih Pelanggan & Unit PlayStation (FR-14, NFR-10)</h3>
            <label className="label">Pelanggan Master</label>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="0">-- Pelanggan Walk-in (Ketik Nama Manual) --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
              ))}
            </select>

            {customerId === '0' && (
              <div style={{ marginTop: 10 }}>
                <label className="label">Nama Pelanggan Walk-in *</label>
                <input className="input" value={walkinName} onChange={(e) => setWalkinName(e.target.value)} placeholder="Contoh: Riko Walk-in" required />
              </div>
            )}

            <label className="label" style={{ marginTop: 14 }}>Klik Unit Tersedia (Unit Disewa/Maintenance terkunci otomatis — NFR-10)</label>
            <div className="grid grid-2" style={{ gap: 10, marginTop: 8 }}>
              {units.map((u) => {
                const avail = u.status === 'Tersedia';
                const isSel = selectedUnit?.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      if (!avail) {
                        setErr(`Unit ${u.name} berstatus ${u.status} — tidak dapat dipilih (NFR-10).`);
                        return;
                      }
                      setErr('');
                      setSelectedUnit(u);
                    }}
                    className={`unit-card ${u.status.toLowerCase()} ${isSel ? 'selected' : ''}`}
                    style={{ cursor: avail ? 'pointer' : 'not-allowed', opacity: avail ? 1 : 0.65 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 13.5 }}>
                      <span>{u.name}</span>
                      <span className="pill pill-blue">{u.ps_type}</span>
                    </div>
                    <div style={{ fontSize: 12, marginTop: 4, fontWeight: 700, color: avail ? '#047857' : '#b91c1c' }}>
                      {avail ? '● Tersedia' : `⛔ ${u.status}`}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1d4ed8', marginTop: 6 }}>{rupiah(u.price_per_hour)}/jam</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>🍟 Tambahan Aksesori & Snack Bar (Opsional)</h3>
            <div className="grid grid-2" style={{ gap: 10 }}>
              {stock.map((s) => {
                const qty = cart[s.id] || 0;
                return (
                  <div key={s.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{s.name}</div>
                      <div style={{ fontSize: 11.5, color: '#64748b' }}>{rupiah(s.price)} • Stok {s.qty}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {qty > 0 && <button type="button" className="btn btn-outline btn-sm" onClick={() => removeCart(s)}>-</button>}
                      {qty > 0 && <b style={{ fontSize: 13 }}>{qty}</b>}
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => addCart(s)} disabled={s.qty <= qty}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card" style={{ position: 'sticky', top: 84 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>2️⃣ Waktu Sewa, Denda & Pembayaran (FR-15 s/d FR-20)</h3>
          <div className="grid grid-2">
            <div>
              <label className="label">Waktu Mulai Otomatis (FR-15)</label>
              <input type="datetime-local" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
            <div>
              <label className="label">Durasi Sewa (Jam) — FR-16</label>
              <input type="number" step="0.5" min="0.5" className="input" value={duration} onChange={(e) => setDuration(e.target.value)} required />
            </div>
            <div>
              <label className="label">Waktu Kembali Aktual (Uji Denda FR-20)</label>
              <input type="datetime-local" className="input" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} />
            </div>
            <div>
              <label className="label">Kode Promo Diskon</label>
              <input className="input" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="HAPPYHOUR / NEWBIE50" />
            </div>
            <div>
              <label className="label">Status Pembayaran (FR-17)</label>
              <select className="input" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                <option value="Lunas">Lunas</option>
                <option value="Belum Lunas">Belum Lunas</option>
              </select>
            </div>
            <div>
              <label className="label">Metode Pembayaran</label>
              <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Tunai (Cash)</option>
                <option value="qris">QRIS</option>
                <option value="gopay">GoPay</option>
                <option value="ovo">OVO</option>
                <option value="transfer">Transfer Bank</option>
              </select>
            </div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 16, marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}>
              <span>Unit Dipilih:</span>
              <b>{selectedUnit ? `${selectedUnit.name} (${rupiah(rate)}/jam)` : '- belum dipilih -'}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}>
              <span>Sewa Konsol ({duration} jam):</span>
              <b>{rupiah(rentSubtotal)}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}>
              <span>Add-ons Snack/Stik:</span>
              <b>{rupiah(addonsTotal)}</b>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6, color: '#047857' }}>
                <span>Diskon Promo ({matchedPromo.code}):</span>
                <b>-{rupiah(discount)}</b>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 8, color: penalty > 0 ? '#dc2626' : '#475569' }}>
              <span>Denda Keterlambatan (FR-20 / NFR-11):</span>
              <b>{rupiah(penalty)}</b>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid #bfdbfe', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 900, color: '#1d4ed8' }}>
              <span>TOTAL TAGIHAN</span>
              <span>{rupiah(total)}</span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 13, marginTop: 16 }} disabled={saving}>
            {saving ? 'Menyimpan Transaksi...' : '💾 Simpan Transaksi & Buka Nota (FR-18)'}
          </button>
        </div>
      </form>
    </div>
  );
}
