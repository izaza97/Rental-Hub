# Database SQL — PS Rental Hub (Admin + Client Next.js)

Folder ini berisi 3 artefak database yang saling melengkapi:

1. **`ps_rental_hub.sql`** — Script SQL lengkap untuk **MySQL / MariaDB** (phpMyAdmin XAMPP / Laragon). Berisi 11 tabel relasional, Foreign Keys, 3 View Dashboard, dan Seed Data (password Bcrypt).
2. **`schema.prisma`** — Definisi skema ORM Prisma untuk integrasi proyek Next.js.
3. **`ps_rental_hub.db`** — File database **SQLite** siap pakai agar `ps-rental-admin` dan `ps-rental-client` dapat langsung dijalankan bersama tanpa konfigurasi awal.

## Cara Import ke MySQL (phpMyAdmin)
1. Buka `http://localhost/phpmyadmin`
2. Klik tab **Import** → pilih `ps_rental_hub.sql` → klik **Import / Go**.
3. Ubah `.env.local` pada `ps-rental-admin` dan `ps-rental-client` menjadi `DB_DRIVER=mysql`.
