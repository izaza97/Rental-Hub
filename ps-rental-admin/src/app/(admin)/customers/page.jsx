'use client';

import { useEffect, useState } from 'react';
import { apiFetch, canUser, getSavedUser } from '@/lib/clientAuth';

const EMPTY_CUST = { id: 0, name: '', nik: '', phone: '', address: '' };

export default function CustomersPage() {
  const user = getSavedUser();
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(EMPTY_CUST);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load(search = q) {
    try {
      const res = await apiFetch(`/api/customers${search ? `?q=${encodeURIComponent(search)}` : ''}`);
      setCustomers(res.customers || []);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      if (form.id > 0) {
        await apiFetch('/api/customers', { method: 'PUT', body: JSON.stringify(form) });
        setMsg('Data pelanggan berhasil diperbarui.');
      } else {
        await apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(form) });
        setMsg('Pelanggan baru berhasil ditambahkan.');
      }
      setForm(EMPTY_CUST);
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function handleDelete(c) {
    if (!confirm(`Hapus pelanggan ${c.name}?`)) return;
    setErr('');
    setMsg('');
    try {
      await apiFetch(`/api/customers?id=${c.id}`, { method: 'DELETE' });
      setMsg(`Pelanggan ${c.name} dihapus.`);
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Pengelolaan Data Pelanggan</h1>
        </div>
      </div>

      {err && <div className="alert alert-error">❌ {err}</div>}
      {msg && <div className="alert alert-ok">✅ {msg}</div>}

      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>
          {form.id > 0 ? `✏️ Ubah Data Pelanggan: ${form.name}` : '➕ Tambah Pelanggan Baru'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-2">
            <div>
              <label className="label">Nama Lengkap *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" required />
            </div>
            <div>
              <label className="label">Nomor Identitas (NIK / KTP)</label>
              <input className="input" value={form.nik || ''} onChange={(e) => setForm({ ...form, nik: e.target.value })} placeholder="3171xxxxxxxxxxxx" />
            </div>
            <div>
              <label className="label">Nomor Telepon</label>
              <input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0812xxxxxxxx" />
            </div>
            <div>
              <label className="label">Alamat Domisili</label>
              <input className="input" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Alamat lengkap" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button type="submit" className="btn btn-primary btn-sm">💾 {form.id > 0 ? 'Simpan Perubahan' : 'Simpan Pelanggan'}</button>
            {form.id > 0 && <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm(EMPTY_CUST)}>Batal</button>}
          </div>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <label className="label">Cari Pelanggan berdasarkan Nama / Telepon / NIK</label>
        <input className="input" value={q} onChange={(e) => { setQ(e.target.value); load(e.target.value); }} placeholder="Ketik nama atau nomor HP..." />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nama Pelanggan</th>
              <th>NIK / KTP</th>
              <th>No. Telepon</th>
              <th>Alamat</th>
              <th>Poin Member</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>#{c.id}</td>
                <td><b>{c.name}</b></td>
                <td>{c.nik || '-'}</td>
                <td>{c.phone || '-'}</td>
                <td>{c.address || '-'}</td>
                <td><span className="pill pill-blue">⭐ {c.points || 0} pts</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setForm(c)}>✏️ Ubah</button>
                    {canUser(user, 'deleteMaster') && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c)}>🗑️</button>
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
