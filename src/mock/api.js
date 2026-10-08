import { allCases, findCase, setCases, nextId, caseRef, incoming, injectedCount, bumpInjected } from "./db";

import { USERS } from "@/data/people";
import { DEPTS, isTicketOnly } from "@/data/departments";
import { DUE, LADDER, REFUND_WINDOW } from "@/data/policy";
import { WAREHOUSE, RETURN_WAREHOUSE } from "@/data/returnForms";
import {
  resolve,
  goods,
  cancelAmount,
  ladderKey,
  parseOrders,
  parseTickets,
  isRefundQueue,
} from "@/lib/rules/routing";
import { refundedSoFar, caseBase, isMoneyBack } from "@/lib/rules/money";
import { canProcess, dept } from "@/lib/rules/permissions";
import { TURN } from "@/lib/rules/filters";
import { confirmText } from "@/lib/rules/confirmations";
import { ticketUrl } from "@/lib/rules/links";
import { money } from "@/lib/rules/format";

/* Pretend it went over the wire. Set to 120 to see the loading states. */
const LATENCY = 0;
const later = (value) =>
  new Promise((res) => setTimeout(() => res(value), LATENCY));

/* ------------------------------------------------------------------ */
/* the Task <-> view adapter                                          */
/* ------------------------------------------------------------------ */

/** Every stored Task keeps an evidence bag; never write to a missing one. */
function ev(t) {
  t.evidence = t.evidence || {};
  return t.evidence;
}

/** Turn a stored Task into the case shape the rest of the app reads. */
function toView(t) {
  const e = t.evidence || {};
  return {
    id: t.id,
    ref: t.ref,
    by: e.by,
    byAI: e.byAI,
    aiConf: e.aiConf,
    team: e.team,
    due: e.due,
    viewer: e.viewer,
    turn: e.turn,
    dept: t.queue_key,
    order: t.order_number_found,
    reason: t.reason,
    amount: e.amount || 0,
    pct: e.pct || 0,
    items: e.items || "",
    age: e.age || 0,
    note: t.note,
    ticket: t.ticket_slug,
    turl: t.ticket_url,
    turls: e.turls || (t.ticket_url ? [t.ticket_url] : []),
    tickets: e.tickets || (t.ticket_slug ? [t.ticket_slug] : []),
    log: e.log || [],
    notes: e.notes || [],
    done: t.state === "resolved",
    doneBy: t.resolved_by,
    doneAt: t.resolved_at,
    code2: e.code2,
    cog: e.cog,
    rtn: e.rtn,
    claim: e.claim,
    nofunds: e.nofunds,
    fb: e.fb,
    fbSeen: e.fbSeen,
    rejected: e.rejected,
    change: e.change,
    purl: e.purl,
    from: e.from,
    atts: e.atts,
    outcome: t.outcome,
    respondedOn: e.respondedOn,
  };
}

/** The store behind an order number, lowercased to a slug — or null for
    ticket-only cases that never had an order. */
function storeSlugOf(orderNumber) {
  const f = resolve(orderNumber);
  return f && !f.unknown && f.store ? f.store.toLowerCase() : null;
}

/** disposition mirrors turn 1:1 in this demo; setting both through here
    keeps them from drifting apart. */
const DISPOSITION_FOR_TURN = {
  wij: "awaiting_agent",
  klant: "awaiting_customer",
  supplier: "awaiting_supplier",
};
function applyTurn(t, turn) {
  ev(t).turn = turn;
  t.disposition = DISPOSITION_FOR_TURN[turn] || null;
}

/** Build a brand-new Task with sensible defaults for every yaml field. */
function makeTask({ queueKey, order, reason, ticketSlug, ticketUrl: tUrl, note, storeSlug }) {
  const t = {
    id: nextId(),
    store_slug: storeSlug ?? storeSlugOf(order),
    queue_key: queueKey,
    disposition: null,
    order_number_found: order,
    reason,
    work_kind: "case",
    ticket_slug: ticketSlug || "",
    ticket_url: tUrl || "",
    proposal: null,
    opened_at: new Date().toISOString(),
    state: "open",
    outcome: null,
    note: note ?? null,
    resolved_by: null,
    resolved_at: null,
    outbound_body: null,
    proposed_body: null,
    submit_reply: false,
    approved_by: null,
    approved_at: null,
    visibility: null,
    priority: null,
    customer_waiting_since: new Date().toISOString(),
    customer_replied_since_draft: false,
    evidence: {},
  };
  caseRef(t);
  return t;
}

