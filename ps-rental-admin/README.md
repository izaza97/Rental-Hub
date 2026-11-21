# Website Admin — PS Rental Hub (React + Next.js)
Proyek khusus **Back-Office / Admin** sesuai Tugas 1 & SRS Kelompok 12 UNINDRA.

## Menjalankan
```bash
npm install
npm run dev
```
Server berjalan di `http://localhost:3001`.

## Fitur SRS yang Diimplementasikan
- **FR-1 s/d FR-3:** Login Bcrypt, Tolak Login Salah, Logout Session
- **FR-4 s/d FR-6:** Dashboard Operasional (Breakdown Status Unit, Pendapatan Harian & Bulanan, Grafik 7 Hari)
- **FR-7 s/d FR-10:** CRUD Data PlayStation + Filter Status/Konsol + Status Otomatis
- **FR-11 s/d FR-13:** CRUD Data Pelanggan + Pencarian Nama/Telepon/NIK
- **FR-14 s/d FR-20:** POS Transaksi Rental, Proteksi Unit (NFR-10), Denda Kelipatan Jam (NFR-11), Riwayat Filter & Cetak Nota PDF
- **NFR-06, NFR-07, NFR-08:** Password Bcrypt, RBAC 4 Role, Audit Trail
