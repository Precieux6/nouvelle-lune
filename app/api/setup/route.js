import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { SCHEMA } from "@/lib/schema";
export const dynamic = "force-dynamic";

// À ouvrir UNE fois : /api/setup?key=VOTRE_SETUP_KEY  (puis supprimez SETUP_KEY dans Vercel)
export async function GET(req) {
  const key = new URL(req.url).searchParams.get("key");
  if (!process.env.SETUP_KEY || key !== process.env.SETUP_KEY) return new Response("Accès refusé.", { status: 403 });
  const u = (process.env.ADMIN_USERNAME || "").trim().toLowerCase();
  const p = process.env.ADMIN_PASSWORD || "";
  if (!u || p.length < 8) return new Response("Définissez ADMIN_USERNAME et ADMIN_PASSWORD (8 caractères minimum).", { status: 400 });
  await sql.unsafe(SCHEMA);
  const hash = await bcrypt.hash(p, 10);
  await sql`insert into admins(username, password_hash, name) values (${u}, ${hash}, 'Administrateur') on conflict (username) do nothing`;
  await sql`insert into events(name, place) select 'Nouvelle Lune', '' where not exists (select 1 from events)`;
  const defaults = { organizer_name: "Nom de l’organisateur", signature_text: "Signature", quote: "" };
  for (const [k, v] of Object.entries(defaults))
    await sql`insert into settings(key, value) values (${k}, ${v}) on conflict (key) do nothing`;
  return new Response("Installation terminée. Supprimez maintenant SETUP_KEY et ADMIN_PASSWORD dans Vercel, puis ouvrez /admin.");
}
