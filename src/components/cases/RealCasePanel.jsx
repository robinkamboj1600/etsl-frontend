import * as React from "react";
import { toast } from "sonner";

import { useApp } from "@/store/app";
import { casesApi, toCaseView } from "@/api/cases";
import { currencyStyle, ordersApi, toOrderView } from "@/api/orders";
import { money } from "@/lib/rules/format";
import { OrderContents } from "@/components/cases/OrderContents";
import { countryName } from "@/data/geo";
import { toStoreView } from "@/api/stores";
import { confirmText } from "@/lib/rules/confirmations";
import { personName } from "@/lib/rules/session";
import { HttpError } from "@/api/http";
import { canProcess, canRetract, canSee, canTransfer, dept, lockReason, refundToast, refundVia } from "@/lib/rules/permissions";
import { isRefundQueue } from "@/lib/rules/routing";
import { DEPTS } from "@/data/departments";
import { TASK_QUEUES } from "@/api/tasks";

import { ShopifyOrderLink } from "@/components/common/ShopifyOrderLink";
import { Badge } from "@/components/ui/badge";
import { StableLabel } from "@/components/ui/stable-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Section({ title, children }) {
  return (
    <div className="border-b px-5 py-4 last:border-b-0">
      <h4 className="mb-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

function KV({ k, children }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dashed py-1.5 last:border-b-0">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className="text-right text-[13px]">{children}</span>
    </div>
  );
}

export function RealCasePanel() {
  const { openId, openReal, setOpenId, session } = useApp();
  const [c, setC] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [adjusting, setAdjusting] = React.useState(false);
  const [moving, setMoving] = React.useState(false);
  const [pending, setPending] = React.useState(null);

  /* After an action the case is re-read quietly, so the panel does not blank out. */
  const load = React.useCallback((quiet = false) => {
    if (!openReal || !openId) return;
    if (!quiet) setLoading(true);
    casesApi
      .get(openId)
      .then((res) => setC(toCaseView(res)))
      .catch((err) => {
        toast.error(err instanceof HttpError ? err.detail || err.code : "Could not open this case.");
        setOpenId(null);
      })
      .finally(() => setLoading(false));
  }, [openReal, openId, setOpenId]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (!openReal) return null;

  const visible = openId != null && canSee(c?.dept, session);
  const act = async (fn, msg, key = "action") => {
    setPending(key);
    try {
      await fn();
      if (msg) toast(msg);
      setAdjusting(false);
      setMoving(false);
      load(true);
    } catch (err) {
      toast.error(err instanceof HttpError ? err.detail || err.code : "That didn't work.");
    } finally {
      setPending(null);
    }
  };

  return (
    <Sheet open={visible} onOpenChange={(o) => !o && setOpenId(null)}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        {loading || !c ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <CaseBody c={c} session={session} act={act} pending={pending} note={note} setNote={setNote} adjusting={adjusting} setAdjusting={setAdjusting} moving={moving} setMoving={setMoving} />
        )}
      </SheetContent>
    </Sheet>
  );
}

const CANCEL_ROUTE_LABEL = { paypal: "PayPal", whop: "Whop", ocean: "Ocean", shopify: "Shopify" };
const TO_CUSTOMER = new Set(["cancel", "modify", "repl", "voucher", "rf_paypal", "rf_whop", "rf_cj"]);

const fmtTime = (t) => (t ? new Date(t).toLocaleString("en-GB") : "—");

/** The message that goes to the customer once the case is solved: right language, amount and signature. */
function Confirmation({ c }) {
  const [text, setText] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    ordersApi
      .get(c.order)
      .then((o) => {
        if (live)
          setText(
            confirmText(c, { ...toStoreView(o.store), ...currencyStyle(o.currency) }, { cust: o.customer.name, cc: o.country }),
          );
      })
      .catch(() => live && setText(""));
    return () => {
      live = false;
    };
  }, [c.id]);

  if (!text) return <p className="text-xs text-muted-foreground">Preparing the message…</p>;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="space-y-2">
      <Textarea value={text} readOnly rows={9} className="text-xs" />
      <Button size="sm" variant="outline" onClick={copy}>
        <StableLabel value={copied ? "Copied" : "Copy message"} options={["Copy message", "Copied"]} />
      </Button>
    </div>
  );
}

