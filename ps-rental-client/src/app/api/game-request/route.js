import { NextResponse } from 'next/server';
import { dbRun, sqlNow, serverError } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const customer_name = String(body.customer_name || '').trim();
    const game_title = String(body.game_title || '').trim();
    const platform = body.platform === 'PS4' ? 'PS4' : 'PS5';
    const unit_preference = String(body.unit_preference || '').trim() || 'Semua Unit';

    if (!customer_name || !game_title) {
      return NextResponse.json({ error: 'Nama Anda dan judul game wajib diisi.' }, { status: 400 });
    }

    await dbRun(
      "INSERT INTO game_requests (customer_name, game_title, platform, unit_preference, status, created_at) VALUES ($1, $2, $3, $4, 'Menunggu', $5) RETURNING id",
      [customer_name, game_title, platform, unit_preference, sqlNow()]
    );

    await dbRun('INSERT INTO activity_logs (username, action, detail, created_at) VALUES ($1, $2, $3, $4)', [
      'client-web',
      'Request Game Baru',
      `${customer_name} meminta instalasi ${game_title} (${platform})`,
      sqlNow(),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(serverError(err, 'game-request POST'), { status: 500 });
  }
}
