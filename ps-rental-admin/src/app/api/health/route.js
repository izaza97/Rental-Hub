import { dbGet } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — laporan status koneksi database (untuk monitoring).
 * Selalu merespons 200 agar mudah dibaca; nilai kebenaran ada di field `ok`.
 * Pesan error disaring agar tidak membocorkan connection string.
 */
export async function GET() {
  try {
    const row = await dbGet("SELECT 1 AS ok");
    return Response.json({
      ok: row?.ok === 1,
      db: "up",
      now: new Date().toISOString(),
    });
  } catch (err) {
    const raw = String(err?.message || err);
    const safe = raw
      .replace(/postgres(?:ql)?:\/\/[^\s@]+@/gi, "postgres://***@")
      .slice(0, 300);
    return Response.json({
      ok: false,
      db: "down",
      code: err?.code || null,
      error: safe,
      now: new Date().toISOString(),
    });
  }
}
