import * as React from "react";
import { Link2, X } from "lucide-react";

import { DEPTS, isTicketOnly } from "@/data/departments";
import { REASONS, proofIsHard, needsProof, ticketRequired } from "@/data/reasons";
import { REFUND_WINDOW } from "@/data/policy";
import { EU, countryName } from "@/data/geo";

import { casesApi, useOrderCases } from "@/api/cases";
import { personName } from "@/lib/rules/session";
import { HttpError } from "@/api/http";
import { ordersApi, useLiveOrders } from "@/api/orders";
import { useQuotes } from "@/api/quotes";
import { notifyCasesChanged } from "@/lib/casesChanged";
import { OrderContents } from "@/components/cases/OrderContents";
import { Thumb } from "@/components/common/Thumb";
import { toast } from "sonner";
import {
  parseOrders,
  parseTickets,
} from "@/lib/rules/routing";
import { dupes, refundedItems, partlyRefunded } from "@/lib/rules/money";
import { dept } from "@/lib/rules/permissions";
import { money } from "@/lib/rules/format";
import { productUrl, reamazeBrand } from "@/lib/rules/links";
import { optionChangeProblem, optionForReason, variantFor } from "@/lib/rules/variants";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ------------------------------------------------------------------ */

const NEEDS_PRODUCT = ["Request size chart", "Request material"];
/* Cases that can say which items of the order they are about. The server checks them again. */
const ITEM_PICK_DEPTS = ["returns", "dispute", "outreach", "supplier"];
const ITEMS_REQUIRED = { supplier: ["wrong item shipped", "damaged item"] };
const ITEM_CHANGE_REASONS = ["Change size", "Change color", "Change item or quantity"];
const ADDRESS_REASONS = ["Change address", "Change name or phone"];
const EMAIL_REASON = "Change email address";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;


/** A numbered step. It lights up once it is that step's turn. */
function Step({ n, label, required, hint, on, children, hidden }) {
  if (hidden) return null;
  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        on ? "border-primary/40 bg-card" : "border-border bg-card/60",
      )}
    >
      <Label className="mb-2 flex items-center gap-2 text-[13px]">
        {n != null && (
          <span
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px]",
              on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {n}
          </span>
        )}
        {label}
        {required && <span className="text-crit">*</span>}
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </Label>
      {children}
    </div>
  );
}

