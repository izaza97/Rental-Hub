import { NextResponse } from 'next/server';
import { dbAll, dbGet } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q) {
    const recent = await dbAll('SELECT * FROM transactions ORDER BY id DESC LIMIT 5');
    return NextResponse.json({ customer: null, transactions: recent });
  }

  const customer = await dbGet(
    'SELECT * FROM customers WHERE phone = ? OR name LIKE ?',
    [q, `%${q}%`]
  );

  const transactions = await dbAll(
    'SELECT * FROM transactions WHERE invoice_code = ? OR customer_phone = ? OR customer_name LIKE ? ORDER BY id DESC',
    [q.toUpperCase(), q, `%${q}%`]
  );

  return NextResponse.json({ customer, transactions });
}
