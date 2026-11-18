import { sql } from "@/lib/db";
import { syncPayment, getSettings } from "@/lib/orders";
import { pl } from "@/lib/pricing";
import Receipt from "@/components/Receipt";
export const dynamic = "force-dynamic";

const load = async (code) => {
  const [o] = await sql`select o.*, e.name as event_name, to_char(o.paid_at at time zone 'Africa/Lagos','DD/MM/YYYY HH24:MI') as paid_label from orders o join events e on e.id=o.event_id where o.code=${code}`;
  return o;
};

export default async function Page({ params, searchParams }) {
  let o = await load(params.code);
  if (!o || o.token !== searchParams.t) return <main className="wrap"><div className="card"><h2>Reçu introuvable</h2><p>Ce lien n’est pas valide.</p></div></main>;
  if (o.status !== "paid") { await syncPayment(o); o = await load(params.code); }
  if (o.status !== "paid")
    return (
      <main className="wrap"><div className="card"><h2>Paiement en attente</h2>
        <p>Nous n’avons pas encore reçu la confirmation de votre paiement. Si vous venez de payer, patientez quelques secondes puis actualisez.</p>
        <a className="btn" href="" style={{ display: "inline-block", textDecoration: "none" }}>Actualiser</a></div></main>
    );
  const s = await getSettings();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const data = {
    code: o.code, eventName: o.event_name, date: o.paid_label, lastName: String(o.last_name).toUpperCase(), firstName: o.first_name,
    phone: o.phone, email: o.email,
    places: pl(1 + o.adults, "adulte", "adultes") + (o.children ? ", " + pl(o.children, "enfant", "enfants") : ""),
    products: o.chance + o.protection ? o.chance + " chance, " + o.protection + " protection" : "",
    total: o.total, quote: s.quote || "", organizer: s.organizer_name || "", signatureText: s.signature_text || "",
    signatureImg: s.signature_img || "", verifyUrl: `${site}/admin?verifier=${o.code}`,
  };
  return <main className="wrap"><div className="card" style={{ textAlign: "center" }}><h2>Paiement confirmé</h2><span className="note">Conservez ce reçu : il sera demandé à l’entrée.</span></div><Receipt d={data} /></main>;
}
