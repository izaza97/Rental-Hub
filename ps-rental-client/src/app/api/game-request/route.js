import { NextResponse } from 'next/server';
import { dbRun, sqlNow } from '@/lib/db';

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
      "INSERT INTO game_requests (customer_name, game_title, platform, unit_preference, status, created_at) VALUES (?, ?, ?, ?, 'Menunggu', ?)",
      [customer_name, game_title, platform, unit_preference, sqlNow()]
    );

    await dbRun(
      'INSERT INTO activity_logs (username, action, detail, created_at) VALUES (?, ?, ?, ?)',
      ['client-web', 'Request Game Baru', `${customer_name} meminta instalasi ${game_title} (${platform})`, sqlNow()]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal mengirim request.' }, { status: 500 });
  }
}