function WarnBox({ tone = "warn", children }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        tone === "crit"
          ? "border-crit/40 bg-crit-soft text-crit"
          : "border-warn/40 bg-warn-soft text-warn",
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Intake() {
  const [deptId, setDeptId] = React.useState(null);
  const [reason, setReason] = React.useState("");
  const [ticket, setTicket] = React.useState("");
  const [orders, setOrders] = React.useState("");
  const [picked, setPicked] = React.useState({});
  const [pct, setPct] = React.useState(null);
  const [desc, setDesc] = React.useState("");
  const [showDesc, setShowDesc] = React.useState(false);
  const [rtn, setRtn] = React.useState("");
  const [purl, setPurl] = React.useState("");
  const [itemSel, setItemSel] = React.useState({});
  const [itemQty, setItemQty] = React.useState({});
  const [itemRepl, setItemRepl] = React.useState({});
  const [cancelOff, setCancelOff] = React.useState({});
  const [cancelQty, setCancelQty] = React.useState({});
  const [pickOn, setPickOn] = React.useState({});
  const [pickQty, setPickQty] = React.useState({});
  const [addr, setAddr] = React.useState(null);
  const [newEmail, setNewEmail] = React.useState("");
  const [variants, setVariants] = React.useState(null);
  const [atts, setAtts] = React.useState([]);
  const [linkIn, setLinkIn] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const addLink = () => {
    const u = linkIn.trim();
    if (!/^https?:\/\/\S+$/i.test(u)) {
      toast.error("Paste a full link starting with https://");
      return;
    }
    setAtts((a) => a.concat([{ n: u.replace(/^https?:\/\//, "").slice(0, 48), u, t: "link" }]));
    setLinkIn("");
  };

  React.useEffect(() => {
    setItemSel({});
    setItemQty({});
    setItemRepl({});
    setNewEmail("");
  }, [deptId, reason, orders]);

  /* Ticks and quantities are kept per order (order id + item), so another order can be added or removed without losing them. */
  React.useEffect(() => {
    setCancelOff({});
    setCancelQty({});
    setPickOn({});
    setPickQty({});
  }, [deptId, reason]);

  /* aifb is admin-only as a queue, but anyone may file feedback into it,
     so its tile belongs on the intake form. */
  const tiles = DEPTS.filter((d) => !(d.admin || d.queueOnly || isTicketOnly(d.id)));
  const d = deptId;
  const ticketOnly = d ? isTicketOnly(d) : false;

  const tickets = React.useMemo(() => {
    const multi = d === "outreach" || d === "dispute" || d === "spam" || d === "manual";
    const list = parseTickets(ticket);
    return multi ? list : list.slice(0, 1);
  }, [ticket, d]);

  const ids = React.useMemo(() => parseOrders(orders), [orders]);
  const liveById = useLiveOrders(ids);
  const looking = ids.some((id) => !liveById[id] || liveById[id].loading);
  const found = ids.map((id) => liveById[id]).filter((f) => f && !f.loading);
  const okOnes = found.filter((f) => !f.unknown);
  const bad = found.filter((f) => f.unknown);
  const bulk = found.length > 1;
  const one = !bulk && okOnes.length === 1 ? okOnes[0] : null;

  /* The cases already on these orders, from the backend. */
  const orderCases = useOrderCases(okOnes.map((f) => f.id));
  const cases = React.useMemo(() => Object.values(orderCases).flat(), [orderCases]);
  const casesReady = !!one && orderCases[one.id] !== undefined;

  /* The Re:amaze brand in the ticket link — it should match the order's store. */
  const ticketBrand = React.useMemo(() => {
    const m = (tickets[0] || "").match(/^https?:\/\/([a-z0-9-]+)\.reamaze\./i);
    return m ? m[1].toLowerCase() : "";
  }, [tickets]);

  const needItems = d === "refund" || d === "repl" || d === "voucher";
  const needMoney = needItems || d === "cancel";
  const isProduct = NEEDS_PRODUCT.indexOf(reason) > -1;
  const isReturnReason = reason === "Returned package";
  const isReturnDept = d === "returns";
  const isChange = d === "modify";
  const perItemChange = isChange && ITEM_CHANGE_REASONS.indexOf(reason) > -1;
  const addrChange = isChange && ADDRESS_REASONS.indexOf(reason) > -1;
  const emailChange = isChange && reason === EMAIL_REASON;
  const qtyReason = reason === "Change item or quantity";
  const proofNeeded = needsProof(reason);
  const needTicket = d ? ticketRequired(d, reason) : true;
  const okTicket = needTicket ? tickets.length > 0 : true;

  /* Tick everything that can still come back, the first time an order
     resolves. */
  React.useEffect(() => {
    if (!one || !needItems) return;
    const already = refundedItems(cases, one.id);
    const next = {};
    one.o.items.forEach((it, i) => {
      if (!it.ins && !already[it.n]) next[i] = true;
    });
    setPicked(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [one && one.id, needItems, casesReady]);

  /* Order modification: the variants each item can become, live from Shopify. */
  React.useEffect(() => {
    setVariants(null);
    if (!perItemChange || !one) return undefined;
    let alive = true;
    const productIds = [...new Set(one.o.items.filter((it) => !it.ins && it.productId).map((it) => it.productId))];
    ordersApi
      .variants(one.id, productIds)
      .then((res) => {
        if (!alive) return;
        const m = {};
        res.products.forEach((p) => (m[p.productId] = p.variants));
        setVariants(m);
      })
      .catch((err) => {
        if (!alive) return;
        setVariants({});
        toast.error(err instanceof HttpError ? err.detail || err.code : "Could not load the product variants.");
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perItemChange, one && one.id]);

  /* Address / name / phone: start from the address on the order. */
  React.useEffect(() => {
    if (!addrChange || !one) {
      setAddr(null);
      return;
    }
    const a = one.o.addr || {};
    setAddr({
      firstName: a.firstName || "",
      lastName: a.lastName || "",
      company: a.company || "",
      address1: a.address1 || "",
      address2: a.address2 || "",
      city: a.city || "",
      zip: a.zip || "",
      provinceCode: a.provinceCode || "",
      countryCode: a.countryCodeV2 || one.o.cc || "",
      phone: a.phone || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addrChange, one && one.id]);

  /* The refund steps come from the server, which checks them again on submit. */
  const ladder = okOnes[0] ? (reason === "RTS" ? okOnes[0].ladderRts : okOnes[0].ladder) : null;
  const curPct = ladder ? (ladder.indexOf(pct) > -1 ? pct : ladder[0]) : null;
  React.useEffect(() => {
    if (ladder && ladder.indexOf(pct) < 0) setPct(ladder[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ladder && ladder.join()]);

  /* Every amount on this form comes from the server, never calculated
     here — so what is shown is exactly what gets saved. */
  const quoteQueue = { refund: "rf_cj", cancel: "cancel", voucher: "voucher", repl: "repl" }[d] || null;
  const pickedNames = one
    ? one.o.items.filter((it, i) => !it.ins && picked[i]).map((it) => it.n).join(", ")
    : "";
  const nothingTicked = needItems && !!one && !pickedNames;

  /* Order modification per item: one line per ticked item, all in one case. */
  const changeRows = perItemChange && one
    ? one.o.items
        .map((it, i) => ({ it, i }))
        .filter(({ it, i }) => !it.ins && picked[i])
        .map(({ it, i }) => {
          const qty = qtyReason && itemQty[i] !== undefined && itemQty[i] !== "" ? Number(itemQty[i]) : it.cq ?? it.q;
          const list = (variants && it.productId && variants[it.productId]) || [];
          const cur = list.find((v) => v.id === it.variantId);
          const repl = qtyReason ? itemRepl[i] : null;
          const values = { ...Object.fromEntries(((cur && cur.options) || []).map((o) => [o.name, o.value])), ...(itemSel[i] || {}) };
          const target = repl ? { id: repl.id, title: repl.label, price: repl.price, available: repl.available } : cur ? variantFor(list, values) : null;
          const swap = !!target && target.id !== it.variantId;
          let problem = "";
          if (!repl && cur && !target) problem = `${it.n}: that combination does not exist in Shopify.`;
          else if (swap && !target.available) problem = `${it.n}: ${target.title} is sold out.`;
          else if (swap && repl && qty === 0) problem = `${it.n}: give the replacement a quantity.`;
          else if (swap && !repl && Math.abs(target.price - cur.price) > 0.004) problem = `${it.n}: ${target.title} has another price, which cannot be swapped in here yet.`;
          else if (swap && !repl) problem = optionChangeProblem(reason, cur.options, target.options) || "";
          return { it, to: target ? target.id : "", qty, swap, problem, newPrice: repl ? repl.price : it.p };
        })
    : [];
  const moneyDelta = changeRows.reduce((a, r) => a + r.qty * r.newPrice - (r.it.cq ?? r.it.q) * r.it.p, 0);
  const addrMissing = addrChange && addr ? !addr.address1.trim() || !addr.city.trim() || !addr.countryCode.trim() : false;
  const changeSpec = perItemChange
    ? {
        kind: "items",
        lines: changeRows.map(({ it, to, qty }) => ({ lineItemId: it.lineItemId, fromVariantId: it.variantId, toVariantId: to, qty })),
      }
    : emailChange
      ? { kind: "email", email: newEmail.trim().toLowerCase() }
      : addrChange && addr
        ? {
            kind: "address",
            address: Object.fromEntries(Object.entries(addr).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v)),
          }
        : null;
  const currentEmail = (one && one.o.email) || "";
  const emailProblem = !emailChange
    ? ""
    : !EMAIL_RE.test(newEmail.trim())
      ? "Type a full email address, like name@example.com."
      : newEmail.trim().toLowerCase() === currentEmail.toLowerCase()
        ? "That is already the email address on this order."
        : "";
  /* Cancellation: every item of an order starts ticked (= the whole order); un-tick an item, or lower its
     quantity, to cancel only part of it. Returns, dispute, outreach, supplier: tick the items the case is
     about (none ticked = the order as a whole). Each order has its own selection. */
  const cancelSel = Object.fromEntries(d === "cancel" ? okOnes.map((f) => [f.id, itemSelection(f, cancelOff, cancelQty, "cancel")]) : []);
  const pickSel = Object.fromEntries(ITEM_PICK_DEPTS.includes(d) ? okOnes.map((f) => [f.id, itemSelection(f, pickOn, pickQty, "pick")]) : []);
  const cancelNone = okOnes.find((f) => cancelSel[f.id]?.none);
  const cancelBad = okOnes.find((f) => cancelSel[f.id]?.bad);
  const anyPartial = okOnes.some((f) => cancelSel[f.id]?.lines);
  const pickBad = okOnes.find((f) => pickSel[f.id]?.bad);
  const pickRequired = (ITEMS_REQUIRED[d] || []).includes(String(reason).toLowerCase());
  const pickMissing = pickRequired ? okOnes.find((f) => !pickSel[f.id]?.rows.length) : null;
  const orderTag = (f) => (okOnes.length > 1 ? `#${f.id}: ` : "");
  const quoteJobs =
    nothingTicked || cancelNone || cancelBad
      ? []
      : okOnes.map((f) => ({ id: f.id, items: needItems && !bulk ? pickedNames : "", cancelLines: d === "cancel" ? cancelSel[f.id]?.lines : undefined }));
  const quotes = useQuotes(quoteQueue, quoteJobs, d === "refund" ? curPct : undefined, d === "refund" ? reason : undefined);
  const quoteOf = (f) => (quotes && quotes[f.id] && quotes[f.id].ok) || null;
  const quotedTotal = okOnes.reduce((a, f) => a + (quoteOf(f) ? quoteOf(f).amount : 0), 0);
  const quoting = !!quoteQueue && quoteJobs.length > 0 && quotes === null;

  /* ---------------- the warnings, in the order they matter ---------- */
  const warnings = [];
  let blocked = false;
  let why = "";

  if (one) {
    const dp = dupes(cases, one.id).filter((c) => !c.done);
    if (dp.length)
      warnings.push({
        key: "dupe",
        tone: "warn",
        body: `A case is already open on this order: ${dp[0].ref} · ${dept(dp[0].dept).t}, submitted ${
          dp[0].age
        }h ago${personName(dp[0].by) ? ` by ${personName(dp[0].by)}` : ""}.`,
      });

    /* Other orders from this customer at this store, from Shopify. */
    const sc = (one.o.others || []).map((x) => ({
      f: { id: x.number, o: { status: x.status === "UNFULFILLED" ? "Unfulfilled" : "Fulfilled" }, s: one.s },
      total: x.total,
    }));
    if (sc.length) {
      const all = sc.concat([{ f: one, total: one.o.total }]);
      const low = all.reduce((a, x) => (x.total < a.total ? x : a));
      warnings.push({
        key: "samecust",
        tone: "warn",
        body: (
          <div>
            <b>
              {one.o.cust} has {sc.length + 1} orders at {one.s.name}.
            </b>
            <div className="mt-1.5 flex flex-col gap-1">
              {all.map((x) => (
                <div key={x.f.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs">#{x.f.id}</span>
                  <Badge variant="secondary">{x.f.o.status}</Badge>
                  <span>{money(x.f.s, x.total)}</span>
                  {x.f.id === one.id && <Badge variant="brand">this one</Badge>}
                  {x === low && all.length > 1 && <Badge variant="warn">lowest amount</Badge>}
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-xs opacity-80">
              Check whether this is a double order before you refund. If it is, cancel the lowest
              one and leave the other standing.
            </p>
          </div>
        ),
      });
    }

    const storeBrand = reamazeBrand(one.s);
    if (ticketBrand && storeBrand && ticketBrand !== storeBrand)
      warnings.push({
        key: "wrongstore",
        tone: "crit",
        body: `The ticket link is from the ${ticketBrand} helpdesk, but this order number belongs to ${one.s.name} (${storeBrand}).`,
      });
  }

  /* An order cancelled in Shopify but not yet paid back is what a refund request is for. */
  if (d === "refund" && okOnes.some((f) => f.o.cancelled))
    warnings.push({
      key: "cancelledorder",
      tone: "warn",
      body: "This order is already cancelled in Shopify. A refund request sends back the items' money; shipping and insurance are not included. If everything was already paid back, the form will say so.",
    });

  /* RULE — a cancellation only while the order is unfulfilled. */
  if (d === "cancel") {
    const shipped = okOnes.filter((f) => f.o && f.o.status !== "Unfulfilled");
    if (shipped.length) {
      blocked = true;
      why =
        okOnes.length === 1
          ? "This order can no longer be cancelled."
          : `${shipped.length} of these orders already shipped and cannot be cancelled.`;
      warnings.push({
        key: "shipped",
        tone: "crit",
        body: `${why}${bulk ? ` Take them out of the list: ${shipped.map((f) => `#${f.id}`).join(", ")}` : ""}`,
      });
    }
  }

  if (pickBad) {
    blocked = true;
    why = `${orderTag(pickBad)}give each ticked item a quantity of at least 1, and no more than was ordered.`;
  } else if (pickMissing) {
    blocked = true;
    why = `${orderTag(pickMissing)}tick the item this is about — the supplier cannot act without it.`;
  }

  if (cancelNone) {
    blocked = true;
    why = `${orderTag(cancelNone)}tick at least one item to cancel.`;
  } else if (cancelBad) {
    blocked = true;
    why = `${orderTag(cancelBad)}give each ticked item a quantity of at least 1, and no more than was ordered.`;
  } else if (anyPartial) {
    warnings.push({
      key: "partialcancel",
      tone: "warn",
      body: "Where items are un-ticked, only the ticked items are cancelled. The rest of that order stays and ships as normal, and shipping and insurance are not refunded. To cancel a whole order, tick everything.",
    });
  }

  if (nothingTicked) {
    blocked = true;
    const already = refundedItems(cases, one.id);
    const allDone = one.o.items.filter((it) => !it.ins).every((it) => already[it.n]);
    why = allDone
      ? "Every item on this order has already been refunded or replaced. Open the existing case instead."
      : "Tick at least one item.";
    if (allDone) warnings.push({ key: "allrefunded", tone: "warn", body: why });
  }

  if (isProduct && !/^https?:\/\/\S+/.test(purl.trim())) {
    blocked = true;
    why = "Paste the product URL.";
  }
  if (isReturnReason && !rtn.trim()) {
    blocked = true;
    why = "Add the return tracking number.";
  }
  if (perItemChange && one) {
    if (variants === null) {
      blocked = true;
      why = "Loading the product variants…";
    } else if (!changeRows.length) {
      blocked = true;
      why = "Tick the item(s) to change.";
    } else if (changeRows.some((r) => r.problem)) {
      blocked = true;
      why = changeRows.find((r) => r.problem).problem;
    } else if (changeRows.some((r) => !r.to)) {
      blocked = true;
      why = "Pick what each ticked item should become.";
    } else if (changeRows.some((r) => !Number.isInteger(r.qty) || r.qty < 0 || r.qty > 50)) {
      blocked = true;
      why = "Give each item a whole quantity (0–50).";
    } else if (
      changeRows.every((r) => r.qty === 0) &&
      one.o.items.filter((it) => !it.ins).length === changeRows.length
    ) {
      blocked = true;
      why = "That removes every item — submit a cancellation instead.";
    } else if (changeRows.some((r) => r.to === r.it.variantId && r.qty === (r.it.cq ?? r.it.q))) {
      blocked = true;
      why = "Change the variant or the quantity of each ticked item.";
    } else if (Math.abs(moneyDelta) > 0.004) {
      warnings.push({
        key: "qtymoney",
        tone: "warn",
        body:
          moneyDelta < 0
            ? `This lowers the order by ${money(one.s, -moneyDelta)}. The Shopify edit does not send money back — the refund is a separate step.`
            : `This raises the order by ${money(one.s, moneyDelta)}. The customer has to pay that difference.`,
      });
    }
  } else if (addrChange && one && addrMissing) {
    blocked = true;
    why = "Fill in at least the street, city and country.";
  } else if (emailChange && one && emailProblem) {
    blocked = true;
    why = emailProblem;
  }
  if (isChange && ids.length > 1) {
    warnings.push({
      key: "onechange",
      tone: "crit",
      body: "One order at a time here — every change is specific to its own order.",
    });
    blocked = true;
    why = "One order at a time for this case type.";
  }
  if (isChange && one && one.o.status !== "Unfulfilled") {
    warnings.push({
      key: "shippedchange",
      tone: "crit",
      body: `This order is already ${one.o.status.toLowerCase()}. It can no longer be changed — once it ships, only a return, replacement or refund can fix it.`,
    });
    blocked = true;
    why = "This order can no longer be changed.";
  }
  if (isChange && one && one.o.status === "Unfulfilled" && addrChange)
    warnings.push({
      key: "tellsupplier",
      tone: "warn",
      body: `Tell ${one.s.supplier} as well if they already have the order — a parcel sent to the old address fails PayPal's address match and loses any "not received" claim.`,
    });

  if (proofNeeded && !atts.length) {
    const hard = d === "supplier" && proofIsHard(reason);
    if (hard) {
      blocked = true;
      why = "Add a photo or a link first.";
    }
    warnings.push({
      key: "proof",
      tone: hard ? "crit" : "warn",
      body: hard
        ? `A claim without a photo gets rejected by ${okOnes[0] ? okOnes[0].s.supplier : "the supplier"}. Add a photo or a link first.`
        : "No photo or link attached. You can still submit, but the specialist has less to go on.",
    });
  }

  if (needItems && ids.length > 1) {
    warnings.push({
      key: "oneorder",
      tone: "crit",
      body: `One order at a time here. The items and the amount are picked per order, so a ${dept(
        d,
      ).t.toLowerCase()} cannot cover ${ids.length} orders at once.`,
    });
    blocked = true;
    why = "One order at a time for this case type.";
  }

  /* RULE — like the insurance: nothing goes back more than 30 days after
     delivery. A chargeback then belongs in the dispute queue. */
  if (d === "refund") {
    const late = okOnes.filter(
      (f) => f.o && f.o.status === "Delivered" && f.o.days != null && f.o.days > REFUND_WINDOW,
    );
    if (late.length) {
      warnings.push({
        key: "late",
        tone: "crit",
        body: (
          <div>
            <b>
              {late.length === 1
                ? `This order was delivered ${late[0].o.days} days ago. Past ${REFUND_WINDOW} days we do not refund any more.`
                : `${late.length} of these orders were delivered more than ${REFUND_WINDOW} days ago. Past ${REFUND_WINDOW} days we do not refund any more.`}
            </b>
            <p className="mt-1 text-xs opacity-80">
              If the customer is threatening a chargeback, submit it as a dispute threat ticket
              instead — that is where the bank deadlines are tracked.
            </p>
          </div>
        ),
      });
      blocked = true;
      why = `Delivered more than ${REFUND_WINDOW} days ago — no refund.`;
    }
  }

  /* RULES 1-4 and 10 — the server's answer, shown as it comes. The
     window and shipped-order warnings above have their own wording. */
  if (quoteQueue && quotes) {
    const explained = warnings.some((w) => w.key === "late" || w.key === "shipped");
    okOnes.forEach((f) => {
      const r = quotes[f.id];
      if (!r) return;
      if (r.error) {
        blocked = true;
        const covered = r.error.code === "refund_window_closed" || r.error.code === "order_already_shipped";
        if (covered && explained) return;
        warnings.push({ key: `quote-${f.id}`, tone: "crit", body: `${bulk ? `#${f.id}: ` : ""}${r.error.detail}` });
        why = why || r.error.detail;
      } else if (!bulk && d !== "repl" && r.ok.already > 0) {
        warnings.push({
          key: "cap-left",
          tone: "warn",
          body: `${money(f.s, r.ok.already)} already went back on this order. ${money(
            f.s,
            Math.max(0, r.ok.cap - r.ok.already),
          )} is left.`,
        });
      }
    });
  }
  if (quoting) {
    blocked = true;
    why = why || "Checking the amount…";
  }

  /* ---------------- ticket-only queues ------------------------------ */
  const noteNeeded = ticketOnly && d !== "spam";
  const okNote = !noteNeeded || desc.trim().length > 2;

  let canSubmit;
  let submitLabel;
  let note;
  if (ticketOnly) {
    canSubmit = !!reason && tickets.length > 0 && okNote;
    submitLabel =
      d === "aifb" ? "Send to Jane" : tickets.length > 1 ? `Submit ${tickets.length} tickets` : "Submit";
    note = canSubmit
      ? d === "aifb"
        ? "Goes to Jane only"
        : `To ${dept(d).t}${tickets.length > 1 ? ` · ${tickets.length} tickets` : ""}`
      : !reason
        ? "Pick a reason first."
        : tickets.length === 0
          ? "Paste the ticket link."
          : d === "manual"
            ? "Say what it needs."
            : "Describe what went wrong.";
  } else {
    canSubmit = !!reason && okTicket && okOnes.length > 0 && !blocked;
    submitLabel = okOnes.length > 1 ? `Submit ${okOnes.length} cases` : "Submit";
    if (!reason) why = why || "Pick a reason first.";
    else if (!okTicket) why = why || "Paste the ticket link.";
    else if (!okOnes.length) why = why || "Fill in an order number we can find.";
    const destName =
      okOnes.length && d === "refund"
        ? okOnes[0].o.pay === "PayPal"
          ? "PayPal request — Lots processes it"
          : /whop|lasso/i.test(okOnes[0].s.provider || "")
            ? "Whop request"
            : "CJ request"
        : "";
    note = !canSubmit
      ? why
      : okOnes.length
        ? d === "refund"
          ? `To ${destName}`
          : needMoney
              ? `To ${dept(d).t} — a specialist will process it`
              : `Goes to ${dept(d).t}`
        : "";
  }

  /* ---------------- submit ------------------------------------------ */
  async function submitToRealBackend() {
    const tk = tickets[0] || "";
    const multiTicket = d === "outreach" || d === "dispute";
    const noteText = [
      desc.trim(),
      isProduct && purl.trim() ? `Product: ${purl.trim()}` : "",
      ...atts.filter((a) => a.t === "link").map((a) => `Proof: ${a.u}`),
    ]
      .filter(Boolean)
      .join("\n");
    const made = [];
    for (const f of okOnes) {
      /* The server recomputes all of this; these are the values it showed. */
      const items = needItems && okOnes.length === 1
        ? pickedNames
        : "";
      const amount = quoteOf(f) ? quoteOf(f).amount : 0;
      const queueKey = d === "refund" ? f.refundQueue : d;

      // eslint-disable-next-line no-await-in-loop
      const res = await casesApi.create({
        queueKey,
        orderNumber: f.id,
        reason,
        items,
        amount,
        pct: d === "refund" ? curPct || 0 : 0,
        ticketUrl: tk || undefined,
        extraTicketUrls: multiTicket && tickets.length > 1 ? tickets.slice(1) : undefined,
        returnTracking: rtn.trim() || undefined,
        changeSpec: isChange && changeSpec ? changeSpec : undefined,
        cancelLines: d === "cancel" ? cancelSel[f.id]?.lines : undefined,
        pickedItems: ITEM_PICK_DEPTS.includes(d) ? pickSel[f.id]?.lines : undefined,
      });
      // eslint-disable-next-line no-await-in-loop
      if (!res.duplicate && noteText) await casesApi.addNote(res.case.id, noteText);
      made.push({ ...res, orderId: f.id });
    }
    return made;
  }

  async function onSubmit() {
    setBusy(true);
    try {
      const made = await submitToRealBackend();
      const refs = made.filter((r) => !r.duplicate).map((r) => r.case.ref);
      notifyCasesChanged();
      if (refs.length) toast(`Sent to ${dept(d).t} — ${refs.join(", ")}`);
      made
        .filter((r) => r.duplicate)
        .forEach((r) =>
          toast(`No new case for #${r.orderId}: ${r.case.ref} is already open on it (${dept(r.case.queueKey).t}) — noted there instead.`),
        );
    } catch (err) {
      toast.error(err instanceof HttpError ? err.detail || err.code : "Could not submit.");
      return;
    } finally {
      setBusy(false);
    }
    setOrders("");
    setTicket("");
    setDesc("");
    setRtn("");
    setPurl("");
    setItemSel({});
    setCancelOff({});
    setCancelQty({});
    setPickOn({});
    setPickQty({});
    setAddr(null);
    setNewEmail("");
    setPicked({});
    setAtts([]);
  }

  const reasonsFor = REASONS.filter((r) => r[1] === d);

  return (
    <Card className="mx-auto max-w-3xl">
      <CardContent className="grid gap-3 p-5">
        {/* 1 — the main line */}
        <Step n={1} label="What is going on?" required on hint="manual, spam and AI-feedback tickets arrive on their own from Re:amaze">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {tiles.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={d === t.id}
                onClick={() => {
                  setDeptId(t.id);
                  setReason("");
                  setPct(null);
                  setShowDesc(false);
                  setPicked({});
                  setAtts([]);
                }}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left text-[12.5px] font-medium transition-colors",
                  d === t.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : d
                      ? "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      : "border-border bg-card hover:border-primary/40",
                )}
              >
                {t.t}
              </button>
            ))}
          </div>
        </Step>

        {/* 2 — the reason inside that line */}
        <Step n={2} label="Reason" required on={!!d} hidden={!d}>
          <div className="flex flex-wrap gap-1.5">
            {reasonsFor.map((r) => (
              <button
                key={r[0]}
                type="button"
                aria-pressed={reason === r[0]}
                onClick={() => {
                  setReason(r[0]);
                  setPicked({});
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  reason === r[0]
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {r[0]}
              </button>
            ))}
          </div>
        </Step>

        {/* 3 — the ticket link */}
        <Step
          n={3}
          label="Ticket link"
          required={needTicket}
          hint={
            !needTicket
              ? "optional"
              : d === "outreach" || d === "dispute" || (ticketOnly && d !== "aifb")
                ? "multiple allowed"
                : null
          }
          on={!!reason}
          hidden={!d}
        >
          <Textarea
            rows={Math.min(6, Math.max(1, ticket.split("\n").filter((x) => x.trim()).length))}
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            placeholder="https://averlylane.reamaze.io/admin/conversations/4482"
            className="font-mono text-xs"
          />
        </Step>

        {/* 4 — the order number(s) */}
        <Step
          n={4}
          label="Order number"
          required
          hint={!needItems ? "multiple allowed — separate with a space, comma or new line" : null}
          on={!!reason && okTicket}
          hidden={!d || ticketOnly}
        >
          <OrderChips
            ids={ids}
            byId={liveById}
            onAdd={(list) => {
              setOrders((prev) => {
                const cur = parseOrders(prev);
                return [...cur, ...list.filter((x) => !cur.includes(x))].join("\n");
              });
              setPicked({});
            }}
            onRemove={(id) => {
              setOrders((prev) => parseOrders(prev).filter((x) => x !== id).join("\n"));
              setPicked({});
            }}
            placeholder={needItems ? "AVERY5809LANE" : "AVERY5809LANE — add more orders after a space, or paste a whole list"}
          />

          {looking && ids.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Looking up in Shopify…</p>
          )}
          {!bulk && bad[0] && (
            <p className="mt-2 text-xs text-crit">
              {bad[0].error || `No order ${bad[0].id} found.`}
            </p>
          )}

          {/* what we know about this order */}
          {one && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="brand">{one.s.name}</Badge>
              <Badge variant="secondary">{one.o.cust}</Badge>
              <Badge variant="secondary">Sold to {countryName(one.o.cc)}</Badge>
              <Badge variant={one.o.pay === "PayPal" ? "warn" : "secondary"}>
                Paid with {one.o.pay || "Credit Card"}
              </Badge>
              <Badge variant={one.o.status === "Unfulfilled" ? "good" : "secondary"}>
                {one.o.status}
              </Badge>
              <Badge variant="secondary">{one.s.supplier}</Badge>
              {EU.indexOf(one.o.cc) > -1 && one.o.days != null && one.o.days <= 14 && d === "refund" && (
                <Badge variant="crit">EU · within 14 days</Badge>
              )}
              {one.o.status !== "Unfulfilled" && (d === "refund" || d === "cancel") && (
                <Badge variant="warn">insurance excluded</Badge>
              )}
            </div>
          )}

          {/* a whole list at once */}
          {bulk && (
            <div className="mt-3 rounded-lg border">
              <div className="border-b px-3 py-2 text-xs font-semibold">
                {okOnes.length} order{okOnes.length === 1 ? "" : "s"} recognised
                {bad.length ? ` · ${bad.length} not found` : ""}
              </div>
              <div className="divide-y">
                {found.map((f) => (
                  <div key={f.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <span className="font-mono text-xs">#{f.id}</span>
                    {f.unknown ? (
                      <Badge variant="crit">not found</Badge>
                    ) : (
                      <>
                        <Badge variant="brand">{f.s.name}</Badge>
                        <Badge variant="secondary">{f.s.supplier}</Badge>
                        {dupes(cases, f.id).length > 0 && <Badge variant="warn">already open</Badge>}
                        <span className="text-xs text-muted-foreground">{f.o.status}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!needMoney && !(perItemChange && one) && okOnes.length > 0 && (
            <div className="mt-3">
              {ITEM_PICK_DEPTS.includes(d) ? (
                <div className="space-y-3">
                  {okOnes.map((f) => (
                    <div key={f.id}>
                      {okOnes.length > 1 && <OrderHeading f={f} />}
                      <CaseItemPicker
                        one={f}
                        on={pickOn}
                        setOn={setPickOn}
                        qtys={pickQty}
                        setQtys={setPickQty}
                        required={pickRequired}
                        hint={
                          d === "dispute"
                            ? "Tick the product the customer is complaining about — it is counted per product in the Dispute Dashboard."
                            : d === "supplier"
                              ? "Tick the item(s) this is about, so the supplier sees exactly which one."
                              : "Tick the item(s) this is about. Leave everything unticked if it is about the whole order."
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <OrderContents orders={okOnes} />
              )}
            </div>
          )}
        </Step>

        {/* the extras, each only where it belongs */}
        <Step label="Product URL" required on={!!reason} hidden={!isProduct}>
          <Input
            value={purl}
            onChange={(e) => setPurl(e.target.value)}
            placeholder="https://averylanebrighton.com/products/…"
          />
        </Step>

        <Step
          label={perItemChange ? "Which items, and what each becomes" : emailChange ? "New email address" : reason === "Change name or phone" ? "New name or phone" : "New address"}
          required
          on={!!reason}
          hidden={!isChange || !one || (!perItemChange && !addrChange && !emailChange)}
          hint="this is what gets changed in Shopify when the case is processed"
        >
          {perItemChange ? (
            <ItemChangePicker
              one={one}
              picked={picked}
              setPicked={setPicked}
              sel={itemSel}
              setSel={setItemSel}
              reason={reason}
              qtys={itemQty}
              setQtys={setItemQty}
              withQty={qtyReason}
              variants={variants}
              repl={itemRepl}
              setRepl={setItemRepl}
              orderId={one?.id}
              store={one?.s}
            />
          ) : emailChange ? (
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                Now on the order:
                <span className="break-all font-mono text-foreground">{currentEmail || "no email"}</span>
              </div>
              <Input
                type="email"
                inputMode="email"
                autoComplete="off"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new.address@example.com"
                className="text-sm"
              />
              {newEmail.trim() && emailProblem ? (
                <p className="text-xs text-crit">{emailProblem}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Only the contact email on this order changes. The customer's profile in Shopify and the Re:amaze ticket stay as they are, and
                  the customer is not emailed.
                </p>
              )}
            </div>
          ) : addr ? (
            <AddressFields addr={addr} setAddr={setAddr} nameOnly={reason === "Change name or phone"} />
          ) : null}
        </Step>

        <Step
          label="Return tracking"
          required={isReturnReason}
          hint={isReturnDept ? "leave it empty until the customer sends it" : null}
          on={!!reason}
          hidden={!(isReturnReason || isReturnDept)}
        >
          <Input
            value={rtn}
            onChange={(e) => setRtn(e.target.value)}
            placeholder="Tracking number or link — e.g. RR123456789SE"
            className="font-mono text-xs"
          />
        </Step>

        {/* 5 — the items and the amount */}
        <Step
          n={5}
          label={
            d === "voucher"
              ? "Items for the voucher"
              : d === "repl"
                ? "Items to send again"
                : d === "cancel"
                  ? "Which items to cancel"
                  : "Items to refund"
          }
          required
          on={!!reason && okTicket && okOnes.length > 0}
          hidden={!needMoney}
        >
          {needItems && one && (
            <ItemPicker one={one} picked={picked} setPicked={setPicked} cases={cases} />
          )}

          {d === "cancel" && okOnes.length > 0 ? (
            <div className="space-y-3">
              {okOnes.map((f) => (
                <div key={f.id}>
                  {okOnes.length > 1 && <OrderHeading f={f} />}
                  <CancelItemPicker one={f} off={cancelOff} setOff={setCancelOff} qtys={cancelQty} setQtys={setCancelQty} />
                </div>
              ))}
            </div>
          ) : (
            needItems && bulk && okOnes.length > 0 && <OrderContents orders={okOnes} />
          )}

          {/* what goes back */}
          {d === "cancel" && okOnes.length > 0 && okOnes.every((f) => f.o.status === "Unfulfilled") && (
            <Suggest
              label="Back to the customer"
              sub={
                anyPartial
                  ? "Where items are un-ticked, only the ticked items and their tax go back — shipping and insurance stay on that order"
                  : okOnes.some((f) => quoteOf(f) && quoteOf(f).already > 0)
                  ? `Nothing shipped yet, so shipping and insurance go back too — minus ${money(
                      okOnes[0].s,
                      okOnes.reduce((a, f) => a + (quoteOf(f) ? quoteOf(f).already : 0), 0),
                    )} that already went back`
                  : "Nothing shipped yet, so shipping and insurance go back too"
              }
              amount={
                quotes === null ? "…" : money(okOnes[0].s, quotedTotal) + (okOnes.length > 1 ? " total" : "")
              }
            />
          )}

          {d === "refund" && okOnes.length > 0 && ladder && (
            <Suggest
              label={bulk ? "Percentage for all orders" : "Requested amount"}
              control={
                <Select value={String(curPct)} onValueChange={(v) => setPct(Number(v))}>
                  <SelectTrigger className="mt-1 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ladder.map((p) => (
                      <SelectItem key={p} value={String(p)}>
                        {p}% {p === 100 ? "· full" : "partial"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
              amount={
                quotes === null
                  ? "…"
                  : money(okOnes[0].s, nothingTicked ? 0 : quotedTotal) + (bulk ? " total" : "")
              }
            />
          )}

          {d === "voucher" && okOnes.length > 0 && (
            <Suggest
              label="Voucher value"
              sub="100% of the ticked items"
              amount={quotes === null ? "…" : money(okOnes[0].s, nothingTicked ? 0 : quotedTotal)}
            />
          )}
        </Step>

        {/* the warnings */}
        {warnings.map((w) => (
          <WarnBox key={w.key} tone={w.tone}>
            {w.body}
          </WarnBox>
        ))}

        {/* 6 — proof */}
        <Step
          n={6}
          label="Photo or video link"
          required={d === "supplier" && proofIsHard(reason)}
          on={!!reason && okTicket}
          hidden={!reason || (!proofNeeded && d !== "supplier" && d !== "dispute")}
        >
          <p className="mb-2 text-xs text-muted-foreground">
            Upload the photo or video to Drive, prnt.sc or the supplier portal and paste the link here.
          </p>
          <div className="flex gap-2">
            <Input
              value={linkIn}
              onChange={(e) => setLinkIn(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLink();
                }
              }}
              placeholder="https://drive.google.com/… · prnt.sc · dayoneerp…"
              className="text-xs"
            />
            <Button type="button" variant="outline" size="sm" onClick={addLink}>
              Add
            </Button>
          </div>
          {atts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {atts.map((a, i) => (
                <span
                  key={`${a.n}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-md border bg-muted px-2 py-1 text-xs"
                >
                  <Link2 className="h-3 w-3" />
                  {a.n}
                  <button
                    type="button"
                    aria-label="remove"
                    onClick={() => setAtts((list) => list.filter((_, j) => j !== i))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Step>

        {/* the note */}
        {reason && !showDesc && !ticketOnly && (
          <button
            type="button"
            onClick={() => setShowDesc(true)}
            className="justify-self-start text-xs text-primary underline underline-offset-2"
          >
            + add a note
          </button>
        )}
        {(showDesc || ticketOnly) && reason && (
          <Step
            label={
              d === "aifb" ? "What went wrong" : d === "manual" ? "What does it need" : "Note"
            }
            required={noteNeeded}
            on={!!reason}
          >
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Only if the ticket does not already say it."
            />
          </Step>
        )}

        {/* submit */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="button" disabled={!canSubmit} loading={busy} onClick={onSubmit}>
            {submitLabel}
          </Button>
          <span className={cn("text-xs", canSubmit ? "text-muted-foreground" : "text-crit")}>
            {note}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Returns, dispute, outreach and supplier cases: tick the items the case is
 * about. Nothing ticked means the order as a whole (except where the
 * supplier needs to know which item — then it is required).
 */
function CaseItemPicker({ one, on, setOn, qtys, setQtys, required, hint }) {
  const k = (i) => `${one.id}:${i}`;
  const rows = one.o.items.map((it, i) => ({ it, i })).filter(({ it }) => !it.ins && it.lineItemId);
  const count = rows.filter(({ i }) => on[k(i)]).length;
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs">
        <span className="font-medium">Which item?</span>
        <Badge variant={required ? "crit" : "secondary"}>{required ? "required" : "optional"}</Badge>
        <span className="ml-auto text-muted-foreground">{count ? `${count} of ${rows.length} ticked` : "whole order"}</span>
        {count > 0 && (
          <button
            type="button"
            className="text-primary underline underline-offset-2"
            onClick={() => setOn((o) => Object.fromEntries(Object.entries(o).filter(([key]) => !key.startsWith(`${one.id}:`))))}
          >
            clear
          </button>
        )}
      </div>
      <p className="border-b px-3 py-2 text-xs text-muted-foreground">{hint}</p>
      <div className="divide-y">
        {rows.map(({ it, i }) => {
          const max = it.cq ?? it.q;
          const ticked = !!on[k(i)];
          const url = productUrl(one.s, it);
          return (
            <div key={`${it.n}-${i}`} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <Checkbox checked={ticked} onCheckedChange={(v) => setOn((o) => ({ ...o, [k(i)]: !!v }))} aria-label={it.n} />
              <Thumb src={it.img} className="h-12 w-12 sm:h-14 sm:w-14" />
              <span className="min-w-0 flex-1 basis-40">
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-primary underline-offset-2 hover:underline">
                    {it.n}
                  </a>
                ) : (
                  <span className="text-[12.5px]">{it.n}</span>
                )}
                <small className="block text-xs text-muted-foreground">
                  {it.v} · {max}×
                </small>
              </span>
              {ticked && max > 1 && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Quantity
                  <Input
                    type="number"
                    min={1}
                    max={max}
                    value={qtys[k(i)] ?? String(max)}
                    onChange={(e) => setQtys((q) => ({ ...q, [k(i)]: e.target.value }))}
                    className="h-8 w-16 text-xs"
                  />
                  of {max}
                </label>
              )}
              <span className="font-mono text-xs">{money(one.s, it.p * max)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Cancellation: every item starts ticked, which is the whole order. Un-tick
 * an item (or lower its quantity) to cancel only part of the order.
 */
function CancelItemPicker({ one, off, setOff, qtys, setQtys }) {
  const k = (i) => `${one.id}:${i}`;
  const rows = one.o.items.map((it, i) => ({ it, i })).filter(({ it }) => !it.ins);
  const extras = one.o.items.filter((it) => it.ins);
  const onCount = rows.filter(({ i }) => !off[k(i)]).length;
  const allOn = onCount === rows.length;
  return (
    <div className="mb-3 overflow-hidden rounded-lg border">
      <label className="flex cursor-pointer items-center gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium">
        <Checkbox
          checked={allOn}
          onCheckedChange={() =>
            setOff((o) => {
              const rest = Object.fromEntries(Object.entries(o).filter(([key]) => !key.startsWith(`${one.id}:`)));
              return allOn ? { ...rest, ...Object.fromEntries(rows.map(({ i }) => [k(i), true])) } : rest;
            })
          }
          aria-label="Select all items"
        />
        <span className="flex-1">{allOn ? "Whole order" : `${onCount} of ${rows.length} item${rows.length === 1 ? "" : "s"}`}</span>
        <span className="font-normal text-muted-foreground">{allOn ? "everything is cancelled" : "only the ticked items"}</span>
      </label>
      <div className="divide-y">
        {rows.map(({ it, i }) => {
          const max = it.cq ?? it.q;
          const on = !off[k(i)];
          const url = productUrl(one.s, it);
          return (
            <div key={`${it.n}-${i}`} className={cn("flex flex-wrap items-center gap-3 px-3 py-2.5", !on && "opacity-60")}>
              <Checkbox checked={on} onCheckedChange={(v) => setOff((o) => ({ ...o, [k(i)]: !v }))} aria-label={it.n} />
              <Thumb src={it.img} className="h-12 w-12 sm:h-14 sm:w-14" />
              <span className="min-w-0 flex-1 basis-40">
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-primary underline-offset-2 hover:underline">
                    {it.n}
                  </a>
                ) : (
                  <span className="text-[12.5px]">{it.n}</span>
                )}
                <small className="block text-xs text-muted-foreground">
                  {it.v} · {max}×
                </small>
              </span>
              {on && max > 1 && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Cancel
                  <Input
                    type="number"
                    min={1}
                    max={max}
                    value={qtys[k(i)] ?? String(max)}
                    onChange={(e) => setQtys((q) => ({ ...q, [k(i)]: e.target.value }))}
                    className="h-8 w-16 text-xs"
                  />
                  of {max}
                </label>
              )}
              <span className="font-mono text-xs">{money(one.s, it.p * max)}</span>
            </div>
          );
        })}
        {extras.map((it, k) => (
          <div key={`x-${k}`} className="flex flex-wrap items-center gap-3 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <Badge variant={allOn ? "good" : "secondary"}>{allOn ? "goes back too" : "stays on the order"}</Badge>
            <span className="min-w-0 flex-1 basis-40">
              {it.n}
              {it.v ? ` · ${it.v}` : ""}
            </span>
            <span className="font-mono">{money(one.s, it.p * it.q)}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2 text-xs">
        <span className="text-muted-foreground">
          Paid by the customer
          {one.o.refunded > 0 ? ` · ${money(one.s, one.o.refunded)} already refunded` : ""}
        </span>
        <span className="font-mono font-semibold">{money(one.s, one.o.paid)}</span>
      </div>
    </div>
  );
}

/** The items of one order that a cancellation (un-ticked ones stay) or an item case (ticked ones count) is about. */
function itemSelection(f, ticks, qtys, mode) {
  const key = (i) => `${f.id}:${i}`;
  const all = f.o.items.map((it, i) => ({ it, i })).filter(({ it }) => !it.ins && (mode === "cancel" || it.lineItemId));
  const rows = all
    .filter(({ i }) => (mode === "cancel" ? !ticks[key(i)] : ticks[key(i)]))
    .map(({ it, i }) => {
      const max = it.cq ?? it.q;
      const raw = qtys[key(i)];
      return { it, i, max, qty: raw === undefined || raw === "" ? max : Number(raw) };
    });
  const bad = rows.some((r) => !Number.isInteger(r.qty) || r.qty < 1 || r.qty > r.max);
  const none = mode === "cancel" && all.length > 0 && rows.length === 0;
  const whole = mode === "cancel" && all.length > 0 && rows.length === all.length && rows.every((r) => r.qty === r.max);
  const lines = rows.length > 0 && !bad && !whole ? rows.map((r) => ({ lineItemId: r.it.lineItemId, qty: r.qty })) : undefined;
  return { rows, bad, none, lines };
}

/** Which order a picker belongs to, when several are on the form. */
function OrderHeading({ f }) {
  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
      <span className="font-mono font-semibold">#{f.id}</span>
      <Badge variant="secondary">{f.s.name}</Badge>
      <Badge variant="secondary">{f.o.status}</Badge>
    </div>
  );
}

/**
 * The order numbers as cards. Typing (or pasting) an order number and then a
 * space, comma, Enter or a short pause turns it into a card that shows the
 * result of the Shopify check; the X takes that order out again.
 */
function OrderChips({ ids, byId, onAdd, onRemove, placeholder }) {
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef(null);

  const commit = (text) => {
    const list = parseOrders(text);
    if (list.length) onAdd(list);
    setDraft("");
  };

  /* One order typed and left alone: add it without another key press. */
  React.useEffect(() => {
    const list = parseOrders(draft);
    if (!list.length || list.every((x) => x.length < 6)) return undefined;
    const t = setTimeout(() => commit(draft), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex min-h-[2.5rem] cursor-text flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 focus-within:ring-1 focus-within:ring-ring"
    >
      {ids.map((id) => {
        const f = byId[id];
        const state = !f || f.loading ? "loading" : f.unknown ? "bad" : "ok";
        return (
          <span
            key={id}
            className={cn(
              "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
              state === "bad" ? "border-crit/50 bg-crit-soft text-crit" : state === "ok" ? "border-good/40 bg-good-soft" : "bg-muted",
            )}
            title={state === "bad" ? (f.error ? f.error : `No order ${id} found.`) : undefined}
          >
            <span className="font-mono font-semibold">#{id}</span>
            {state === "loading" && <span className="text-muted-foreground">checking…</span>}
            {state === "ok" && (
              <span className="truncate text-muted-foreground">
                {f.s.name} · {f.o.status}
              </span>
            )}
            {state === "bad" && <span>{f.error ? "could not check" : "not found"}</span>}
            <button
              type="button"
              aria-label={`Remove ${id}`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(id);
              }}
              className="shrink-0 rounded-sm opacity-70 hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
      <input
        ref={inputRef}
        value={draft}
        placeholder={ids.length ? "add another…" : placeholder}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => {
          const v = e.target.value;
          if (/[\s,;]/.test(v.trim()) || /[\s,;]$/.test(v)) commit(v);
          else setDraft(v);
        }}
        onPaste={(e) => {
          e.preventDefault();
          commit(e.clipboardData.getData("text"));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && !draft && ids.length) onRemove(ids[ids.length - 1]);
        }}
        onBlur={() => commit(draft)}
        className="min-w-[10rem] flex-1 bg-transparent py-1 font-mono text-xs outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

function Suggest({ label, sub, control, amount }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-accent/40 px-4 py-3">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        {sub && <div className="text-sm">{sub}</div>}
        {control}
      </div>
      <div className="font-display text-xl font-bold">{amount}</div>
    </div>
  );
}

/**
 * Order modification: tick the items to change. Each ticked item shows one
 * dropdown per product option, under Shopify's own option names (any
 * language). "Change size" / "Change color" lock the other options when
 * the option is recognised; otherwise the agent changes one option of
 * their choice. "Change item or quantity" leaves every option open and
 * adds the quantity.
 */
function ItemChangePicker({ one, reason, picked, setPicked, sel, setSel, qtys, setQtys, withQty, variants, repl, setRepl, orderId, store }) {
  return (
    <div className="divide-y rounded-lg border">
      {one.o.items.map((it, i) => {
        if (it.ins) return null;
        const url = productUrl(one.s, it);
        const list = (variants && it.productId && variants[it.productId]) || [];
        const current = list.find((v) => v.id === it.variantId);
        const named = current ? optionForReason(reason, current.options) : undefined;
        const canChange = !!it.lineItemId && !!it.variantId;
        const chosen = sel[i] || {};
        const valueOf = (name) => chosen[name] ?? current?.options.find((o) => o.name === name)?.value ?? "";
        const valuesFor = (name) => [...new Set(list.map((v) => v.options.find((o) => o.name === name)?.value).filter(Boolean))];
        return (
          <div key={`${it.n}-${i}`} className="px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <Checkbox
                checked={!!picked[i]}
                disabled={!canChange}
                onCheckedChange={(v) => setPicked((p) => ({ ...p, [i]: !!v }))}
                aria-label={it.n}
              />
              <Thumb src={it.img} className="h-12 w-12 sm:h-14 sm:w-14" />
              <span className="min-w-0 flex-1 basis-40">
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12.5px] text-primary underline-offset-2 hover:underline"
                  >
                    {it.n}
                  </a>
                ) : (
                  <span className="text-[12.5px]">{it.n}</span>
                )}
                <small className="block text-xs text-muted-foreground">
                  {it.v} · {it.cq ?? it.q}×{!canChange ? " · can't be changed here: this line has no variant in Shopify any more (the product was changed after the order)" : ""}
                </small>
              </span>
              <span className="font-mono text-xs">{money(one.s, it.p * it.q)}</span>
            </div>
            {picked[i] && (
              <div className="mt-2 flex flex-wrap items-center gap-3 pl-7">
                {withQty && repl[i] ? (
                  <span className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="brand">replaced by</Badge>
                    <span>{repl[i].label}</span>
                    <span className="font-mono text-muted-foreground">{money(store, repl[i].price)}</span>
                    <button
                      type="button"
                      className="text-primary underline underline-offset-2"
                      onClick={() => setRepl((r) => ({ ...r, [i]: undefined }))}
                    >
                      undo
                    </button>
                  </span>
                ) : variants === null ? (
                  <span className="text-xs text-muted-foreground">Loading variants…</span>
                ) : !current ? (
                  <span className="text-xs text-crit">This item's variants could not be read from Shopify.</span>
                ) : (
                  current.options.map((o) => {
                    const locked = !withQty && !!named && o.name !== named;
                    return (
                      <label key={o.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {o.name}
                        <Select
                          value={valueOf(o.name)}
                          disabled={locked}
                          onValueChange={(v) => setSel((s) => ({ ...s, [i]: { ...(s[i] || {}), [o.name]: v } }))}
                        >
                          <SelectTrigger className="h-8 w-36 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {valuesFor(o.name).map((val) => (
                              <SelectItem key={val} value={val}>
                                {val}
                                {val === o.value ? " · now" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>
                    );
                  })
                )}
                {withQty && (
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    Quantity
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={qtys[i] ?? String(it.cq ?? it.q)}
                      onChange={(e) => setQtys((q) => ({ ...q, [i]: e.target.value }))}
                      className="h-8 w-16 text-xs"
                    />
                  </label>
                )}
                {withQty && !repl[i] && (
                  <ReplaceSearch
                    orderId={orderId}
                    store={store}
                    onPick={(v) => setRepl((r) => ({ ...r, [i]: v }))}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The cheapest and dearest price among a product's variants, as one label. */
function priceLabel(store, variants) {
  const prices = variants.map((v) => v.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  return lo === hi ? money(store, lo) : `from ${money(store, lo)}`;
}

/**
 * Replace an item with another product of the store: search by name, pick
 * the product from a short list, then choose its options (colour, size …)
 * from dropdowns — the same way the change-size picker works.
 */
function ReplaceSearch({ orderId, store, onPick }) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [found, setFound] = React.useState(null);
  const [searching, setSearching] = React.useState(false);
  const [product, setProduct] = React.useState(null);
  const [choice, setChoice] = React.useState({});

  React.useEffect(() => {
    const q = text.trim();
    if (!open || q.length < 2) {
      setFound(null);
      setSearching(false);
      return undefined;
    }
    let alive = true;
    setSearching(true);
    const t = setTimeout(() => {
      ordersApi
        .searchProducts(orderId, q)
        .then((res) => alive && setFound(res.products))
        .catch((err) => {
          if (!alive) return;
          setFound([]);
          toast.error(err instanceof HttpError ? err.detail || err.code : "Could not search the products.");
        })
        .finally(() => alive && setSearching(false));
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [text, open, orderId]);

  const close = () => {
    setOpen(false);
    setText("");
    setFound(null);
    setProduct(null);
    setChoice({});
  };

  const choose = (p) => {
    const start = p.variants.find((v) => v.available) || p.variants[0];
    setChoice(Object.fromEntries((start?.options || []).map((o) => [o.name, o.value])));
    setProduct(p);
  };

  if (!open)
    return (
      <Button type="button" variant="outline" size="xs" onClick={() => setOpen(true)}>
        Replace with another product
      </Button>
    );

  const optionNames = product ? (product.variants[0]?.options || []).map((o) => o.name) : [];
  const valuesFor = (name) => [...new Set(product.variants.map((v) => v.options.find((o) => o.name === name)?.value).filter(Boolean))];
  const chosen = product ? variantFor(product.variants, choice) : null;
  const single = product && product.variants.length === 1;
  const picked = single ? product.variants[0] : chosen;

  return (
    <div className="w-full rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{product ? "Choose the options" : "Replace with another product"}</span>
        <Button type="button" variant="ghost" size="xs" onClick={close}>
          Cancel
        </Button>
      </div>

      {!product ? (
        <>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type the product name…"
            className="mt-2 h-9 text-sm"
            autoFocus
          />
          {text.trim().length < 2 && <p className="mt-2 text-xs text-muted-foreground">Type at least 2 letters of the product name.</p>}
          {searching && <p className="mt-2 text-xs text-muted-foreground">Searching…</p>}
          {found && !searching && found.length === 0 && <p className="mt-2 text-xs text-muted-foreground">No product found. Try another word.</p>}
          {found && found.length > 0 && (
            <div className="mt-2 max-h-72 divide-y overflow-y-auto rounded-md border bg-card">
              {found.map((p) => {
                const left = p.variants.filter((v) => v.available).length;
                return (
                  <button
                    key={p.productId}
                    type="button"
                    disabled={left === 0}
                    onClick={() => choose(p)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Thumb src={p.image} className="h-11 w-11" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{p.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {p.variants.length === 1 ? "1 option" : `${p.variants.length} options`}
                        {left === 0 ? " · sold out" : left < p.variants.length ? ` · ${left} in stock` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs">{priceLabel(store, p.variants)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="mt-2 space-y-3">
          <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
            <Thumb src={product.image} className="h-12 w-12" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{product.title}</span>
            <button
              type="button"
              className="shrink-0 text-xs text-primary underline underline-offset-2"
              onClick={() => {
                setProduct(null);
                setChoice({});
              }}
            >
              other product
            </button>
          </div>

          {!single && (
            <div className="flex flex-wrap gap-3">
              {optionNames.map((name) => (
                <label key={name} className="grid gap-1 text-xs text-muted-foreground">
                  {name}
                  <Select value={choice[name] ?? ""} onValueChange={(v) => setChoice((c) => ({ ...c, [name]: v }))}>
                    <SelectTrigger className="h-9 w-40 text-xs">
                      <SelectValue placeholder={`Pick ${name.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {valuesFor(name).map((val) => {
                        const inStock = product.variants.some((v) => v.available && v.options.some((o) => o.name === name && o.value === val));
                        return (
                          <SelectItem key={val} value={val}>
                            {val}
                            {inStock ? "" : " · sold out"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </label>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-3 py-2">
            <span className="text-xs">
              {picked ? (
                <>
                  <span className="font-medium">{single ? product.title : picked.title}</span>
                  {!picked.available && <Badge variant="crit" className="ml-2">sold out</Badge>}
                </>
              ) : (
                <span className="text-crit">That combination does not exist — pick another.</span>
              )}
            </span>
            <span className="flex items-center gap-3">
              {picked && <span className="font-mono text-sm font-semibold">{money(store, picked.price)}</span>}
              <Button
                type="button"
                size="sm"
                disabled={!picked || !picked.available}
                onClick={() => {
                  onPick({
                    id: picked.id,
                    label: single || picked.title === "Default Title" ? product.title : `${product.title} — ${picked.title}`,
                    price: picked.price,
                    available: picked.available,
                  });
                  close();
                }}
              >
                Use this
              </Button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** The shipping address as it should become. Name and phone live on the address in Shopify. */
function AddressFields({ addr, setAddr, nameOnly }) {
  const field = (k, label, className = "") => (
    <label className={cn("grid gap-1 text-xs", className)}>
      <span className="text-muted-foreground">{label}</span>
      <Input value={addr[k]} onChange={(e) => setAddr((a) => ({ ...a, [k]: e.target.value }))} className="h-8 text-xs" />
    </label>
  );
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {field("firstName", "First name")}
      {field("lastName", "Last name")}
      {field("phone", "Phone", "sm:col-span-2")}
      {!nameOnly && (
        <>
          {field("company", "Company", "sm:col-span-2")}
          {field("address1", "Street and number", "sm:col-span-2")}
          {field("address2", "Apartment, suite (optional)", "sm:col-span-2")}
          {field("zip", "Postcode")}
          {field("city", "City")}
          {field("provinceCode", "State / province code")}
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">Country</span>
            <Input value={addr.countryCode} disabled className="h-8 text-xs" />
          </label>
        </>
      )}
      <p className="text-xs text-muted-foreground sm:col-span-2">
        {nameOnly
          ? "Only the name and phone change; the rest of the address stays as it is."
          : "The country stays the same — moving an order to another country changes shipping and tax."}
      </p>
    </div>
  );
}

/**
 * The items on the order. Anything already fully refunded or replaced is
 * locked; a partial refund only gets a warning, because the amount check
 * is what guards the total.
 */
function ItemPicker({ one, picked, setPicked, cases }) {
  const already = refundedItems(cases, one.id);
  const partly = partlyRefunded(cases, one.id);
  return (
    <div className="divide-y rounded-lg border">
      {one.o.items.map((it, i) => {
        const blockedItem = !!already[it.n];
        const part = partly[it.n];
        const url = productUrl(one.s, it);
        return (
          <div
            key={`${it.n}-${i}`}
            className={cn(
              "flex flex-wrap items-center gap-3 px-3 py-2.5",
              (it.ins || blockedItem) && "opacity-60",
            )}
          >
            {it.ins ? (
              <Badge variant="warn">never</Badge>
            ) : blockedItem ? (
              <Badge variant="crit">already done</Badge>
            ) : (
              <Checkbox
                checked={!!picked[i]}
                onCheckedChange={(v) => setPicked((p) => ({ ...p, [i]: !!v }))}
                aria-label={it.n}
              />
            )}
            {!it.ins && <Thumb src={it.img} className="h-12 w-12 sm:h-14 sm:w-14" />}
            <span className="min-w-0 flex-1 basis-40">
              {url && !it.ins ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[12.5px] text-primary underline-offset-2 hover:underline"
                >
                  {it.n}
                </a>
              ) : (
                <span className="text-[12.5px]">{it.n}</span>
              )}
              <small className="block text-xs text-muted-foreground">
                {it.v} · {it.q}×
              </small>
            </span>
            {!it.ins && !blockedItem && part ? (
              <Badge variant="warn">{part}% already refunded</Badge>
            ) : null}
            <span className="font-mono text-xs">{money(one.s, it.p * it.q)}</span>
          </div>
        );
      })}
    </div>
  );
}
