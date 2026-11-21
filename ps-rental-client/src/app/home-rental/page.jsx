'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

function rp(n) {
  return 'Rp' + Math.round(Number(n || 0)).toLocaleString('id-ID');
}

export default function HomeRentalPage() {
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [name, setName] = useState('');
  const [nik, setNik] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [days, setDays] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('qris');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const r = await fetch('/api/catalog');
    const d = await r.json();
    setUnits((d.units || []).filter((u) => u.room_type === 'Home Rental'));
  }

  useEffect(() => {
    load();
  }, []);

  const totalRent = Number(selectedUnit?.price_per_hour || 0) * Number(days || 1);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!selectedUnit) {
      setErr('Pilih paket konsol Portable terlebih dahulu.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name,
          customer_nik: nik,
          customer_phone: phone,
          customer_address: address,
          unit_id: selectedUnit.id,
          duration_hours: Number(days),
          payment_method: paymentMethod,
          is_home_rental: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) setErr(data.error || 'Gagal menyewa.');
      else {
        setOk(data);
        setSelectedUnit(null);
        load();
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
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>🎒 Sewa PlayStation Bawa Pulang (Home Rental)</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Sewa harian konsol PS4 / PS5 lengkap dengan tas hardcase & 2 controller original. Data identitas & deposit tercatat otomatis ke sistem Admin.
        </p>
      </div>

      {err && <div className="alert alert-error">❌ {err}</div>}
      {ok && (
        <div className="alert alert-ok">
          ✅ Pesanan Sewa Bawa Pulang berhasil! Kode: <b>{ok.invoice_code}</b> • Total Sewa: <b>{rp(ok.total)}</b> (+ Deposit Jaminan Rp500.000 tercatat di Admin).{' '}
          <Link href={`/status?q=${encodeURIComponent(ok.invoice_code)}`} style={{ textDecoration: 'underline', fontWeight: 800 }}>Cek Bukti Sewa →</Link>
        </div>
      )}

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 14 }}>
          {units.map((u) => {
            const avail = u.status === 'Tersedia';
            const sel = selectedUnit?.id === u.id;
            return (
              <div
                key={u.id}
                onClick={() => avail && setSelectedUnit(u)}
                className={`floor-card ${u.status.toLowerCase()} ${sel ? 'selected' : ''}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900 }}>{u.name}</h3>
                  <span className="pill pill-blue">{u.ps_type}</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <span className={`pill ${avail ? 'pill-green' : 'pill-red'}`}>{avail ? '● Tersedia Dibawa Pulang' : `⛔ ${u.status}`}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#1d4ed8', marginTop: 10 }}>{rp(u.price_per_hour)}<span style={{ fontSize: 13, fontWeight: 600 }}>/hari (24 jam)</span></div>
                <p style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>{u.features}</p>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="card">
          <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 14 }}>📋 Data Identitas & Pengiriman</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label className="label">Paket Konsol Dipilih</label>
              <div style={{ padding: '10px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, fontWeight: 800, color: '#1d4ed8' }}>
                {selectedUnit ? `${selectedUnit.name} (${selectedUnit.ps_type} • ${rp(selectedUnit.price_per_hour)}/hari)` : 'Klik paket konsol di sebelah kiri'}
              </div>
            </div>
            <div className="grid grid-2">
              <div>
                <label className="label">Nama Sesuai KTP *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="label">NIK KTP (Wajib Jaminan) *</label>
                <input className="input" value={nik} onChange={(e) => setNik(e.target.value)} placeholder="3171xxxxxxxxxxxx" required />
              </div>
            </div>
            <div className="grid grid-2">
              <div>
                <label className="label">Nomor WhatsApp Aktif *</label>
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812xxxxxxxx" required />
              </div>
              <div>
                <label className="label">Durasi Sewa (Hari)</label>
                <select className="input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                  {[1, 2, 3, 5, 7].map((d) => <option key={d} value={d}>{d} Hari ({d * 24} Jam)</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Alamat Lengkap Pengantaran / Domisili *</label>
              <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Jalan, RT/RW, Kelurahan, Kota" required />
            </div>
            <div>
              <label className="label">Metode Pembayaran</label>
              <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="qris">QRIS</option>
                <option value="transfer">Transfer Bank</option>
                <option value="cash">Tunai saat Ambil di Outlet</option>
              </select>
            </div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 14, marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}><span>Biaya Sewa ({days} hari):</span><b>{rp(totalRent)}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#475569', marginTop: 4 }}><span>Deposit Jaminan (Dikembalikan 100% saat konsol kembali):</span><b>Rp500.000</b></div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 13, marginTop: 16 }} disabled={loading}>
            {loading ? 'Memproses...' : '🎒 Ajukan Sewa Bawa Pulang'}
          </button>
        </form>
      </div>
    </div>
  );
}
