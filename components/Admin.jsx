"use client";
import { useEffect, useState, useCallback } from "react";
import { fcfa, pl } from "@/lib/pricing";

async function api(action, body) {
  const opt = body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  const r = await fetch("/api/admin/" + action, opt);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || "Erreur"), { status: r.status });
  return j;
}
const Row = ({ a, b }) => <div className="row"><span>{a}</span><b>{b}</b></div>;
const H = ({ t }) => <h3 style={{ margin: "14px 0 2px", fontSize: "1rem" }}>{t}</h3>;
function Modal({ title, onClose, side, children }) {
  useEffect(() => { const k = (e) => e.key === "Escape" && onClose(); document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={"pnl " + (side ? "right" : "center")} role="dialog" aria-modal="true" aria-label={title}>
        <header><h2>{title}</h2><button className="x" onClick={onClose} aria-label="Fermer">×</button></header>{children}
      </div>
    </div>
  );
}
function resize(file, max, type) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL(type, 0.85));
    };
    img.src = URL.createObjectURL(file);
  });
}

function Login({ onDone }) {
  const [u, setU] = useState(""), [p, setP] = useState(""), [err, setErr] = useState("");
  const go = async (e) => { e.preventDefault(); try { await api("login", { username: u, password: p }); onDone(); } catch (x) { setErr(x.message); } };
  return (
    <main className="wrap"><form className="card" onSubmit={go}>
      <h2>Connexion administrateur</h2>
      <label>Identifiant<input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoCapitalize="none" /></label>
      <label>Mot de passe<input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" /></label>
      <p className="err" role="alert">{err}</p><button className="b">Se connecter</button>
    </form></main>
  );
}

function Dashboard() {
  const [s, setS] = useState(null), [m, setM] = useState(null);
  useEffect(() => { api("stats").then(setS).catch(() => {}); }, []);
  if (!s) return <p className="note">Chargement…</p>;
  const t = s.totals, w = s.week, max = Math.max(1, ...w.map((d) => d.c));
  const dd = (d) => d.slice(8) + "/" + d.slice(5, 7);
  return (
    <>
      <div className="kpis">
        <button className="card kp" onClick={() => setM("rec")}><small>Recettes</small><b>{fcfa(t.revenue)}</b></button>
        <button className="card kp" onClick={() => setM("tk")}><small>Tickets vendus</small><b>{t.orders}</b></button>
      </div>
      <button className="card kp" onClick={() => setM("wk")}><h2>Ventes de la semaine</h2>
        <div className="bars">{w.map((d) => <i key={d.day} style={{ height: Math.max(4, (d.c / max) * 100) + "%" }} />)}</div><small>Touchez pour le détail</small></button>
      <div className="card"><h2>Clients qui dépensent le plus</h2>
        {s.top.length ? s.top.map((c) => <div className="row" key={c.email}><div>{c.name}<small style={{ display: "block" }}>{pl(c.c, "commande", "commandes")}</small></div><b>{fcfa(c.t)}</b></div>) : <p className="hint">Aucune vente pour l’instant.</p>}</div>
      {m === "rec" && <Modal title="Recettes" onClose={() => setM(null)}>
        <Row a="Total encaissé" b={fcfa(t.revenue)} /><H t="Par type de vente" /><Row a="Tickets" b={fcfa(t.tickets_rev)} /><Row a="Produits du mois" b={fcfa(t.products_rev)} />
        <Row a="Réductions accordées" b={fcfa(t.discounts)} /><H t="Par moyen de paiement" />{s.methods.map((x) => <Row key={x.m} a={x.m + " (" + x.c + ")"} b={fcfa(x.t)} />)}
        <H t="Dernières ventes" />{s.last.map((x) => <Row key={x.code} a={x.code + " · " + x.name} b={fcfa(x.total)} />)}</Modal>}
      {m === "tk" && <Modal title="Tickets vendus" onClose={() => setM(null)}>
        <Row a="Tickets (reçus émis)" b={t.orders} /><H t="Places réservées" /><Row a="Adultes" b={t.adults} /><Row a="Enfants" b={t.children} />
        <H t="Contrôle à l’entrée" /><Row a="Déjà scannés" b={t.scanned} /><Row a="Pas encore scannés" b={t.orders - t.scanned} /></Modal>}
      {m === "wk" && <Modal title="Ventes de la semaine" onClose={() => setM(null)}>
        {w.map((d) => <Row key={d.day} a={dd(d.day) + " · " + pl(d.c, "ticket", "tickets")} b={fcfa(d.t)} />)}
        <H t="Total" /><Row a={pl(w.reduce((a, d) => a + d.c, 0), "ticket", "tickets")} b={fcfa(w.reduce((a, d) => a + d.t, 0))} /></Modal>}
    </>
  );
}

