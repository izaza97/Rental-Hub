'use client';

import { useEffect, useState } from 'react';
import { apiFetch, canUser, getSavedUser, rupiah } from '@/lib/clientAuth';

const EMPTY_FORM = { id: 0, code: '', name: '', ps_type: 'PS5', room_type: 'Reguler', price_per_hour: 20000, status: 'Tersedia', features: 'TV 4K • 2 DualSense' };

export default function UnitsPage() {
  const user = getSavedUser();
  const [units, setUnits] = useState([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [psFilter, setPsFilter] = useState('');
  const [sort, setSort] = useState('terlama');
  const [form, setForm] = useState(EMPTY_FORM);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load(query = q, st = statusFilter, ps = psFilter) {
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (st) params.set('status', st);
      if (ps) params.set('ps_type', ps);
      const res = await apiFetch(`/api/units?${params.toString()}`);
      setUnits(res.units || []);
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
        await apiFetch('/api/units', { method: 'PUT', body: JSON.stringify(form) });
        setMsg('Data unit PlayStation berhasil diperbarui.');
      } else {
        await apiFetch('/api/units', { method: 'POST', body: JSON.stringify(form) });
        setMsg('Unit PlayStation baru berhasil ditambahkan.');
      }
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function cycleStatus(u) {
    setErr('');
    const next = u.status === 'Tersedia' ? 'Disewa' : u.status === 'Disewa' ? 'Maintenance' : 'Tersedia';
    try {
      await apiFetch('/api/units', { method: 'PUT', body: JSON.stringify({ id: u.id, status: next }) });
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function handleDelete(u) {
    if (!confirm(`Hapus unit ${u.name} (${u.code})?`)) return;
    setErr('');
    setMsg('');
    try {
      await apiFetch(`/api/units?id=${u.id}`, { method: 'DELETE' });
      setMsg(`Unit ${u.name} dihapus.`);
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Pengelolaan Data PlayStation</h1>
        </div>
      </div>

      {err && <div className="alert alert-error">❌ {err}</div>}
      {msg && <div className="alert alert-ok">✅ {msg}</div>}

      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>
          {form.id > 0 ? `✏️ Ubah Unit: ${form.name}` : '➕ Tambah Unit PlayStation Baru'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-3">
            <div>
              <label className="label">Kode Unit</label>
              <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="VIP-04" required />
            </div>
            <div>
              <label className="label">Nama Unit</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VIP 04" required />
            </div>
            <div>
              <label className="label">Jenis Konsol</label>
              <select className="input" value={form.ps_type} onChange={(e) => setForm({ ...form, ps_type: e.target.value })}>
                <option value="PS5">PS5</option>
                <option value="PS4">PS4</option>
              </select>
            </div>
            <div>
              <label className="label">Tipe Ruangan / Bilik</label>
              <select className="input" value={form.room_type} onChange={(e) => setForm({ ...form, room_type: e.target.value })}>
                <option value="VIP Room">VIP Room</option>
                <option value="Reguler">Reguler</option>
                <option value="VR Corner">VR Corner</option>
                <option value="Home Rental">Home Rental</option>
              </select>
            </div>
            <div>
              <label className="label">Tarif per Jam (Rp)</label>
              <input className="input" type="number" min="0" value={form.price_per_hour} onChange={(e) => setForm({ ...form, price_per_hour: Number(e.target.value) })} required />
            </div>
            <div>
              <label className="label">Status Unit</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="Tersedia">Tersedia</option>
                <option value="Disewa">Disewa</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Fasilitas Unit (Ditampilkan di Website Client)</label>
              <input className="input" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="TV OLED 55 4K • Sofa Recliner • 2 DualSense" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button type="submit" className="btn btn-primary btn-sm">💾 {form.id > 0 ? 'Simpan Perubahan' : 'Tambah Unit'}</button>
            {form.id > 0 && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm(EMPTY_FORM)}>Batal</button>
            )}
          </div>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="grid grid-4" style={{ alignItems: 'end' }}>
          <div>
            <label className="label">Cari Kode / Nama Unit</label>
            <input className="input" value={q} onChange={(e) => { setQ(e.target.value); load(e.target.value, statusFilter, psFilter); }} placeholder="Ketik VIP, REG, VR..." />
          </div>
          <div>
            <label className="label">Filter Status</label>
            <select className="input" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); load(q, e.target.value, psFilter); }}>
              <option value="">Semua Status</option>
              <option value="Tersedia">Tersedia</option>
              <option value="Disewa">Disewa</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
          <div>
            <label className="label">Filter Jenis Konsol</label>
            <select className="input" value={psFilter} onChange={(e) => { setPsFilter(e.target.value); load(q, statusFilter, e.target.value); }}>
              <option value="">Semua Konsol</option>
              <option value="PS5">PS5</option>
              <option value="PS4">PS4</option>
            </select>
          </div>
          <div>
            <label className="label">Urutkan</label>
            <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="terlama">Terlama</option>
              <option value="terbaru">Terbaru</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama Unit</th>
              <th>Konsol</th>
              <th>Tipe Bilik</th>
              <th>Tarif / Jam</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {[...units]
              .sort((a, b) => {
                const cmp = String(a.created_at || '').localeCompare(String(b.created_at || ''));
                return sort === 'terbaru' ? -cmp || b.id - a.id : cmp || a.id - b.id;
              })
              .map((u) => (
              <tr key={u.id}>
                <td><span className="pill pill-blue">{u.code}</span></td>
                <td>
                  <div style={{ fontWeight: 800 }}>{u.name}</div>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>{u.features}</div>
                </td>
                <td><b>{u.ps_type}</b></td>
                <td>{u.room_type}</td>
                <td><b>{rupiah(u.price_per_hour)}</b></td>
                <td>
                  <span className={`pill ${u.status === 'Tersedia' ? 'pill-green' : u.status === 'Disewa' ? 'pill-red' : 'pill-orange'}`}>
                    {u.status}
                  </span>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setForm(u)}>✏️ Ubah</button>
                    <button className="btn btn-outline btn-sm" onClick={() => cycleStatus(u)}>🔄 Status</button>
                    {canUser(user, 'deleteMaster') && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u)}>🗑️</button>
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
