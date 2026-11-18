import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { findPromo } from "@/lib/orders";
import { computeTotals, discountFor } from "@/lib/pricing";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const [ev] = await sql`select * from events where id=${Number(b.eventId) || 0} and archived=false`;
  if (!ev) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
  const p = await findPromo(b.code, ev.id);
  if (!p) return NextResponse.json({ error: "Code promo invalide ou expiré." }, { status: 400 });
  const d = discountFor(p, computeTotals(b, ev).subtotal);
  return NextResponse.json({ code: p.code, kind: p.kind, value: p.value, discount: d });
}
