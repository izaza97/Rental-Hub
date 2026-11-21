# PS Rental Hub — React & Next.js Edition (Supabase PostgreSQL + Vercel)
## Sistem Informasi Pengelolaan Rental PlayStation Berbasis Web
**Kelompok 12 — UNINDRA — Rekayasa Perangkat Lunak (Sesuai SRS v1.0)**

Arsitektur proyek ini dibagi menjadi **3 bagian terpisah**:

```
Rental-Hub/
├── database/                              # 1. DATABASE SUPABASE POSTGRESQL
│   ├── supabase/migrations/0001_init.sql  #    Skema + seed untuk Supabase SQL Editor
│   ├── scripts/migrate-sqlite-to-supabase.mjs  # Migrasi data SQLite lama
│   ├── schema.prisma                      #    Skema ORM Prisma (provider postgresql)
│   ├── ps_rental_hub.sql                  #    (legacy) arsip MySQL lama
│   └── ps_rental_hub.db                   #    (legacy) SQLite lama — sumber migrasi data
│
├── ps-rental-admin/                       # 2. WEBSITE ADMIN / BACK-OFFICE (Next.js Port 3001)
│   ├── package.json                       #    dependensi: next, pg, bcryptjs
│   ├── .env.example                       #    DATABASE_URL, SUPABASE_*, AUTH_SECRET
│   └── src/app/...                        #    FR-1 s/d FR-20, RBAC 4 Role, Bcrypt, Audit Trail
│
├── ps-rental-client/                      # 3. WEBSITE CLIENT / PELANGGAN (Next.js Port 3000)
│   ├── package.json                       #    dependensi: next, pg
│   ├── .env.example                       #    DATABASE_URL, SUPABASE_*
│   └── src/app/...                        #    Landing, Floor Plan Booking, Home Rental, Game, Member
│
└── DEPLOYMENT-VERCEL.md                   # Panduan migrasi DB + deploy Vercel (WAJIB DIBACA)
```

**Migrasi database:** seluruh sistem kini memakai **PostgreSQL Supabase** via driver `pg`
(parameterized `$1..$n`, transaksi `dbTx`, error handling terpusat) — driver lama
`better-sqlite3` (SQLite) dan `mysql2` (MySQL localhost) sudah dihapus.

---

## Cara Menjalankan di Lokal

1. **Siapkan Supabase** (sekali saja): buat project → SQL Editor → jalankan
   `database/supabase/migrations/0001_init.sql`.

2. **Konfigurasi env** — di folder `ps-rental-admin` **dan** `ps-rental-client`:
   ```bash
   cp .env.example .env.local
   # isi DATABASE_URL (Supabase → Settings → Database → Connection string → URI / Pooler)
   # isi NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
   # isi AUTH_SECRET (admin saja)
   ```

3. **Jalankan Website Client (Port 3000):**
   ```bash
   cd ps-rental-client
   npm install
   npm run dev
   ```
   Buka: `http://localhost:3000`

4. **Jalankan Website Admin (Port 3001) di terminal kedua:**
   ```bash
   cd ps-rental-admin
   npm install
   npm run dev
   ```
   Buka: `http://localhost:3001`

> Data SQLite/MySQL lama? Ikuti **Langkah Migrasi Database** di `DEPLOYMENT-VERCEL.md` (§2).

---

## Deploy ke Vercel

Ringkasnya: buat **2 project Vercel** dari repo ini dengan Root Directory
`ps-rental-admin` dan `ps-rental-client`, lalu isi env `DATABASE_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` (+ `AUTH_SECRET` untuk admin).
Langkah lengkap (build settings, pooling, checklist pasca-deploy): **[DEPLOYMENT-VERCEL.md](./DEPLOYMENT-VERCEL.md)**.

---

## Akun Demo Login Website Admin (`http://localhost:3001`)

| Role (NFR-07) | Username | Password | Hak Akses |
|---|---|---|---|
| **Super Admin** | `admin` | `admin123` | Akses penuh semua modul + User & Audit Trail |
| **Manajer** | `manager` | `manager123` | Dashboard, Unit, Pelanggan, POS, Riwayat, Audit Trail |
| **Operator** | `operator` | `operator123` | Kasir harian (Dashboard, Unit, Pelanggan, POS, Riwayat) |
| **Pemilik** | `pemilik` | `pemilik123` | Monitoring Read-Only (Dashboard & Riwayat/Nota) |
