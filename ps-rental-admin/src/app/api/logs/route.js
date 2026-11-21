export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { dbAll } from '@/lib/db';
import { getAuthUser, canRole } from '@/lib/auth';

export async function GET(request) {
  const user = getAuthUser(request);
  if (!user || !canRole(user.role, 'logs')) {
    return NextResponse.json({ error: 'Role Anda tidak memiliki akses Audit Trail (NFR-07).' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();

  let logs;
  if (q) {
    logs = await dbAll(
      'SELECT * FROM activity_logs WHERE username LIKE ? OR action LIKE ? OR detail LIKE ? ORDER BY id DESC LIMIT 200',
      [`%${q}%`, `%${q}%`, `%${q}%`]
    );
  } else {
    logs = await dbAll('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 200');
  }
  return NextResponse.json({ logs });
}
