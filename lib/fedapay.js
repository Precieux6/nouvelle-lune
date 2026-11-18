// Appels directs à l'API FedaPay (clé secrète côté serveur uniquement)
const base = () => (process.env.FEDAPAY_ENV === "live" ? "https://api.fedapay.com/v1" : "https://sandbox-api.fedapay.com/v1");

async function call(path, method = "GET", body) {
  const r = await fetch(base() + path, {
    method, cache: "no-store",
    headers: { Authorization: "Bearer " + process.env.FEDAPAY_SECRET_KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("FedaPay " + r.status + " " + JSON.stringify(j).slice(0, 300));
  return j;
}
const unwrap = (j) => j["v1/transaction"] || j.transaction || j;

export async function createPayment({ amount, description, callbackUrl, customer }) {
  const j = await call("/transactions", "POST", { description, amount, currency: { iso: "XOF" }, callback_url: callbackUrl, customer });
  const tx = unwrap(j);
  const t = await call("/transactions/" + tx.id + "/token", "POST");
  return { id: String(tx.id), url: t.url };
}
export async function getTransaction(id) { return unwrap(await call("/transactions/" + id)); }
