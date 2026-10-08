import { DEPTS } from "@/data/departments";
import { isRefundQueue, supplierOf } from "./routing";

export function dept(id) {
  return DEPTS.filter((d) => d.id === id)[0];
}

/** May this person see this queue at all. */
export function canSee(id, session) {
  const d = dept(id);
  if (!d) return true;
  if (session.isAdmin && !d.admin) return true;
  return d.roles.indexOf(session.role) > -1;
}

/**
 * Who may actually execute:
 *   - PayPal refunds: Lots only, and no admin override.
 *   - Whop and CJ refunds: CS leads, plus Jane and Joris.
 *   - COG claims: the lead ticks the money off, never the supplier.
 * Everyone else who may see the list looks without being able to click.
 */
export function canProcess(c, session) {
  if (c.dept === "cog") return session.role === "lead" || session.isAdmin;
  if (c.dept === "cancel") {
    const lead = session.role === "lead" || session.isAdmin;
    if (!c.cancelledAt) return c.moneyRoute === "shopify" ? lead : lead || session.role === "agent";
    return c.moneyRoute === "paypal" ? session.role === "paypal" : lead;
  }
  if (!isRefundQueue(c.dept)) return session.role !== "checker";
  if (c.dept === "rf_paypal") return session.role === "paypal";
  return session.role === "lead" || session.isAdmin;
}

/**
 * Through whom the money of this case goes back for real when its button is
 * pressed: Shopify itself, or the PayPal / Whop API. Null where it is still
 * done by hand (Ocean) or the case is not at the refund step yet.
 */
export function refundVia(c) {
  if (c.done || c.retracted) return null;
  if (c.dept === "rf_cj" && c.moneyRoute === "shopify") return "Shopify";
  if (c.dept === "rf_paypal") return "PayPal";
  if (c.dept === "rf_whop") return "Whop";
  if (c.dept === "cancel" && c.cancelledAt && c.moneyRoute === "paypal") return "PayPal";
  if (c.dept === "cancel" && c.cancelledAt && c.moneyRoute === "whop") return "Whop";
  return null;
}

/** The sentence shown when the refund button has been pressed. */
export function refundToast(via, stage) {
  return stage === "resolved"
    ? `Refund sent through ${via} and confirmed.`
    : `Refund sent — ${via} has not shown it as completed yet. Press Check refund in a moment.`;
}

/**
 * May this person transfer the case to another tab (it landed in the wrong
 * one)? A lead any case; an agent any case that is not a refund or a COG
 * claim. The server checks it again.
 */
export function canTransfer(c, session) {
  if (c.done || c.retracted || session.org) return false;
  if (session.role === "lead") return true;
  return session.role === "agent" && !isRefundQueue(c.dept) && c.dept !== "cog";
}

/**
 * May this person take the case back (opened by mistake)? Same rule as the
 * server: a lead any open case, an agent only their own, a PayPal request
 * only the PayPal account holder; nothing that already changed the order or
 * sent money. The server checks it again.
 */
export function canRetract(c, session) {
  if (c.done || c.retracted || c.dept === "cog") return false;
  if (c.cancelledAt || c.editedAt || c.refundSent) return false;
  if (c.dept === "rf_paypal") return session.role === "paypal";
  if (session.role === "lead") return true;
  return session.role === "agent" && c.by === session.me;
}

export function lockReason(c) {
  if (c.dept === "cancel") {
    if (!c.cancelledAt) return c.moneyRoute === "shopify" ? "Only a CS lead can cancel and refund this one." : "You can look, not process.";
    return c.moneyRoute === "paypal"
      ? "The PayPal refund is sent by Lots only."
      : "Only a CS lead can send this refund.";
  }
  if (c.dept === "rf_paypal") return "PayPal refunds are done by Lots only.";
  if (c.dept === "cog") return "A CS lead ticks this off once the money is actually back.";
  if (isRefundQueue(c.dept)) return "Only a CS lead, Jane or Joris can process a refund.";
  return "You can look, not process.";
}

/**
 * One gate for "may this person open this case at all". Search, the case
 * panel, the related cases and the notifications all pass through here,
 * so a supplier can never open another supplier's case — not from a
 * list, not from search, not by guessing a case id.
 */
export function mayOpen(c, session) {
  if (!c) return false;
  if (!canSee(c.dept, session) && !(isRefundQueue(c.dept) && session.isAdmin)) return false;
  if (session.org) {
    const mineSup = session.role === "cj" ? "CJ" : "DayOne";
    if (c.dept !== "supplier" && c.dept !== "cog") return false;
    if (supplierOf(c) !== mineSup) return false;
  }
  return true;
}

