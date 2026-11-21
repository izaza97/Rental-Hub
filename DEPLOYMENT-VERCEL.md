# Panduan Deploy — Supabase PostgreSQL + Vercel

Panduan lengkap migrasi database dan deployment **PS Rental Hub** (2 aplikasi Next.js App Router) ke **Supabase** + **Vercel**.

---

## 0. Ringkasan Perubahan Migrasi

| Aspek | Sebelum | Sesudah |
|---|---|---|
| Driver DB | `better-sqlite3` (SQLite file) & `mysql2` (localhost) | `pg` (node-postgres) |
| Koneksi | `DB_DRIVER` / `DB_HOST` / `DB_PORT` / `SQLITE_PATH` | `DATABASE_URL` (satu env) |
| Placeholder | `?` (MySQL/SQLite) | `$1, $2, ...` (PostgreSQL) |
| Pencarian | `LIKE` (case-insensitive by default) | `ILIKE` |
| Insert id balikan | `lastInsertRowid` (driver) | `RETURNING id` |
| Multi-tulis | banyak `dbRun` terpisah (tidak atomic) | `dbTx()` transaksi `BEGIN/COMMIT/ROLLBACK` |
| Dashboard | load seluruh tabel ke memori JS | agregasi `COUNT/SUM/FILTER` di SQL |
| Error handling | sebagian route tanpa try/catch | semua route: try/catch + kode error PG (`23505`, `23503`) |
| Skema | MySQL DDL + auto-create SQLite | `database/supabase/migrations/0001_init.sql` |

---

## 1. Environment Variables

Struktur env yang dipakai (kedua aplikasi — **isi identik kecuali `AUTH_SECRET`**):

```env
# --- Wajib: koneksi PostgreSQL Supabase ---
DATABASE_URL=postgresql://postgres.abcdefghijklmn:your-password@aws-0-xx-xx.pooler.supabase.com:6543/postgres

# --- Supabase API (Project Settings → API) ---
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# --- Admin only: secret sesi login ---
AUTH_SECRET=(string acak panjang, contoh: openssl rand -hex 32)
```

