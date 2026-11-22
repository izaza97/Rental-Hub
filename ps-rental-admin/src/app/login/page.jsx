'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAuthSession } from '@/lib/clientAuth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login gagal');
      } else {
        saveAuthSession(data.token, data.user);
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Gagal terhubung ke server API.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8 60%, #3b82f6)', color: '#fff', padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 20 }}>PS</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 'clamp(16px, 4.5vw, 20px)' }}>PS RENTAL HUB — ADMIN</div>
            <div className="login-sub" style={{ fontSize: 12, opacity: 0.85 }}>React + Next.js App Router • Database SQL</div>
          </div>
        </div>
        <h1 style={{ fontSize: 'clamp(24px, 7vw, 32px)', lineHeight: 1.2, fontWeight: 800 }}>Panel Back-Office<br />Pengelolaan Rental PS</h1>
      </div>

      <div style={{ display: 'grid', placeItems: 'center', padding: 'clamp(16px, 4vw, 28px)', background: '#f8fafc' }}>
        <div className="card" style={{ width: '100%', maxWidth: 420, padding: 'clamp(22px, 6vw, 32px)' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div className="logo-icon" style={{ margin: '0 auto 10px', width: 44, height: 44, fontSize: 17 }}>PS</div>
            <h2 style={{ fontSize: 'clamp(18px, 5vw, 21px)', fontWeight: 800 }}>Login Admin / Operator</h2>
            <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>Masuk untuk mengakses panel back-office</p>
          </div>

          {error && <div className="alert alert-error">❌ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Username</label>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Masukkan username" required />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan password" required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 12 }} disabled={loading}>
              {loading ? 'Memverifikasi...' : '🔐 Masuk Sistem'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
