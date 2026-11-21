# Website Client — PS Rental Hub (React + Next.js)
Proyek khusus **Portal Pelanggan / Client** (terpisah dari Website Admin).

## Menjalankan
```bash
npm install
npm run dev
```
Server berjalan di `http://localhost:3000`.

## Halaman & Fitur Client
1. **Beranda (`/`)** — Live ketersediaan unit dari database, paket harga, kode promo aktif.
2. **Floor Plan & Booking (`/booking`)** — Pilih bilik VIP/Reguler/VR yang tersedia, tambah snack, pakai kupon diskon, bayar QRIS/E-Wallet/Tunai.
3. **Sewa Bawa Pulang (`/home-rental`)** — Sewa konsol PS4/PS5 harian lengkap dengan input NIK KTP & pencatatan deposit otomatis.
4. **Katalog Game (`/games`)** — Daftar game PS4/PS5 + form request instalasi game langsung masuk ke Website Admin.
5. **Cek Status & Member (`/status`)** — Cek riwayat sewa, kartu poin membership (Bronze–Platinum), & cetak bukti booking.
