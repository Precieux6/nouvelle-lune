import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { computeTotals, discountFor } from "@/lib/pricing";
import { newCode, newToken, findPromo } from "@/lib/orders";
import { createPayment } from "@/lib/fedapay";
export const dynamic = "force-dynamic";
const err = (m, s = 400) => NextResponse.json({ error: m }, { status: s });

export async function POST(req) {
  try {
    const b = await req.json();
    const [ev] = await sql`select * from events where id=${Number(b.eventId) || 0} and archived=false`;
    if (!ev) return err("Événement introuvable.", 404);
    const first = String(b.firstName || "").trim().slice(0, 80);
    const last = String(b.lastName || "").trim().slice(0, 80);
    const phone = String(b.phone || "").trim().slice(0, 30);
    const email = String(b.email || "").trim().slice(0, 120);
    if (!first || !last || phone.replace(/\D/g, "").length < 8 || !/^\S+@\S+\.\S+$/.test(email))
      return err("Renseignez un nom, un prénom, un téléphone et un e-mail valides.");
    const t = computeTotals(b, ev);
    let promo = null, discount = 0;
    if (b.promo) {
      promo = await findPromo(b.promo, ev.id);
      if (!promo) return err("Code promo invalide ou expiré.");
      discount = discountFor(promo, t.subtotal);
    }
    const total = t.subtotal - discount;
    if (total <= 0) return err("Montant invalide.");
    const code = newCode(), token = newToken();
    const [o] = await sql`insert into orders(code,token,event_id,first_name,last_name,phone,email,adults,children,chance,protection,tickets_amount,products_amount,discount,total,promo_code)
      values (${code},${token},${ev.id},${first},${last},${phone},${email},${t.extra},${t.kids},${t.chance},${t.prot},${t.tickets},${t.products},${discount},${total},${promo ? promo.code : null}) returning id`;
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    const pay = await createPayment({
      amount: total, description: `${ev.name} - ${code}`,
      callbackUrl: `${site}/recu/${code}?t=${token}`,
      customer: { firstname: first, lastname: last, email },
    });
    await sql`update orders set fedapay_id=${pay.id} where id=${o.id}`;
    return NextResponse.json({ url: pay.url });
  } catch (e) {
    console.error(e);
    return err("Impossible de lancer le paiement. Réessayez dans un instant.", 500);
  }
}