const snapshot = () => allCases().map(toView);
const viewCases = () => allCases().map(toView);
const log = (t, text) => {
  const e = ev(t);
  e.log = e.log || [];
  e.log.push({ t: text, w: "just now" });
};

/* ------------------------------------------------------------------ */
/* reading                                                             */
/* ------------------------------------------------------------------ */

export async function listCases() {
  return later(snapshot());
}

export async function getCase(id) {
  const t = findCase(Number(id));
  return later(t ? toView(t) : null);
}

/** The order behind a case. Becomes a Shopify Admin API call. */
export async function getOrder(orderNumber) {
  return later(resolve(orderNumber));
}

/* ------------------------------------------------------------------ */
/* intake                                                              */
/* ------------------------------------------------------------------ */

/**
 * Submit one or more cases. `draft` is exactly what the intake form
 * holds; the AI posts the same shape to the same endpoint, which is why
 * an AI cannot get a refund past a rule a person could not.
 */
export async function createCases(draft, session) {
  const { me } = session;
  const d = draft.dept;
  const reason = draft.reason;
  const made = [];

  if (!d || !reason) return later({ ok: false, error: "Pick a department and a reason." });

  /* ---- ticket-only queues: no order, no money ---- */
  if (isTicketOnly(d)) {
    const tk0 = parseTickets(draft.ticket);
    /* One ticket per case so they can be ticked off separately; AI
       feedback stays a single case. */
    const group = d === "aifb" ? tk0.slice(0, 1) : tk0;
    if (!group.length) return later({ ok: false, error: "Paste the ticket link." });
    group.forEach((u0) => {
      const slug = u0.replace(/^https?:\/\//, "").slice(0, 44);
      const t0 = makeTask({
        queueKey: d,
        order: "—",
        reason,
        ticketSlug: slug,
        ticketUrl: u0,
        note: (draft.desc || "").trim() || null,
      });
      const e = ev(t0);
      applyTurn(t0, "wij");
      e.by = me;
      e.team = USERS[me].team || null;
      e.amount = 0;
      e.pct = 0;
      e.items = "";
      e.age = 0;
      e.turls = [u0];
      e.tickets = [u0];
      e.log = [{ t: `${d === "aifb" ? "Sent to Jane by " : "Submitted by "}${USERS[me].n}`, w: "just now" }];
      e.notes = (draft.desc || "").trim() ? [{ t: (draft.desc || "").trim(), w: "just now", by: me }] : [];
      allCases().unshift(t0);
      made.push(t0);
    });
    return later({
      ok: true,
      created: made.map(toView),
      cases: snapshot(),
      message:
        d === "aifb"
          ? "Sent to Jane."
          : `${made.length} ticket${made.length === 1 ? "" : "s"} sent to ${dept(d).t}.`,
    });
  }

  /* ---- everything with an order behind it ---- */
  const list = parseOrders(draft.orders).map(resolve).filter((f) => f && !f.unknown);
  if (!list.length) return later({ ok: false, error: "Fill in an order number we can find." });

  const pct = draft.pct || 0;
  let tk = parseTickets(draft.ticket);
  if (d !== "outreach" && d !== "dispute") tk = tk.slice(0, 1);

  for (const f of list) {
    const names = [];
    let amt = 0;
    if (list.length === 1) {
      f.o.items.forEach((it, i) => {
        if (!it.ins && draft.picked && draft.picked[i]) {
          names.push(it.n);
          amt += it.p * it.q;
        }
      });
    } else {
      amt = goods(f);
    }

    const already = refundedSoFar(viewCases(), f.id);
    const final =
      d === "refund"
        ? (amt * pct) / 100
        : d === "voucher"
          ? amt
          : d === "cancel"
            ? Math.max(0, cancelAmount(f) - already)
            : 0;

    /* RULE — a refund percentage must be a step on this order's ladder. */
    if (d === "refund") {
      const steps = LADDER[ladderKey(f)] || [];
      if (steps.indexOf(pct) < 0)
        return later({ ok: false, error: `${pct}% is not a step on this order's ladder.` });
    }

    /* RULE — never refund more than came in. */
    if (isMoneyBack(d) || d === "voucher" || d === "cancel") {
      const cap = d === "cancel" ? cancelAmount(f) : goods(f);
      if (already + final > cap + 0.01)
        return later({
          ok: false,
          error: `${money(f.s, already)} already went back on this order; ${money(
            f.s,
            cap,
          )} is all that came in.`,
        });
    }

    /* RULE — no refund more than 30 days after delivery. */
    if (
      (isMoneyBack(d) || d === "voucher") &&
      f.o.status === "Delivered" &&
      f.o.days != null &&
      f.o.days > REFUND_WINDOW
    )
      return later({
        ok: false,
        error: `Delivered ${f.o.days} days ago. After ${REFUND_WINDOW} days this belongs in the dispute queue.`,
      });

    /* RULE — cancel and modify only while the order is unfulfilled. */
    if ((d === "cancel" || d === "modify") && f.o.status !== "Unfulfilled")
      return later({
        ok: false,
        error: "This order has already shipped — a return, a replacement or a refund is what is left.",
      });

    /* A refund is written straight into the queue that matches how the
       customer paid and who the provider is. */
    let dd = d;
    if (d === "refund") {
      dd =
        f.o.pay === "PayPal"
          ? "rf_paypal"
          : /whop|lasso/i.test(f.s.provider || "")
            ? "rf_whop"
            : "rf_cj";
    }

    const t = makeTask({
      queueKey: dd,
      order: f.id,
      reason,
      ticketSlug: (tk[0] || "").replace(/^https?:\/\//, "").slice(0, 44),
      ticketUrl: tk[0] || "",
      storeSlug: f.store ? f.store.toLowerCase() : null,
    });
    const e = ev(t);
    applyTurn(t, TURN[d] || "wij");
    e.by = me;
    e.team = USERS[me].team || null;
    e.due = DUE[reason] || null;
    e.amount = final;
    e.pct = d === "refund" ? pct : 0;
    e.items = names.join(", ");
    e.age = 0;
    e.turls = tk.slice();
    e.tickets = tk.map((x) => x.replace(/^https?:\/\//, ""));
    e.atts = draft.atts || 0;
    e.rtn = (draft.rtn || "").trim();
    e.change = d === "modify" ? (draft.change || "").trim() : "";
    e.purl = (draft.purl || "").trim();
    e.log = [{ t: `Submitted by ${USERS[me].n}`, w: "just now" }];
    e.notes = [];
    allCases().unshift(t);
    made.push(t);
  }

  const refs = made.map((t) => t.ref);
  return later({
    ok: true,
    created: made.map(toView),
    cases: snapshot(),
    message:
      made.length > 1
        ? `${made.length} cases sent to ${dept(d).t} — ${refs.join(", ")}`
        : `Sent to ${dept(d).t} — ${refs[0]}`,
  });
}

/* ------------------------------------------------------------------ */
/* processing                                                          */
/* ------------------------------------------------------------------ */

function markDone(t, label, session) {
  t.state = "resolved";
  t.resolved_by = session.me;
  t.resolved_at = new Date().toISOString();
  log(t, `${label || "Processed"} by ${USERS[session.me].n}`);
}

/**
 * As soon as the customer has their money back we want the cost price
 * back from the supplier. The dashboard opens that claim itself, one
 * per order.
 */
function openCogClaim(t, st, session) {
  if (!(isRefundQueue(t.queue_key) || t.queue_key === "repl")) return null;
  if (!st || !st.supplier) return null;
  if (allCases().some((x) => x.queue_key === "cog" && x.order_number_found === t.order_number_found)) return null;

  const e = ev(t);
  const claim = makeTask({
    queueKey: "cog",
    order: t.order_number_found,
    reason: t.queue_key === "repl" ? "Replacement sent" : "Refunded to customer",
    ticketSlug: t.ticket_slug || "",
    ticketUrl: t.ticket_url || "",
    storeSlug: t.store_slug,
  });
  const ce = ev(claim);
  applyTurn(claim, "supplier");
  ce.by = session.me;
  ce.team = e.team || USERS[session.me].team || null;
  ce.amount = e.amount || 0;
  ce.cog = 0;
  ce.items = e.items || "";
  ce.age = 0;
  ce.turls = (e.turls || []).slice();
  ce.tickets = (e.tickets || []).slice();
  ce.atts = 0;
  ce.from = t.id;
  ce.log = [
    {
      t: `Opened automatically after ${(dept(t.queue_key) || {}).act || "processing"} by ${USERS[session.me].n}`,
      w: "just now",
    },
  ];
  ce.notes = [];
  allCases().unshift(claim);
  return claim;
}

/**
 * Process one case: record who did it, open the COG claim if there is a
 * supplier behind the store, and hand back the confirmation text for
 * the customer in their own language.
 */
export async function processCase(id, session, opts = {}) {
  const t = findCase(Number(id));
  if (!t) return later({ ok: false, error: "No such case." });
  if (t.state === "resolved") return later({ ok: false, error: "Already processed." });

  const view = toView(t);

  /* RULE — who may execute. */
  if (!canProcess(view, session)) return later({ ok: false, error: "You are not allowed to process this one." });

  /* RULE — a voucher needs its code, a replacement its draft order. */
  if ((t.queue_key === "voucher" || t.queue_key === "repl") && !view.code2)
    return later({
      ok: false,
      error: t.queue_key === "voucher" ? "Add the voucher code first." : "Add the draft order number first.",
    });

  const label = (dept(t.queue_key) || {}).act || "Processed";
  const f = resolve(t.order_number_found);
  const st = (f && f.s) || {};
  const o = (f && f.o) || {};

  /* Only what touches the customer gets a confirmation. A COG claim, a
     supplier case or a dispute is internal. */
  const toCustomer =
    !opts.quiet &&
    (isRefundQueue(t.queue_key) || ["cancel", "repl", "voucher", "modify"].indexOf(t.queue_key) > -1);
  let confirmation = "";
  if (toCustomer) {
    try {
      confirmation = confirmText(view, st, o);
    } catch {
      confirmation = "";
    }
  }

  markDone(t, label, session);
  const claim = openCogClaim(t, st, session);

  const message =
    t.queue_key === "returns"
      ? "Return received. Open a refund or a replacement for this order now — the parcel is back."
      : `${label}.${claim ? ` A COG claim for ${st.supplier} was opened.` : ""}`;

  return later({
    ok: true,
    message,
    confirmation,
    ticket: toCustomer ? ticketUrl(view) : "",
    claim: claim ? toView(claim) : null,
    cases: snapshot(),
  });
}

/** Bulk: everything the person is allowed to process, and a count of the rest. */
export async function processMany(ids, session) {
  let done = 0;
  let skipped = 0;
  let claims = 0;
  for (const id of ids) {
    const t = findCase(Number(id));
    if (!t || t.state === "resolved") continue;
    if (!canProcess(toView(t), session)) {
      skipped += 1;
      continue;
    }
    if ((t.queue_key === "voucher" || t.queue_key === "repl") && !ev(t).code2) {
      skipped += 1;
      continue;
    }
    const before = allCases().length;
    // eslint-disable-next-line no-await-in-loop
    await processCase(id, session, { quiet: true });
    if (allCases().length > before) claims += 1;
    done += 1;
  }
  return later({
    ok: true,
    done,
    skipped,
    claims,
    message:
      `${done} processed` +
      (claims ? `, ${claims} COG claim${claims === 1 ? "" : "s"} opened` : "") +
      (skipped ? `, ${skipped} you are not allowed to process` : "") +
      ". Send each customer their confirmation from the case itself.",
    cases: snapshot(),
  });
}

/** Undo a processed case, and take its automatic COG claim with it. */
export async function undoCase(id, session) {
  const t = findCase(Number(id));
  if (!t) return later({ ok: false, error: "No such case." });
  t.state = "open";
  t.resolved_by = null;
  t.resolved_at = null;
  const e = ev(t);
  if (e.log && e.log.length) e.log.pop();
  setCases(
    allCases().filter((x) => {
      const xe = ev(x);
      if (x.queue_key !== "cog" || xe.from !== t.id || x.state === "resolved") return true;
      if (!(xe.cog > 0)) return false; /* nothing filled in yet: drop it */
      log(x, `The ${(dept(t.queue_key) || {}).t || "case"} this came from was undone by ${USERS[session.me].n}`);
      applyTurn(x, "wij");
      return true;
    }),
  );
  return later({ ok: true, cases: snapshot() });
}

/** Remove cases outright — the undo straight after submitting. */
export async function removeCases(ids, _session) {
  const numeric = ids.map(Number);
  setCases(allCases().filter((t) => numeric.indexOf(t.id) < 0));
  return later({ ok: true, cases: snapshot() });
}

/* ------------------------------------------------------------------ */
/* adjusting, rejecting, moving                                        */
/* ------------------------------------------------------------------ */

/**
 * Change the percentage of a refund, or reject it outright (0%).
 * The ladder and the cap are checked again here.
 */
export async function adjustCase(id, newPct, reason, session) {
  const t = findCase(Number(id));
  if (!t) return later({ ok: false, error: "No such case." });
  const view = toView(t);
  if (!canProcess(view, session)) return later({ ok: false, error: "You are not allowed to adjust this one." });

  const f = resolve(t.order_number_found);
  const e = ev(t);
  const old = e.pct || 0;
  const steps = [0].concat(LADDER[ladderKey(f)] || [15, 25, 30, 100]);
  if (steps.indexOf(newPct) < 0 && newPct !== old)
    return later({ ok: false, error: `${newPct}% is not a step on this order's ladder.` });

  e.fb = { by: session.me, from: old, to: newPct, reason, rejected: newPct === 0 };
  e.fbSeen = false;

  if (newPct === 0) {
    e.rejected = true;
    e.pct = 0;
    e.amount = 0;
    markDone(t, "Rejected", session);
    log(t, `Reason: ${reason}`);
    return later({
      ok: true,
      message: `Rejected. It is in the case log, ${
        USERS[view.by] ? USERS[view.by].n : "the person who submitted it"
      } sees it on the case.`,
      cases: snapshot(),
    });
  }

  /* Scale against the items on this case, not the whole order: otherwise
     10% → 15% quietly becomes 15% of everything. */
  let oldBase = old > 0 ? (e.amount || 0) / (old / 100) : caseBase(view, f);
  if (!Number.isFinite(oldBase) || oldBase <= 0) oldBase = caseBase(view, f);
  const baseUse = Math.min(oldBase, caseBase(view, f));
  const want = (baseUse * newPct) / 100;

  /* RULE — together with what already went back, never above what came in. */
  const others = refundedSoFar(viewCases(), t.order_number_found) - (e.amount || 0);
  const room = Math.max(0, goods(f) - others);
  if (want > room + 0.01)
    return later({
      ok: false,
      error: `That would take this order to more than was paid. ${money(
        f.s,
        room,
      )} is the most that can still go back.`,
    });

  e.rejected = false;
  e.pct = newPct;
  e.amount = want;
  log(t, `Adjusted from ${old}% to ${newPct}% by ${USERS[session.me].n} — ${reason}`);
  return later({
    ok: true,
    message: `Adjusted to ${newPct}%. It is in the case log, ${
      USERS[view.by] ? USERS[view.by].n : "the person who submitted it"
    } sees it on the case.`,
    cases: snapshot(),
  });
}

/** Move a case to another queue. The case number travels with it. */
export async function moveCase(id, toDept, session) {
  const t = findCase(Number(id));
  if (!t) return later({ ok: false, error: "No such case." });
  if (!canProcess(toView(t), session) || session.org)
    return later({ ok: false, error: "Ask a CS lead to move this one." });
  const from = t.queue_key;
  t.queue_key = toDept;
  applyTurn(t, TURN[toDept] || "wij");
  log(t, `Moved from ${(dept(from) || {}).t || from} to ${dept(toDept).t} by ${USERS[session.me].n}`);
  return later({ ok: true, from, message: `Moved to ${dept(toDept).t}.`, cases: snapshot() });
}

/* ------------------------------------------------------------------ */
/* field edits                                                         */
/* ------------------------------------------------------------------ */

/** Voucher code / draft order number. */
export async function setCode(id, code, session) {
  const t = findCase(Number(id));
  if (!t) return later({ ok: false });
  const e = ev(t);
  e.code2 = (code || "").trim();
  if (e.code2)
    log(t, `${t.queue_key === "voucher" ? "Voucher code " : "Draft order "}${e.code2} added by ${USERS[session.me].n}`);
  return later({ ok: true, message: e.code2 ? "Saved." : "Cleared.", cases: snapshot() });
}

/** The amount claimed back from the supplier. */
export async function setCog(id, value, session) {
  const t = findCase(Number(id));
  if (!t) return later({ ok: false });
  const e = ev(t);
  const v = parseFloat(String(value).replace(",", "."));
  e.cog = Number.isNaN(v) || v <= 0 ? 0 : v;
  const f = resolve(t.order_number_found);
  if (e.cog) log(t, `COG claim set to ${money((f && f.s) || "€", e.cog)} by ${USERS[session.me].n}`);
  return later({ ok: true, message: e.cog ? "Saved." : "Cleared.", cases: snapshot() });
}

/** Return tracking. Filling it in turns the case from the customer to us. */
export async function setTracking(id, tracking, session) {
  const t = findCase(Number(id));
  if (!t) return later({ ok: false });
  const e = ev(t);
  const was = (e.rtn || "").trim();
  e.rtn = (tracking || "").trim();
  if (e.rtn && !was) {
    applyTurn(t, "wij");
    log(t, `Tracking ${e.rtn} added by ${USERS[session.me].n} — on its way to the warehouse`);
  } else if (!e.rtn && was) {
    applyTurn(t, "klant");
    log(t, `Tracking cleared by ${USERS[session.me].n}`);
  }
  return later({
    ok: true,
    message: e.rtn ? "Saved. The parcel is on its way." : "Cleared.",
    cases: snapshot(),
  });
}

/** Park a refund because the store has no balance. */
export async function toggleNoFunds(id, session) {
  const t = findCase(Number(id));
  if (!t) return later({ ok: false });
  const e = ev(t);
  e.nofunds = !e.nofunds;
  log(t, e.nofunds ? `Put on hold — store has no funds (${USERS[session.me].n})` : `Funds available again (${USERS[session.me].n})`);
  return later({
    ok: true,
    message: e.nofunds
      ? "Parked under No funds. It stays open until the balance is topped up."
      : "Back in the queue.",
    cases: snapshot(),
  });
}

/** A supplier taking a case. */
export async function claimCase(id, session) {
  const t = findCase(Number(id));
  if (!t) return later({ ok: false });
  const e = ev(t);
  e.claim = session.me;
  log(t, `Claimed by ${USERS[session.me].n} (${USERS[session.me].org})`);
  return later({
    ok: true,
    message: "You claimed this case. Your name is on it until you hand it back.",
    cases: snapshot(),
  });
}

export async function unclaimCase(id) {
  const t = findCase(Number(id));
  if (t) ev(t).claim = null;
  return later({ ok: true, cases: snapshot() });
}

/** Spam that turned out not to be spam. */
export async function notSpam(id, session) {
  const t = findCase(Number(id));
  if (!t) return later({ ok: false });
  t.queue_key = "manual";
  applyTurn(t, "wij");
  log(t, `Not spam after all — moved to Manual ticket by ${USERS[session.me].n}`);
  return later({ ok: true, message: "Moved to Manual ticket.", cases: snapshot() });
}

export async function addNote(id, text, session) {
  const t = findCase(Number(id));
  if (!t || !text.trim()) return later({ ok: false });
  const e = ev(t);
  e.notes = e.notes || [];
  e.notes.unshift({ t: text.trim(), w: "just now", by: session.me });
  log(t, `Note added by ${USERS[session.me].n}`);
  return later({ ok: true, message: "Note added.", cases: snapshot() });
}

/** Whose turn it is now. */
export async function setTurn(id, turn, label, session) {
  const t = findCase(Number(id));
  if (!t) return later({ ok: false });
  applyTurn(t, turn);
  log(t, `${label || `Set to: ${turn}`} — ${USERS[session.me].n}`);
  return later({ ok: true, message: "Updated.", cases: snapshot() });
}

/** Push a case into the dispute queue, where the bank deadlines are tracked. */
export async function escalate(id, session) {
  const t = findCase(Number(id));
  if (!t) return later({ ok: false });
  if (session.org || session.role === "checker")
    return later({ ok: false, error: "Only the CS team can escalate." });
  t.queue_key = "dispute";
  applyTurn(t, "wij");
  log(t, `Escalated to Disputes by ${USERS[session.me].n}`);
  return later({ ok: true, message: "Escalated to Disputes.", cases: snapshot() });
}

/** When we answered a dispute. Without it we cannot tell late from weak. */
export async function setRespondedOn(id, date, session) {
  const t = findCase(Number(id));
  if (!t) return later({ ok: false });
  const e = ev(t);
  e.respondedOn = date || "";
  log(t, `${e.respondedOn ? `Response sent on ${e.respondedOn}` : "Response date cleared"} — ${USERS[session.me].n}`);
  return later({ ok: true, cases: snapshot() });
}

export async function setDisputeOutcome(id, outcome, session) {
  const t = findCase(Number(id));
  if (!t) return later({ ok: false });
  t.outcome = outcome || null;
  log(t, `Outcome: ${outcome || "still open"} — ${USERS[session.me].n}`);
  if (outcome && t.state !== "resolved") markDone(t, `Closed as ${outcome}`, session);
  return later({
    ok: true,
    message: outcome ? `Marked ${outcome}.` : "Back to open.",
    cases: snapshot(),
  });
}

export async function markFeedbackSeen(id) {
  const t = findCase(Number(id));
  if (t) ev(t).fbSeen = true;
  return later({ ok: true, cases: snapshot() });
}

/* ------------------------------------------------------------------ */
/* the AI feed                                                         */
/* ------------------------------------------------------------------ */

/**
 * Stands in for the AI that reads what the reply agents in Re:amaze and
 * Zendesk left behind and opens a case for it. It posts the same fields
 * a person would, through createCases in production — here it writes
 * the case directly so the demo has something to show.
 */
export async function pullNextFromHelpdesk() {
  const feed = incoming();
  const n = injectedCount();
  if (n >= feed.length) return later({ ok: false, done: true });
  const f0 = feed[n];
  bumpInjected();
  const f = resolve(f0.order);

  let pickBase = 0;
  if (f && f.o && f.o.items) {
    const want = String(f0.items || "").split(", ").filter(Boolean);
    f.o.items.forEach((it) => {
      if (it.ins) return;
      if (want.length && want.indexOf(it.n) < 0) return;
      pickBase += it.p * it.q;
    });
  }
  if (!pickBase) pickBase = goods(f);
  const amt = f0.pct ? (pickBase * f0.pct) / 100 : 0;

  const t = makeTask({
    queueKey: f0.dept,
    order: f0.order,
    reason: f0.reason,
    ticketSlug: f0.ticket,
    ticketUrl: f0.turl || "",
    storeSlug: f && f.store ? f.store.toLowerCase() : null,
  });
  const e = ev(t);
  applyTurn(t, TURN[f0.dept] || "wij");
  e.by = "kate";
  e.byAI = true;
  e.aiConf = f0.conf || 92;
  e.team = "Team 1";
  e.amount = amt;
  e.pct = f0.pct || 0;
  e.items = f0.items || "";
  e.age = 0;
  e.tickets = f0.ticket ? [f0.ticket] : [];
  e.turls = f0.turl ? [f0.turl] : [];
  e.due = DUE[f0.reason] || null;
  e.atts = f0.dept === "rf_whop" ? 2 : 0;
  e.log = [{ t: `Opened by the AI from the ticket · confidence ${f0.conf || 92}%`, w: "just now" }];
  e.notes = [];
  allCases().unshift(t);
  return later({ ok: true, case: toView(t), cases: snapshot() });
}

/* Handy for the returns screen. */
export function warehouseFor(cc) {
  return WAREHOUSE[RETURN_WAREHOUSE[cc] || "US"];
}

export const DEPARTMENTS = DEPTS;
export default {
  listCases,
  getCase,
  getOrder,
  createCases,
  processCase,
  processMany,
  undoCase,
  removeCases,
  adjustCase,
  moveCase,
  setCode,
  setCog,
  setTracking,
  toggleNoFunds,
  claimCase,
  unclaimCase,
  notSpam,
  addNote,
  setDisputeOutcome,
  setRespondedOn,
  setTurn,
  escalate,
  markFeedbackSeen,
  pullNextFromHelpdesk,
};
