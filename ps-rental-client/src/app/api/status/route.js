import { NextResponse } from 'next/server';
import { dbAll, dbGet, serverError } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q) {
      const recent = await dbAll('SELECT * FROM transactions ORDER BY id DESC LIMIT 5');
      return NextResponse.json({ customer: null, transactions: recent });
    }

    const customer = await dbGet('SELECT * FROM customers WHERE phone = $1 OR name ILIKE $2', [q, `%${q}%`]);

    const transactions = await dbAll(
      'SELECT * FROM transactions WHERE invoice_code = $1 OR customer_phone = $2 OR customer_name ILIKE $3 ORDER BY id DESC',
      [q.toUpperCase(), q, `%${q}%`]
    );

    return NextResponse.json({ customer, transactions });
  } catch (err) {
    return NextResponse.json(serverError(err, 'status GET'), { status: 500 });
  }
}
