// ============================================================================
// Data Layer — PS Rental Hub (Admin)
// PostgreSQL (Supabase) via `pg` — siap Vercel Serverless & Next.js App Router
//
// Menggantikan driver lama: better-sqlite3 (SQLite) & mysql2 (MySQL localhost).
// Keunggulan:
//   - Koneksi via DATABASE_URL (Supabase Pooler) — satu env untuk semua serverless
//   - Parameterized query ($1, $2, ...) — aman dari SQL Injection
//   - Pool koneksi lazy (production: di-cache per isolate Vercel)
//   - Transaksi bantu (dbTx) untuk operasi multi-tabel (booking, POS)
//   - Error handling terpusat + pengenalan unique/FK violation
//
// Catatan tipe (agar kompatibel dengan perilaku SQLite/MySQL sebelumnya):
//   - timestamp/date  -> string mentah "YYYY-MM-DD HH:MM:SS" (frontend memakai .slice())
//   - numeric/int8    -> Number (harga, poin, durasi)
// ============================================================================
import { Pool, types } from 'pg';

// --- Type parser: jaga format JSON identik dengan driver lama ----------------
// numeric (1700) & int8 (20) -> Number
types.setTypeParser(types.builtins.NUMERIC, (v) => (v === null ? null : Number(v)));
types.setTypeParser(types.builtins.INT8, (v) => (v === null ? null : Number(v)));
// timestamp (1114), timestamptz (1184), date (1082) -> string mentah
// (frontend admin memotong string: String(t.start_time).slice(0, 16))
types.setTypeParser(types.builtins.TIMESTAMP, (v) => v);
types.setTypeParser(types.builtins.TIMESTAMPTZ, (v) => v);
types.setTypeParser(types.builtins.DATE, (v) => v);

// --- Pool (lazy: dibuat saat query pertama, aman saat build tanpa env) -------
function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL belum diisi. Salin .env.example menjadi .env.local lalu isi koneksi Supabase (lihat DEPLOYMENT-VERCEL.md).'
    );
  }
  // Supabase selalu pakai SSL; lokal (localhost/127.0.0.1) tidak.
  // Bisa dioverride via query param: ?sslmode=disable / ?sslmode=require
  let hostname = '';
  let sslmode = '';
  try {
    const u = new URL(connectionString);
    hostname = u.hostname;
    sslmode = (u.searchParams.get('sslmode') || '').toLowerCase();
  } catch {
    /* URL tak terbaca → anggap remote */
  }
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(hostname);
  const useSsl = sslmode === 'require' || (sslmode !== 'disable' && !isLocal);
  const pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: 10, // serverless: jangan terlalu besar agar tidak kena limit pooler Supabase
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  // Koneksi idle yang error tidak boleh menjatuhkan proses
  pool.on('error', (err) => {
    console.error('[pg] idle client error:', err.message);
  });
  return pool;
}

// Production (Vercel serverless): module state persist per lambda instance;
// globalThis jadi pengaman bila module di-eval ulang (hemat koneksi pooler).
// Development: pool baru setiap hot-reload agar perubahan kode/env langsung
// berlaku dan tidak memakai pool basi (mis. koneksi/env yang baru diubah).
const globalRef = globalThis;
const isProd = process.env.NODE_ENV === 'production';
let poolInstance = null;
function getPool() {
  if (poolInstance) return poolInstance;
  if (isProd) {
    poolInstance = globalRef.__psRentalPgPool ?? (globalRef.__psRentalPgPool = createPool());
  } else {
    poolInstance = createPool();
  }
  return poolInstance;
}

// --- Util waktu (format sama dengan driver lama: "YYYY-MM-DD HH:MM:SS") ------
function nowSql(offsetMinutes = 0) {
  const d = new Date(Date.now() + offsetMinutes * 60000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// --- Helper query (semua param wajib lewat $1..$n — tanpa string concat) ------
export async function dbAll(sql, params = []) {
  try {
    const { rows } = await getPool().query(sql, params);
    return rows;
  } catch (err) {
    console.error('[pg] dbAll error:', err.message, '\n  sql:', sql.replace(/\s+/g, ' ').slice(0, 180));
    throw err;
  }
}

export async function dbGet(sql, params = []) {
  try {
    const { rows } = await getPool().query(sql, params);
    return rows[0] || null;
  } catch (err) {
    console.error('[pg] dbGet error:', err.message, '\n  sql:', sql.replace(/\s+/g, ' ').slice(0, 180));
    throw err;
  }
}

// Untuk INSERT yang butuh id balikan: sertakan `RETURNING id` pada SQL,
// maka lastInsertRowid terisi (kompatibel dengan pola kode lama).
export async function dbRun(sql, params = []) {
  try {
    const res = await getPool().query(sql, params);
    const row = Array.isArray(res.rows) && res.rows[0];
    return {
      lastInsertRowid: row && row.id !== undefined ? Number(row.id) : null,
      changes: res.rowCount ?? 0,
    };
  } catch (err) {
    console.error('[pg] dbRun error:', err.message, '\n  sql:', sql.replace(/\s+/g, ' ').slice(0, 180));
    throw err;
  }
}

// Transaksi: seluruh callback COMMIT bila sukses, ROLLBACK bila gagal.
// Dipakai booking client & POS admin (banyak tulis lintas tabel).
// Contoh:
//   const id = await dbTx(async (tx) => {
//     const ins = await tx.run('INSERT ... RETURNING id', [...]);
//     await tx.run('UPDATE ...', [...]);
//     return ins.lastInsertRowid;
//   });
export async function dbTx(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const tx = {
      async all(sql, params = []) {
        const { rows } = await client.query(sql, params);
        return rows;
      },
      async get(sql, params = []) {
        const { rows } = await client.query(sql, params);
        return rows[0] || null;
      },
      async run(sql, params = []) {
        const res = await client.query(sql, params);
        const row = Array.isArray(res.rows) && res.rows[0];
        return {
          lastInsertRowid: row && row.id !== undefined ? Number(row.id) : null,
          changes: res.rowCount ?? 0,
        };
      },
    };
    const result = await fn(tx);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* rollback gagal diabaikan */
    }
    console.error('[pg] tx error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// --- Helper error agar route bisa memberi pesan yang benar -------------------
export function isUniqueViolation(err) {
  return err?.code === '23505'; // unique_violation (duplikat UNIQUE/PRIMARY KEY)
}

export function isForeignKeyViolation(err) {
  return err?.code === '23503'; // foreign_key_violation
}

// Pesan generik untuk 500 — jangan bocorkan detail internal ke client
export function serverError(err, context = '') {
  console.error(`[pg]${context ? ` ${context}` : ''}:`, err?.message || err);
  return { error: 'Terjadi kesalahan pada server. Silakan coba lagi.' };
}

export function sqlNow(offsetMinutes = 0) {
  return nowSql(offsetMinutes);
}
