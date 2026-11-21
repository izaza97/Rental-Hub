'use client';

import { useEffect, useState } from 'react';
import { apiFetch, getSavedUser } from '@/lib/clientAuth';

export default function UsersPage() {
  const me = getSavedUser();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', name: '', password: '', role: 'Operator' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    try {
      const res = await apiFetch('/api/users');
      setUsers(res.users || []);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(form) });
      setMsg(`Akun ${form.username} berhasil dibuat (Password Bcrypt Hash).`);
      setForm({ username: '', name: '', password: '', role: 'Operator' });
      load();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function toggleUser(u) {
    setErr('');
    setMsg('');
    try {
      await apiFetch('/api/users', { method: 'PATCH', body: JSON.stringify({ id: u.id }) });
      setMsg(`Status akun ${u.username} berhasil diubah.`);
      load();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Manajemen Pengguna & RBAC</h1>
          <p className="page-sub">NFR-06 (Enkripsi Bcrypt) & NFR-07 (Role-Based Access Control)</p>
        </div>
      </div>

      {err && <div className="alert alert-error">❌ {err}</div>}
      {msg && <div className="alert alert-ok">✅ {msg}</div>}

      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>➕ Tambah User Back-Office Baru</h3>
        <form onSubmit={handleAdd} className="grid grid-4" style={{ alignItems: 'end' }}>
          <div>
            <label className="label">Username</label>
            <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="kasir02" required />
          </div>
          <div>
            <label className="label">Nama Lengkap</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama petugas" required />
          </div>
          <div>
            <label className="label">Password (min 6 kar.)</label>
            <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
          </div>
          <div>
            <label className="label">Role RBAC</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="Operator">Operator</option>
              <option value="Manajer">Manajer</option>
              <option value="Pemilik">Pemilik</option>
              <option value="Super Admin">Super Admin</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" className="btn btn-primary btn-sm">🔐 Simpan User (Bcrypt)</button>
          </div>
        </form>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Nama</th>
              <th>Role RBAC</th>
              <th>Status</th>
              <th>Terakhir Aktif</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>#{u.id}</td>
                <td><b>{u.username}</b></td>
                <td>{u.name}</td>
                <td><span className="pill pill-blue">{u.role}</span></td>
                <td><span className={`pill ${u.status === 'Aktif' ? 'pill-green' : 'pill-red'}`}>{u.status}</span></td>
                <td style={{ fontSize: 12, color: '#64748b' }}>{u.last_active || '-'}</td>
                <td>
                  {Number(u.id) === Number(me?.id) ? (
                    <span className="pill pill-gray">Akun Anda</span>
                  ) : (
                    <button className="btn btn-outline btn-sm" onClick={() => toggleUser(u)}>🔄 Aktif/Nonaktif</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
