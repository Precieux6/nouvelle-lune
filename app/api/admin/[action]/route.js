import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { createSession, clearSession, getAdminId } from "@/lib/auth";
import { getSettings } from "@/lib/orders";
export const dynamic = "force-dynamic";
const ok = (d = {}) => NextResponse.json(d);
const bad = (m, s = 400) => NextResponse.json({ error: m }, { status: s });
const img = (v) => typeof v === "string" && v.startsWith("data:image/") && v.length < 400000;

export async function GET(req, { params }) {
  const id = await getAdminId();
  if (!id) return bad("Non connecté", 401);
  const a = params.action;
  if (a === "me") {
    const [user] = await sql`select username, name, photo from admins where id=${id}`;
    return ok({ user, settings: await getSettings() });
  }
  if (a === "events")
    return ok({ events: await sql`select id, name, to_char(event_date,'YYYY-MM-DD') as event_date, place, price_adult, price_child, max_children, products_enabled, archived from events order by archived, id desc` });
  if (a === "promos")
    return ok({ promos: await sql`select p.id, p.code, p.kind, p.value, p.event_id, to_char(p.expires_at,'YYYY-MM-DD') as expires_at, p.max_uses, p.uses, p.archived, e.name as event_name from promo_codes p left join events e on e.id=p.event_id order by p.archived, p.id desc` });
  if (a === "stats") {
    const [totals] = await sql`select coalesce(sum(total),0)::int as revenue, coalesce(sum(tickets_amount),0)::int as tickets_rev, coalesce(sum(products_amount),0)::int as products_rev, coalesce(sum(discount),0)::int as discounts, count(*)::int as orders, coalesce(sum(1+adults),0)::int as adults, coalesce(sum(children),0)::int as children, (count(*) filter (where scanned_at is not null))::int as scanned from orders where status='paid'`;
    const methods = await sql`select coalesce(payment_method,'autre') as m, sum(total)::int as t, count(*)::int as c from orders where status='paid' group by 1 order by 2 desc`;
    const week = await sql`select to_char(d,'YYYY-MM-DD') as day, count(o.id)::int as c, coalesce(sum(o.total),0)::int as t from generate_series(current_date-6, current_date, interval '1 day') d left join orders o on o.status='paid' and o.paid_at::date=d::date group by d order by d`;
    const top = await sql`select min(first_name||' '||last_name) as name, lower(email) as email, count(*)::int as c, sum(total)::int as t from orders where status='paid' group by lower(email) order by t desc limit 5`;
    const last = await sql`select code, first_name||' '||last_name as name, total, to_char(paid_at,'DD/MM HH24:MI') as at from orders where status='paid' order by paid_at desc limit 5`;
    return ok({ totals, methods, week, top, last });
  }
  if (a === "order") {
    const code = String(new URL(req.url).searchParams.get("code") || "").trim().toUpperCase();
    const [o] = await sql`select o.code, o.first_name, o.last_name, o.phone, o.email, o.adults, o.children, o.chance, o.protection, o.total, o.discount, o.promo_code, o.status, o.payment_method, e.name as event_name, to_char(o.paid_at,'DD/MM/YYYY HH24:MI') as paid_at, to_char(o.scanned_at,'DD/MM/YYYY HH24:MI') as scanned_at from orders o join events e on e.id=o.event_id where upper(o.code)=${code}`;
    return o ? ok({ order: o }) : bad("Aucune commande trouvée pour ce numéro.", 404);
  }
  return bad("Inconnu", 404);
}

