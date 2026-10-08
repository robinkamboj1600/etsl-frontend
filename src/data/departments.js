/**
 * Every queue in the dashboard: who may see it, what the action on a
 * case is called, and which queues are ticket-only (no order, no money).
 */

export const DEPTS = [
  {
    id: "cancel",
    t: "Cancellation request",
    hint: "stop the order",
    act: "Cancelled",
    roles: ["lead", "agent", "checker", "paypal"],
  },
  {
    id: "modify",
    t: "Order modification request",
    hint: "change it before it ships",
    act: "Order modified",
    roles: ["lead", "agent", "checker"],
  },
  {
    id: "rf_paypal",
    t: "PayPal request",
    hint: "paid with PayPal",
    act: "Refund processed",
    roles: ["paypal"],
    queueOnly: true,
  },
  {
    id: "rf_whop",
    t: "Whop request",
    hint: "paid by card",
    act: "Refund processed",
    roles: ["lead", "checker"],
    queueOnly: true,
  },
  {
    id: "rf_cj",
    t: "CJ request",
    hint: "refund in Shopify",
    act: "Refund processed",
    roles: ["lead", "checker"],
    queueOnly: true,
  },
  {
    id: "refund",
    t: "Refund request",
    hint: "money back",
    act: "Refund processed",
    roles: [],
    intakeOnly: true,
  },
  {
    id: "repl",
    t: "Replacement request",
    hint: "send again",
    act: "Replacement ordered",
    roles: ["lead", "checker"],
  },
  {
    id: "voucher",
    t: "Store voucher request",
    hint: "store credit",
    act: "Voucher created",
    roles: ["lead", "checker"],
  },
  {
    id: "returns",
    t: "Returned orders",
    hint: "parcel coming back",
    act: "Return received",
    roles: ["lead", "agent", "checker"],
  },
  {
    id: "dispute",
    t: "Dispute threat ticket",
    hint: "dispute risk",
    act: "Picked up",
    roles: ["lead", "dispute", "checker"],
  },
  {
    id: "outreach",
    t: "Outreach ticket",
    hint: "we contact them",
    act: "Contacted",
    roles: ["lead", "outreach", "checker"],
  },
  {
    id: "supplier",
    t: "Supplier case",
    hint: "CJ or DayOne",
    act: "Reply received",
    roles: ["lead", "agent", "cj", "dayone", "checker"],
  },
  {
    id: "cog",
    t: "COG Refunds",
    hint: "claim back from the supplier",
    act: "COG received",
    roles: ["lead", "checker", "cj", "dayone"],
    queueOnly: true,
  },
  {
    id: "manual",
    t: "Manual ticket",
    hint: "the AI could not do it",
    act: "Handled",
    roles: ["lead", "agent", "checker"],
  },
  {
    id: "suptix",
    t: "Supplier tickets",
    hint: "returns and supplier questions from Re:amaze",
    act: "Handled",
    roles: ["lead", "agent", "checker"],
  },
  {
    id: "spam",
    t: "Spam ticket",
    hint: "not a real customer",
    act: "Confirmed spam",
    roles: ["lead", "agent", "checker"],
  },
  {
    id: "aifb",
    t: "Feedback for AI response",
    hint: "AI got it wrong",
    act: "Reviewed",
    roles: ["lead"],
    adminOnly: true,
  },
  {
    id: "access",
    t: "Access",
    hint: "who sees what",
    act: "",
    roles: ["lead"],
    admin: true,
  },
];

/* reden bepaalt de afdeling */

/* Bakken die alleen om een ticket draaien: geen ordernummer, geen bedrag. */
export const TICKET_ONLY = ["aifb", "manual", "spam", "suptix"];
export function isTicketOnly(d) {
  return TICKET_ONLY.indexOf(d) > -1;
}
