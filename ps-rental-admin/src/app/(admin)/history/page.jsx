'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, getSavedUser, rupiah } from '@/lib/clientAuth';

export default function HistoryPage() {
  const user = getSavedUser();
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState('');
  const [customer, setCustomer] = useState('');
  const [status, setStatus] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load(d = date, c = customer, s = status) {
    try {
      const p = new URLSearchParams();
      if (d) p.set('date', d);
      if (c) p.set('customer', c);
      if (s) p.set('status', s);
      const res = await apiFetch(`/api/transactions?${p.toString()}`);
      setRows(res.transactions || []);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAction(id, action, label) {
    setErr('');
    setMsg('');
    try {
      await apiFetch('/api/transactions', { method: 'PATCH', body: JSON.stringify({ id, action }) });
      setMsg(label);
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Riwayat Transaksi & Pengembalian</h1>
        </div>
        {user?.role !== 'Pemilik' && (
          <Link href="/pos" className="btn btn-primary btn-sm">➕ Transaksi Baru</Link>
        )}
      </div>

      {err && <div className="alert alert-error">❌ {err}</div>}
      {msg && <div className="alert alert-ok">✅ {msg}</div>}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="grid grid-3" style={{ alignItems: 'end' }}>
          <div>
            <label className="label">Filter Tanggal (FR-19)</label>
            <input type="date" className="input" value={date} onChange={(e) => { setDate(e.target.value); load(e.target.value, customer, status); }} />
          </div>
          <div>
            <label className="label">Filter Pelanggan / Kode Nota (FR-19)</label>
            <input className="input" value={customer} onChange={(e) => { setCustomer(e.target.value); load(date, e.target.value, status); }} placeholder="Cari nama pelanggan atau TRX-..." />
          </div>
          <div>
            <label className="label">Status Pembayaran (FR-17)</label>
            <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); load(date, customer, e.target.value); }}>
              <option value="">Semua Status</option>
              <option value="Lunas">Lunas</option>
              <option value="Belum Lunas">Belum Lunas</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nota</th>
              <th>Sumber</th>
              <th>Pelanggan</th>
              <th>Unit & Durasi</th>
              <th>Waktu Sewa</th>
              <th>Denda</th>
              <th>Total</th>
              <th>Pembayaran</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td><span className="pill pill-blue">{t.invoice_code}</span></td>
                <td><span className="pill pill-gray">{t.booking_source}</span></td>
                <td>
                  <div style={{ fontWeight: 800 }}>{t.customer_name}</div>
                  {t.customer_phone && <div style={{ fontSize: 11.5, color: '#64748b' }}>{t.customer_phone}</div>}
                </td>
                <td><b>{t.unit_name}</b> ({t.duration_hours} jam)</td>
                <td style={{ fontSize: 12 }}>
                  <div>Mulai: {String(t.start_time).slice(0, 16)}</div>
                  <div>Selesai: {String(t.end_time).slice(0, 16)}</div>
                  {t.return_time && <div style={{ color: '#047857', fontWeight: 700 }}>✓ Kembali: {String(t.return_time).slice(11, 16)}</div>}
                </td>
                <td>{Number(t.penalty) > 0 ? <span className="pill pill-red">{rupiah(t.penalty)}</span> : '-'}</td>
                <td><b>{rupiah(t.total)}</b></td>
                <td>
                  <span className={`pill ${t.payment_status === 'Lunas' ? 'pill-green' : 'pill-orange'}`}>
                    {t.payment_status}
                  </span>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link href={`/invoice/${t.id}`} className="btn btn-outline btn-sm">🖨️ Nota</Link>
                    {user?.role !== 'Pemilik' && !t.return_time && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleAction(t.id, 'selesai', `Sewa ${t.invoice_code} selesai & unit kembali Tersedia.`)}>
                        ✅ Selesai
                      </button>
                    )}
                    {user?.role !== 'Pemilik' && t.payment_status !== 'Lunas' && (
                      <button className="btn btn-outline btn-sm" onClick={() => handleAction(t.id, 'lunasi', `Transaksi ${t.invoice_code} ditandai Lunas.`)}>
                        💰 Lunasi
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