export async function POST(req, { params }) {
  const a = params.action;
  const b = await req.json().catch(() => ({}));
  if (a === "login") {
    const [u] = await sql`select * from admins where username=${String(b.username || "").trim().toLowerCase()}`;
    if (!u || !(await bcrypt.compare(String(b.password || ""), u.password_hash))) return bad("Identifiant ou mot de passe incorrect.", 401);
    await createSession(u.id);
    return ok();
  }
  if (a === "logout") { clearSession(); return ok(); }
  const id = await getAdminId();
  if (!id) return bad("Non connecté", 401);

  try {
    if (a === "event-save") {
      const name = String(b.name || "").trim();
      if (!name) return bad("Le nom est obligatoire.");
      const d = b.event_date || null, place = String(b.place || "").trim();
      const pa = Math.max(0, parseInt(b.price_adult) || 0), pc = Math.max(0, parseInt(b.price_child) || 0);
      const mc = Math.max(0, Math.min(30, parseInt(b.max_children) || 0)), pe = !!b.products_enabled;
      if (b.id) await sql`update events set name=${name}, event_date=${d}, place=${place}, price_adult=${pa}, price_child=${pc}, max_children=${mc}, products_enabled=${pe} where id=${Number(b.id)}`;
      else await sql`insert into events(name,event_date,place,price_adult,price_child,max_children,products_enabled) values (${name},${d},${place},${pa},${pc},${mc},${pe})`;
      return ok();
    }
    if (a === "event-archive") { await sql`update events set archived=${!!b.archived} where id=${Number(b.id)}`; return ok(); }
    if (a === "event-delete") {
      try { await sql`delete from events where id=${Number(b.id)}`; return ok(); }
      catch (e) { if (e.code === "23503") return bad("Cet événement a des commandes : archivez-le plutôt que de le supprimer.", 409); throw e; }
    }
    if (a === "promo-save") {
      const code = String(b.code || "").trim().toUpperCase();
      const kind = b.kind === "fixed" ? "fixed" : "percent";
      let value = Math.max(1, parseInt(b.value) || 0);
      if (kind === "percent") value = Math.min(100, value);
      if (!code) return bad("Le code est obligatoire.");
      const ev = b.event_id ? Number(b.event_id) : null, ex = b.expires_at || null, mx = b.max_uses ? Number(b.max_uses) : null;
      try {
        if (b.id) await sql`update promo_codes set code=${code}, kind=${kind}, value=${value}, event_id=${ev}, expires_at=${ex}, max_uses=${mx} where id=${Number(b.id)}`;
        else await sql`insert into promo_codes(code,kind,value,event_id,expires_at,max_uses) values (${code},${kind},${value},${ev},${ex},${mx})`;
      } catch (e) { if (e.code === "23505") return bad("Ce code existe déjà."); throw e; }
      return ok();
    }
    if (a === "promo-archive") { await sql`update promo_codes set archived=${!!b.archived} where id=${Number(b.id)}`; return ok(); }
    if (a === "promo-delete") { await sql`delete from promo_codes where id=${Number(b.id)}`; return ok(); }
    if (a === "settings-save") {
      const up = async (k, v) => sql`insert into settings(key,value) values (${k},${v}) on conflict (key) do update set value=excluded.value`;
      if (typeof b.organizer_name === "string") await up("organizer_name", b.organizer_name.trim().slice(0, 120));
      if (typeof b.signature_text === "string") await up("signature_text", b.signature_text.trim().slice(0, 120));
      if (b.signature_img === "") await up("signature_img", "");
      else if (img(b.signature_img)) await up("signature_img", b.signature_img);
      return ok();
    }
    if (a === "profile-save") {
      await sql`update admins set name=${String(b.name || "").trim().slice(0, 80)} where id=${id}`;
      if (b.photo === "") await sql`update admins set photo=null where id=${id}`;
      else if (img(b.photo)) await sql`update admins set photo=${b.photo} where id=${id}`;
      if (typeof b.quote === "string") await sql`insert into settings(key,value) values ('quote',${b.quote.trim().slice(0, 300)}) on conflict (key) do update set value=excluded.value`;
      return ok();
    }
    if (a === "password") {
      const [u] = await sql`select password_hash from admins where id=${id}`;
      if (!(await bcrypt.compare(String(b.old || ""), u.password_hash))) return bad("Le mot de passe actuel est incorrect.");
      if (String(b.new || "").length < 8) return bad("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      await sql`update admins set password_hash=${await bcrypt.hash(String(b.new), 10)} where id=${id}`;
      return ok();
    }
    if (a === "scan") {
      const code = String(b.code || "").trim().toUpperCase();
      const r = await sql`update orders set scanned_at=now() where upper(code)=${code} and status='paid' and scanned_at is null returning id`;
      return r.length ? ok() : bad("Ticket déjà utilisé ou non payé.", 409);
    }
  } catch (e) { console.error(e); return bad("Erreur serveur.", 500); }
  return bad("Inconnu", 404);
}
