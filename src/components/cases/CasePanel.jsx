import * as React from "react";
import { Copy, Download, ExternalLink } from "lucide-react";

import { USERS } from "@/data/people";
import { TEMPLATES } from "@/data/templates";
import { RETURN_FORMS, RETURN_WAREHOUSE, WAREHOUSE } from "@/data/returnForms";
import { COUNTRY, countryName, flag } from "@/data/geo";

import { useApp } from "@/store/app";
import api from "@/mock/api";
import { resolve, goods, isRefundQueue } from "@/lib/rules/routing";
import { canProcess, dept, lockReason, mayOpen } from "@/lib/rules/permissions";
import { isTicketOnly } from "@/data/departments";
import { money } from "@/lib/rules/format";
import {
  payTarget,
  productUrl,
  ticketUrl,
  returnFormUrl,
} from "@/lib/rules/links";
import { risks, timeline, disputeTips } from "@/lib/rules/signals";
import { finishProcess } from "@/lib/processMessage";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar } from "@/components/common/Who";

/* ------------------------------------------------------------------ */

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

function CopyButton({ text, label = "Copy", className }) {
  const [done, setDone] = React.useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      className={className}
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          setDone(false);
        }
      }}
    >
      <Copy className="mr-1 h-3 w-3" />
      {done ? "Copied" : label}
    </Button>
  );
}

function Timeline({ events }) {
  return (
    <ul className="m-0 list-none space-y-2.5 border-l border-dashed pl-4">
      {events.map((e, i) => (
        <li key={`${e.t}-${i}`} className="relative">
          <span
            className={cn(
              "absolute -left-[21px] top-1.5 h-2 w-2 rounded-full",
              i === events.length - 1 ? "bg-primary" : "bg-border",
            )}
          />
          <b className="block text-[13px] font-medium">{e.t}</b>
          {e.u ? (
            <a
              href={e.u}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              {e.w}
            </a>
          ) : (
            <small className="text-xs text-muted-foreground">{e.w}</small>
          )}
        </li>
      ))}
    </ul>
  );
}