const emptyEv = { name: "", event_date: "", place: "", price_adult: 1000, price_child: 500, max_children: 9, products_enabled: true };
function Events() {
  const [list, setList] = useState([]), [f, setF] = useState(emptyEv), [msg, setMsg] = useState("");
  const load = () => api("events").then((j) => setList(j.events));
  useEffect(() => { load(); }, []);
  const on = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const save = async () => { try { await api("event-save", f); setF(emptyEv); setMsg("Enregistré."); load(); } catch (x) { setMsg(x.message); } };
  const arch = async (e) => { await api("event-archive", { id: e.id, archived: !e.archived }); load(); };
  const del = async (e) => { if (!confirm("Supprimer définitivement « " + e.name + " » ?")) return; try { await api("event-delete", { id: e.id }); load(); } catch (x) { setMsg(x.message); } };
  const item = (e) => (
    <div className="row" key={e.id} style={{ alignItems: "flex-start" }}><div>
      <b style={{ textAlign: "left", display: "block" }}>{e.name}</b>
      <small>{(e.event_date || "Date à fixer") + " · " + (e.place || "Lieu à fixer") + " · adulte " + fcfa(e.price_adult) + ", enfant " + fcfa(e.price_child)}</small>
      <div className="acts"><button onClick={() => { setF({ ...e, event_date: e.event_date || "" }); setMsg(""); }}>Modifier</button><button onClick={() => arch(e)}>{e.archived ? "Réactiver" : "Archiver"}</button><button className="dg" onClick={() => del(e)}>Supprimer</button></div>
    </div></div>
  );
  return (
    <>
      <div className="card"><h2>Événements</h2>{list.filter((e) => !e.archived).map(item)}
        {list.some((e) => e.archived) && <><H t="Archivés" />{list.filter((e) => e.archived).map(item)}</>}</div>
      <div className="card"><h2>{f.id ? "Modifier l’événement" : "Créer un événement"}</h2>
        <label>Nom<input value={f.name} onChange={on("name")} placeholder="Ex. Pleine Lune" /></label>
        <div className="g2"><label>Date<input type="date" value={f.event_date} onChange={on("event_date")} /></label><label>Lieu<input value={f.place || ""} onChange={on("place")} /></label></div>
        <div className="g2"><label>Prix adulte (F)<input type="number" value={f.price_adult} onChange={on("price_adult")} /></label><label>Prix enfant (F)<input type="number" value={f.price_child} onChange={on("price_child")} /></label></div>
        <div className="g2"><label>Enfants max.<input type="number" value={f.max_children} onChange={on("max_children")} /></label>
          <label>Produits du mois<select value={f.products_enabled ? "1" : "0"} onChange={(e) => setF({ ...f, products_enabled: e.target.value === "1" })}><option value="1">Activés</option><option value="0">Désactivés</option></select></label></div>
        <button className="b" onClick={save}>{f.id ? "Enregistrer les modifications" : "Créer l’événement"}</button>
        {f.id && <button className="link" onClick={() => { setF(emptyEv); setMsg(""); }}>Annuler</button>}<p className="hint">{msg}</p></div>
    </>
  );
}

