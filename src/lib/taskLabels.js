/**
 * Plain-words labels for the Re:amaze task list. The task service writes `reason` and
 * `work_kind` for its own engine; agents read these labels instead and the full
 * instruction stays in the tooltip.
 */

const REASONS = {
  repeat_after_reply: "Customer replied again: read and answer",
  "fault undetermined": "Return: set whose fault it is",
  "duplicate candidate: merge or resolve in Reamaze": "Duplicate check: merge or resolve in Re:amaze",
  matched: "Draft ready: check it and approve",
  "outside the chart window": "Return is past the policy window: decide by hand",
  "ticket_type is not this workflow": "Not a standard request: handle by hand",
  "upstream flagged needs_human": "Needs a person: read the ticket and answer",
  "no order linked: escalate": "Find the order and link it",
  "carrier has not scanned this parcel": "Parcel not scanned: check with the carrier",
  "shipped longer ago than the bound": "No delivery recorded: check the parcel",
  "address history unavailable": "Ship-from country unknown: handle the offer by hand",
  "no carrier status seen": "No tracking info: check the parcel",
  letters_fit_rep_picks: "Choose the right reply",
  "reason outside allowlist": "Return reason not in the policy: decide by hand",
  "no status rule matches": "No rule fits: handle by hand",
  order_linked_by_hand: "Order was linked by hand: check the draft",
};

const WORK_KINDS = [
  ["find and link the order", "Find the order and link it"],
  ["has already been answered", "Customer replied again: read and answer"],
  ["Set the fault from", "Return: set whose fault it is"],
  ["This ticket was re-read as", "Ticket changed type: read the decision below"],
  ["marked fulfilled but has no tracking", "Fulfilled, no tracking: check the order"],
  ["The reply proposed here was for an earlier", "Old draft withdrawn: read the thread and answer"],
];

/** "parent" = the newer ticket the older one is merged into; "duplicate" = the older one, resolved in favour of the parent. */
export function dupRole(t) {
  const w = String(t.work_kind || "");
  if (!/look like duplicates/.test(w) && !String(t.reason || "").startsWith("duplicate candidate")) return null;
  if (/merge the older conversation/.test(w)) return "parent";
  return "duplicate";
}

export function whatOf(t) {
  const reason = String(t.reason || "");
  const work = String(t.work_kind || "");
  const hint = [work, reason && reason !== "matched" ? `Engine note: ${reason}` : ""].filter(Boolean).join("\n\n");
  if (reason.startsWith("send refused")) return { label: "Send was refused: read the note, approve again", hint: reason };
  if (reason.startsWith("no send verdict")) return { label: "Not sent: approve again", hint: reason };
  if (dupRole(t)) return { label: "Duplicate check: merge or resolve in Re:amaze", hint };
  if (REASONS[reason]) return { label: REASONS[reason], hint };
  const w = WORK_KINDS.find(([k]) => work.includes(k));
  if (w) return { label: w[1], hint };
  return { label: reason.replace(/_/g, " ") || "—", hint };
}

export const DUP_TAGS = {
  duplicate: { label: "Duplicate", variant: "warn", hint: "Another open ticket from the same customer is being answered. Resolve this one in Re:amaze." },
  parent: { label: "Parent of duplicates", variant: "brand", hint: "The newer ticket. Merge the older one into it in Re:amaze, then tick Merge done." },
};

export const FAULT_LABELS = {
  supplier_s_fault: "Supplier's fault",
  customer_s_fault: "Customer's fault",
  unknown: "Fault not sure",
};
