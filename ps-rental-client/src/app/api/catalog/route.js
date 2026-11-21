import { NextResponse } from 'next/server';
import { dbAll } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const units = await dbAll('SELECT * FROM units ORDER BY id ASC');
  const games = await dbAll('SELECT * FROM games ORDER BY id ASC');
  const promos = await dbAll('SELECT * FROM promos ORDER BY id DESC');
  const stock = await dbAll('SELECT * FROM stock WHERE qty > 0 ORDER BY id ASC');
  const gameRequests = await dbAll('SELECT * FROM game_requests ORDER BY id DESC LIMIT 10');

  return NextResponse.json({ units, games, promos, stock, gameRequests });
}
