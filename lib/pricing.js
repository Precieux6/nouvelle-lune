// Règles de prix (adulte + adultes accompagnants + enfants, produits mélangés)
export const productsPrice = (n) => (n > 0 ? 1500 * n + 500 : 0); // 1=2000, 2=3500, 3=5000...
const clamp = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

export function computeTotals(input, ev) {
  const extra = clamp(input.adults, 20); // adultes accompagnants
  const kids = clamp(input.children, ev.max_children);
  const chance = ev.products_enabled ? clamp(input.chance, 99) : 0;
  const prot = ev.products_enabled ? clamp(input.protection, 99) : 0;
  const tickets = ev.price_adult * (1 + extra) + ev.price_child * kids;
  const products = productsPrice(chance + prot);
  return { extra, kids, chance, prot, tickets, products, subtotal: tickets + products };
}
export function discountFor(promo, subtotal) {
  if (!promo) return 0;
  const d = promo.kind === "percent" ? Math.floor((subtotal * promo.value) / 100) : promo.value;
  return Math.max(0, Math.min(d, subtotal));
}
export const fcfa = (n) => new Intl.NumberFormat("fr-FR").format(n).replace(/[\u202f\u00a0]/g, " ") + " F";
export const pl = (n, a, b) => n + " " + (n > 1 ? b : a);
