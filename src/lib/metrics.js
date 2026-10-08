import { hash } from "@/lib/rules/routing";

/**
 * SAMPLE FIGURES.
 *
 * There is no order volume in the prototype, so these numbers are
 * generated from the store name — stable, so a store always shows the
 * same figures. The backend replaces this one function with real counts
 * from Shopify and the case table; nothing on the Overview screen
 * changes when it does.
 */
export function stats(st) {
  const h = hash(st.n + "|" + (st.sd || ""));
  const orders = 180 + (h % 1400);
  const refunds = Math.round(orders * (0.02 + ((h >> 3) % 90) / 1000));
  const cb = Math.round(orders * (0.001 + ((h >> 7) % 13) / 1000));
  const repl = Math.round(orders * (0.004 + ((h >> 11) % 18) / 1000));
  const vch = Math.round(orders * (0.002 + ((h >> 13) % 14) / 1000));
  return {
    orders,
    refunds,
    cb,
    repl,
    vch,
    rr: (refunds / orders) * 100,
    cbr: (cb / orders) * 100,
    rpr: (repl / orders) * 100,
    vcr: (vch / orders) * 100,
  };
}

/**
 * Where a rate stops being normal. 1% chargebacks is where processors
 * start to intervene; 0.65% is where to look into it yourself.
 */
export function rateClass(kind, v) {
  if (kind === "cb") return v >= 1 ? "crit" : v >= 0.65 ? "warn" : "";
  if (kind === "refund") return v >= 8 ? "crit" : v >= 5 ? "warn" : "";
  return v >= 4 ? "warn" : "";
}
