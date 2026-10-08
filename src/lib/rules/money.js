import { isRefundQueue } from "./routing";

/**
 * These read the cases already recorded on one order (from the backend)
 * so the form can warn early. The server checks the same rules again.
 */
function isMoneyBack(d) {
  return isRefundQueue(d) || d === "refund";
}

/**
 * An item is only finished when it was fully refunded or replaced.
 * A partial refund leaves it tickable; the amount check on the server is
 * what guarantees more never goes back than came in.
 */
export function refundedItems(cases, oid) {
  const set = {};
  cases.forEach((c) => {
    if (c.order !== oid || !c.items) return;
    if (c.rejected) return;
    const full =
      c.dept === "repl" ||
      c.dept === "voucher" ||
      c.dept === "cancel" ||
      (isMoneyBack(c.dept) && (c.pct || 0) >= 100);
    if (!full) return;
    c.items.split(", ").forEach((n) => {
      if (n) set[n] = true;
    });
  });
  return set;
}

/** Items that already had part of their value back: a warning, not a lock. */
export function partlyRefunded(cases, oid) {
  const out = {};
  cases.forEach((c) => {
    if (c.order !== oid || !c.items) return;
    if (c.rejected) return;
    if (!isMoneyBack(c.dept) || (c.pct || 0) >= 100) return;
    c.items.split(", ").forEach((n) => {
      if (n) out[n] = (out[n] || 0) + (c.pct || 0);
    });
  });
  return out;
}

/** Open cases on the same order — the duplicate warning at intake. */
export function dupes(cases, oid) {
  return cases.filter((c) => c.order === oid && !c.done);
}
