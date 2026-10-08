import * as React from "react";
import { http } from "./http";
import { registerPerson } from "@/lib/rules/session";

export const casesApi = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.queueKey) q.set("queueKey", params.queueKey);
    if (params.state) q.set("state", params.state);
    if (params.retracted) q.set("retracted", "true");
    if (params.search) q.set("search", params.search);
    q.set("page", String(params.page || 1));
    q.set("pageSize", String(params.pageSize || 25));
    return http.get(`/cases?${q.toString()}`);
  },
  get: (id) => http.get(`/cases/${id}`),
  openCounts: () => http.get("/cases/counts/open"),
  disputeStats: () => http.get("/cases/stats/disputes"),
  storeStats: (days) => http.get(`/cases/stats/stores?days=${days}`),
  onOrder: (orderNumber) => http.get(`/cases/on-order/${encodeURIComponent(orderNumber)}`),
  create: (input) => http.post("/cases", input),
  quote: (input) => http.post("/cases/quote", input),
  process: (id) => http.post(`/cases/${id}/process`),
  undo: (id) => http.post(`/cases/${id}/undo`),
  retract: (id, note) => http.post(`/cases/${id}/retract`, { note }),
  adjust: (id, pct, reason) => http.post(`/cases/${id}/adjust`, { pct, reason }),
  move: (id, queueKey) => http.post(`/cases/${id}/move`, { queueKey }),
  addNote: (id, text) => http.post(`/cases/${id}/notes`, { text }),
  setTracking: (id, tracking) => http.post(`/cases/${id}/tracking`, { tracking }),
  setVoucherCode: (id, code) => http.post(`/cases/${id}/voucher-code`, { code }),
  setCogAmount: (id, amount) => http.post(`/cases/${id}/cog-amount`, { amount }),
  claim: (id) => http.post(`/cases/${id}/claim`),
  unclaim: (id) => http.post(`/cases/${id}/unclaim`),
  escalate: (id) => http.post(`/cases/${id}/escalate`),
  setDisputeOutcome: (id, outcome) => http.post(`/cases/${id}/dispute-outcome`, { outcome }),
  setRespondedOn: (id, date) => http.post(`/cases/${id}/responded-on`, { date }),
  toggleNoFunds: (id) => http.post(`/cases/${id}/toggle-no-funds`),
  setTurn: (id, turn) => http.post(`/cases/${id}/turn`),
};

/** Backend Case rows -> the short-key shape the queue and case panel read. */
export function toCaseView(c) {
  const openedAt = c.openedAt ? new Date(c.openedAt) : null;
  return {
    id: c.id,
    ref: c.ref,
    dept: c.queueKey,
    order: c.orderNumber,
    reason: c.reason,
    amount: Number(c.amount) || 0,
    currency: c.currency || "",
    pct: c.pct || 0,
    items: c.items || "",
    picked: c.pickedItems || [],
    by: registerPerson(c.submittedBy),
    team: c.submittedTeam,
    turn: c.turn,
    done: c.state === "resolved",
    doneBy: registerPerson(c.resolvedBy),
    doneAt: c.resolvedAt,
    rejected: c.rejected,
    ticket: c.ticketSlug || "",
    turl: c.ticketUrl || "",
    turls: [c.ticketUrl, ...(c.extraTicketUrls || [])].filter(Boolean),
    tickets: c.ticketSlug ? [c.ticketSlug] : [],
    rtn: c.returnTracking || "",
    change: c.changeTo || "",
    shopifyEdit: !!c.changeSpec,
    editedAt: c.shopifyEditedAt || null,
    code2: c.voucherCode || "",
    cog: c.cogAmount != null ? Number(c.cogAmount) : null,
    claim: registerPerson(c.claimedBy),
    nofunds: c.noFunds,
    moneyRoute: c.moneyRoute || "",
    payout: c.payouts && c.payouts[0] ? c.payouts[0] : null,
    refundSent: c.changeSpec?.kind === "refund" || !!(c.payouts && c.payouts[0] && c.payouts[0].status !== "failed"),
    refundSteps: c.refundSteps || null,
    retracted: !!c.retractedAt,
    retractedAt: c.retractedAt || null,
    retractedBy: registerPerson(c.retractedBy),
    retractNote: c.retractNote || "",
    customerCountry: c.customerCountry || "",
    paymentMethod: c.paymentMethod || "",
    paymentGateway: c.paymentGateway || "",
    cancelledAt: c.shopifyCancelledAt || null,
    cancelledBy: registerPerson(c.shopifyCancelledBy),
    respondedOn: c.respondedOn ? String(c.respondedOn).slice(0, 10) : "",
    outcome: c.outcome || "",
    due: c.dueAt,
    age: openedAt ? Math.max(0, Math.round((Date.now() - openedAt.getTime()) / 3600000)) : 0,
    log: (c.logEntries || []).map((l) => ({ t: l.text, w: "" })),
    notes: (c.notes || []).map((n) => ({ t: n.text, w: "", by: n.authorId })),
    atts: 0,
    store: c.store || null,
  };
}

/**
 * The cases already recorded on each of these orders, from the backend:
 * { [orderNumber]: caseView[] }. Refetched when the list of orders changes.
 */
export function useOrderCases(ids) {
  const [byOrder, setByOrder] = React.useState({});
  const key = ids.join(",");
  React.useEffect(() => {
    let alive = true;
    if (!ids.length) {
      setByOrder({});
      return undefined;
    }
    Promise.all(
      ids.map((id) =>
        casesApi
          .onOrder(id)
          .then((r) => [id, r.rows.map(toCaseView)])
          .catch(() => [id, []]),
      ),
    ).then((pairs) => alive && setByOrder(Object.fromEntries(pairs)));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return byOrder;
}

/** Queues held in the dashboard database. manual, spam, aifb and suptix come from the Re:amaze task service (api/tasks.js). */
export const REAL_QUEUES = new Set([
  "cancel", "modify", "rf_paypal", "rf_whop", "rf_cj",
  "repl", "voucher", "returns", "supplier", "cog", "dispute", "outreach",
]);