const emptyPr = { code: "", kind: "percent", value: 10, event_id: "", expires_at: "", max_uses: 100 };
function Promos() {
  const [list, setList] = useState([]), [evs, setEvs] = useState([]), [f, setF] = useState(emptyPr), [msg, setMsg] = useState("");
  const load = () => api("promos").then((j) => setList(j.promos));
  useEffect(() => { load(); api("events").then((j) => setEvs(j.events)); }, []);
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => { try { await api("promo-save", f); setF(emptyPr); setMsg(""); load(); } catch (x) { setMsg(x.message); } };
  const item = (p) => (
    <div className="row" key={p.id} style={{ alignItems: "flex-start" }}><div>
      <b style={{ textAlign: "left", display: "block" }}>{p.code}</b>
      <small>{"−" + p.value + (p.kind === "percent" ? " %" : " F") + " · " + p.uses + "/" + (p.max_uses || "∞") + " utilisations · " + (p.event_name || "tous les événements") + (p.expires_at ? " · jusqu’au " + p.expires_at : "")}</small>
      <div className="acts"><button onClick={() => { setF({ ...p, event_id: p.event_id || "", expires_at: p.expires_at || "", max_uses: p.max_uses || "" }); setMsg(""); }}>Modifier</button>
        <button onClick={async () => { await api("promo-archive", { id: p.id, archived: !p.archived }); load(); }}>{p.archived ? "Réactiver" : "Archiver"}</button>
        <button className="dg" onClick={async () => { if (confirm("Supprimer le code " + p.code + " ?")) { await api("promo-delete", { id: p.id }); load(); } }}>Supprimer</button></div>
    </div></div>
  );
  return (
    <>
      <div className="card"><h2>Codes promo</h2>{list.filter((p) => !p.archived).map(item)}{list.some((p) => p.archived) && <><H t="Archivés" />{list.filter((p) => p.archived).map(item)}</>}</div>
      <div className="card"><h2>{f.id ? "Modifier le code" : "Nouveau code"}</h2>
        <div className="g2"><label>Code<input value={f.code} onChange={on("code")} placeholder="LUNE10" /></label><label>Réduction<input type="number" value={f.value} onChange={on("value")} /></label></div>
        <div className="g2"><label>Type<select value={f.kind} onChange={on("kind")}><option value="percent">Pourcentage</option><option value="fixed">Montant fixe</option></select></label>
          <label>Utilisations max.<input type="number" value={f.max_uses} onChange={on("max_uses")} /></label></div>
        <div className="g2"><label>Événement<select value={f.event_id} onChange={on("event_id")}><option value="">Tous</option>{evs.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
          <label>Valable jusqu’au<input type="date" value={f.expires_at} onChange={on("expires_at")} /></label></div>
        <button className="b" onClick={save}>{f.id ? "Enregistrer les modifications" : "Ajouter le code"}</button>
        {f.id && <button className="link" onClick={() => setF(emptyPr)}>Annuler</button>}<p className="err">{msg}</p></div>
    </>
  );
}

function ReceiptSettings({ settings, reload }) {
  const [o, setO] = useState(settings.organizer_name || ""), [s, setS] = useState(settings.signature_text || ""), [msg, setMsg] = useState("");
  const save = async (extra = {}) => { await api("settings-save", { organizer_name: o, signature_text: s, ...extra }); setMsg("Enregistré."); reload(); };
  return (
    <div className="card"><h2>Réglages du reçu</h2>
      <label>Nom de l’organisateur<input value={o} onChange={(e) => setO(e.target.value)} /></label>
      <label>Signature (texte)<input value={s} onChange={(e) => setS(e.target.value)} /></label>
      <label>Image de signature (facultatif)<input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files[0]; if (f) save({ signature_img: await resize(f, 400, "image/png") }); }} /></label>
      {settings.signature_img && <div><img src={settings.signature_img} alt="Signature" style={{ maxHeight: 50 }} /> <button className="link" onClick={() => save({ signature_img: "" })}>Retirer</button></div>}
      <button className="b" onClick={() => save()}>Enregistrer</button><p className="hint">{msg}</p></div>
  );
}

