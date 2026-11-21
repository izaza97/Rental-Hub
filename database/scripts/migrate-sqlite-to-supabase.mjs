#!/usr/bin/env node
// ============================================================================
// Migrasi DATA dari SQLite lokal (database/ps_rental_hub.db) ke Supabase
// PostgreSQL. Skema/table dibuat terlebih dahulu oleh
// database/supabase/migrations/0001_init.sql (SQL Editor / supabase db push).
//
// Pemakaian:
//   cd database
//   DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres" \
//     node scripts/migrate-sqlite-to-supabase.mjs            # upsert (id dipertahankan)
//   DATABASE_URL="..." node scripts/migrate-sqlite-to-supabase.mjs --reset
//     # hapus semua data lama di Supabase dulu (TRUNCATE), lalu load penuh
//
// Dependensi (sekali jalan, tidak masuk package.json aplikasi):
//   npm install --no-save better-sqlite3 pg
//
// Catatan:
//   - Id dipertahankan agar relasi FK (trx→customer/unit, addons→trx/stock) utuh.
//   - Setelah load, sequence tiap tabel di-sync ke MAX(id).
//   - Aman dijalankan berulang: ON CONFLICT (id) DO UPDATE.
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Urutan sesuai FK (parent dulu)
const TABLES = [
  'users',
  'units',
  'customers',
  'stock',
  'promos',
  'games',
  'transactions',
  'transaction_addons',
  'deposits',
  'game_requests',
  'activity_logs',
];

// Kolom boolean di PostgreSQL (di SQLite: INTEGER 0/1)
const BOOLEAN_COLUMNS = { games: ['is_popular'] };

function resolveSqlitePath() {
  if (process.env.SQLITE_PATH) return path.resolve(process.env.SQLITE_PATH);
  const shared = path.resolve(__dirname, '..', 'ps_rental_hub.db');
  if (fs.existsSync(shared)) return shared;
  throw new Error(`File SQLite tidak ditemukan: ${shared} (set SQLITE_PATH bila berada di lokasi lain).`);
}

function mapValue(table, col, value) {
  if (value === undefined) return null;
  if (BOOLEAN_COLUMNS[table]?.includes(col)) return value ? true : false; // 0/1 -> boolean
  return value;
}

async function main() {
  const reset = process.argv.includes('--reset');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: env DATABASE_URL belum diisi (koneksi Supabase, format postgresql://...).');
    process.exit(1);
  }

  let Database;
  let pg;
  try {
    ({ default: Database } = await import('better-sqlite3'));
  } catch {
    console.error('ERROR: better-sqlite3 belum terinstall. Jalankan: npm install --no-save better-sqlite3 pg');
    process.exit(1);
  }
  try {
    pg = await import('pg');
  } catch {
    console.error('ERROR: pg belum terinstall. Jalankan: npm install --no-save better-sqlite3 pg');
    process.exit(1);
  }
  const Client = pg.Client || pg.default.Client;

  const sqlitePath = resolveSqlitePath();
  console.log(`SQLite : ${sqlitePath}`);
  console.log(`Target : ${databaseUrl.replace(/:[^:@/]+@/, ':***@')}`);
  console.log(`Mode   : ${reset ? 'TRUNCATE + FULL LOAD' : 'UPSERT (id dipertahankan)'}`);

  const sqlite = new Database(sqlitePath, { readonly: true, fileMustExist: true });
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    if (reset) {
      const list = [...TABLES].reverse().join(', ');
      await client.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
      console.log('TRUNCATE semua tabel ... OK');
    }

    let totalRows = 0;
    for (const table of TABLES) {
      const exists = sqlite
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get(table);
      if (!exists) {
        console.log(`- ${table}: dilewati (tidak ada di SQLite)`);
        continue;
      }

      const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all();
      if (rows.length === 0) {
        console.log(`- ${table}: 0 baris`);
        continue;
      }

      const columns = Object.keys(rows[0]);
      const colList = columns.join(', ');
      const paramList = columns.map((_, i) => `$${i + 1}`).join(', ');
      const updateList = columns
        .filter((c) => c !== 'id')
        .map((c) => `${c} = EXCLUDED.${c}`)
        .join(', ');

      const sql = updateList
        ? `INSERT INTO ${table} (${colList}) VALUES (${paramList})
             ON CONFLICT (id) DO UPDATE SET ${updateList}`
        : `INSERT INTO ${table} (${colList}) VALUES (${paramList})
             ON CONFLICT (id) DO NOTHING`;

      const stmtSql = sqlite.prepare(`SELECT * FROM "${table}"`);
      for (const row of stmtSql.iterate()) {
        const params = columns.map((c) => mapValue(table, c, row[c]));
        await client.query(sql, params);
      }
      totalRows += rows.length;
      console.log(`- ${table}: ${rows.length} baris ... OK`);
    }

    // Sync sequence identity agar insert aplikasi berikutnya tidak bentrok id
    for (const table of TABLES) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'),
             COALESCE((SELECT MAX(id) FROM ${table}), 1), true)`
      );
    }

    await client.query('COMMIT');
    console.log(`\nSelesai. Total ${totalRows} baris dimigrasikan. Sequence sudah di-sync.`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\nGAGAL — transaksi di-rollback:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
    sqlite.close();
  }
}

main();
