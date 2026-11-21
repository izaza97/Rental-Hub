'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, rupiah } from '@/lib/clientAuth';

export default function InvoicePage({ params }) {
  const [trx, setTrx] = useState(null);
  const [addons, setAddons] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    apiFetch(`/api/transactions?id=${params.id}`)
      .then((res) => {
        setTrx(res.transaction);
        setAddons(res.addons || []);
      })
      .catch((e) => setErr(e.message));
  }, [params.id]);

  if (err) return <div style={{ padding: 32 }}><div className="alert alert-error">❌ {err}</div></div>;
  if (!trx) return <div style={{ padding: 32, textAlign: 'center' }}>Memuat Nota Transaksi...</div>;

  return (
    <div style={{ minHeight: '100vh', padding: 28, background: '#f8fafc' }}>
      <div className="card" style={{ maxWidth: 480, margin: '0 auto', padding: 28 }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #1d4ed8', paddingBottom: 14, marginBottom: 14 }}>
          <div style={{ fontWeight: 900, fontSize: 21, color: '#1d4ed8' }}>🎮 PS RENTAL HUB</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Bukti Transaksi Resmi (SRS FR-18)</div>
          <div style={{ fontWeight: 800, fontSize: 14, marginTop: 6 }}>{trx.invoice_code}</div>
        </div>

        <div style={{ display: 'grid', gap: 8, fontSize: 13.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tanggal</span><b>{String(trx.created_at).slice(0, 16)}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Pelanggan</span><b>{trx.customer_name}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Unit PlayStation</span><b>{trx.unit_name}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Waktu Mulai (FR-15)</span><b>{String(trx.start_time).slice(0, 16)}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Waktu Selesai</span><b>{String(trx.end_time).slice(0, 16)}</b></div>
          {trx.return_time && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Waktu Kembali</span><b>{String(trx.return_time).slice(0, 16)}</b></div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Durasi × Tarif (FR-16)</span>
            <b>{trx.duration_hours} jam × {rupiah(trx.price_per_hour)}</b>
          </div>

          {addons.length > 0 && (
            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#64748b', marginBottom: 4 }}>Add-ons Snack / Stik:</div>
              {addons.map((a) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span>• {a.item_name} × {a.qty}</span>
                  <b>{rupiah(a.subtotal)}</b>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: 8 }}>
            <span>Subtotal</span><b>{rupiah(trx.subtotal)}</b>
          </div>
          {Number(trx.discount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857' }}>
              <span>Diskon Promo</span><b>-{rupiah(trx.discount)}</b>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: Number(trx.penalty) > 0 ? '#dc2626' : '#475569' }}>
            <span>Denda Keterlambatan (FR-20)</span><b>{rupiah(trx.penalty)}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Status & Metode (FR-17)</span><b>{trx.payment_status} ({String(trx.payment_method).toUpperCase()})</b>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '2px solid #1d4ed8', fontSize: 19, fontWeight: 900, color: '#1d4ed8' }}>
          <span>TOTAL BAYAR</span>
          <span>{rupiah(trx.total)}</span>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11.5, color: '#64748b', marginTop: 18 }}>
          Terima kasih telah bermain di PS Rental Hub!<br />Struk ini dihasilkan otomatis dari sistem Next.js.
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '16px auto 0', display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={() => window.print()} className="btn btn-primary">🖨️ Cetak / Simpan PDF</button>
        <Link href="/history" className="btn btn-outline">← Riwayat</Link>
        <Link href="/pos" className="btn btn-outline">+ Transaksi Baru</Link>
      </div>
    </div>
  );
}