function Verify({ initial }) {
  const [code, setCode] = useState(initial || ""), [o, setO] = useState(null), [err, setErr] = useState(""), [msg, setMsg] = useState("");
  const go = useCallback(async (c) => { setErr(""); setMsg(""); setO(null); try { setO((await api("order?code=" + encodeURIComponent(c))).order); } catch (x) { setErr(x.message); } }, []);
  useEffect(() => { if (initial) go(initial); }, [initial, go]);
  const scan = async () => { try { await api("scan", { code: o.code }); setMsg("Entrée validée."); go(o.code); } catch (x) { setMsg(x.message); } };
  return (
    <div className="card"><h2>Vérifier un paiement</h2>
      <label>Numéro d’identification<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="NL-2026-XXXXXX" autoCapitalize="characters" /></label>
      <button className="b" onClick={() => go(code)}>Vérifier</button><p className="err">{err}</p>
      {o && <div>
        <p className={o.status === "paid" ? "ok" : "bad"}><b>{o.status === "paid" ? "Paiement confirmé" : "Non payé (" + o.status + ")"}</b></p>
        <Row a="Nom" b={o.last_name.toUpperCase()} /><Row a="Prénom(s)" b={o.first_name} /><Row a="Téléphone" b={o.phone} /><Row a="E-mail" b={o.email} />
        <Row a="Événement" b={o.event_name} /><Row a="Places" b={pl(1 + o.adults, "adulte", "adultes") + (o.children ? ", " + pl(o.children, "enfant", "enfants") : "")} />
        <Row a="Produits" b={o.chance + o.protection ? o.chance + " chance, " + o.protection + " protection" : "–"} /><Row a="Montant" b={fcfa(o.total)} />
        {o.paid_at && <Row a="Payé le" b={o.paid_at} />}
        <Row a="Ticket" b={<span className={o.scanned_at ? "bad" : "ok"}>{o.scanned_at ? "Déjà utilisé le " + o.scanned_at : "Valide, non utilisé"}</span>} />
        {o.status === "paid" && !o.scanned_at && <button className="b" onClick={scan}>Valider l’entrée</button>}<p className="hint">{msg}</p>
      </div>}
    </div>
  );
}

function Profile({ user, settings, onClose, reload }) {
  const [name, setName] = useState(user.name || ""), [quote, setQuote] = useState(settings.quote || "");
  const [old, setOld] = useState(""), [nw, setNw] = useState(""), [msg, setMsg] = useState(""), [bad, setBad] = useState(false);
  const say = (m, b) => { setMsg(m); setBad(b); };
  const save = async () => {
    try {
      await api("profile-save", { name, quote });
      if (old || nw) { await api("password", { old, new: nw }); setOld(""); setNw(""); }
      say("Profil enregistré.", false); reload();
    } catch (x) { say(x.message, true); }
  };
  return (
    <Modal title="Mon profil" side onClose={onClose}>
      <label>Nom<input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>Photo<input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files[0]; if (f) { await api("profile-save", { name, quote, photo: await resize(f, 160, "image/jpeg") }); reload(); } }} /></label>
      <label>Citation de l’auteur (affichée sur les reçus)<textarea rows={3} value={quote} onChange={(e) => setQuote(e.target.value)} /></label>
      <label>Mot de passe actuel<input type="password" value={old} onChange={(e) => setOld(e.target.value)} autoComplete="current-password" /></label>
      <label>Nouveau mot de passe<input type="password" value={nw} onChange={(e) => setNw(e.target.value)} autoComplete="new-password" /></label>
      <button className="b" style={{ width: "100%" }} onClick={save}>Enregistrer</button><p className={bad ? "err" : "hint ok"}>{msg}</p>
      <button className="b out" onClick={async () => { await api("logout", {}); location.href = "/admin"; }}>Se déconnecter</button>
    </Modal>
  );
}

export default function Admin() {
  const [user, setUser] = useState(undefined), [settings, setSettings] = useState({}), [tab, setTab] = useState(0), [prof, setProf] = useState(false), [vc, setVc] = useState("");
  const load = useCallback(async () => { try { const j = await api("me"); setUser(j.user); setSettings(j.settings); } catch { setUser(false); } }, []);
  useEffect(() => { load(); const c = new URLSearchParams(location.search).get("verifier"); if (c) { setVc(c); setTab(4); } }, [load]);
  if (user === undefined) return <main className="wrap"><p className="note">Chargement…</p></main>;
  if (!user) return <Login onDone={load} />;
  const tabs = ["Tableau de bord", "Événements", "Codes promo", "Reçu", "Vérification"];
  return (
    <main className="wrap">
      <div className="top"><h1>Administration</h1>
        <button className="av" onClick={() => setProf(true)} aria-label="Ouvrir mon profil" style={user.photo ? { backgroundImage: `url(${user.photo})` } : null}>{user.photo ? "" : "👤"}</button></div>
      <div className="tabs">{tabs.map((t, i) => <button key={t} className={i === tab ? "on" : ""} onClick={() => setTab(i)}>{t}</button>)}</div>
      {tab === 0 && <Dashboard />}{tab === 1 && <Events />}{tab === 2 && <Promos />}
      {tab === 3 && <ReceiptSettings settings={settings} reload={load} />}{tab === 4 && <Verify initial={vc} />}
      {prof && <Profile user={user} settings={settings} onClose={() => setProf(false)} reload={load} />}
    </main>
  );
}
