import React from "react";
import { http } from "./http";

export const ordersApi = {
  get: (number) => http.get(`/orders/${encodeURIComponent(number)}`),
  variants: (number, productIds) =>
    http.get(`/orders/${encodeURIComponent(number)}/variants?products=${encodeURIComponent(productIds.join(","))}`),
  adminLink: (number) => http.get(`/orders/${encodeURIComponent(number)}/admin-link`),
  searchProducts: (number, q) => http.get(`/orders/${encodeURIComponent(number)}/product-search?q=${encodeURIComponent(q)}`),
};

/* Currencies written after the amount (1.234,56 kr), as the stores do. */
const POST_SYMBOL = new Set(["SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN"]);

function symbolFor(currency) {
  try {
    const part = new Intl.NumberFormat("en", { style: "currency", currency }).formatToParts(0);
    return part.find((p) => p.type === "currency")?.value || currency;
  } catch {
    return currency;
  }
}

/** How an amount in this currency is written: symbol, number style, symbol before or after. */
export function currencyStyle(currency) {
  return {
    sym: symbolFor(currency),
    loc: currency === "EUR" || POST_SYMBOL.has(currency) ? "nl-NL" : "en-GB",
    post: POST_SYMBOL.has(currency),
  };
}

/** Backend order -> the { id, store, s, o } shape Intake reads. Everything comes from the backend. */
export function toOrderView(order) {
  const letters = String(order.number).replace(/[^A-Z]/gi, "").toUpperCase();
  const st = order.store;
  const s = {
    ...currencyStyle(order.currency),
    name: st.name,
    dom: st.url || "",
    sd: st.shopifyDomain || "",
    mail: st.helpdeskAddress || "",
    hd: st.helpdesk || "",
    niche: st.niche || "",
    supplier: st.supplier || "",
    provider: st.paymentProvider || "",
    cc: (st.countriesSold || [])[0] || order.country,
  };

  const items = order.items.map((it) => ({
    lineItemId: it.lineItemId,
    productId: it.productId,
    variantId: it.variantId,
    cq: it.currentQty,
    n: it.name,
    v: it.variant || "",
    q: it.qty,
    p: it.price,
    ins: it.isInsurance,
    img: it.image || null,
    // Deleted products have no page — point at the store's search instead of a guessed slug.
    url: it.url || `https://${order.store.url}/search?q=${encodeURIComponent(it.name)}`,
  }));
  order.shipping.forEach((sh) => items.push({ n: "Shipping", v: sh.title, q: 1, p: sh.price, ins: true }));

  return {
    id: order.number,
    store: letters,
    s,
    live: true,
    ladder: order.ladder,
    ladderRts: order.ladderRts || order.ladder,
    refundQueue: order.refundQueue,
    o: {
      cust: order.customer.name,
      email: order.customer.email,
      cc: order.country,
      pay: order.payment,
      status: order.status,
      days: order.days,
      cancelled: order.cancelled,
      paid: order.paid,
      refunded: order.refunded,
      currency: order.currency,
      total: order.total,
      items,
      others: order.otherOrders,
      addr: order.shippingAddress || null,
    },
  };
}

/**
 * Looks up every order number typed into the form, a few at a time, and
 * remembers the answers. Result per id: { loading } | { unknown } |
 * { error } | the order view.
 */
export function useLiveOrders(ids) {
  const [byId, setById] = React.useState({});
  const [retry, setRetry] = React.useState(0);
  const seen = React.useRef(new Set());

  React.useEffect(() => {
    const todo = ids.filter((id) => !seen.current.has(id));
    if (!todo.length) return undefined;

    const timer = setTimeout(() => {
      todo.forEach((id) => seen.current.add(id));
      setById((m) => {
        const next = { ...m };
        todo.forEach((id) => (next[id] = { id, loading: true }));
        return next;
      });

      const queue = todo.slice();
      const worker = async () => {
        while (queue.length) {
          const id = queue.shift();
          let result;
          try {
            result = toOrderView(await ordersApi.get(id));
          } catch (err) {
            if (err.status !== 404) seen.current.delete(id); // let the next edit retry
            // Shopify's search finds a brand-new order only after a short while: look again.
            else
              setTimeout(() => {
                seen.current.delete(id);
                setRetry((n) => n + 1);
              }, 15000);
            result =
              err.status === 404
                ? { id, unknown: true }
                : { id, unknown: true, error: err.detail || "Could not look this order up." };
          }
          setById((m) => ({ ...m, [id]: result }));
        }
      };
      for (let i = 0; i < 4; i++) worker();
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(","), retry]);

  return byId;
}
