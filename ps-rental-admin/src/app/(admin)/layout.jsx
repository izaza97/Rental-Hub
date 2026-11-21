'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch, canUser, clearAuthSession, getSavedUser } from '@/lib/clientAuth';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = getSavedUser();
    if (!saved) {
      router.replace('/login');
    } else {
      setUser(saved);
    }
  }, [router]);

  async function handleLogout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    clearAuthSession();
    router.replace('/login');
  }

  if (!user) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#64748b' }}>Memeriksa sesi login...</div>;
  }

  const navItems = [
    { section: 'Modul Inti SRS (Tugas 1 & 2)' },
    { href: '/dashboard', label: 'Dashboard Operasional', icon: '📊', perm: 'dashboard' },
    { href: '/units', label: 'Data PlayStation', icon: '🎮', perm: 'units' },
    { href: '/customers', label: 'Data Pelanggan', icon: '👥', perm: 'customers' },
    { href: '/pos', label: 'Transaksi Rental (POS)', icon: '🛒', perm: 'pos' },
    { href: '/history', label: 'Riwayat & Pengembalian', icon: '🧾', perm: 'history' },
    { section: 'Keamanan & Audit (NFR)' },
    { href: '/users', label: 'User & RBAC', icon: '🔐', perm: 'users' },
    { href: '/logs', label: 'Audit Trail', icon: '📜', perm: 'logs' },
    { section: 'Fitur Tambahan & Sinkron Client' },
    { href: '/extras', label: 'Stok, Promo & Request Client', icon: '✨', perm: 'extras' },
  ];

  return (
    <div>
      <header className="header-app">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/dashboard" className="logo">
            <div className="logo-icon">PS</div>
            <div className="logo-text">
              <b>PS RENTAL ADMIN</b>
              <span>Next.js Back-Office • SRS v1.0</span>
            </div>
          </Link>
          <span className="pill pill-blue">🛡️ {user.role}</span>
          <span style={{ fontSize: 13, color: '#64748b' }}>{user.name}</span>
        </div>
        <button onClick={handleLogout} className="btn btn-danger btn-sm">
          🚪 Logout (FR-3)
        </button>
      </header>

      <div className="app-shell">
        <aside className="sidebar">
          {navItems.map((item, idx) => {
            if (item.section) {
              return <div key={idx} className="sidebar-section">{item.section}</div>;
            }
            if (!canUser(user, item.perm)) return null;
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`nav-link ${active ? 'active' : ''}`}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </aside>
        <main className="main-area">{children}</main>
      </div>
    </div>
  );
}
