import { RETURN_FORMS, RETURN_FORMS_FOLDER } from "@/data/returnForms";
import { slug } from "./format";

/** The myshopify domain, from the backend store row. */
export function shopDomain(st) {
  return (st && st.sd) || "";
}

export function adminUrl(sd) {
  const h = String(sd || "").replace(/\.myshopify\.com.*$/, "");
  return h ? `https://admin.shopify.com/store/${h}` : "#";
}

export function productUrl(st, it) {
  if (it && it.url) return it.url;
  if (!st.dom || !it) return "";
  return `https://${st.dom}/products/${slug(it.n)}`;
}

/**
 * Where the money is actually moved. PayPal when the customer paid that
 * way, otherwise the store's own provider. The backend replaces these
 * links with API calls — see step 7 of the build order in the SOP.
 */
export function payTarget(st, o, dept, orderId) {
  const sd2 = shopDomain(st);
  if (dept === "rf_paypal")
    return { label: "Open in PayPal", url: "https://www.paypal.com/activity/" };
  if (dept === "modify")
    return {
      label: "Edit the order in Shopify",
      url: sd2 ? `${adminUrl(sd2)}/orders?query=${encodeURIComponent(orderId || "")}` : "#",
    };
  if (dept === "voucher")
    return { label: "Create discount in Shopify", url: sd2 ? `${adminUrl(sd2)}/discounts/new` : "#" };
  if (dept === "repl")
    return { label: "Create draft order", url: sd2 ? `${adminUrl(sd2)}/draft_orders/new` : "#" };
  if (o && o.pay === "PayPal")
    return { label: "Open in PayPal", url: "https://www.paypal.com/activity/" };
  if (/whop|lasso/i.test(st.provider || ""))
    return {
      label: "Open in Whop",
      url: st.biz ? `https://whop.com/dashboard/${st.biz}/payments` : "https://whop.com/dashboard",
    };
  if (/cj/i.test(st.provider || ""))
    return {
      label: "Open the order in Shopify",
      url: sd2 ? `${adminUrl(sd2)}/orders?query=${encodeURIComponent(orderId || "")}` : "#",
    };
  if (/ocean/i.test(st.provider || ""))
    return { label: "Refund in Ocean", url: "https://www.oceanpayment.com/" };
  return { label: "Refund in Shopify", url: sd2 ? adminUrl(sd2) : "#" };
}

export function ticketUrl(c) {
  if (c.turl) return c.turl;
  if (!c.ticket) return "";
  return `https://${String(c.ticket).replace(/…\/?/g, "")}`;
}

/**
 * Label taken from the full URL, never from the truncated field —
 * otherwise a ticket reads as "wynnboutique · ations".
 */
export function shortTicket(t) {
  t = String(t || "").replace(/^https?:\/\//, "");
  const host = t.split("/")[0];
  const parts = t.split(/[/?#]/).filter(Boolean);
  let id = "";
  for (let k = parts.length - 1; k > 0; k--) {
    if (/^\d+$/.test(parts[k])) {
      id = parts[k];
      break;
    }
    if (!id) id = parts[k];
  }
  if (!/^\d+$/.test(id)) id = (id || "").slice(-8);
  return `${host.split(".")[0]} · ${id}`;
}

/** Every store has its own Re:amaze brand: info@baiduge.reamaze.com → baiduge. */
export function reamazeBrand(st) {
  const m = (st && st.mail) || "";
  const at = m.indexOf("@");
  if (at < 0 || !/\.reamaze\.com$/i.test(m)) return "";
  return m.slice(at + 1).replace(/\.reamaze\.com$/i, "");
}

/** Deep link into this store's own helpdesk. Zendesk has no subdomain yet, so only Re:amaze links. */
export function helpdeskUrl(st) {
  const br = reamazeBrand(st);
  return br ? `https://${br}.reamaze.com/admin` : "";
}

export function returnFormUrl(cc) {
  return RETURN_FORMS[cc] || RETURN_FORMS_FOLDER;
}