function Notes({ c, session, onAdd }) {
  const [v, setV] = React.useState("");
  return (
    <>
      <div className="space-y-2">
        {(c.notes || []).length === 0 && (
          <p className="text-xs text-muted-foreground">
            No notes yet. Use @name to pull someone in.
          </p>
        )}
        {(c.notes || []).map((n, i) => (
          <div key={i} className="rounded-lg border bg-muted/50 px-3 py-2">
            <p className="text-[13px]">
              {n.t.split(/(@[A-Za-z]+)/g).map((part, j) =>
                part.startsWith("@") ? (
                  <span key={j} className="font-medium text-primary">
                    {part}
                  </span>
                ) : (
                  <React.Fragment key={j}>{part}</React.Fragment>
                ),
              )}
            </p>
            <small className="text-xs text-muted-foreground">
              {(USERS[n.by || "jonathan"] || { n: "Someone" }).n} · {n.w}
            </small>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (v.trim()) {
                onAdd(v);
                setV("");
              }
            }
          }}
          placeholder="@Jessa can you take a look?"
        />
        <Button
          size="sm"
          onClick={() => {
            if (!v.trim()) return;
            onAdd(v);
            setV("");
          }}
        >
          Post
        </Button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

export function CasePanel() {
  const { cases, openId, openReal, setOpenId, session, run } = useApp();
  const c = openReal ? null : cases.find((x) => x.id === openId) || null;
  const visible = !!c && mayOpen(c, session);

  React.useEffect(() => {
    if (c && !mayOpen(c, session)) setOpenId(null);
  }, [c, session, setOpenId]);

  if (!visible) return null;

  const f = resolve(c.order);
  const ticketOnly = isTicketOnly(c.dept) || !f || f.unknown || !f.s;

  return (
    <Sheet open onOpenChange={(o) => !o && setOpenId(null)}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl">
        {ticketOnly ? (
          <TicketPanel
            c={c}
            session={session}
            run={run}
            close={() => setOpenId(null)}
          />
        ) : (
          <FullPanel
            c={c}
            f={f}
            session={session}
            run={run}
            cases={cases}
            setOpenId={setOpenId}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ---- the short panel: a ticket, no order, no money ---------------- */

function TicketPanel({ c, session, run }) {
  const d0 = dept(c.dept) || { t: "Case", act: "Done" };
  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-mono">{c.ref}</SheetTitle>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            {d0.t} · {c.reason}
          </span>
          <CopyButton text={c.ref} label="Copy case number" />
        </div>
      </SheetHeader>

      <div className="flex flex-wrap gap-2 px-5 py-3">
        {ticketUrl(c) && (
          <Button asChild variant="outline" size="xs">
            <a href={ticketUrl(c)} target="_blank" rel="noopener noreferrer">
              Open ticket <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        )}
        <Badge variant="secondary">
          {c.age === 0 ? "just in" : `${c.age}h open`}
        </Badge>
        {c.done && <Badge variant="good">done</Badge>}
      </div>

      {c.note && (
        <Section title="What it says">
          <div className="whitespace-pre-wrap rounded-lg border bg-muted/50 px-3 py-2 text-[13px]">
            {c.note}
          </div>
        </Section>
      )}

      <Section title="Actions">
        <div className="flex flex-wrap gap-2">
          {!c.done && canProcess(c, session) ? (
            <>
              <Button
                size="sm"
                onClick={() => run(() => api.processCase(c.id, session))}
              >
                {d0.act || "Done"}
              </Button>
              {c.dept === "spam" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => run(() => api.notSpam(c.id, session))}
                >
                  Not spam
                </Button>
              )}
            </>
          ) : c.done ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => run(() => api.undoCase(c.id, session))}
            >
              Reopen
            </Button>
          ) : (
            <Badge variant="secondary">review only</Badge>
          )}
        </div>
      </Section>

      <Section title="Timeline">
        <Timeline events={(c.log || []).map((l) => ({ t: l.t, w: l.w }))} />
      </Section>

      <Section title="Internal notes">
        <Notes
          c={c}
          session={session}
          onAdd={(v) => run(() => api.addNote(c.id, v, session))}
        />
      </Section>
    </>
  );
}

/* ---- the full case ------------------------------------------------ */

function FullPanel({ c, f, session, run, cases, setOpenId }) {
  const s = f.s;
  const o = f.o;
  const d0 = dept(c.dept);
  const locked = !canProcess(c, session);
  const pt = payTarget(s, o, c.dept, c.order);
  const mayRecord = !session.org && session.role !== "checker";
  const related = cases.filter(
    (x) => x.order === c.order && x.id !== c.id && mayOpen(x, session),
  );
  const supplierTemplate = TEMPLATES[c.reason]
    ? TEMPLATES[c.reason](c, f)
    : null;

  const processIt = () =>
    run(async () => finishProcess(await api.processCase(c.id, session)));

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-mono">{c.ref}</SheetTitle>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            #{c.order} · {s.name} · {o.cust}
          </span>
          <CopyButton text={c.ref} label="Copy case number" />
        </div>
      </SheetHeader>

      <div className="flex flex-wrap gap-2 border-b px-5 py-3">
        {(isRefundQueue(c.dept) ||
          ["voucher", "repl", "modify"].indexOf(c.dept) > -1) && (
          <Button asChild variant="outline" size="xs">
            <a href={pt.url} target="_blank" rel="noopener noreferrer">
              {pt.label} <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        )}
        {ticketUrl(c) && (
          <Button asChild variant="outline" size="xs">
            <a href={ticketUrl(c)} target="_blank" rel="noopener noreferrer">
              Open ticket <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        )}
        <Badge variant="brand">{d0.t}</Badge>
        <Badge variant="secondary">{c.reason}</Badge>
        <Badge
          variant={
            c.turn === "wij"
              ? "brand"
              : c.turn === "supplier"
                ? "warn"
                : "secondary"
          }
        >
          {c.turn === "wij"
            ? "our turn"
            : c.turn === "supplier"
              ? `waiting on ${s.supplier}`
              : "waiting on customer"}
        </Badge>
        <Badge
          variant={c.age >= 48 ? "crit" : c.age >= 24 ? "warn" : "secondary"}
        >
          {c.age === 0 ? "just in" : `${c.age}h open`}
        </Badge>
        {c.done && <Badge variant="good">done</Badge>}
      </div>

      {c.viewer && c.viewer !== session.me && (
        <div className="flex items-center gap-2 border-b bg-warn-soft px-5 py-2.5 text-[13px] text-warn">
          <Avatar uid={c.viewer} />
          {USERS[c.viewer].n} has this case open right now — check in before you
          process anything.
        </div>
      )}

      {c.dept === "dispute" && (
        <Section title="What wins this one">
          <ul className="list-disc space-y-1 pl-4 text-[12.5px] leading-relaxed">
            {disputeTips(c.reason).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Response sent on
            </span>
            <Input
              type="date"
              disabled={!mayRecord}
              defaultValue={c.respondedOn || ""}
              onChange={(e) =>
                run(() => api.setRespondedOn(c.id, e.target.value, session))
              }
              className="h-8 w-40"
            />
            <span className="text-xs text-muted-foreground">Outcome</span>
            <Select
              value={c.outcome || "open"}
              disabled={!mayRecord}
              onValueChange={(v) =>
                run(() =>
                  api.setDisputeOutcome(c.id, v === "open" ? "" : v, session),
                )
              }
            >
              <SelectTrigger className="h-8 w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Still open</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="settled">
                  Settled with the customer
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Section>
      )}

      {c.dept === "returns" && (
        <Section title="Where it goes back to">
          {WAREHOUSE[RETURN_WAREHOUSE[o.cc] || "US"] && (
            <KV k={WAREHOUSE[RETURN_WAREHOUSE[o.cc] || "US"].n}>
              <span className="flex flex-wrap items-center justify-end gap-2">
                {WAREHOUSE[RETURN_WAREHOUSE[o.cc] || "US"].a}
                <CopyButton
                  text={`${WAREHOUSE[RETURN_WAREHOUSE[o.cc] || "US"].n}\n${
                    WAREHOUSE[RETURN_WAREHOUSE[o.cc] || "US"].a
                  }`}
                />
              </span>
            </KV>
          )}
          {RETURN_FORMS[o.cc] && (
            <Button asChild variant="outline" size="sm" className="mt-3">
              <a
                href={returnFormUrl(o.cc)}
                download={`Return form ${COUNTRY[o.cc] || o.cc}.pdf`}
                title={`Download the form for ${COUNTRY[o.cc] || o.cc} and send it to the customer`}
              >
                <Download className="mr-1 h-3 w-3" /> {flag(o.cc)} return form
              </a>
            </Button>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {c.rtn
              ? `Tracking ${c.rtn} — tick it off once the parcel is actually at the warehouse, then open the refund or replacement.`
              : "No tracking yet. The customer still has to send it; add the number in the list once they do."}
          </p>
        </Section>
      )}

      <Section title="Actions">
        <div className="flex flex-wrap gap-2">
          {!c.done ? (
            <>
              <Button
                size="sm"
                disabled={locked}
                title={locked ? lockReason(c) : undefined}
                onClick={processIt}
              >
                {d0.act}
              </Button>
              {(canProcess(c, session) ||
                (session.org && c.dept === "supplier")) &&
                [
                  ["Waiting on customer", "klant"],
                  [`Waiting on ${s.supplier}`, "supplier"],
                  ["Our turn", "wij"],
                ]
                  .filter(([, v]) => c.turn !== v)
                  .map(([label, v]) => (
                    <Button
                      key={v}
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        run(() => api.setTurn(c.id, v, label, session))
                      }
                    >
                      {label}
                    </Button>
                  ))}
              {isRefundQueue(c.dept) &&
                (session.role === "lead" || session.role === "paypal") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => run(() => api.toggleNoFunds(c.id, session))}
                  >
                    {c.nofunds ? "Funds are back" : "No funds"}
                  </Button>
                )}
              {c.dept !== "dispute" &&
                !session.org &&
                session.role !== "checker" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => run(() => api.escalate(c.id, session))}
                  >
                    Escalate
                  </Button>
                )}
            </>
          ) : (
            <>
              <Badge variant="good">done</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => run(() => api.undoCase(c.id, session))}
              >
                Reopen
              </Button>
            </>
          )}
        </div>
      </Section>

      {c.fb && (
        <Section title="Adjusted by the specialist">
          <div
            className={cn(
              "rounded-lg border px-3 py-2 text-[13px]",
              c.fb.rejected
                ? "border-crit/40 bg-crit-soft text-crit"
                : "border-warn/40 bg-warn-soft text-warn",
            )}
          >
            {c.fb.rejected ? "Rejected" : `From ${c.fb.from}% to ${c.fb.to}%`}{" "}
            by {USERS[c.fb.by].n} — {c.fb.reason}
          </div>
        </Section>
      )}

      {supplierTemplate && (
        <Section title={`Message for ${s.supplier}`}>
          <pre className="whitespace-pre-wrap rounded-lg border bg-muted/50 px-3 py-2 font-sans text-[12.5px] leading-relaxed">
            {supplierTemplate}
          </pre>
          <div className="mt-2 flex gap-2">
            <CopyButton text={supplierTemplate} />
            <Button
              variant="outline"
              size="xs"
              onClick={() =>
                run(() =>
                  api.setTurn(
                    c.id,
                    "supplier",
                    `Request sent to ${s.supplier}`,
                    session,
                  ),
                )
              }
            >
              Send to {s.supplier}
            </Button>
          </div>
        </Section>
      )}

      <Section title="Signals">
        <div className="space-y-1.5">
          {risks(cases, c, f).map(([tone, text], i) => (
            <div
              key={i}
              className={cn(
                "rounded-md border-l-2 px-3 py-1.5 text-[12.5px]",
                tone === "crit"
                  ? "border-l-crit bg-crit-soft text-crit"
                  : tone === "warn"
                    ? "border-l-warn bg-warn-soft text-warn"
                    : "border-l-border bg-muted/50 text-muted-foreground",
              )}
            >
              {text}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Order">
        <KV k="Submitted by">{USERS[c.by || "jonathan"].n}</KV>
        <KV k="Status">{o.status}</KV>
        <KV k="Sold to">{countryName(o.cc)}</KV>
        <KV k="Paid with">{o.pay || "Credit Card"}</KV>
        <KV k="Supplier">{s.supplier}</KV>
        <KV k="Handled in">
          {pt.label.replace(
            /^(Open in|Open the order in|Create discount in|Create draft order) ?/,
            "",
          )}
        </KV>
        <KV k="Order value">{money(s, goods(f))}</KV>
        {c.code2 && (
          <KV k={c.dept === "voucher" ? "Voucher code" : "Draft order"}>
            {c.code2}
          </KV>
        )}
        {c.purl && (
          <KV k="Product">{c.purl.replace(/^https?:\/\//, "").slice(0, 42)}</KV>
        )}
        {c.rtn && <KV k="Return tracking">{c.rtn}</KV>}
        {c.items && (
          <KV k="Items">
            {c.items.split(", ").map((nm, ix) => {
              const it = o.items.filter((x) => x.n === nm)[0];
              const url = productUrl(s, it || { n: nm });
              return (
                <React.Fragment key={nm}>
                  {ix ? ", " : ""}
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {nm}
                    </a>
                  ) : (
                    nm
                  )}
                </React.Fragment>
              );
            })}
          </KV>
        )}
        {c.amount ? (
          <KV k="Amount">
            {money(s, c.amount)}
            {c.pct ? ` · ${c.pct}%` : ""}
          </KV>
        ) : null}
      </Section>

      {related.length > 0 && (
        <Section title="Other cases on this order">
          <div className="flex flex-col gap-1.5">
            {related.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setOpenId(r.id)}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px] hover:bg-accent"
              >
                <Badge variant="brand">{dept(r.dept).t}</Badge>
                {r.reason}
                {r.done && <Badge variant="good">done</Badge>}
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title="Timeline">
        <Timeline events={timeline(c, f)} />
      </Section>

      <Section title="Internal notes">
        <Notes
          c={c}
          session={session}
          onAdd={(v) => run(() => api.addNote(c.id, v, session))}
        />
      </Section>
    </>
  );
}
