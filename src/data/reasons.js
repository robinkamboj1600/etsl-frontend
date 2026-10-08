/**
 * The reasons a case can be submitted with, which department each one
 * routes to, which need proof, and which need a ticket link.
 * The wording follows the client's lists, department by department.
 */

export const REASONS = [
  // Manual ticket
  ["Needs a human reply", "manual"], ["AI could not answer", "manual"], ["Complaint or upset customer", "manual"],
  ["Legal or press", "manual"], ["Wholesale or partnership", "manual"], ["Something else", "manual"],
  // Spam ticket
  ["Marketing or newsletter", "spam"], ["Bot or scam", "spam"], ["Not our customer", "spam"],
  ["Duplicate ticket", "spam"], ["Test message", "spam"],
  // Feedback for AI
  ["Wrong answer to the customer", "aifb"], ["Wrong category or routing", "aifb"],
  ["Escalation missed", "aifb"], ["Tone or language off", "aifb"],
  ["Refund offered that should not be", "aifb"], ["Good example to learn from", "aifb"],
  // Dispute threat
  ["Threatens chargeback", "dispute"], ["Threatens PayPal dispute", "dispute"],
  ["Chargeback opened", "dispute"], ["PayPal dispute opened", "dispute"], ["Prevention alert (Ethoca/RDR)", "dispute"],
  ["Legal", "dispute"], ["Report to Authority", "dispute"], ["Mentioned Consumer Protection Bureau", "dispute"],
  // Refund request
  ["Quality Issue", "refund"], ["Sizing Issue", "refund"], ["Not as described", "refund"],
  ["Wrong product", "refund"], ["Missing item", "refund"], ["Returned package", "refund"],
  ["Dispute threat", "refund"], ["Delay shipment", "refund"], ["30-day Money Back", "refund"],
  ["Expired Order", "refund"], ["Insurance fee", "refund"], ["Order modification", "refund"],
  ["Lost Package", "refund"], ["Cancellation", "refund"], ["Out of Stock", "refund"],
  ["Damaged Item", "refund"], ["Wrong color", "refund"], ["Wrong size", "refund"],
  ["RTS", "refund"], ["Material Discrepancy", "refund"], ["Auto-Cancelled Order", "refund"],
  // Replacement request
  ["Damaged item", "repl"], ["Wrong size", "repl"], ["Not as described", "repl"],
  ["Wrong color", "repl"], ["Wrong Item", "repl"], ["RTS", "repl"], ["Lost Package", "repl"],
  ["Quality Issue – Replacement with fee", "repl"], ["Sizing Issue – Replacement with fee", "repl"],
  ["Material Discrepancy", "repl"],
  // Store voucher request
  ["Retention Offer", "voucher"], ["Goodwill", "voucher"], ["Delayed Delivery", "voucher"],
  ["No funds available", "voucher"], ["50% Thank you Voucher", "voucher"], ["Damaged Item", "voucher"],
  ["Wrong Item", "voucher"], ["Wrong Size", "voucher"], ["Wrong Color", "voucher"],
  ["Old Transaction – CX Accepted Voucher", "voucher"], ["Material Discrepancy", "voucher"], ["Returned to Wrong Address", "voucher"],
  // Returned orders
  ["Customer is returning it", "returns"], ["Refused on delivery", "returns"],
  ["Undeliverable, back to sender", "returns"], ["Wrong item sent back", "returns"],
  ["Returned without asking us", "returns"], ["Expired Orders", "returns"],
  ["Failed Pick up Orders", "returns"], ["Delayed Delivery", "returns"],
  ["Quality Issue - CX opted to return", "returns"], ["Sizing Issue - CX opted to return", "returns"],
  // Cancellation request
  ["No longer needed", "cancel"], ["Change mind", "cancel"], ["Ordered wrong item", "cancel"],
  ["Takes too long to fulfill", "cancel"], ["COG too high", "cancel"], ["Out of stock", "cancel"],
  ["Found online negative reviews", "cancel"], ["Dispute/Chargeback Threat", "cancel"],
  ["Ordered wrong color", "cancel"], ["Ordered wrong size", "cancel"],
  ["Found a better price", "cancel"], ["Ordered by mistake", "cancel"],
  ["Found a better item somewhere", "cancel"], ["Duplicate order", "cancel"], ["Insurance Fee", "cancel"],
  // Order modification request
  ["Change address", "modify"], ["Change size", "modify"], ["Change color", "modify"],
  ["Change item or quantity", "modify"], ["Change name or phone", "modify"], ["Change email address", "modify"],
  // Outreach ticket
  ["Out of stock", "outreach"], ["Variant unavailable", "outreach"], ["Address incomplete", "outreach"],
  ["Address invalid", "outreach"], ["Failed delivery/RTS", "outreach"], ["Extra info needed", "outreach"],
  ["Color Unavailable", "outreach"], ["Address Issue", "outreach"], ["Ready for Pick up", "outreach"],
  // Supplier case
  ["Request Shipping Label & POD", "supplier"], ["Request size chart", "supplier"], ["Request material", "supplier"],
  ["Order status", "supplier"], ["Wrong item shipped", "supplier"], ["Tracking not updating", "supplier"],
  ["Cancellation", "supplier"], ["Damaged Item", "supplier"], ["Refund of COG", "supplier"],
  ["Info Received", "supplier"],
];

/* Reasons where a photo or video is expected (compared without regard to capitals). */
export const PROOF = [
  "Quality Issue", "Sizing Issue", "Not as described", "Wrong product", "Missing item",
  "Damaged item", "Wrong size", "Wrong color", "Wrong Item", "Material Discrepancy",
  "Quality Issue – Replacement with fee", "Sizing Issue – Replacement with fee",
  "Damaged on arrival", "Wrong item shipped", "Dispute threat",
];
/* Without proof the supplier rejects the claim, so for a supplier case this one blocks. */
export const PROOF_HARD = ["Wrong item shipped", "Missing item", "Damaged item", "Damaged on arrival"];
/* A supplier case often starts without a ticket, for example a shipping label request. */
export const NO_TICKET = ["Out of stock", "COG too high"];

const norm = (r) => String(r || "").trim().toLowerCase();
const PROOF_SET = new Set(PROOF.map(norm));
const PROOF_HARD_SET = new Set(PROOF_HARD.map(norm));

export function ticketRequired(d, reason) {
  if (d === "supplier") return false;
  if (d === "cancel" && NO_TICKET.indexOf(reason) > -1) return false;
  return true;
}
export function needsProof(r) {
  return PROOF_SET.has(norm(r));
}
export function proofIsHard(r) {
  return PROOF_HARD_SET.has(norm(r));
}
