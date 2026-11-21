'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: '🏠 Beranda' },
  { href: '/booking', label: '🎮 Floor Plan & Booking' },
  { href: '/home-rental', label: '🎒 Sewa Bawa Pulang' },
  { href: '/games', label: '🕹️ Katalog Game' },
  { href: '/status', label: '🧾 Cek Booking & Member' },
];

export default function ClientNavbar() {
  const pathname = usePathname();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="logo">
          <div className="logo-icon">PS</div>
          <div>
            <b style={{ display: 'block', fontSize: 16, color: '#1e3a8a' }}>PS RENTAL HUB</b>
            <span style={{ display: 'block', fontSize: 11, color: '#64748b' }}>Portal Pelanggan • Next.js</span>
          </div>
        </Link>

        <nav className="nav-links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`nav-pill ${pathname === l.href ? 'active' : ''}`}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
