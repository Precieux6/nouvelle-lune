import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { syncPayment } from "@/lib/orders";
export const dynamic = "force-dynamic";

// FedaPay appelle cette adresse. On ne fait pas confiance au contenu : on redemande
// l'état de la transaction à FedaPay avec la clé secrète avant de valider quoi que ce soit.
export async function POST(req) {
  try {
    const b = await req.json();
    const id = String((b && b.entity && b.entity.id) || (b && b.data && b.data.id) || (b && b.id) || "");
    if (id) {
      const [o] = await sql`select * from orders where fedapay_id=${id}`;
      if (o) await syncPayment(o);
    }
  } catch (e) { console.error(e); }
  return NextResponse.json({ received: true });
}
