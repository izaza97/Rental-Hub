# PS Rental Hub — React & Next.js Edition (2 Website Terpisah + Database SQL)
## Sistem Informasi Pengelolaan Rental PlayStation Berbasis Web
**Kelompok 12 — UNINDRA — Rekayasa Perangkat Lunak (Sesuai SRS v1.0)**

Arsitektur proyek ini dibagi menjadi **3 bagian terpisah**:

```
ps-rental-nextjs/
├── database/                  # 1. DATABASE SQL TERPUSAT
│   ├── ps_rental_hub.sql      # File import MySQL / MariaDB (phpMyAdmin / XAMPP)
│   ├── schema.prisma          # Skema ORM Prisma (MySQL / SQLite)
│   ├── ps_rental_hub.db       # Database SQLite siap pakai tanpa konfigurasi
│   └── README-DATABASE.md
│
├── ps-rental-admin/           # 2. WEBSITE ADMIN / BACK-OFFICE (Next.js Port 3001)
│   ├── package.json
│   ├── .env.example
│   └── src/app/...            # FR-1 s/d FR-20, RBAC 4 Role, Bcrypt, Audit Trail
│
└── ps-rental-client/          # 3. WEBSITE CLIENT / PELANGGAN (Next.js Port 3000)
    ├── package.json
    ├── .env.example
    └── src/app/...            # Landing, Floor Plan Booking, Home Rental, Game, Member
```

---

## Cara Menjalankan di Laptop (Windows / Mac / Linux)

### Opsi A — Langsung Jalan Tanpa Setup Server MySQL (Mode SQLite Default)
Kedua website otomatis membaca & menulis ke file SQL yang sama (`../database/ps_rental_hub.db`):

1. **Jalankan Website Client (Port 3000):**
   ```bash
   cd ps-rental-client
   npm install
   npm run dev
   ```
   Buka: `http://localhost:3000`

2. **Jalankan Website Admin (Port 3001) di terminal kedua:**
   ```bash
   cd ps-rental-admin
   npm install
   npm run dev
   ```
   Buka: `http://localhost:3001`

---

### Opsi B — Menggunakan MySQL / phpMyAdmin (XAMPP / Laragon — Sesuai SRS 2.4)
1. Nyalakan **MySQL** di XAMPP / Laragon.
2. Buka `http://localhost/phpmyadmin` → **Import** file `database/ps_rental_hub.sql`.
3. Di dalam folder `ps-rental-admin` **dan** `ps-rental-client`, salin `.env.example` menjadi `.env.local`, lalu ubah baris:
   ```env
   DB_DRIVER=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=ps_rental_hub
   ```
4. Jalankan `npm run dev` pada masing-masing folder!

---

## Akun Demo Login Website Admin (`http://localhost:3001`)

| Role (NFR-07) | Username | Password | Hak Akses |
|---|---|---|---|
| **Super Admin** | `admin` | `admin123` | Akses penuh semua modul + User & Audit Trail |
| **Manajer** | `manager` | `manager123` | Dashboard, Unit, Pelanggan, POS, Riwayat, Audit Trail |
| **Operator** | `operator` | `operator123` | Kasir harian (Dashboard, Unit, Pelanggan, POS, Riwayat) |
| **Pemilik** | `pemilik` | `pemilik123` | Monitoring Read-Only (Dashboard & Riwayat/Nota) |
