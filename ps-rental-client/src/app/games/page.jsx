'use client';

import { useEffect, useState } from 'react';

export default function GamesPage() {
  const [games, setGames] = useState([]);
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('Semua');
  const [form, setForm] = useState({ customer_name: '', game_title: '', platform: 'PS5', unit_preference: 'VIP 01' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    const r = await fetch('/api/catalog');
    const d = await r.json();
    setGames(d.games || []);
    setRequests(d.gameRequests || []);
  }

  useEffect(() => {
    load();
  }, []);

  const shown = filter === 'Semua' ? games : games.filter((g) => g.platform.includes(filter));

  async function handleRequest(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    const res = await fetch('/api/game-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) setErr(data.error || 'Gagal mengirim request.');
    else {
      setMsg('Request instalasi game berhasil dikirim ke Website Admin!');
      setForm({ customer_name: '', game_title: '', platform: 'PS5', unit_preference: 'VIP 01' });
      load();
    }
  }

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900 }}>🕹️ Katalog Game PS4 & PS5</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Semua judul di bawah sudah terinstal siap main. Belum ada game favoritmu? Request di bawah!</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Semua', 'PS5', 'PS4'].map((p) => (
            <button key={p} onClick={() => setFilter(p)} className={`btn btn-sm ${filter === p ? 'btn-primary' : 'btn-white'}`}>{p}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 32 }}>
        {shown.map((g) => (
          <div key={g.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span className="pill pill-blue">{g.platform}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b' }}>⭐ {g.rating}</span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>{g.title}</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{g.genre}</p>
            </div>
            <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#475569' }}>
              <span>👥 {g.players}</span>
              <span style={{ color: '#047857', fontWeight: 700 }}>✓ Ready to Play</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>📩 Request Instalasi Game Baru ke Admin</h3>
          {err && <div className="alert alert-error">❌ {err}</div>}
          {msg && <div className="alert alert-ok">✅ {msg}</div>}
          <form onSubmit={handleRequest} style={{ display: 'grid', gap: 12 }}>
            <div>
              <label className="label">Nama Anda *</label>
              <input className="input" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="Nama lengkap" required />
            </div>
            <div>
              <label className="label">Judul Game yang Diinginkan *</label>
              <input className="input" value={form.game_title} onChange={(e) => setForm({ ...form, game_title: e.target.value })} placeholder="Contoh: Monster Hunter Wilds" required />
            </div>
            <div className="grid grid-2">
              <div>
                <label className="label">Platform</label>
                <select className="input" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                  <option value="PS5">PS5</option>
                  <option value="PS4">PS4</option>
                </select>
              </div>
              <div>
                <label className="label">Preferensi Bilik</label>
                <input className="input" value={form.unit_preference} onChange={(e) => setForm({ ...form, unit_preference: e.target.value })} placeholder="VIP 01 / Reguler" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">🚀 Kirim Request ke Admin</button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>📋 Status Request Pelanggan Terbaru</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {requests.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{r.game_title} <span className="pill pill-blue">{r.platform}</span></div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Oleh: {r.customer_name} • Bilik: {r.unit_preference || 'Bebas'}</div>
                </div>
                <span className={`pill ${r.status === 'Selesai' ? 'pill-green' : r.status === 'Disetujui' ? 'pill-blue' : 'pill-orange'}`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
