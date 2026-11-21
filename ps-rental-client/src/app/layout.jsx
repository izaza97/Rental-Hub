import './globals.css';
import ClientNavbar from '@/components/ClientNavbar';

export const metadata = {
  title: 'PS Rental Hub — Portal Pelanggan (Next.js)',
  description: 'Booking PlayStation PS4, PS5, VIP Room & VR2 secara online - Kelompok 12 UNINDRA',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <ClientNavbar />
        <main style={{ minHeight: 'calc(100vh - 180px)' }}>{children}</main>
        <footer style={{ background: '#0f172a', color: '#cbd5e1', padding: '36px 0', marginTop: 56 }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: 17 }}>🎮 PS RENTAL HUB — CLIENT PORTAL</div>
              <div style={{ fontSize: 13, marginTop: 6, color: '#94a3b8' }}>
                Dibangun dengan React & Next.js App Router • Terhubung langsung ke Database SQL Terpusat.
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: '#94a3b8', textAlign: 'right' }}>
              <div>Kelompok 12 — Rekayasa Perangkat Lunak UNINDRA</div>
              <div style={{ marginTop: 4 }}>Buka setiap hari 10:00 – 24:00 WIB</div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
