import { EU } from "@/data/geo";
import { isRefundQueue, goods } from "./routing";
import { isMoneyBack } from "./money";
import { dept } from "./permissions";
import { ticketUrl } from "./links";

/**
 * What is worth knowing before you act on this case. Each signal is
 * [tone, text] — the text carries the meaning, the tone only sorts it.
 */
export function risks(cases, c, f) {
  const out = [];
  const o = f.o;
  const s = f.s;
  const other = cases.filter((x) => x.order === c.order && x.id !== c.id);

  if (c.nofunds)
    out.push([
      "crit",
      `On hold — ${s.name} has no balance to pay this refund. The customer is still waiting.`,
    ]);
  if (c.dept === "dispute")
    out.push(["crit", "Chargeback risk — this case comes before everything else"]);
  if (other.some((x) => isMoneyBack(x.dept))) out.push(["warn", "This order already had a refund"]);
  if (other.some((x) => x.dept === "repl"))
    out.push(["warn", "This order already had a replacement"]);
  if (other.length > 1) out.push(["warn", `${other.length} other cases on the same order`]);
  if (o.status === "Unfulfilled" && o.days != null && o.days > 7)
    out.push(["crit", `Unfulfilled for ${o.days} days`]);
  if (o.status === "In Transit" && o.days != null && o.days > 10)
    out.push(["warn", `No scan for ${o.days} days`]);
  if (goods(f) > 300) out.push(["warn", "High order value"]);
  if (c.turn === "supplier" && c.age > 48)
    out.push(["crit", `${s.supplier} has not replied for ${c.age}h`]);
  if (EU.indexOf(o.cc) > -1 && o.days != null && o.days <= 14 && (isMoneyBack(c.dept) || c.dept === "repl"))
    out.push(["crit", "EU customer within 14 days — statutory right of withdrawal"]);
  if (c.reason === "Prevention alert (Ethoca / RDR)")
    out.push([
      "crit",
      "Refund now and the chargeback never lands. These alerts expire within about 24 hours.",
    ]);
  if (c.due) {
    const left = c.due - c.age;
    out.push([
      left <= 24 ? "crit" : "warn",
      left <= 0
        ? "Evidence deadline passed"
        : `Evidence due in ${left < 48 ? `${left} hours` : `${Math.round(left / 24)} days`} — card networks give 7 to 21 days, PayPal closes a dispute after 20 days`,
    ]);
  }
  if (isRefundQueue(c.dept) && o.days != null && o.days > 110)
    out.push([
      "warn",
      `Order is ${o.days} days old — refunds to the original card usually stop working around 120 days`,
    ]);
  if (EU.indexOf(o.cc) > -1 && c.reason === "Returned package")
    out.push([
      "info",
      "EU return: if the store policy did not say beforehand that the customer pays return shipping, you do",
    ]);
  if (!out.length) out.push(["info", "Nothing unusual"]);
  return out;
}

/** Everything that happened on this case and its order, oldest first. */
export function timeline(c, f) {
  const o = f.o;
  const s = f.s;
  const ev = [];
  ev.push({ t: `Order placed at ${s.name}`, w: `#${c.order}` });
  if (o.status !== "Unfulfilled") ev.push({ t: `Sent to ${s.supplier}`, w: "fulfilment" });
  if (o.status === "In Transit" || o.status === "Delivered")
    ev.push({ t: "On its way to the customer", w: "tracking" });
  if (o.status === "Delivered") ev.push({ t: "Delivered", w: `${o.days} days ago` });
  if (c.tickets && c.tickets.length > 1)
    c.tickets.forEach((t, i) =>
      ev.push({ t: `Ticket ${i + 1} opened`, w: t, u: (c.turls && c.turls[i]) || `https://${t}` }),
    );
  else if (c.ticket) ev.push({ t: "Ticket opened", w: c.ticket, u: ticketUrl(c) });
  if (c.rtn) ev.push({ t: "Customer sent the package back", w: c.rtn });
  (c.log || []).forEach((l) => ev.push({ t: l.t, w: l.w }));
  if (c.done) ev.push({ t: dept(c.dept).act, w: "just now" });
  return ev;
}

/** What actually wins a dispute, per reason. */
export function disputeTips(reason) {
  const r = String(reason || "").toLowerCase();
  if (/prevention alert/.test(r))
    return [
      "Refund the order now, in full. The alert expires within about 24 hours and the chargeback then never lands.",
      "A refunded alert stays out of the dispute rate that Whop measures.",
    ];
  if (/paypal/.test(r))
    return [
      "Answer within 10 days of a claim — after that PayPal closes it for the buyer with a full refund.",
      "Not as described: offer a partial refund before day 20. A settled dispute costs no fee; Seller Protection never covers these.",
      "Item not received: upload the last-mile tracking number showing “delivered” at the buyer's postcode or city.",
      "Tracking shows delivered in another city? Refund instead of fighting — it fails PayPal's address match.",
    ];
  return [
    "Card disputes: 7–21 days to respond on Whop, then it is an automatic loss plus the $15 fee.",
    "Not received: carrier tracking showing delivery to the address on the order, plus the customer emails.",
    "Not as described or unacceptable: product page screenshot, the size chart, photos of what was sent, the return policy the customer agreed to.",
    "Credit not processed: proof the refund was sent, or the policy that says why it wasn't.",
    "Unrecognised or fraud: order details, IP and delivery address, and any earlier undisputed orders on the same card.",
  ];
}