| Variabel | Dipakai oleh | Keterangan |
|---|---|---|
| `DATABASE_URL` | `src/lib/db.js` (admin & client) | **Wajib.** Supabase → Project Settings → Database → Connection string → **URI**. Untuk Vercel gunakan **Pooler** (port `6543`). |
| `NEXT_PUBLIC_SUPABASE_URL` | env publik aplikasi | URL project Supabase (`https://<ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | env publik aplikasi | Key publik untuk Supabase JS / RLS client-side. |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Key service-role (bypass RLS). **Jangan** diberi prefix `NEXT_PUBLIC_`, jangan di-commit. |
| `AUTH_SECRET` | admin `src/lib/auth.js` | Tanda tangan token sesi admin. Wajib diganti saat production. |

Catatan:
- `pg` berbicara langsung ke PostgreSQL Supabase lewat `DATABASE_URL` — seluruh API route sudah PostgreSQL-native.
- `SUPABASE_SERVICE_ROLE_KEY` & `NEXT_PUBLIC_SUPABASE_*` disiapkan untuk integrasi Supabase JS mendatang (Auth/Storage/Realtime) dan tooling Supabase; aman disimpan sekarang.
- Local development: salin `.env.example` → `.env.local` di masing-masing folder (`ps-rental-admin/`, `ps-rental-client/`).

---

## 2. Langkah Migrasi Database

### 2a. Buat skema + seed di Supabase (wajib)

1. Buat project di [https://supabase.com](https://supabase.com) → **New project** (catat DB password).
2. Buka **SQL Editor** → **New query**.
3. Paste isi **`database/supabase/migrations/0001_init.sql`** → **Run**.
   - Berhasil = 11 tabel + 3 view + seed data (4 user demo, 14 unit, dst).
   - Alternatif CLI: taruh file di `supabase/migrations/` lalu `supabase db push`.

### 2b. Migrasi data lama (jika ada data di SQLite/MySQL)

**Dari SQLite (`database/ps_rental_hub.db`):**

```bash
cd database
npm install --no-save better-sqlite3 pg
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres" \
  node scripts/migrate-sqlite-to-supabase.mjs
# Untuk load ulang total (hapus data Supabase dulu):
DATABASE_URL="..." node scripts/migrate-sqlite-to-supabase.mjs --reset
```

Script mempertahankan `id` (relasi FK utuh), mengubah `is_popular` 0/1 → boolean, lalu mensinkronkan sequence.

**Dari MySQL lokal (`database/ps_rental_hub.sql`):**

```bash
# 1. Export tabel per data (bukan DDL) ke CSV dari phpMyAdmin, atau mysqldump --compatible=postgresql
# 2. Di Supabase SQL Editor, per tabel:
\copy users(id,username,password_hash,name,role,status,last_active,created_at) FROM 'users.csv' WITH (FORMAT csv, HEADER true)
# 3. Set sequence setelah load:
SELECT setval(pg_get_serial_sequence('users','id'), COALESCE((SELECT MAX(id) FROM users),1));
```

> Struktur kolom MySQL dan PostgreSQL di sini identik (hanya tipe berbeda), sehingga CSV dapat langsung di-`\copy`.

### 2c. Verifikasi

```bash
# Dari SQL Editor Supabase:
SELECT COUNT(*) FROM users;        -- 4
SELECT COUNT(*) FROM units;        -- 14
SELECT * FROM v_unit_status;
```

---

## 3. Build Settings Vercel

Monorepo 2 aplikasi → buat **2 project Vercel** dari repository yang sama (Root Directory berbeda):

### Project 1 — Admin

| Setting | Nilai |
|---|---|
| Framework Preset | **Next.js** |
| Root Directory | `ps-rental-admin` |
| Build Command | `next build` (default) |
| Output Directory | `.next` (default) |
| Install Command | `npm install` (default) |
| Node.js Version | **20.x** (Settings → General) |

### Project 2 — Client

| Setting | Nilai |
|---|---|
| Framework Preset | **Next.js** |
| Root Directory | `ps-rental-client` |
| Build Command | `next build` (default) |
| Output Directory | `.next` (default) |
| Install Command | `npm install` (default) |
| Node.js Version | **20.x** |

### Environment Variables (kedua project → Settings → Environment Variables)

Tambahkan untuk **Production, Preview, dan Development**:

```
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
AUTH_SECRET            ← hanya project Admin
```

> `package-lock.json` sudah diperbarui (`pg` menggantikan `better-sqlite3` + `mysql2`), sehingga build Vercel deterministik. Tidak ada native module yang perlu compile → build cepat & tidak gagal di Vercel.

### Vercel Configuration (opsional)

Tidak wajib ada `vercel.json` — deteksi Next.js otomatis. Bila ingin konfigurasi eksplisit, buat `vercel.json` di Root Directory masing-masing project:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "next build",
  "installCommand": "npm install"
}
```

---

## 4. Setelah Deploy — Checklist

1. Buka URL Vercel client (`https://<project-client>.vercel.app`) → katalog unit & game tampil (berarti `DATABASE_URL` benar).
2. Buka admin (`https://<project-admin>.vercel.app`) → login:
   - `admin` / `admin123`
   - `manager` / `manager123`, `operator` / `operator123`, `pemilik` / `pemilik123`
3. Buat transaksi POS → cek nota, stok berkurang, unit jadi *Disewa*.
4. Booking dari client → cek transaksi muncul di riwayat admin (sinkronisasi 1 DB untuk 2 aplikasi ✅).
5. Ganti `AUTH_SECRET` production dan (opsional) ganti password user demo.

---

## 5. Catatan Teknis Penting (Serverless & Pooling)

- **Pooler Supabase**: gunakan connection string port **6543** (Transaction mode) — dirancang untuk banyak koneksi pendek dari Vercel Lambdas. Port `5432`/`db.<ref>.supabase.co` (Direct) hanya untuk IP whitelist / migration.
- **SSL**: `src/lib/db.js` otomatis menyalakan SSL (`rejectUnauthorized: false`) untuk host non-localhost — sesuai kebutuhan Supabase.
- **Pool**: `max: 10`, `idleTimeout 30s`, `connectionTimeout 10s` — aman untuk limit free tier. Instance lambdas yang warm memakai pool yang sama (di-cache via `globalThis`).
- **Timezone**: kolom waktu adalah `TIMESTAMP` tanpa zona; aplikasi menulis & membaca dalam format `YYYY-MM-DD HH:MM:SS` (zona runtime server — Vercel = UTC). Pastikan semua serverless functions berada di region yang sama (default) agar konsisten.
- **SQL Injection**: seluruh query memakai parameterized `$1..$n` — tidak ada string concatenation nilai user.
- **Atomicitas**: booking client & POS admin memakai `dbTx()` — kegagalan di tengah transaksi otomatis `ROLLBACK` (tidak ada stok minus tanpa transaksi).
- **Prisma (opsional)**: `database/schema.prisma` sudah diset `provider = "postgresql"`. Bila tim ingin memakai Prisma di kemudian hari: `npm i -D prisma && npx prisma migrate dev` — tanpa perubahan skema (skema SQL sudah kompatibel). Runtime aplikasi saat ini memakai `pg` agar ringan (tanpa `prisma generate` saat build).

---

## 6. Struktur Repo Setelah Migrasi

```
Rental-Hub/
├── database/
│   ├── supabase/migrations/0001_init.sql   # ← Skema + seed Supabase (jalankan di SQL Editor)
│   ├── scripts/migrate-sqlite-to-supabase.mjs  # ← Migrasi data SQLite lama
│   ├── schema.prisma                       # provider = postgresql
│   ├── ps_rental_hub.sql                   # (legacy) arsip MySQL lama
│   └── ps_rental_hub.db                    # (legacy) sumber data migrasi
├── ps-rental-admin/                        # Vercel project #1 (Root Directory ini)
│   ├── .env.example                        # DATABASE_URL + SUPABASE_* + AUTH_SECRET
│   └── src/lib/db.js                       # data layer pg (pool, dbAll/dbGet/dbRun/dbTx)
├── ps-rental-client/                       # Vercel project #2 (Root Directory ini)
│   ├── .env.example
│   └── src/lib/db.js                       # identik dengan admin
├── DEPLOYMENT-VERCEL.md                    # ← dokumen ini
└── README.md
```
