'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

function rp(n) {
  return 'Rp' + Math.round(Number(n || 0)).toLocaleString('id-ID');
}

export default function ClientHomePage() {
  const [units, setUnits] = useState([]);
  const [promos, setPromos] = useState([]);

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((d) => {
        setUnits(d.units || []);
        setPromos(d.promos || []);
      })
      .catch(() => {});
  }, []);

  const onsiteUnits = units.filter((u) => u.room_type !== 'Home Rental');
  const availCount = onsiteUnits.filter((u) => u.status === 'Tersedia').length;

  return (
    <div>
      <section className="hero">
        <div className="container">
          <div className="grid grid-2" style={{ alignItems: 'center', gap: 32 }}>
            <div>
              <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.16)', padding: '6px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, marginBottom: 14 }}>
                ⚡ Live Ketersediaan Bilik: {availCount} dari {onsiteUnits.length || 12} Unit Tersedia Sekarang!
              </span>
              <h1 style={{ fontSize: 'clamp(26px, 6vw, 40px)', lineHeight: 1.15, fontWeight: 900 }}>
                Pengalaman Gaming PS5, VIP OLED & VR2 Terbaik.
              </h1>
              <p style={{ marginTop: 14, fontSize: 15.5, opacity: 0.92, lineHeight: 1.7 }}>
                Pilih bilik langsung dari Floor Plan interaktif, pesan snack dari sofa, kumpulkan poin member, atau sewa konsol PS4/PS5 bawa pulang ke rumah!
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
                <Link href="/booking" className="btn" style={{ background: '#fff', color: '#1d4ed8', padding: '13px 22px', fontSize: 14.5 }}>
                  🎮 Booking Bilik Sekarang →
                </Link>
                <Link href="/home-rental" className="btn" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', padding: '13px 22px' }}>
                  🎒 Sewa Bawa Pulang
                </Link>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 20, padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <b style={{ fontSize: 14 }}>🟢 Live Preview Denah Bilik</b>
                <Link href="/booking" style={{ fontSize: 12, textDecoration: 'underline' }}>Lihat Semua →</Link>
              </div>
              <div className="grid grid-3" style={{ gap: 10 }}>
                {onsiteUnits.slice(0, 9).map((u) => (
                  <div
                    key={u.id}
                    style={{
                      background: u.status === 'Tersedia' ? 'rgba(16,185,129,0.22)' : 'rgba(15,23,42,0.32)',
                      border: `1px solid ${u.status === 'Tersedia' ? '#6ee7b7' : 'rgba(255,255,255,0.2)'}`,
                      borderRadius: 12,
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{u.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.9 }}>{u.ps_type} • {u.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container" style={{ marginTop: 44 }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a' }}>Pilihan Paket & Ruangan</h2>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Tarif transparan per jam & per hari, otomatis tersinkron dengan sistem kasir</p>
        </div>

        <div className="grid grid-3">
          <div className="card">
            <span className="pill pill-blue">Hemat & Nyaman</span>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginTop: 10 }}>Reguler Arena (PS4 / PS5)</h3>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#1d4ed8', margin: '10px 0' }}>Rp15.000<span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}> – Rp20.000/jam</span></div>
            <p style={{ fontSize: 13.5, color: '#475569', marginBottom: 16 }}>TV 43&quot; 4K/FHD, kursi gaming / bean bag empuk, 2 controller original wireless.</p>
            <Link href="/booking" className="btn btn-white" style={{ width: '100%' }}>Pilih Bilik Reguler</Link>
          </div>

          <div className="card" style={{ border: '2px solid #1d4ed8', position: 'relative' }}>
            <span className="pill pill-blue">🔥 Paling Favorit</span>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginTop: 10 }}>VIP Privat & VR2 Corner</h3>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#1d4ed8', margin: '10px 0' }}>Rp35.000<span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}> – Rp45.000/jam</span></div>
            <p style={{ fontSize: 13.5, color: '#475569', marginBottom: 16 }}>Ruangan privat ber-AC, TV OLED 55&quot; 4K 120Hz, Sofa Recliner, Soundbar & PlayStation VR2.</p>
            <Link href="/booking" className="btn btn-primary" style={{ width: '100%' }}>Booking VIP / VR →</Link>
          </div>

          <div className="card">
            <span className="pill pill-green">Bawa Pulang 24 Jam</span>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginTop: 10 }}>Home Rental Portable</h3>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#1d4ed8', margin: '10px 0' }}>Rp100.000<span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}> – Rp150.000/hari</span></div>
            <p style={{ fontSize: 13.5, color: '#475569', marginBottom: 16 }}>Paket lengkap konsol PS4/PS5 + tas hardcase + 2 stik + game terinstal siap main di rumah.</p>
            <Link href="/home-rental" className="btn btn-white" style={{ width: '100%' }}>Sewa Bawa Pulang</Link>
          </div>
        </div>
      </section>

      {promos.length > 0 && (
        <section className="container" style={{ marginTop: 44 }}>
          <div className="card" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #bfdbfe' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1e3a8a' }}>🎟️ Kode Promo Aktif Hari Ini</h3>
                <p style={{ fontSize: 13, color: '#475569' }}>Gunakan kode di bawah saat checkout di halaman Floor Plan & Booking</p>
              </div>
              <Link href="/booking" className="btn btn-primary btn-sm">Pakai Promo Sekarang →</Link>
            </div>
            <div className="grid grid-4">
              {promos.map((p) => (
                <div key={p.id} style={{ background: '#fff', border: '1px dashed #3b82f6', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontWeight: 900, color: '#1d4ed8', fontSize: 15 }}>{p.code}</div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#047857', marginTop: 2 }}>Diskon {p.discount_percent}%</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{p.description || 'Promo spesial member'}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
