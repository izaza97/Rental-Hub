'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function rp(n) {
  return 'Rp' + Math.round(Number(n || 0)).toLocaleString('id-ID');
}

function getTier(points = 0) {
  if (points >= 300) return { name: 'Platinum Member', color: '#1e3a8a', perk: 'Diskon Member 20% + Prioritas VIP' };
  if (points >= 150) return { name: 'Gold Member', color: '#b45309', perk: 'Diskon Member 15% + Free Minuman' };
  if (points >= 75) return { name: 'Silver Member', color: '#475569', perk: 'Diskon Member 10%' };
  return { name: 'Bronze Member', color: '#1d4ed8', perk: 'Kumpulkan poin setiap transaksi Rp10.000 = 10 pts' };
}

function StatusContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [q, setQ] = useState(initialQ);
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);

  async function search(queryStr) {
    const r = await fetch(`/api/status?q=${encodeURIComponent(queryStr || '')}`);
    const d = await r.json();
    setCustomer(d.customer || null);
    setTransactions(d.transactions || []);
  }

  useEffect(() => {
    search(initialQ);
  }, [initialQ]);

  const tier = customer ? getTier(customer.points) : null;

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>🧾 Cek Status Booking & Poin Membership</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Masukkan Kode Nota (mis. <b>TRX-1002</b>), Nomor HP (mis. <b>081234567890</b>), atau Nama Anda.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(q);
        }}
        className="card"
        style={{ display: 'flex', gap: 10, marginBottom: 22 }}
      >
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ketik Kode TRX-..., Nomor HP, atau Nama Pelanggan..." />
        <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>🔍 Cek Sekarang</button>
      </form>

      {customer && (
        <div className="card" style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', color: '#fff', marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 700 }}>KARTU LOYALITAS DIGITAL</div>
              <h2 style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{customer.name}</h2>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>📱 {customer.phone || '-'} • {tier.perk}</div>
            </div>
            <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.16)', padding: '12px 18px', borderRadius: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{tier.name}</div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>⭐ {customer.points || 0} pts</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {transactions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: '#64748b' }}>Tidak ditemukan transaksi untuk pencarian tersebut.</div>
        ) : (
          transactions.map((t) => (
            <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span className="pill pill-blue">{t.invoice_code}</span>
                  <span className={`pill ${t.payment_status === 'Lunas' ? 'pill-green' : 'pill-orange'}`}>{t.payment_status}</span>
                  <span className="pill pill-blue">{t.booking_source}</span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800 }}>{t.unit_name} — {t.customer_name}</h3>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  Mulai: {String(t.start_time).slice(0, 16)} • Selesai: {String(t.end_time).slice(0, 16)} • Durasi: {t.duration_hours} {t.booking_source === 'Home Rental' ? 'hari' : 'jam'}
                </div>
                {t.return_time && <div style={{ fontSize: 12.5, color: '#047857', fontWeight: 700, marginTop: 4 }}>✓ Sesi telah diselesaikan pada {String(t.return_time).slice(0, 16)}</div>}
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#1d4ed8' }}>{rp(t.total)}</div>
                {Number(t.penalty) > 0 && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 700 }}>Termasuk Denda {rp(t.penalty)}</div>}
                <button type="button" onClick={() => window.print()} className="btn btn-white btn-sm" style={{ marginTop: 8 }}>🖨️ Cetak Bukti</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: 32 }}>Memuat status booking...</div>}>
      <StatusContent />
    </Suspense>
  );
}
