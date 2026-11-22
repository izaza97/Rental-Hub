export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { dbAll, serverError } from '@/lib/db';
import { getAuthUser, canRole } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = getAuthUser(request);
    if (!user || !canRole(user.role, 'logs')) {
      return NextResponse.json({ error: 'Role Anda tidak memiliki akses Audit Trail.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    let logs;
    if (q) {
      logs = await dbAll(
        'SELECT * FROM activity_logs WHERE username ILIKE $1 OR action ILIKE $1 OR detail ILIKE $1 ORDER BY id DESC LIMIT 200',
        [`%${q}%`]
      );
    } else {
      logs = await dbAll('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 200');
    }
    return NextResponse.json({ logs });
  } catch (err) {
    return NextResponse.json(serverError(err, 'logs GET'), { status: 500 });
  }
}
