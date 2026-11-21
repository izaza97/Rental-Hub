import { NextResponse } from 'next/server';
import { dbAll, serverError } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [units, games, promos, stock, gameRequests] = await Promise.all([
      dbAll('SELECT * FROM units ORDER BY id ASC'),
      dbAll('SELECT * FROM games ORDER BY id ASC'),
      dbAll('SELECT * FROM promos ORDER BY id DESC'),
      dbAll('SELECT * FROM stock WHERE qty > 0 ORDER BY id ASC'),
      dbAll('SELECT * FROM game_requests ORDER BY id DESC LIMIT 10'),
    ]);

    return NextResponse.json({ units, games, promos, stock, gameRequests });
  } catch (err) {
    return NextResponse.json(serverError(err, 'catalog GET'), { status: 500 });
  }
}
