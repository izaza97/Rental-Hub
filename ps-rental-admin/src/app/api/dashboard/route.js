export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { dbAll, dbGet, sqlNow, serverError } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Refactor serverless-friendly: agregasi dihitung di PostgreSQL
// (sebelumnya seluruh tabel transactions dimuat ke memori lalu di-loop di JS).
export async function GET(request) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Batas waktu dihitung di aplikasi (zona waktu yang sama dengan nilai yang ditulis sqlNow())
    const nowStr = sqlNow();
    const todayStart = `${nowStr.slice(0, 10)} 00:00:00`;
    const monthStart = `${nowStr.slice(0, 7)}-01 00:00:00`;
    const d7 = new Date(Date.now() - 6 * 86400000);
    const pad = (n) => String(n).padStart(2, '0');
    const weekStart = `${d7.getFullYear()}-${pad(d7.getMonth() + 1)}-${pad(d7.getDate())} 00:00:00`;

    const [statusRows, agg, dailyRows, activeRentals, recentTransactions, pending] = await Promise.all([
      // FR-4: breakdown status unit
      dbAll('SELECT status, COUNT(*) AS jumlah FROM units GROUP BY status'),
      // FR-5 & FR-6: transaksi & pendapatan hari ini / bulan ini
      dbGet(
        `SELECT
           COUNT(*) FILTER (WHERE created_at >= $1) AS today_count,
           COALESCE(SUM(total) FILTER (WHERE created_at >= $1), 0) AS today_revenue,
           COUNT(*) FILTER (WHERE created_at >= $2) AS month_count,
           COALESCE(SUM(total) FILTER (WHERE created_at >= $2), 0) AS month_revenue
         FROM transactions`,
        [todayStart, monthStart]
      ),
      // Grafik 7 hari terakhir
      dbAll(
        `SELECT to_char(created_at, 'YYYY-MM-DD') AS key, COALESCE(SUM(total), 0) AS revenue
         FROM transactions
         WHERE created_at >= $1 AND created_at < $2
         GROUP BY 1`,
        [weekStart, `${nowStr.slice(0, 10)} 23:59:59`]
      ),
      // Sesi yang masih berjalan (belum dikembalikan)
      dbAll('SELECT * FROM transactions WHERE return_time IS NULL ORDER BY id DESC'),
      dbAll('SELECT * FROM transactions ORDER BY id DESC LIMIT 8'),
      dbGet("SELECT COUNT(*) AS c FROM game_requests WHERE status = 'Menunggu'"),
    ]);

    const statusCounts = { Tersedia: 0, Disewa: 0, Maintenance: 0 };
    for (const row of statusRows) {
      statusCounts[row.status] = Number(row.jumlah) || 0;
    }

    const dailyMap = new Map(dailyRows.map((r) => [r.key, Number(r.revenue) || 0]));
    const dailySeries = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const label = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
      dailySeries.push({ key, label, revenue: dailyMap.get(key) || 0 });
    }

    return NextResponse.json({
      totalUnits: statusRows.reduce((sum, r) => sum + (Number(r.jumlah) || 0), 0),
      statusCounts,
      todayCount: Number(agg?.today_count) || 0,
      todayRevenue: Number(agg?.today_revenue) || 0,
      monthCount: Number(agg?.month_count) || 0,
      monthRevenue: Number(agg?.month_revenue) || 0,
      dailySeries,
      activeRentals,
      recentTransactions,
      pendingGameRequests: Number(pending?.c) || 0,
    });
  } catch (err) {
    return NextResponse.json(serverError(err, 'dashboard GET'), { status: 500 });
  }
}
