'use client';

import { useEffect, useState } from 'react';
import { apiFetch, rupiah } from '@/lib/clientAuth';

export default function ExtrasPage() {
  const [stock, setStock] = useState([]);
  const [promos, setPromos] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stockForm, setStockForm] = useState({ name: '', price: 10000, qty: 20, category: 'Makanan' });
  const [promoForm, setPromoForm] = useState({ code: '', discount_percent: 20, description: '', expired_at: '2027-12-31' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    try {
      const res = await apiFetch('/api/extras');
      setStock(res.stock || []);
      setPromos(res.promos || []);
      setDeposits(res.deposits || []);
      setRequests(res.gameRequests || []);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function postExtra(payload, successMsg) {
    setErr('');
    setMsg('');
    try {
      await apiFetch('/api/extras', { method: 'POST', body: JSON.stringify(payload) });
      setMsg(successMsg);
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Stok Snack, Promo, Deposit & Request Game Client</h1>
        </div>
      </div>

      {err && <div className="alert alert-error">❌ {err}</div>}
      {msg && <div className="alert alert-ok">✅ {msg}</div>}

      <div className="grid grid-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>🍟 Manajemen Stok Aksesori & Snack</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              postExtra({ type: 'stock', ...stockForm }, 'Item stok baru ditambahkan.');
              setStockForm({ name: '', price: 10000, qty: 20, category: 'Makanan' });
            }}
            className="grid grid-2"
            style={{ marginBottom: 14 }}
          >
            <input className="input" placeholder="Nama item" value={stockForm.name} onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })} required />
            <select className="input" value={stockForm.category} onChange={(e) => setStockForm({ ...stockForm, category: e.target.value })}>
              <option>Makanan</option>
              <option>Minuman</option>
              <option>Aksesori</option>
            </select>
            <input className="input" type="number" placeholder="Harga" value={stockForm.price} onChange={(e) => setStockForm({ ...stockForm, price: Number(e.target.value) })} required />
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" type="number" placeholder="Qty" value={stockForm.qty} onChange={(e) => setStockForm({ ...stockForm, qty: Number(e.target.value) })} required />
              <button className="btn btn-primary btn-sm" type="submit">+ Tambah</button>
            </div>
          </form>

          <div style={{ display: 'grid', gap: 8 }}>
            {stock.map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.name} <span className="pill pill-gray">{s.category}</span></div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{rupiah(s.price)} • Sisa: <b>{s.qty}</b> • Terjual: {s.sold}</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => postExtra({ type: 'restock', id: s.id, add_qty: 10 }, `Restock ${s.name} +10 pcs`)}>+10 Stok</button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>🎟️ Kupon Promo (Aktif di POS & Website Client)</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              postExtra({ type: 'promo', ...promoForm }, 'Kode promo ditambahkan.');
              setPromoForm({ code: '', discount_percent: 20, description: '', expired_at: '2027-12-31' });
            }}
            className="grid grid-2"
            style={{ marginBottom: 14 }}
          >
            <input className="input" placeholder="Kode (mis. MERDEKA25)" value={promoForm.code} onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })} required />
            <input className="input" type="number" placeholder="Diskon %" value={promoForm.discount_percent} onChange={(e) => setPromoForm({ ...promoForm, discount_percent: Number(e.target.value) })} required />
            <input className="input" placeholder="Deskripsi singkat" value={promoForm.description} onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })} />
            <button className="btn btn-primary btn-sm" type="submit">+ Simpan Promo</button>
          </form>

          <div style={{ display: 'grid', gap: 8 }}>
            {promos.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#1d4ed8', fontSize: 13.5 }}>{p.code} — Diskon {p.discount_percent}%</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{p.description || 'Promo aktif'} • Dipakai {p.used_count}x</div>
                </div>
                <span className="pill pill-blue">s/d {p.expired_at}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>🎮 Request Instalasi Game dari Website Client</h3>
          {requests.length === 0 ? (
            <p style={{ fontSize: 13, color: '#64748b' }}>Belum ada request game dari pelanggan.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {requests.map((r) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13.5 }}>{r.game_title} <span className="pill pill-blue">{r.platform}</span></div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Oleh: {r.customer_name} • Unit: {r.unit_preference || 'Bebas'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`pill ${r.status === 'Selesai' ? 'pill-green' : r.status === 'Disetujui' ? 'pill-blue' : 'pill-orange'}`}>{r.status}</span>
                    {r.status !== 'Selesai' && (
                      <button className="btn btn-primary btn-sm" onClick={() => postExtra({ type: 'game_request_status', id: r.id, status: r.status === 'Menunggu' ? 'Disetujui' : 'Selesai' }, 'Status request game diperbarui.')}>
                        ✓ Proses
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>🛡️ Deposit Jaminan Sewa Bawa Pulang (Home Rental)</h3>
          {deposits.length === 0 ? (
            <p style={{ fontSize: 13, color: '#64748b' }}>Belum ada data deposit.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {deposits.map((d) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13.5 }}>{d.customer_name} — {d.unit_name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Deposit: <b>{rupiah(d.deposit_amount)}</b> • NIK: {d.customer_nik || '-'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`pill ${d.status === 'Dikembalikan' ? 'pill-green' : 'pill-orange'}`}>{d.status}</span>
                    {d.status === 'Ditahan' && (
                      <button className="btn btn-outline btn-sm" onClick={() => postExtra({ type: 'refund_deposit', id: d.id }, `Deposit ${d.customer_name} dikembalikan.`)}>
                        💸 Refund
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
