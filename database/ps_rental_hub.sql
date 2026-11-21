-- ============================================================================
-- PS RENTAL HUB - DATABASE MYSQL / MARIADB (VERSI NEXT.JS ADMIN + CLIENT)
-- Sistem Informasi Pengelolaan Rental PlayStation Berbasis Web
-- Kelompok 12 - UNINDRA - Rekayasa Perangkat Lunak (SRS v1.0)
-- Digunakan bersama oleh:
--   1. Website Admin  (ps-rental-admin  - Next.js Port 3001)
--   2. Website Client (ps-rental-client - Next.js Port 3000)
-- Cara pakai: Import ke phpMyAdmin (XAMPP/Laragon) atau jalankan di MySQL CLI
-- ============================================================================

CREATE DATABASE IF NOT EXISTS ps_rental_hub
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ps_rental_hub;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS game_requests;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS deposits;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS promos;
DROP TABLE IF EXISTS transaction_addons;
DROP TABLE IF EXISTS stock;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS users;

-- 1. Tabel Users (SRS 4.1, NFR-06 Bcrypt, NFR-07 RBAC)
CREATE TABLE users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(50)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL COMMENT 'Bcrypt hash (NFR-06)',
  name          VARCHAR(100) NOT NULL,
  role          ENUM('Super Admin','Manajer','Operator','Pemilik') NOT NULL DEFAULT 'Operator' COMMENT 'RBAC (NFR-07)',
  status        ENUM('Aktif','Nonaktif') NOT NULL DEFAULT 'Aktif',
  last_active   DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabel Units PlayStation (SRS 4.3, FR-7 s/d FR-10)
