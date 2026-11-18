"use client";
import { useState } from "react";
import { computeTotals, discountFor, fcfa, pl } from "@/lib/pricing";

export default function Wizard({ events }) {
  const [evId, setEvId] = useState(events[0] ? events[0].id : 0);
  const [q, setQ] = useState({ adults: 0, children: 0, chance: 0, protection: 0 });
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const [code, setCode] = useState("");
  const [promo, setPromo] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const ev = events.find((e) => e.id === Number(evId)) || events[0];
  if (!ev) return <div className="card"><p>Aucun événement n’est ouvert à la réservation pour le moment.</p></div>;

  const t = computeTotals(q, ev);
  const disc = discountFor(promo, t.subtotal);
  const total = t.subtotal - disc;
  const set = (k, d, max) => setQ((o) => ({ ...o, [k]: Math.max(0, Math.min(max, o[k] + d)) }));
  const stepper = (k, label, sub, max) => (
    <div className="card"><div className="row"><div><b style={{ textAlign: "left", display: "block" }}>{label}</b><small>{sub}</small></div>
      <div className="qty">
        <button type="button" disabled={q[k] <= 0} onClick={() => set(k, -1, max)} aria-label={"Retirer : " + label}>−</button>
        <span>{q[k]}</span>
        <button type="button" disabled={q[k] >= max} onClick={() => set(k, 1, max)} aria-label={"Ajouter : " + label}>+</button>
      </div></div></div>
  );
  const labels = ["Tickets", "Produits", "Paiement"];
  const next = async () => {
    setMsg("");
    if (step === 0) return setStep(ev.products_enabled ? 1 : 2);
    if (step === 1) return setStep(2);
    setBusy(true);
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: ev.id, ...q, ...f, promo: promo ? promo.code : "" }) });
      const j = await r.json();
      if (j.url) window.location.href = j.url; else { setMsg(j.error || "Erreur."); setBusy(false); }
    } catch { setMsg("Connexion impossible. Réessayez."); setBusy(false); }
  };
  const apply = async () => {
    setMsg("");
    const r = await fetch("/api/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: ev.id, code, ...q }) });
    const j = await r.json();
    if (r.ok) setPromo(j); else { setPromo(null); setMsg(j.error); }
  };
  const inp = (k, label, type = "text", ac) => (
    <label>{label}<input type={type} autoComplete={ac} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
  );

  return (
    <>
      <div className="steps">{labels.map((l, i) => <div key={l} className={i === step ? "on" : i < step ? "done" : ""}>{l}</div>)}</div>
      {step === 0 && (<>
        {events.length > 1 && <div className="card"><label>Événement<select value={ev.id} onChange={(e) => setEvId(Number(e.target.value))}>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label></div>}
        <div className="card"><b>{ev.name}</b><small style={{ display: "block" }}>{[ev.event_date, ev.place].filter(Boolean).join(" · ")}</small></div>
        <div className="card"><div className="row"><div><b style={{ textAlign: "left", display: "block" }}>Ticket adulte</b><small>{fcfa(ev.price_adult)}</small></div><span>Inclus</span></div></div>
        {stepper("adults", "Adultes accompagnants", fcfa(ev.price_adult) + " par adulte", 20)}
        {ev.max_children > 0 && stepper("children", "Enfants", fcfa(ev.price_child) + " par enfant · " + ev.max_children + " maximum", ev.max_children)}
      </>)}
      {step === 1 && (<>
        <span className="note">Facultatif. Prix selon le nombre total de produits, chance et protection confondus : 1 = 2 000 F, 2 = 3 500 F, 3 = 5 000 F, etc.</span>
        {stepper("chance", "Produits de chance", "À partir de 2 000 F", 99)}
        {stepper("protection", "Produits de protection", "À partir de 2 000 F", 99)}
        <button className="link" onClick={() => setStep(0)}>Retour aux tickets</button>
      </>)}
      {step === 2 && (<>
        <div className="card">
          <div className="row"><span>Tickets ({pl(1 + t.extra, "adulte", "adultes")}{t.kids ? ", " + pl(t.kids, "enfant", "enfants") : ""})</span><b>{fcfa(t.tickets)}</b></div>
          <div className="row"><span>Produits</span><b>{t.products ? fcfa(t.products) : "–"}</b></div>
          {disc > 0 && <div className="row"><span>Réduction ({promo.code})</span><b>− {fcfa(disc)}</b></div>}
          <div className="row"><b>Total</b><b>{fcfa(total)}</b></div>
        </div>
        <div className="card">
          <div className="g2">{inp("lastName", "Nom", "text", "family-name")}{inp("firstName", "Prénom(s)", "text", "given-name")}</div>
          {inp("phone", "Téléphone", "tel", "tel")}{inp("email", "E-mail", "email", "email")}
        </div>
        <div className="card"><label>Code promo (facultatif)</label>
          <div style={{ display: "flex", gap: 8 }}><input value={code} onChange={(e) => setCode(e.target.value)} /><button type="button" className="btn" onClick={apply}>Appliquer</button></div></div>
        <p className="err" role="alert">{msg}</p>
        <button className="link" onClick={() => setStep(ev.products_enabled ? 1 : 0)}>Retour</button>
      </>)}
      {step < 2 && msg && <p className="err">{msg}</p>}
      <div className="bar"><div>
        <div className="tot"><small>Total</small><b>{fcfa(total)}</b></div>
        <button className="btn" disabled={busy} onClick={next}>{step === 0 ? (ev.products_enabled ? "Choisir mes produits" : "Passer au paiement") : step === 1 ? "Passer au paiement" : busy ? "Redirection…" : "Payer " + fcfa(total)}</button>
      </div></div>
    </>
  );
}
