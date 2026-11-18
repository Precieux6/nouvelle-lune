import { sql } from "@/lib/db";
import Wizard from "@/components/Wizard";
export const dynamic = "force-dynamic";

export default async function Home() {
  let events = [];
  try {
    events = await sql`select id, name, to_char(event_date,'DD/MM/YYYY') as event_date, place, price_adult, price_child, max_children, products_enabled from events where archived=false order by event_date nulls last, id`;
  } catch (e) { console.error(e); }
  return (
    <main className="wrap">
      <div className="hero"><div className="moon" aria-hidden="true" /><div><h1>Nouvelle Lune</h1><span className="note">Réservez vos places{" "}puis choisissez vos produits du mois.</span></div></div>
      <Wizard events={JSON.parse(JSON.stringify(events))} />
    </main>
  );
}