CREATE TABLE units (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code            VARCHAR(20)  NOT NULL,
  name            VARCHAR(50)  NOT NULL,
  ps_type         ENUM('PS4','PS5') NOT NULL DEFAULT 'PS5',
  room_type       ENUM('VIP Room','Reguler','VR Corner','Home Rental') NOT NULL DEFAULT 'Reguler',
  price_per_hour  DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Tarif per jam (NFR-09)',
  status          ENUM('Tersedia','Disewa','Maintenance') NOT NULL DEFAULT 'Tersedia' COMMENT 'FR-4, FR-10',
  features        VARCHAR(255) NULL COMMENT 'Fasilitas bilik untuk portal client',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_units_code (code),
  KEY idx_units_status (status),
  KEY idx_units_ps_type (ps_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel Customers / Pelanggan (SRS 4.4, FR-11 s/d FR-13)
CREATE TABLE customers (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  nik        VARCHAR(30)  NULL,
  phone      VARCHAR(20)  NULL,
  address    VARCHAR(255) NULL,
  points     INT NOT NULL DEFAULT 0 COMMENT 'Poin loyalitas portal client',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_customers_name (name),
  KEY idx_customers_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabel Transactions / Transaksi Rental (SRS 4.5, FR-14 s/d FR-20)
CREATE TABLE transactions (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_code     VARCHAR(25)  NOT NULL,
  customer_id      BIGINT UNSIGNED NULL,
  customer_name    VARCHAR(100) NOT NULL,
  customer_phone   VARCHAR(20)  NULL,
  unit_id          BIGINT UNSIGNED NULL,
  unit_name        VARCHAR(50)  NOT NULL,
  booking_source   ENUM('Admin POS','Client Online','Home Rental') NOT NULL DEFAULT 'Admin POS',
  start_time       DATETIME NOT NULL COMMENT 'Waktu mulai otomatis (FR-15)',
  end_time         DATETIME NOT NULL,
  return_time      DATETIME NULL COMMENT 'Waktu kembali aktual (FR-20)',
  duration_hours   DECIMAL(6,2) NOT NULL DEFAULT 1,
  price_per_hour   DECIMAL(12,2) NOT NULL DEFAULT 0,
  addons_total     DECIMAL(14,2) NOT NULL DEFAULT 0,
  subtotal         DECIMAL(14,2) NOT NULL DEFAULT 0,
  discount         DECIMAL(14,2) NOT NULL DEFAULT 0,
  penalty          DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT 'Denda keterlambatan (FR-20, NFR-11)',
  total            DECIMAL(14,2) NOT NULL DEFAULT 0,
  payment_status   ENUM('Lunas','Belum Lunas') NOT NULL DEFAULT 'Lunas' COMMENT 'FR-17',
  payment_method   VARCHAR(30) NOT NULL DEFAULT 'cash',
  created_by       VARCHAR(50) NOT NULL DEFAULT 'system',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_transactions_invoice (invoice_code),
  KEY idx_transactions_customer (customer_id),
  KEY idx_transactions_unit (unit_id),
  KEY idx_transactions_created (created_at),
  CONSTRAINT fk_trx_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_trx_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabel Stock Aksesori & Snack Bar
CREATE TABLE stock (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  price      DECIMAL(12,2) NOT NULL DEFAULT 0,
  qty        INT NOT NULL DEFAULT 0,
  category   ENUM('Aksesori','Makanan','Minuman') NOT NULL DEFAULT 'Aksesori',
  sold       INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabel Detail Add-ons Transaksi
CREATE TABLE transaction_addons (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transaction_id  BIGINT UNSIGNED NOT NULL,
  stock_id        BIGINT UNSIGNED NULL,
  item_name       VARCHAR(100) NOT NULL,
  price           DECIMAL(12,2) NOT NULL DEFAULT 0,
  qty             INT NOT NULL DEFAULT 1,
  subtotal        DECIMAL(14,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT fk_addon_trx FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_addon_stock FOREIGN KEY (stock_id) REFERENCES stock(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabel Promo / Kupon Diskon
CREATE TABLE promos (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code             VARCHAR(30) NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  description      VARCHAR(255) NULL,
  expired_at       DATE NULL,
  used_count       INT NOT NULL DEFAULT 0,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_promos_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabel Activity Logs / Audit Trail (NFR-08)
CREATE TABLE activity_logs (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username   VARCHAR(50) NOT NULL,
  action     VARCHAR(100) NOT NULL,
  detail     VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tabel Deposits (Jaminan Sewa Bawa Pulang)
CREATE TABLE deposits (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_code   VARCHAR(25)  NULL,
  unit_name      VARCHAR(50)  NOT NULL,
  customer_name  VARCHAR(100) NOT NULL,
  customer_nik   VARCHAR(30)  NULL,
  deposit_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  status         ENUM('Ditahan','Dikembalikan') NOT NULL DEFAULT 'Ditahan',
  return_date    DATE NULL,
  notes          VARCHAR(255) NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Tabel Games (Katalog Game Portal Client)
CREATE TABLE games (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title      VARCHAR(100) NOT NULL,
  platform   ENUM('PS4','PS5','PS4 & PS5') NOT NULL DEFAULT 'PS5',
  genre      VARCHAR(60)  NOT NULL,
  rating     DECIMAL(3,1) NOT NULL DEFAULT 4.8,
  players    VARCHAR(30)  NOT NULL DEFAULT '1-2 Pemain',
  is_popular TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Tabel Game Requests (Request Instalasi Game dari Client ke Admin)
CREATE TABLE game_requests (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_name VARCHAR(100) NOT NULL,
  game_title    VARCHAR(120) NOT NULL,
  platform      ENUM('PS4','PS5') NOT NULL DEFAULT 'PS5',
  unit_preference VARCHAR(50) NULL,
  status        ENUM('Menunggu','Disetujui','Selesai') NOT NULL DEFAULT 'Menunggu',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- SEED DATA AWAL
-- Password akun demo (Bcrypt):
--   admin    -> admin123
--   manager  -> manager123
--   operator -> operator123
--   pemilik  -> pemilik123
-- ============================================================================

INSERT INTO users (id, username, password_hash, name, role, status, last_active) VALUES
(1, 'admin',    '$2b$12$GUmxSTO2elzBWlCp5vCtsOz/cRhdJA6hCwx7w7vtNvxvcmio3Y/W2', 'Super Admin',   'Super Admin', 'Aktif', NOW()),
(2, 'manager',  '$2b$12$ViSxMs16eMAvvwBdqWaxIu6E2pxJDrXdJU6LkJN74I6OINacn5e2a', 'Agus Manajer',  'Manajer',     'Aktif', NOW()),
(3, 'operator', '$2b$12$lgZOp9nosLtyW38duncqLOSbX6h9qUnpAfjRsSuqDkFa57LRRKeou', 'Sari Kasir',    'Operator',    'Aktif', NOW()),
(4, 'pemilik',  '$2b$12$TWnwZfo4yfMYB2IRLr9rIebz9bk4XAmZMsg6ubRCVTiyQ0ru9LJNK', 'Pemilik Usaha', 'Pemilik',     'Aktif', NOW());

INSERT INTO units (id, code, name, ps_type, room_type, price_per_hour, status, features) VALUES
(1,  'VIP-01', 'VIP 01',      'PS5', 'VIP Room',    35000,  'Tersedia',    'TV OLED 55" 4K • Sofa Recliner • AC Privat'),
(2,  'VIP-02', 'VIP 02',      'PS5', 'VIP Room',    35000,  'Disewa',      'TV OLED 55" 4K • Sofa Recliner • AC Privat'),
(3,  'VIP-03', 'VIP 03',      'PS5', 'VIP Room',    35000,  'Tersedia',    'TV OLED 55" 4K • Sofa Recliner • Soundbar'),
(4,  'REG-01', 'REG 01',      'PS4', 'Reguler',     15000,  'Tersedia',    'TV LED 43" FHD • Bean Bag • 2 DualShock'),
(5,  'REG-02', 'REG 02',      'PS4', 'Reguler',     15000,  'Maintenance', 'TV LED 43" FHD • Bean Bag • 2 DualShock'),
(6,  'REG-03', 'REG 03',      'PS5', 'Reguler',     20000,  'Tersedia',    'TV 4K 43" • Kursi Gaming • 2 DualSense'),
(7,  'REG-04', 'REG 04',      'PS4', 'Reguler',     15000,  'Tersedia',    'TV LED 43" FHD • Bean Bag • 2 DualShock'),
(8,  'REG-05', 'REG 05',      'PS5', 'Reguler',     20000,  'Disewa',      'TV 4K 43" • Kursi Gaming • 2 DualSense'),
(9,  'REG-06', 'REG 06',      'PS4', 'Reguler',     15000,  'Tersedia',    'TV LED 43" FHD • Bean Bag • 2 DualShock'),
(10, 'REG-07', 'REG 07',      'PS5', 'Reguler',     20000,  'Tersedia',    'TV 4K 43" • Kursi Gaming • 2 DualSense'),
(11, 'VR-01',  'VR 01',       'PS5', 'VR Corner',   45000,  'Tersedia',    'PlayStation VR2 • Area Gerak 3x3m • Headset Pulse'),
(12, 'VR-02',  'VR 02',       'PS5', 'VR Corner',   45000,  'Disewa',      'PlayStation VR2 • Area Gerak 3x3m • Headset Pulse'),
(13, 'PRT-01', 'PORTABLE 01', 'PS4', 'Home Rental', 100000, 'Tersedia',    'Paket Sewa Harian Bawa Pulang • Tas Hardcase • 2 Stik'),
(14, 'PRT-02', 'PORTABLE 02', 'PS5', 'Home Rental', 150000, 'Tersedia',    'Paket Sewa Harian Bawa Pulang • Tas Hardcase • 2 DualSense');

INSERT INTO customers (id, name, nik, phone, address, points) VALUES
(1, 'Budi Santoso',   '3171010101900001', '081234567890', 'Jl. Merdeka No. 10, Jakarta', 140),
(2, 'Sari Dewi',      '3171010202950002', '081298765432', 'Jl. Sudirman No. 25, Jakarta', 90),
(3, 'Agus Wijaya',    '3171010303880003', '085712345678', 'Jl. Thamrin No. 5, Jakarta', 60),
(4, 'Rina Marlina',   '3171010404920004', '082198765432', 'Jl. Gatot Subroto No. 88, Jakarta', 220),
(5, 'Dedi Kurniawan', '3171010505970005', '089876543210', 'Jl. Kemang No. 12, Jakarta Selatan', 40);

INSERT INTO stock (id, name, price, qty, category, sold) VALUES
(1, 'Stik PS5 DualSense Extra', 10000, 12, 'Aksesori', 34),
(2, 'Stik PS4 DualShock Extra',  8000, 18, 'Aksesori', 22),
(3, 'Indomie Goreng + Telur',   15000, 30, 'Makanan',  45),
(4, 'Es Kopi Susu Gula Aren',   12000, 40, 'Minuman',  60),
(5, 'Teh Botol Sosro Dingin',    6000, 50, 'Minuman',  38),
(6, 'French Fries Crispy',      12000, 25, 'Makanan',  28);

INSERT INTO promos (id, code, discount_percent, description, expired_at, used_count) VALUES
(1, 'HAPPYHOUR', 30, 'Diskon Happy Hour 30% Siang Hari', '2027-12-31', 120),
(2, 'WEEKEND20', 20, 'Promo Seru Akhir Pekan 20%',       '2027-12-31',  45),
(3, 'NEWBIE50',  50, 'Diskon Pelanggan Baru 50%',        '2027-12-31', 210),
(4, 'MEMBER15',  15, 'Diskon Member Setia 15%',          '2027-12-31',  32);

INSERT INTO games (id, title, platform, genre, rating, players, is_popular) VALUES
(1, 'EA Sports FC 26',               'PS4 & PS5', 'Sports / Football', 4.9, '1-4 Pemain', 1),
(2, 'eFootball 2026',                'PS4 & PS5', 'Sports / Football', 4.7, '1-4 Pemain', 1),
(3, 'NBA 2K26',                      'PS4 & PS5', 'Sports / Basket',   4.8, '1-4 Pemain', 1),
(4, 'Tekken 8',                      'PS5',       'Fighting',          4.9, '1-2 Pemain', 1),
(5, 'Mortal Kombat 1',               'PS5',       'Fighting',          4.8, '1-2 Pemain', 1),
(6, 'Marvel''s Spider-Man 2',        'PS5',       'Action Adventure',  4.9, '1 Pemain',   1),
(7, 'Gran Turismo 7 (VR2 Ready)',    'PS4 & PS5', 'Racing / Simulasi', 4.9, '1-2 Pemain', 1),
(8, 'GTA V Expanded & Enhanced',     'PS4 & PS5', 'Open World',        4.9, '1 Pemain',   1),
(9, 'It Takes Two',                  'PS4 & PS5', 'Co-op Adventure',   4.9, '2 Pemain',   1),
(10,'God of War Ragnarök',           'PS4 & PS5', 'Action RPG',        4.9, '1 Pemain',   0);

INSERT INTO transactions (id, invoice_code, customer_id, customer_name, customer_phone, unit_id, unit_name, booking_source, start_time, end_time, return_time, duration_hours, price_per_hour, addons_total, subtotal, discount, penalty, total, payment_status, payment_method, created_by) VALUES
(1, 'TRX-1001', 1, 'Budi Santoso', '081234567890', 1,  'VIP 01', 'Admin POS',     NOW() - INTERVAL 4 HOUR, NOW() - INTERVAL 2 HOUR, NOW() - INTERVAL 2 HOUR, 2, 35000, 0, 70000, 0, 0, 70000, 'Lunas',       'qris',     'operator'),
(2, 'TRX-1002', 2, 'Sari Dewi',    '081298765432', 2,  'VIP 02', 'Client Online', NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 1 HOUR, NULL,                    2, 35000, 0, 70000, 0, 0, 70000, 'Lunas',       'qris',     'client-web'),
(3, 'TRX-1003', 3, 'Agus Wijaya',  '085712345678', 8,  'REG 05', 'Admin POS',     NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 1 HOUR, NULL,                    2, 20000, 0, 40000, 0, 0, 40000, 'Belum Lunas', 'cash',     'operator'),
(4, 'TRX-1004', 4, 'Rina Marlina', '082198765432', 12, 'VR 02',  'Client Online', NOW() - INTERVAL 30 MINUTE, NOW() + INTERVAL 90 MINUTE, NULL,              2, 45000, 0, 90000, 0, 0, 90000, 'Lunas',       'gopay',    'client-web');

INSERT INTO deposits (id, invoice_code, unit_name, customer_name, customer_nik, deposit_amount, status, return_date, notes) VALUES
(1, 'TRX-HOME01', 'PORTABLE 01', 'Budi Santoso', '3171010101900001', 500000, 'Dikembalikan', CURDATE(), 'Kondisi lengkap & mulus');

INSERT INTO game_requests (id, customer_name, game_title, platform, unit_preference, status) VALUES
(1, 'Rina Marlina', 'Black Myth: Wukong', 'PS5', 'VIP 01', 'Menunggu'),
(2, 'Dedi Kurniawan', 'Street Fighter 6', 'PS5', 'REG 03', 'Disetujui');

INSERT INTO activity_logs (username, action, detail) VALUES
('system', 'Inisialisasi DB', 'Database ps_rental_hub siap untuk Website Admin & Website Client Next.js');

-- Views untuk Dashboard SRS FR-4 s/d FR-6
CREATE OR REPLACE VIEW v_unit_status AS
SELECT status, COUNT(*) AS jumlah_unit FROM units GROUP BY status;

CREATE OR REPLACE VIEW v_dashboard_harian AS
SELECT COUNT(*) AS transaksi_hari_ini, COALESCE(SUM(total),0) AS pendapatan_hari_ini
FROM transactions WHERE DATE(created_at) = CURDATE();

CREATE OR REPLACE VIEW v_dashboard_bulanan AS
SELECT COUNT(*) AS transaksi_bulan_ini, COALESCE(SUM(total),0) AS pendapatan_bulan_ini
FROM transactions WHERE YEAR(created_at)=YEAR(CURDATE()) AND MONTH(created_at)=MONTH(CURDATE());
