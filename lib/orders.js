import crypto from "crypto";
import { sql } from "./db";
import { getTransaction } from "./fedapay";

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newCode() {
  let s = "";
  for (const x of crypto.randomBytes(6)) s += ALPHA[x % ALPHA.length];
  return "NL-" + new Date().getFullYear() + "-" + s;
}
export const newToken = () => crypto.randomBytes(16).toString("hex");

export async function getSettings() {
  const rows = await sql`select key, value from settings`;
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function findPromo(code, eventId) {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return null;
  const [p] = await sql`select * from promo_codes where upper(code)=${c} and archived=false
    and (event_id is null or event_id=${eventId})
    and (expires_at is null or expires_at>=current_date)
    and (max_uses is null or uses<max_uses)`;
  return p || null;
}

const esc = (s) => String(s || "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

export async function sendReceiptEmail(o) {
  if (!process.env.RESEND_API_KEY || !o.email) return;
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/recu/${o.code}?t=${o.token}`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM, to: [o.email], subject: "Votre reçu " + o.code,
      html: `<p>Bonjour ${esc(o.first_name)},</p><p>Votre paiement est confirmé. Votre reçu avec QR code : <a href="${url}">${url}</a></p><p>Numéro : <b>${o.code}</b></p>`,
    }),
  });
}

// Vérifie auprès de FedaPay (jamais sur la seule parole du navigateur) puis marque la commande payée.
export async function syncPayment(order) {
  if (order.status === "paid" || !order.fedapay_id) return;
  let tx;
  try { tx = await getTransaction(order.fedapay_id); } catch { return; }
  if (!["approved", "transferred"].includes(tx.status) || Number(tx.amount) !== Number(order.total)) return;
  const [o] = await sql`update orders set status='paid', paid_at=now(), payment_method=${tx.mode || null}
    where id=${order.id} and status<>'paid' returning *`;
  if (o) {
    if (o.promo_code) await sql`update promo_codes set uses=uses+1 where upper(code)=upper(${o.promo_code})`;
    await sendReceiptEmail(o).catch(() => {});
  }
}
