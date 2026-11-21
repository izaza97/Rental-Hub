export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getAuthUser, logActivity } from '@/lib/auth';

export async function POST(request) {
  const user = getAuthUser(request);
  if (user) {
    await logActivity(user.username, 'Logout', `${user.name} keluar dari sistem (FR-3)`);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('ps_admin_token');
  return res;
}
