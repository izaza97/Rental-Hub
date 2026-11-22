'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/clientAuth';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  async function load(search = q) {
    try {
      const res = await apiFetch(`/api/logs${search ? `?q=${encodeURIComponent(search)}` : ''}`);
      setLogs(res.logs || []);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Audit Trail & Log Aktivitas</h1>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => load()}>🔄 Refresh</button>
      </div>

      {err && <div className="alert alert-error">❌ {err}</div>}

      <div className="card" style={{ marginBottom: 18 }}>
        <label className="label">Cari Log Aktivitas</label>
        <input className="input" value={q} onChange={(e) => { setQ(e.target.value); load(e.target.value); }} placeholder="Cari username, aksi, atau nomor transaksi..." />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Username</th>
              <th>Aksi</th>
              <th>Detail Aktivitas</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => {
              const isDanger = /gagal|hapus|ditolak/i.test(l.action);
              return (
                <tr key={l.id}>
                  <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{l.created_at}</td>
                  <td><b>{l.username}</b></td>
                  <td><span className={`pill ${isDanger ? 'pill-red' : 'pill-blue'}`}>{l.action}</span></td>
                  <td>{l.detail || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
