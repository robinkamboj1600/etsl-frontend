/** Everything except shipping and insurance. */
export function goods(f) {
  let t = 0;
  f.o.items.forEach((it) => {
    if (!it.ins) t += it.p * it.q;
  });
  return t;
}

export function routeLabel(deptId) {
  return deptId === "rf_paypal" ? "PayPal" : deptId === "rf_whop" ? "Whop" : "CJ";
}

export function isRefundQueue(id) {
  return id === "rf_paypal" || id === "rf_whop" || id === "rf_cj";
}

/** Which supplier is behind this case's store (from the backend case row). */
export function supplierOf(c) {
  return (c && c.store && c.store.supplier) || "";
}

export function parseOrders(txt) {
  return String(txt || "")
    .split(/[\s,;]+/)
    .map((x) => x.trim().toUpperCase().replace(/^#/, ""))
    .filter((x) => x.length > 2);
}

export function parseTickets(txt) {
  return String(txt || "")
    .split(/[\s,;]+/)
    .map((x) => x.trim())
    .filter((x) => /^https?:\/\/\S+/.test(x));
}
