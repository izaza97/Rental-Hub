'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, rupiah } from '@/lib/clientAuth';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const res = await apiFetch('/api/dashboard');
      setData(res);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (error) return <div className="alert alert-error">❌ {error}</div>;
  if (!data) return <div className="card">Memuat ringkasan dashboard dari database...</div>;

  const maxRev = Math.max(100000, ...data.dailySeries.map((d) => d.revenue));
  const statusMeta = [
    { key: 'Tersedia', color: '#10b981', bg: '#ecfdf5', icon: '✅' },
    { key: 'Disewa', color: '#ef4444', bg: '#fef2f2', icon: '🎮' },
    { key: 'Maintenance', color: '#f59e0b', bg: '#fffbeb', icon: '🔧' },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard Operasional</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} className="btn btn-outline btn-sm">🔄 Refresh Data</button>
          <Link href="/pos" className="btn btn-primary btn-sm">➕ Transaksi Baru</Link>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="card" style={{ borderLeft: '4px solid #1d4ed8' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Pendapatan Hari Ini (FR-6)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1d4ed8', marginTop: 6 }}>{rupiah(data.todayRevenue)}</div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>Dari POS Admin & Booking Client</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Pendapatan Bulan Ini (FR-6)</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{rupiah(data.monthRevenue)}</div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>{data.monthCount} transaksi bulan ini</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Transaksi Hari Ini (FR-5)</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{data.todayCount} Transaksi</div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>{data.activeRentals.length} sesi sedang berjalan</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Total Unit PS (FR-4)</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{data.totalUnits} Unit</div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>Request Game Client: {data.pendingGameRequests} menunggu</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>📦 Breakdown Status Unit PlayStation (FR-4)</h3>
        <div className="grid grid-3">
          {statusMeta.map((s) => {
            const count = data.statusCounts[s.key] || 0;
            const pct = data.totalUnits ? Math.round((count / data.totalUnits) * 100) : 0;
            return (
              <div key={s.key} style={{ background: s.bg, border: `1px solid ${s.color}40`, borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>{s.icon} {s.key}</span>
                  <span style={{ fontWeight: 900, fontSize: 24, color: s.color }}>{count}</span>
                </div>
                <div style={{ height: 7, background: '#fff', borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: s.color }} />
                </div>
                <div style={{ fontSize: 11.5, color: '#475569', marginTop: 6 }}>{pct}% dari seluruh konsol</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>📈 Grafik Pendapatan 7 Hari Terakhir (FR-6)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 190, paddingTop: 20 }}>
            {data.dailySeries.map((d) => {
              const h = Math.max(8, Math.round((d.revenue / maxRev) * 140));
              return (
                <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: '#1d4ed8' }}>
                    {d.revenue > 0 ? `${Math.round(d.revenue / 1000)}rb` : '0'}
                  </div>
                  <div style={{ width: '100%', maxWidth: 38, height: h, background: 'linear-gradient(180deg, #3b82f6, #1d4ed8)', borderRadius: '8px 8px 4px 4px' }} />
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{d.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>⏰ Pengingat Unit Sedang Disewa</h3>
            <Link href="/history" className="btn btn-outline btn-sm">Kelola →</Link>
          </div>
          {data.activeRentals.length === 0 ? (
            <p style={{ fontSize: 13, color: '#64748b' }}>Semua unit sedang tidak dalam sesi aktif.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {data.activeRentals.map((r) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13.5 }}>{r.unit_name} — {r.customer_name}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>
                      {r.invoice_code} • Sumber: <b>{r.booking_source}</b> • Selesai: {String(r.end_time).slice(11, 16)}
                    </div>
                  </div>
                  <span className={`pill ${r.payment_status === 'Lunas' ? 'pill-green' : 'pill-orange'}`}>{r.payment_status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
