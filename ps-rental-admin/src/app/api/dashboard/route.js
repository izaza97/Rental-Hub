export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { dbAll, sqlNow } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request) {
  const user = getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const units = await dbAll('SELECT * FROM units ORDER BY id ASC');
  const transactions = await dbAll('SELECT * FROM transactions ORDER BY id DESC');
  const pendingRequests = await dbAll("SELECT * FROM game_requests WHERE status = 'Menunggu' ORDER BY id DESC");

  const statusCounts = { Tersedia: 0, Disewa: 0, Maintenance: 0 };
  for (const u of units) {
    statusCounts[u.status] = (statusCounts[u.status] || 0) + 1;
  }

  const nowStr = sqlNow();
  const todayPrefix = nowStr.slice(0, 10);
  const monthPrefix = nowStr.slice(0, 7);

  let todayCount = 0;
  let todayRevenue = 0;
  let monthCount = 0;
  let monthRevenue = 0;

  for (const t of transactions) {
    const dt = String(t.created_at || '');
    const amt = Number(t.total || 0);
    if (dt.startsWith(todayPrefix)) {
      todayCount += 1;
      todayRevenue += amt;
    }
    if (dt.startsWith(monthPrefix)) {
      monthCount += 1;
      monthRevenue += amt;
    }
  }

  // Grafik 7 hari terakhir
  const dailySeries = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const pad = (n) => String(n).padStart(2, '0');
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const label = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
    const rev = transactions
      .filter((t) => String(t.created_at || '').startsWith(key))
      .reduce((acc, t) => acc + Number(t.total || 0), 0);
    dailySeries.push({ key, label, revenue: rev });
  }

  const activeRentals = transactions.filter((t) => !t.return_time);

  return NextResponse.json({
    totalUnits: units.length,
    statusCounts,
    todayCount,
    todayRevenue,
    monthCount,
    monthRevenue,
    dailySeries,
    activeRentals,
    recentTransactions: transactions.slice(0, 8),
    pendingGameRequests: pendingRequests.length,
  });
}
