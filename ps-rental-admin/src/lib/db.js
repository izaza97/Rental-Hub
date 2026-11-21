import fs from 'fs';
import path from 'path';

let sqliteInstance = null;
let mysqlPool = null;

function nowSql(offsetMinutes = 0) {
  const d = new Date(Date.now() + offsetMinutes * 60000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function resolveSqlitePath() {
  if (process.env.SQLITE_PATH) return path.resolve(process.env.SQLITE_PATH);
  const sharedDir = path.resolve(process.cwd(), '..', 'database');
  if (fs.existsSync(sharedDir)) {
    return path.join(sharedDir, 'ps_rental_hub.db');
  }
  const localDir = path.resolve(process.cwd(), 'local-database');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  return path.join(localDir, 'ps_rental_hub.db');
}

function seedSqliteIfNeeded(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Operator',
      status TEXT NOT NULL DEFAULT 'Aktif',
      last_active TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      ps_type TEXT NOT NULL DEFAULT 'PS5',
      room_type TEXT NOT NULL DEFAULT 'Reguler',
      price_per_hour REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Tersedia',
      features TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      nik TEXT,
      phone TEXT,
      address TEXT,
      points INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_code TEXT NOT NULL UNIQUE,
      customer_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      unit_id INTEGER,
      unit_name TEXT NOT NULL,
      booking_source TEXT NOT NULL DEFAULT 'Admin POS',
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      return_time TEXT,
      duration_hours REAL NOT NULL DEFAULT 1,
      price_per_hour REAL NOT NULL DEFAULT 0,
      addons_total REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      penalty REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'Lunas',
      payment_method TEXT NOT NULL DEFAULT 'cash',
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      qty INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'Aksesori',
      sold INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transaction_addons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      stock_id INTEGER,
      item_name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      qty INTEGER NOT NULL DEFAULT 1,
      subtotal REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS promos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      discount_percent REAL NOT NULL DEFAULT 0,
      description TEXT,
      expired_at TEXT,
      used_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_code TEXT,
      unit_name TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_nik TEXT,
      deposit_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Ditahan',
      return_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'PS5',
      genre TEXT NOT NULL,
      rating REAL NOT NULL DEFAULT 4.8,
      players TEXT NOT NULL DEFAULT '1-2 Pemain',
      is_popular INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS game_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      game_title TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'PS5',
      unit_preference TEXT,
      status TEXT NOT NULL DEFAULT 'Menunggu',
      created_at TEXT NOT NULL
    );
  `);

  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount > 0) return;

  const now = nowSql();
  const insUser = db.prepare('INSERT INTO users (username, password_hash, name, role, status, last_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  [
    ['admin', '$2b$12$GUmxSTO2elzBWlCp5vCtsOz/cRhdJA6hCwx7w7vtNvxvcmio3Y/W2', 'Super Admin', 'Super Admin', 'Aktif', now, now],
    ['manager', '$2b$12$ViSxMs16eMAvvwBdqWaxIu6E2pxJDrXdJU6LkJN74I6OINacn5e2a', 'Agus Manajer', 'Manajer', 'Aktif', now, now],
    ['operator', '$2b$12$lgZOp9nosLtyW38duncqLOSbX6h9qUnpAfjRsSuqDkFa57LRRKeou', 'Sari Kasir', 'Operator', 'Aktif', now, now],
    ['pemilik', '$2b$12$TWnwZfo4yfMYB2IRLr9rIebz9bk4XAmZMsg6ubRCVTiyQ0ru9LJNK', 'Pemilik Usaha', 'Pemilik', 'Aktif', now, now],
  ].forEach((r) => insUser.run(...r));

  const insUnit = db.prepare('INSERT INTO units (code, name, ps_type, room_type, price_per_hour, status, features, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  [
    ['VIP-01', 'VIP 01', 'PS5', 'VIP Room', 35000, 'Tersedia', 'TV OLED 55" 4K • Sofa Recliner • AC Privat', now],
    ['VIP-02', 'VIP 02', 'PS5', 'VIP Room', 35000, 'Disewa', 'TV OLED 55" 4K • Sofa Recliner • AC Privat', now],
    ['VIP-03', 'VIP 03', 'PS5', 'VIP Room', 35000, 'Tersedia', 'TV OLED 55" 4K • Sofa Recliner • Soundbar', now],
    ['REG-01', 'REG 01', 'PS4', 'Reguler', 15000, 'Tersedia', 'TV LED 43" FHD • Bean Bag • 2 DualShock', now],
    ['REG-02', 'REG 02', 'PS4', 'Reguler', 15000, 'Maintenance', 'TV LED 43" FHD • Bean Bag • 2 DualShock', now],
    ['REG-03', 'REG 03', 'PS5', 'Reguler', 20000, 'Tersedia', 'TV 4K 43" • Kursi Gaming • 2 DualSense', now],
    ['REG-04', 'REG 04', 'PS4', 'Reguler', 15000, 'Tersedia', 'TV LED 43" FHD • Bean Bag • 2 DualShock', now],
    ['REG-05', 'REG 05', 'PS5', 'Reguler', 20000, 'Disewa', 'TV 4K 43" • Kursi Gaming • 2 DualSense', now],
    ['REG-06', 'REG 06', 'PS4', 'Reguler', 15000, 'Tersedia', 'TV LED 43" FHD • Bean Bag • 2 DualShock', now],
    ['REG-07', 'REG 07', 'PS5', 'Reguler', 20000, 'Tersedia', 'TV 4K 43" • Kursi Gaming • 2 DualSense', now],
    ['VR-01', 'VR 01', 'PS5', 'VR Corner', 45000, 'Tersedia', 'PlayStation VR2 • Area Gerak 3x3m • Headset Pulse', now],
    ['VR-02', 'VR 02', 'PS5', 'VR Corner', 45000, 'Disewa', 'PlayStation VR2 • Area Gerak 3x3m • Headset Pulse', now],
    ['PRT-01', 'PORTABLE 01', 'PS4', 'Home Rental', 100000, 'Tersedia', 'Paket Sewa Harian Bawa Pulang • Tas Hardcase • 2 Stik', now],
    ['PRT-02', 'PORTABLE 02', 'PS5', 'Home Rental', 150000, 'Tersedia', 'Paket Sewa Harian Bawa Pulang • Tas Hardcase • 2 DualSense', now],
  ].forEach((r) => insUnit.run(...r));

  const insCust = db.prepare('INSERT INTO customers (name, nik, phone, address, points, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  [
    ['Budi Santoso', '3171010101900001', '081234567890', 'Jl. Merdeka No. 10, Jakarta', 140, now],
    ['Sari Dewi', '3171010202950002', '081298765432', 'Jl. Sudirman No. 25, Jakarta', 90, now],
    ['Agus Wijaya', '3171010303880003', '085712345678', 'Jl. Thamrin No. 5, Jakarta', 60, now],
    ['Rina Marlina', '3171010404920004', '082198765432', 'Jl. Gatot Subroto No. 88, Jakarta', 220, now],
    ['Dedi Kurniawan', '3171010505970005', '089876543210', 'Jl. Kemang No. 12, Jakarta Selatan', 40, now],
  ].forEach((r) => insCust.run(...r));

  const insStock = db.prepare('INSERT INTO stock (name, price, qty, category, sold, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  [
    ['Stik PS5 DualSense Extra', 10000, 12, 'Aksesori', 34, now],
    ['Stik PS4 DualShock Extra', 8000, 18, 'Aksesori', 22, now],
    ['Indomie Goreng + Telur', 15000, 30, 'Makanan', 45, now],
    ['Es Kopi Susu Gula Aren', 12000, 40, 'Minuman', 60, now],
    ['Teh Botol Sosro Dingin', 6000, 50, 'Minuman', 38, now],
    ['French Fries Crispy', 12000, 25, 'Makanan', 28, now],
  ].forEach((r) => insStock.run(...r));

  const insPromo = db.prepare('INSERT INTO promos (code, discount_percent, description, expired_at, used_count, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  [
    ['HAPPYHOUR', 30, 'Diskon Happy Hour 30% Siang Hari', '2027-12-31', 120, now],
    ['WEEKEND20', 20, 'Promo Seru Akhir Pekan 20%', '2027-12-31', 45, now],
    ['NEWBIE50', 50, 'Diskon Pelanggan Baru 50%', '2027-12-31', 210, now],
    ['MEMBER15', 15, 'Diskon Member Setia 15%', '2027-12-31', 32, now],
  ].forEach((r) => insPromo.run(...r));

  const insGame = db.prepare('INSERT INTO games (title, platform, genre, rating, players, is_popular) VALUES (?, ?, ?, ?, ?, ?)');
  [
    ['EA Sports FC 26', 'PS4 & PS5', 'Sports / Football', 4.9, '1-4 Pemain', 1],
    ['eFootball 2026', 'PS4 & PS5', 'Sports / Football', 4.7, '1-4 Pemain', 1],
    ['NBA 2K26', 'PS4 & PS5', 'Sports / Basket', 4.8, '1-4 Pemain', 1],
    ['Tekken 8', 'PS5', 'Fighting', 4.9, '1-2 Pemain', 1],
    ['Mortal Kombat 1', 'PS5', 'Fighting', 4.8, '1-2 Pemain', 1],
    ["Marvel's Spider-Man 2", 'PS5', 'Action Adventure', 4.9, '1 Pemain', 1],
    ['Gran Turismo 7 (VR2 Ready)', 'PS4 & PS5', 'Racing / Simulasi', 4.9, '1-2 Pemain', 1],
    ['GTA V Expanded & Enhanced', 'PS4 & PS5', 'Open World', 4.9, '1 Pemain', 1],
    ['It Takes Two', 'PS4 & PS5', 'Co-op Adventure', 4.9, '2 Pemain', 1],
    ['God of War Ragnarök', 'PS4 & PS5', 'Action RPG', 4.9, '1 Pemain', 0],
  ].forEach((r) => insGame.run(...r));

  const insTrx = db.prepare(`INSERT INTO transactions
    (invoice_code, customer_id, customer_name, customer_phone, unit_id, unit_name, booking_source, start_time, end_time, return_time, duration_hours, price_per_hour, addons_total, subtotal, discount, penalty, total, payment_status, payment_method, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  [
    ['TRX-1001', 1, 'Budi Santoso', '081234567890', 1, 'VIP 01', 'Admin POS', nowSql(-240), nowSql(-120), nowSql(-120), 2, 35000, 0, 70000, 0, 0, 70000, 'Lunas', 'qris', 'operator', nowSql(-240)],
    ['TRX-1002', 2, 'Sari Dewi', '081298765432', 2, 'VIP 02', 'Client Online', nowSql(-60), nowSql(60), null, 2, 35000, 0, 70000, 0, 0, 70000, 'Lunas', 'qris', 'client-web', nowSql(-60)],
    ['TRX-1003', 3, 'Agus Wijaya', '085712345678', 8, 'REG 05', 'Admin POS', nowSql(-45), nowSql(75), null, 2, 20000, 0, 40000, 0, 0, 40000, 'Belum Lunas', 'cash', 'operator', nowSql(-45)],
    ['TRX-1004', 4, 'Rina Marlina', '082198765432', 12, 'VR 02', 'Client Online', nowSql(-30), nowSql(90), null, 2, 45000, 0, 90000, 0, 0, 90000, 'Lunas', 'gopay', 'client-web', nowSql(-30)],
  ].forEach((r) => insTrx.run(...r));

  db.prepare('INSERT INTO deposits (invoice_code, unit_name, customer_name, customer_nik, deposit_amount, status, return_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('TRX-HOME01', 'PORTABLE 01', 'Budi Santoso', '3171010101900001', 500000, 'Dikembalikan', now.slice(0, 10), 'Kondisi lengkap & mulus', now);

  const insReq = db.prepare('INSERT INTO game_requests (customer_name, game_title, platform, unit_preference, status, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  insReq.run('Rina Marlina', 'Black Myth: Wukong', 'PS5', 'VIP 01', 'Menunggu', now);
  insReq.run('Dedi Kurniawan', 'Street Fighter 6', 'PS5', 'REG 03', 'Disetujui', now);

  db.prepare('INSERT INTO activity_logs (username, action, detail, created_at) VALUES (?, ?, ?, ?)')
    .run('system', 'Inisialisasi DB', 'Database SQL aktif & terhubung ke Website Admin + Website Client Next.js', now);
}

function getSqlite() {
  if (!sqliteInstance) {
    const Database = require('better-sqlite3');
    sqliteInstance = new Database(resolveSqlitePath());
    sqliteInstance.pragma('journal_mode = WAL');
    sqliteInstance.pragma('busy_timeout = 5000');
    seedSqliteIfNeeded(sqliteInstance);
  }
  return sqliteInstance;
}

async function getMysql() {
  if (!mysqlPool) {
    const mysql = await import('mysql2/promise');
    mysqlPool = mysql.default.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ps_rental_hub',
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return mysqlPool;
}

const isMysql = () => (process.env.DB_DRIVER || 'sqlite').toLowerCase() === 'mysql';

export async function dbAll(sql, params = []) {
  if (isMysql()) {
    const pool = await getMysql();
    const [rows] = await pool.execute(sql, params);
    return rows;
  }
  const db = getSqlite();
  return db.prepare(sql).all(...params);
}

export async function dbGet(sql, params = []) {
  if (isMysql()) {
    const pool = await getMysql();
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  }
  const db = getSqlite();
  return db.prepare(sql).get(...params) || null;
}

export async function dbRun(sql, params = []) {
  if (isMysql()) {
    const pool = await getMysql();
    const [res] = await pool.execute(sql, params);
    return { lastInsertRowid: res.insertId, changes: res.affectedRows };
  }
  const db = getSqlite();
  const res = db.prepare(sql).run(...params);
  return { lastInsertRowid: Number(res.lastInsertRowid), changes: res.changes };
}

export function sqlNow(offsetMinutes = 0) {
  return nowSql(offsetMinutes);
}