/** The live order behind the case: who bought, from where, how it was paid, and what is on it. */
function OrderDetails({ c }) {
  const [f, setF] = React.useState(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    setF(null);
    setFailed(false);
    ordersApi
      .get(c.order)
      .then((o) => live && setF(toOrderView(o)))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [c.id]);

  if (failed) return <p className="text-xs text-muted-foreground">The order could not be loaded from Shopify right now.</p>;
  if (!f) return <p className="text-xs text-muted-foreground">Loading the order…</p>;
  return (
    <div>
      <KV k="Customer">{f.o.cust || "—"}</KV>
      <KV k="Sold to">{f.o.cc ? countryName(f.o.cc) : "—"}</KV>
      <KV k="Paid with">{f.o.pay}</KV>
      <KV k="Order status">
        {f.o.cancelled ? "Cancelled" : f.o.status}
        {f.o.days != null ? ` · ${f.o.days} day${f.o.days === 1 ? "" : "s"}` : ""}
      </KV>
      <div className="mt-3">
        <OrderContents orders={[f]} />
      </div>
    </div>
  );
}

function CaseBody({ c, session, act, pending, note, setNote, adjusting, setAdjusting, moving, setMoving }) {
  const role = session.role;
  const locked = !canProcess(c, session);
  const d = dept(c.dept);
  const store = c.store;
  const [retracting, setRetracting] = React.useState(false);

  /* A refund that goes out for real (Shopify, PayPal or Whop): ask once before money moves. */
  const via = refundVia(c);
  const shopifyRefund = via !== null;
  const processNow = () => {
    if (
      via &&
      !c.refundSent &&
      !window.confirm(
        `Send ${c.currency ? money(currencyStyle(c.currency), c.amount) : c.amount.toFixed(2)} back to the customer through ${via} now?\n\nThis moves real money and cannot be undone. The exact amount is worked out from the customer's real payment, in the currency they paid in.`,
      )
    )
      return;
    act(
      () =>
        casesApi.process(c.id).then((res) => {
          if (c.dept === "cancel" && !via && res.stage !== "resolved")
            toast(c.moneyRoute === "shopify" ? "Cancelled in Shopify — waiting for Shopify to confirm the refund." : "Cancelled in Shopify — the refund is the next step.");
          if (via) toast(refundToast(via, res.stage));
        }),
      c.dept === "cancel" || shopifyRefund ? undefined : c.dept === "modify" && c.shopifyEdit ? "Order edited in Shopify." : "Processed.",
      "process",
    );
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          {c.ref} <span className="ml-2 font-normal text-muted-foreground">#{c.order}</span>
          <ShopifyOrderLink order={c.order} iconOnly className="ml-2 align-middle" />
        </SheetTitle>
      </SheetHeader>

      <div className="flex flex-wrap gap-1.5 border-b px-5 py-3">
        <Badge variant="brand">{d ? d.t : c.dept}</Badge>
        {store?.name && <Badge variant="secondary">{store.name}</Badge>}
        {store?.supplier && <Badge variant="secondary">{store.supplier}</Badge>}
        {c.retracted ? <Badge variant="secondary">retracted</Badge> : c.done && <Badge variant="good">done</Badge>}
      </div>

      <Section title="Case">
        <KV k="Reason">{c.reason}</KV>
        {c.picked && c.picked.length > 0 ? (
          <KV k="About these items">
            <span className="block whitespace-pre-line">
              {c.picked
                .map((p) => `${p.title || p.name}${p.variant ? ` (${p.variant})` : ""}${p.qty > 1 || p.orderedQty > 1 ? ` × ${p.qty}` : ""}`)
                .join("\n")}
            </span>
          </KV>
        ) : (
          c.items && <KV k="Items">{c.items}</KV>
        )}
        {(isRefundQueue(c.dept) || c.dept === "voucher" || c.dept === "repl" || (c.dept === "cancel" && c.change)) && (
          <>
            <KV k="Percentage">{c.pct ? `${c.pct}%` : "—"}</KV>
            <KV k="Amount">{c.currency ? money(currencyStyle(c.currency), c.amount) : c.amount.toFixed(2)}</KV>
          </>
        )}
        {c.dept === "cog" && <KV k="COG amount">{c.cog != null ? (c.currency ? money(currencyStyle(c.currency), c.cog) : c.cog.toFixed(2)) : "not set"}</KV>}
        {c.change && (
          <KV k={c.dept === "cancel" ? "Cancels only" : "Change to"}>
            <span className="whitespace-pre-line">{c.change}</span>
          </KV>
        )}
        {c.editedAt && <KV k="Edited in Shopify">{fmtTime(c.editedAt)}</KV>}
        {c.rtn && <KV k="Return tracking">{c.rtn}</KV>}
        <KV k="Waiting on">{c.turn}</KV>
        {c.payout && c.payout.status !== "failed" && (
          <KV k={`Refund through ${c.payout.provider === "whop" ? "Whop" : "PayPal"}`}>
            {Number(c.payout.amount).toFixed(2)} {c.payout.currency}
            {c.payout.full ? " (the whole payment)" : ""} · {c.payout.status === "completed" ? "confirmed" : "waiting for the provider"}
          </KV>
        )}
        {c.turl && (
          <KV k="Ticket">
            <a href={c.turl} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
              open ticket
            </a>
          </KV>
        )}
        {c.dept === "cancel" && c.moneyRoute && <KV k="Refund goes via">{CANCEL_ROUTE_LABEL[c.moneyRoute]}</KV>}
        {c.dept === "cancel" && c.cancelledAt && (
          <KV k="Cancelled in Shopify">
            {personName(c.cancelledBy) || "—"} · {fmtTime(c.cancelledAt)}
          </KV>
        )}
        {c.retracted && <KV k="Retracted by">{personName(c.retractedBy) || "—"} · {fmtTime(c.retractedAt)}</KV>}
        {c.retracted && c.retractNote && <KV k="Why">{c.retractNote}</KV>}
        {c.done && !c.retracted && <KV k={c.dept === "cancel" ? "Refund processed by" : "Processed by"}>{personName(c.doneBy) || "—"}</KV>}
        {c.done && !c.retracted && <KV k="Processed at">{fmtTime(c.doneAt)}</KV>}
      </Section>

      {c.order && ["lead", "agent", "checker", "cj", "dayone"].includes(role) && (
        <Section title="Order">
          <OrderDetails c={c} />
        </Section>
      )}

      {c.done && !c.retracted && TO_CUSTOMER.has(c.dept) && ["lead", "agent", "checker"].includes(role) && (
        <Section title="Message to the customer">
          <Confirmation c={c} />
        </Section>
      )}

      {!c.done && (
        <Section title="Actions">
          {adjusting ? (
            <AdjustForm c={c} act={act} pending={pending} onCancel={() => setAdjusting(false)} />
          ) : moving ? (
            <MoveForm c={c} session={session} act={act} pending={pending} onCancel={() => setMoving(false)} />
          ) : retracting ? (
            <RetractForm c={c} act={act} pending={pending} onCancel={() => setRetracting(false)} />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" disabled={locked} loading={pending === "process"} title={locked ? lockReason(c) : undefined} onClick={processNow}>
                {via ? (c.refundSent ? "Check refund" : `Refund via ${via}`) : c.dept === "cancel" && c.cancelledAt ? (c.moneyRoute === "shopify" ? "Check refund" : "Refund") : c.dept === "modify" && c.shopifyEdit ? "Edit in Shopify" : d ? d.act : "Process"}
              </Button>
              {isRefundQueue(c.dept) && !locked && (
                <Button size="sm" variant="outline" onClick={() => setAdjusting(true)}>
                  Adjust
                </Button>
              )}
              {canTransfer(c, session) && (
                <Button size="sm" variant="outline" onClick={() => setMoving(true)}>
                  Transfer
                </Button>
              )}
              {canRetract(c, session) && (
                <Button size="sm" variant="outline" title="Opened by mistake? Take it back, with a note saying why" onClick={() => setRetracting(true)}>
                  Retract
                </Button>
              )}
              {c.dept === "supplier" && (role === "cj" || role === "dayone") && !c.claim && (
                <Button size="sm" variant="outline" loading={pending === "claim"} onClick={() => act(() => casesApi.claim(c.id), "Claimed.", "claim")}>
                  I will take it
                </Button>
              )}
              {isRefundQueue(c.dept) && !locked && (
                <Button size="sm" variant="outline" loading={pending === "nofunds"} onClick={() => act(() => casesApi.toggleNoFunds(c.id), undefined, "nofunds")}>
                  {c.nofunds ? "Funds are back" : "No funds"}
                </Button>
              )}
              {c.dept === "returns" && !locked && (
                <InlineTracking c={c} act={act} pending={pending} />
              )}
              {(c.dept === "voucher" || c.dept === "repl") && !locked && (
                <InlineVoucherCode c={c} act={act} pending={pending} />
              )}
              {c.dept === "cog" && role === "lead" && (
                <InlineCog c={c} act={act} pending={pending} />
              )}
            </div>
          )}
        </Section>
      )}

      <Section title="Notes">
        <div className="space-y-2">
          {(c.notes || []).length === 0 && <p className="text-xs text-muted-foreground">No notes yet.</p>}
          {(c.notes || []).map((n, i) => (
            <div key={i} className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
              {n.t}
            </div>
          ))}
        </div>
        {role !== "checker" && (
        <div className="mt-2 flex gap-2">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="text-xs" />
          <Button
            size="sm"
            loading={pending === "note"}
            onClick={async () => {
              if (!note.trim()) return;
              await act(() => casesApi.addNote(c.id, note), "Note added.", "note");
              setNote("");
            }}
          >
            Add
          </Button>
        </div>
        )}
      </Section>

      <Section title="Timeline">
        <div className="space-y-1.5">
          {(c.log || []).map((l, i) => (
            <div key={i} className="text-xs text-muted-foreground">
              {l.t}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function AdjustForm({ c, act, pending, onCancel }) {
  const [pct, setPct] = React.useState(String(c.pct || 0));
  const [reason, setReason] = React.useState("Other");
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Input value={pct} onChange={(e) => setPct(e.target.value)} className="h-8 w-20 text-xs" placeholder="%" />
      <Input value={reason} onChange={(e) => setReason(e.target.value)} className="h-8 w-40 text-xs" placeholder="Reason" />
      <Button size="xs" loading={pending === "adjust"} onClick={() => act(() => casesApi.adjust(c.id, Number(pct), reason), "Adjusted.", "adjust")}>
        Save
      </Button>
      <Button size="xs" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

/** Taking a case back: the reason is required, and the case is kept (as retracted), not deleted. */
function RetractForm({ c, act, pending, onCancel }) {
  const [note, setNote] = React.useState("");
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Use this when the case should never have been opened. It leaves the open list and is kept under "Retracted" with your note.
      </p>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Why is it being retracted? (required)" className="text-xs" autoFocus />
      <div className="flex items-center gap-1.5">
        <Button
          size="xs"
          variant="destructive"
          disabled={note.trim().length < 3}
          loading={pending === "retract"}
          onClick={() => act(() => casesApi.retract(c.id, note.trim()), `${c.ref} retracted.`, "retract")}
        >
          Retract {c.ref}
        </Button>
        <Button size="xs" variant="ghost" onClick={onCancel} disabled={pending === "retract"}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function MoveForm({ c, session, act, pending, onCancel }) {
  const options = DEPTS.filter((x) => {
    if (x.id === c.dept || x.admin || x.adminOnly || x.intakeOnly || x.id === "cog" || TASK_QUEUES.has(x.id)) return false;
    if (!canSee(x.id, session)) return false;
    if (x.id === "rf_paypal" && session.role !== "paypal") return false;
    if (isRefundQueue(x.id) && !(session.role === "lead" || session.role === "paypal" || session.isAdmin)) return false;
    return true;
  });
  const [to, setTo] = React.useState(options[0]?.id || "");
  if (!options.length) return <span className="text-xs text-muted-foreground">Nowhere to move this one.</span>;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Select value={to} onValueChange={setTo}>
        <SelectTrigger className="h-8 w-48 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((x) => (
            <SelectItem key={x.id} value={x.id}>
              {x.t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="xs" loading={pending === "move"} onClick={() => act(() => casesApi.move(c.id, to), "Transferred.", "move")}>
        Transfer
      </Button>
      <Button size="xs" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

function InlineTracking({ c, act, pending }) {
  const [v, setV] = React.useState(c.rtn || "");
  return (
    <div className="flex items-center gap-1.5">
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="tracking number" className="h-8 w-40 text-xs" />
      <Button size="xs" loading={pending === "tracking"} onClick={() => act(() => casesApi.setTracking(c.id, v), "Saved.", "tracking")}>
        Save
      </Button>
    </div>
  );
}

function InlineVoucherCode({ c, act, pending }) {
  const [v, setV] = React.useState(c.code2 || "");
  return (
    <div className="flex items-center gap-1.5">
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="code" className="h-8 w-32 text-xs" />
      <Button size="xs" loading={pending === "code"} onClick={() => act(() => casesApi.setVoucherCode(c.id, v), "Saved.", "code")}>
        Save
      </Button>
    </div>
  );
}

function InlineCog({ c, act, pending }) {
  const [v, setV] = React.useState(c.cog != null ? String(c.cog) : "");
  return (
    <div className="flex items-center gap-1.5">
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="0.00" className="h-8 w-24 text-xs" />
      <Button size="xs" loading={pending === "cog"} onClick={() => act(() => casesApi.setCogAmount(c.id, Number(v) || 0), "Saved.", "cog")}>
        Save
      </Button>
    </div>
  );
}
