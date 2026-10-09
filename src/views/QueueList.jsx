import * as React from "react";
import { TaskQueue } from "@/views/TaskQueue";
import { TASK_QUEUES } from "@/api/tasks";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ArrowUpDown, CornerUpLeft, ExternalLink } from "lucide-react";

import { DEPTS } from "@/data/departments";
import { LADDER } from "@/data/policy";
import { personName } from "@/lib/rules/session";
import { RETURN_WAREHOUSE, WAREHOUSE } from "@/data/returnForms";
import { COUNTRY, EU } from "@/data/geo";

import { notifyCasesChanged } from "@/lib/casesChanged";
import { useApp } from "@/store/app";
import { casesApi, toCaseView } from "@/api/cases";
import { currencyStyle } from "@/api/orders";
import { HttpError } from "@/api/http";
import { canProcess, canRetract, canSee, canTransfer, dept, lockReason, refundToast, refundVia } from "@/lib/rules/permissions";
import { isRefundQueue } from "@/lib/rules/routing";
import { filterSpec, matchFilter } from "@/lib/rules/filters";
import { money } from "@/lib/rules/format";
import { payTarget } from "@/lib/rules/links";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterSelect, StatusTabs } from "@/components/common/Filters";
import { ShopifyOrderLink } from "@/components/common/ShopifyOrderLink";
import { CaseRef, OrderRef } from "@/components/common/CaseRef";
import { TicketLink } from "@/components/common/TicketLink";
import { Who } from "@/components/common/Who";
import { AgeTag, TurnTag } from "@/components/common/Tags";
import { CaseFilterBar, NO_FILTERS } from "@/components/common/CaseFilterBar";
import { rangeOf } from "@/lib/period";

/* Queues where the Open time is coloured by how late the case is. */
const TIMED = new Set(["cancel", "modify", "refunds", "repl", "voucher", "returns", "dispute", "outreach", "supplier", "cog"]);

const ADJUST_REASONS = [
  "Too high for this reason",
  "Wrong items selected",
  "Outside policy",
  "Not enough evidence",
  "Other",
];

export function QueueList({ viewId }) {
  if (TASK_QUEUES.has(viewId)) return <TaskQueue key={viewId} queue={viewId} />;
  return <CaseQueueList key={viewId} viewId={viewId} />;
}

/** The case's store, plus how its amounts are written (the order's currency, saved on the case). */
function storeView(c) {
  const store = c.store || {};
  return {
    ...(c.currency ? currencyStyle(c.currency) : { sym: "", loc: "en-GB" }),
    name: store.name || c.order || "Unknown store",
    provider: store.paymentProvider || "",
    dom: store.url || "",
    sd: store.shopifyDomain || "",
    niche: store.niche || "",
    supplier: store.supplier || "",
    cc: store.countriesSold || [],
  };
}

function ladderKeyFor(st) {
  if (!/fashion|footwear|garment/i.test(st.niche || "")) return "general";
  return st.cc.some((c) => EU.indexOf(c) > -1) ? "fashion-eu" : "fashion-uk-us";
}

/* Only for cases opened before the route was saved on them: the queue says where the money goes. */
const REAL_ROUTE_LABEL = { rf_paypal: "PayPal", rf_whop: "Whop", rf_cj: "Shopify" };
const CANCEL_ROUTE_LABEL = {
  paypal: "PayPal",
  whop: "Whop",
  ocean: "Ocean",
  shopify: "Shopify",
};
const routeName = (c) =>
  c.dept === "cancel"
    ? CANCEL_ROUTE_LABEL[c.moneyRoute]
    : CANCEL_ROUTE_LABEL[c.moneyRoute] || REAL_ROUTE_LABEL[c.dept];

function CaseQueueList({ viewId }) {
  const app = useApp();
  const {
    session,
    marked,
    setMarked,
    qFilter,
    setQFilter,
    rfFilter,
    setRfFilter,
    cogFilter,
    setCogFilter,
    teamFilter,
    setTeamFilter,
  } = app;
  const role = session.role;

  /* CJ and DayOne are the same queue, one supplier each. */
  let id = viewId;
  let supWho = null;
  if (String(id).indexOf("sup_") === 0) {
    supWho = id.slice(4);
    id = "supplier";
  }

  const [adjusting, setAdjusting] = React.useState(null); // case id
  const [moving, setMoving] = React.useState(null);
  const [retracting, setRetracting] = React.useState(null);
  const [pending, setPending] = React.useState(null); // which button is running: "<caseId>:<action>" or "bulk"

  const [filters, setFilters] = React.useState(NO_FILTERS);
  const [options, setOptions] = React.useState(null);
  const [exporting, setExporting] = React.useState(false);
  const [realRows, setRealRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [openSort, setOpenSort] = React.useState("none"); // "none" | "oldest" | "newest"

  const RFV = isRefundQueue(id) || id === "refunds";
  const rfIds = ["rf_paypal", "rf_whop", "rf_cj"].filter((x) =>
    canSee(x, session),
  );

  const fetchKey = id === "refunds" ? rfIds.join(",") : id;

  /* Date, person and store filters are applied by the server, so the list is the real answer, not a slice of it. */
  const filterKey = JSON.stringify(filters);
  const serverFilters = React.useMemo(() => {
    const { from, to } = rangeOf(filters.period, filters.from, filters.to);
    return {
      openedFrom: from,
      openedTo: to,
      submittedByName: filters.submittedBy === "all" ? undefined : filters.submittedBy,
      handledByName: filters.handledBy === "all" ? undefined : filters.handledBy,
      storeId: filters.storeId === "all" ? undefined : filters.storeId,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const loadReal = React.useCallback(() => {
    if (!fetchKey) return;
    setLoading(true);
    /* Only open and retracted cases are fetched here; solved ones live in the Solved Cases tab. */
    Promise.all([
      casesApi.list({ queueKey: fetchKey, state: "open", pageSize: 100, ...serverFilters }),
      casesApi.list({ queueKey: fetchKey, retracted: true, pageSize: 100, ...serverFilters }),
    ])
      .then(([open, retracted]) => {
        setRealRows(open.rows.concat(retracted.rows).map(toCaseView));
      })
      .catch((err) => {
        toast.error(
          err instanceof HttpError
            ? err.detail || err.code
            : "Could not load this queue.",
        );
      })
      .finally(() => setLoading(false));
  }, [fetchKey, serverFilters]);

  React.useEffect(() => {
    loadReal();
  }, [loadReal]);

  React.useEffect(() => {
    if (!fetchKey) return undefined;
    let alive = true;
    casesApi
      .filterOptions(fetchKey)
      .then((o) => alive && setOptions(o))
      .catch(() => alive && setOptions(null));
    return () => {
      alive = false;
    };
  }, [fetchKey]);

  const canExport = role === "lead" || role === "agent" || role === "checker";
  const exportCases = async (kind) => {
    setExporting(true);
    try {
      await casesApi.exportCsv({
        queueKey: fetchKey,
        ...(kind === "retracted" ? { retracted: true } : { state: kind }),
        ...serverFilters,
      });
    } catch (err) {
      toast.error(err instanceof HttpError ? err.detail || err.code : "Could not export.");
    } finally {
      setExporting(false);
    }
  };

  const cases = realRows;

  if (id !== "refunds" && !canSee(id, session))
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        You do not have access to this list.
      </Card>
    );

  const d =
    id === "refunds"
      ? { id: "refunds", t: "Refund request", act: "Refund processed" }
      : dept(id);

  let rows =
    id === "refunds"
      ? cases.filter((c) => rfIds.indexOf(c.dept) > -1)
      : cases.filter((c) => c.dept === id);

  /* A supplier only ever sees their own stores. */
  if (role === "cj" || role === "dayone") {
    const mine = role === "cj" ? "CJ" : "DayOne";
    rows = rows.filter((c) => c.store?.supplier === mine);
  }
  if (supWho)
    rows = rows.filter((c) => c.store?.supplier === supWho);

  /* ---- team filter ---- */
  const showTeam =
    !RFV && session.team && (role === "lead" || role === "checker");
  let teamNote = null;
  const teamOpts = showTeam
    ? [
        [
          "mine",
          session.team,
          rows.filter((c) => !c.done && c.team === session.team).length,
        ],
        ["all", "All teams", rows.filter((c) => !c.done).length],
      ]
    : null;
  if (showTeam && teamFilter === "mine") {
    const own = rows.filter((c) => c.team === session.team);
    if (own.length || !rows.length) rows = own;
    else
      teamNote = `Nothing for ${session.team} right now — showing every team.`;
  }

  /* ---- COG: which supplier owes it ---- */
  const showCog = id === "cog" && role !== "cj" && role !== "dayone";
  const cogOpts = showCog
    ? [
        ["all", "All"],
        ["CJ", "CJ"],
        ["DayOne", "DayOne"],
      ].map(([k, l]) => [
        k,
        l,
        rows.filter((c) => !c.done && (k === "all" || c.store?.supplier === k))
          .length,
      ])
    : null;
  if (showCog && (cogFilter === "CJ" || cogFilter === "DayOne"))
    rows = rows.filter((c) => c.store?.supplier === cogFilter);

  /* ---- route filter: which system the money leaves through. Only
     meaningful on the merged refunds view — the queue itself IS the
     route there. A per-order route for other queues would need a live
     order, which we don't have yet. ---- */
  const showRoute = (id === "refunds" && rfIds.length > 1) || id === "cancel";
  const routeOpts = showRoute
    ? [["all", "All"]]
        .concat(
          Object.values(CANCEL_ROUTE_LABEL).map((x) => [x, x]),
        )
        .map(([k, l]) => [
          k,
          l,
          rows.filter((c) => !c.done && (k === "all" || routeName(c) === k))
            .length,
        ])
    : null;
  if (showRoute && rfFilter !== "all")
    rows = rows.filter((c) => routeName(c) === rfFilter);

  /* ---- status filter ---- */
  const fkey = id === "refunds" ? "refunds" : supWho ? `sup_${supWho}` : id;
  const fopts = filterSpec(id, RFV).concat([["retracted", "Retracted"]]);
  const firstTab = (fopts.find(([, l]) => l === "To do") || fopts[0])[0];
  let fsel = qFilter[fkey] || firstTab;
  if (!fopts.some((x) => x[0] === fsel)) fsel = firstTab;
  const statusOpts = fopts.map(([k, l]) => {
    const n = rows.filter((c) => matchFilter(c, k)).length;
    return [k, l, n];
  });
  rows = rows.filter((c) => matchFilter(c, fsel));

  /* Done sinks to the bottom so the open work stays on top. */
  const sortable = TIMED.has(id) || RFV;
  const byAge = sortable && openSort !== "none" ? (openSort === "oldest" ? -1 : 1) : 0;
  rows = rows
    .slice()
    .sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || (byAge ? (a.age - b.age) * byAge : 0));

  const selected = Object.keys(marked).filter((k) => marked[k]);

  /* ---- the columns this queue needs ---- */
  let cols;
  {
    if (RFV)
      cols = [
        "",
        "Case ID",
        "Order",
        "Store",
        "Country",
        "Paid with",
        "Items",
        "%",
        "Amount",
      ];
    else if (id === "voucher")
      cols = [
        "",
        "Case ID",
        "Order",
        "Store",
        "Country",
        "Items",
        "Value",
        "Voucher code",
      ];
    else if (id === "repl")
      cols = ["", "Case ID", "Order", "Store", "Items", "Supplier", "Draft order"];
    else if (id === "supplier")
      cols = ["", "Case ID", "Order", "Store", "Supplier", "Request", "Items"];
    else if (id === "cog")
      cols = [
        "",
        "Case ID",
        "Order",
        "Store",
        "Supplier",
        "Refunded to customer",
        "COG to claim",
      ];
    else if (id === "dispute")
      cols = ["", "Case ID", "Order", "Store", "Reason", "Items", "Responded", "Outcome"];
    else if (id === "modify")
      cols = ["", "Case ID", "Order", "Store", "Reason", "Change to", "Supplier"];
    else if (id === "returns")
      cols = [
        "",
        "Case ID",
        "Order",
        "Store",
        "Reason",
        "Items",
        "Return tracking",
        "Goes back to",
      ];
    else if (id === "cancel") cols = ["", "Case ID", "Order", "Store", "Reason", "Cancels"];
    else if (id === "outreach") cols = ["", "Case ID", "Order", "Store", "Reason", "Items"];
    else cols = ["", "Case ID", "Order", "Store", "Reason"];
    if (showRoute && rfFilter === "all") cols.splice(4, 0, "Route");
    cols = cols.concat([
      "Waiting on",
      "Open",
      "Submitted by",
      "Team",
      "Ticket",
      "Processed by",
    ]);
    if (id === "cancel") cols.push("Processed at");
    cols.push("");
  }

  /* ---- actions: reload this queue from the backend after every one ---- */
  const realAct = async (fn, successMsg, key) => {
    if (key) setPending(key);
    try {
      await fn();
      setAdjusting(null);
      setMoving(null);
      setRetracting(null);
      if (successMsg) toast(successMsg);
      loadReal();
      notifyCasesChanged();
    } catch (err) {
      toast.error(
        err instanceof HttpError ? err.detail || err.code : "That didn't work.",
      );
    } finally {
      if (key) setPending(null);
    }
  };
  const busy = (c, action) => pending === `${c.id}:${action}`;

  /* A refund that goes out for real (Shopify, PayPal or Whop): ask once before money moves. */
  const realRefund = (c) => refundVia(c) !== null;
  const confirmRefund = (list) => {
    const todo = list.filter((c) => realRefund(c) && !c.refundSent);
    if (!todo.length) return true;
    const sum = todo.map((c) => `${money(storeView(c), c.amount)} · #${c.order} · via ${refundVia(c)}`).join("\n");
    return window.confirm(
      `Send ${todo.length === 1 ? "this refund" : `these ${todo.length} refunds`} back to the customer now?\n\n${sum}\n\nThis moves real money and cannot be undone. The exact amount is worked out from the customer's real payment, in the currency they paid in.`,
    );
  };

  const processOne = (c) => {
    const key = `${c.id}:process`;
    if (realRefund(c)) {
      if (!confirmRefund([c])) return undefined;
      return realAct(async () => {
        const res = await casesApi.process(c.id);
        toast(refundToast(refundVia(c), res.stage));
      }, undefined, key);
    }
    if (c.dept === "cancel") {
      return realAct(async () => {
        const res = await casesApi.process(c.id);
        toast(
          res.stage === "resolved"
            ? "Cancelled and refunded."
            : c.moneyRoute === "shopify"
              ? "Cancelled in Shopify — waiting for Shopify to confirm the refund."
              : `Cancelled in Shopify — the refund still has to be sent via ${CANCEL_ROUTE_LABEL[c.moneyRoute] || "the payment provider"}.`,
        );
      }, undefined, key);
    }
    return realAct(
      () => casesApi.process(c.id),
      c.dept === "modify" && c.shopifyEdit ? "Order edited in Shopify." : "Processed.",
      key,
    );
  };

  return (
    <div>
      <div className="mb-4 space-y-3">
        <StatusTabs
          options={statusOpts}
          value={fsel}
          onChange={(v) => {
            setQFilter({ ...qFilter, [fkey]: v });
            setMarked({});
          }}
        />
        <CaseFilterBar
          filters={filters}
          onChange={(f) => {
            setFilters(f);
            setMarked({});
          }}
          options={options}
          onExport={canExport ? exportCases : undefined}
          exporting={exporting}
        />
        {(teamOpts || cogOpts || routeOpts) && (
          <div className="flex flex-wrap items-center gap-2">
            {teamOpts && (
              <FilterSelect
                label="Team"
                options={teamOpts}
                value={teamFilter}
                onChange={(v) => {
                  setTeamFilter(v);
                  setMarked({});
                }}
              />
            )}
            {cogOpts && (
              <FilterSelect
                label="Supplier"
                options={cogOpts}
                value={cogFilter}
                onChange={(v) => {
                  setCogFilter(v);
                  setMarked({});
                }}
              />
            )}
            {routeOpts && (
              <FilterSelect
                label="Route"
                options={routeOpts}
                value={rfFilter}
                onChange={(v) => {
                  setRfFilter(v);
                  setMarked({});
                }}
              />
            )}
            {((teamOpts && teamFilter !== "mine") || (cogOpts && cogFilter !== "all") || (routeOpts && rfFilter !== "all")) && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  if (teamOpts) setTeamFilter("mine");
                  if (cogOpts) setCogFilter("all");
                  if (routeOpts) setRfFilter("all");
                  setMarked({});
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
        {teamNote && <p className="text-xs text-muted-foreground">{teamNote}</p>}
      </div>

      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-primary/40 bg-accent px-4 py-2.5">
          <span className="text-sm font-medium">
            {selected.length} selected
          </span>
          <Button
            size="sm"
            onClick={() => {
              const ids = selected.filter((cid) =>
                rows.some((r) => r.id === cid),
              );
              if (!confirmRefund(rows.filter((r) => ids.includes(r.id)))) return undefined;
              return realAct(async () => {
                // eslint-disable-next-line no-restricted-syntax
                for (const cid of ids) {
                  // eslint-disable-next-line no-await-in-loop
                  await casesApi.process(cid);
                }
                setMarked({});
              }, `${ids.length} processed.`, "bulk");
            }}
            loading={pending === "bulk"}
          >
            {d.act}
          </Button>
        </div>
      )}

      {loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Loading…
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nothing open.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {cols.map((c, i) => (
                  <TableHead
                    key={`${c}-${i}`}
                    className={i === 0 ? "w-8" : undefined}
                  >
                    {c === "Open" && sortable ? (
                      <button
                        type="button"
                        title="Sort by hours open"
                        onClick={() => setOpenSort(openSort === "oldest" ? "newest" : openSort === "newest" ? "none" : "oldest")}
                        className="inline-flex items-center gap-1 uppercase hover:text-foreground"
                      >
                        Open
                        {openSort === "oldest" ? <ArrowDown className="h-3 w-3" /> : openSort === "newest" ? <ArrowUp className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                      </button>
                    ) : (
                      c
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const s = storeView(c);
                const locked = !canProcess(c, session);
                const pt = payTarget(
                  s,
                  c.moneyRoute === "paypal" ? { pay: "PayPal" } : undefined,
                  c.dept,
                  c.order,
                );
                const refundStage = id === "cancel" && !!c.cancelledAt;
                return (
                  <TableRow key={c.id} className={cn(c.done && "opacity-55", c.retracted && "line-through decoration-muted-foreground/40")}>
                    <TableCell>
                      {!c.done && (
                        <Checkbox
                          checked={!!marked[c.id]}
                          onCheckedChange={(v) =>
                            setMarked({ ...marked, [c.id]: !!v })
                          }
                          aria-label={`Select ${c.ref}`}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <CaseRef c={c} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <OrderRef c={c} />
                        <ShopifyOrderLink order={c.order} iconOnly />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{s.name}</TableCell>

                    {showRoute && rfFilter === "all" && (
                      <TableCell>
                        {routeName(c) ? (
                          <Badge variant="brand">{routeName(c)}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {id === "cancel" && c.cancelledAt && !c.done && (
                          <Badge variant="warn" className="ml-1">
                            cancelled · refund pending
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    {(RFV || id === "voucher") && (
                      <TableCell className="whitespace-nowrap text-sm">
                        {c.customerCountry ? (
                          <span title={COUNTRY[c.customerCountry === "GB" ? "UK" : c.customerCountry] || c.customerCountry}>
                            <span className="font-mono text-xs">{c.customerCountry}</span>{" "}
                            <span className="text-muted-foreground">
                              {COUNTRY[c.customerCountry === "GB" ? "UK" : c.customerCountry] || ""}
                            </span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    )}
                    {RFV && (
                      <TableCell className="text-sm">
                        {c.paymentMethod ? (
                          <>
                            {c.paymentMethod}
                            {c.paymentGateway && (
                              <small className="block text-xs text-muted-foreground">{c.paymentGateway}</small>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    )}
                    {(RFV || id === "voucher" || id === "repl") && (
                      <TableCell
                        className="max-w-[220px] truncate text-sm"
                        title={c.items}
                      >
                        {c.items || "—"}
                      </TableCell>
                    )}
                    {RFV && (
                      <>
                        <TableCell className="font-mono text-xs">
                          {c.pct ? `${c.pct}%` : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {money(s, c.amount)}
                          {c.refundSent && !c.done && (
                            <Badge variant="warn" className="ml-1.5">
                              refund sent · confirming
                            </Badge>
                          )}
                        </TableCell>
                      </>
                    )}
                    {id === "voucher" && (
                      <TableCell className="font-mono text-xs">
                        {money(s, c.amount)}
                      </TableCell>
                    )}
                    {id === "repl" && (
                      <TableCell className="text-sm">{s.supplier}</TableCell>
                    )}
                    {(id === "voucher" || id === "repl") && (
                      <TableCell>
                        <InlineField
                          editable={role === "lead" && !c.done}
                          value={c.code2 || ""}
                          placeholder={
                            id === "voucher" ? "e.g. KATH2147" : "e.g. #D1042"
                          }
                          onSave={(v) =>
                            realAct(
                              () => casesApi.setVoucherCode(c.id, v),
                              "Saved.",
                            )
                          }
                          empty="—"
                        />
                      </TableCell>
                    )}
                    {id === "supplier" && (
                      <>
                        <TableCell className="text-sm">{s.supplier}</TableCell>
                        <TableCell className="text-sm">{c.reason}</TableCell>
                        <PickedCell c={c} />
                      </>
                    )}
                    {id === "cog" && (
                      <>
                        <TableCell className="text-sm">{s.supplier}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {c.amount ? money(s, c.amount) : "—"}
                        </TableCell>
                        <TableCell>
                          <InlineField
                            editable={role === "lead" && !c.done}
                            value={c.cog ? String(c.cog) : ""}
                            placeholder="0.00"
                            onSave={(v) =>
                              realAct(
                                () =>
                                  casesApi.setCogAmount(c.id, Number(v) || 0),
                                "Saved.",
                              )
                            }
                            empty="not set"
                            display={c.cog ? money(s, c.cog) : null}
                            className="w-24 text-right"
                          />
                        </TableCell>
                      </>
                    )}
                    {id === "cancel" && (
                      <>
                        <TableCell className="text-sm">{c.reason}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-sm" title={c.change}>
                          {c.change ? (
                            <>
                              <Badge variant="warn" className="mr-1.5">
                                part
                              </Badge>
                              {c.change.replace(/\n/g, "; ")}
                            </>
                          ) : (
                            "Whole order"
                          )}
                        </TableCell>
                      </>
                    )}
                    {id === "modify" && (
                      <>
                        <TableCell className="text-sm">{c.reason}</TableCell>
                        <TableCell
                          className="max-w-[220px] truncate text-sm"
                          title={c.change}
                        >
                          {c.change || "—"}
                        </TableCell>
                        <TableCell className="text-sm">{s.supplier}</TableCell>
                      </>
                    )}
                    {id === "outreach" && (
                      <>
                        <TableCell className="text-sm">{c.reason}</TableCell>
                        <PickedCell c={c} />
                      </>
                    )}
                    {id === "returns" && (
                      <>
                        <TableCell className="text-sm">{c.reason}</TableCell>
                        <PickedCell c={c} />
                        <TableCell>
                          <InlineField
                            editable={
                              (role === "lead" || role === "agent") && !c.done
                            }
                            value={c.rtn || ""}
                            placeholder="tracking number"
                            onSave={(v) =>
                              realAct(
                                () => casesApi.setTracking(c.id, v),
                                "Saved.",
                              )
                            }
                            empty="not sent yet"
                            className="w-40"
                          />
                        </TableCell>
                        <TableCell>
                          {WAREHOUSE[RETURN_WAREHOUSE[s.cc[0]] || "US"] ? (
                            <Badge variant="secondary">
                              {WAREHOUSE[RETURN_WAREHOUSE[s.cc[0]] || "US"].n}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </>
                    )}
                    {id === "dispute" && (
                      <>
                        <TableCell className="text-sm">{c.reason}</TableCell>
                        <PickedCell c={c} />
                        <TableCell className="text-sm">
                          {c.respondedOn || (
                            <span className="text-muted-foreground">
                              not yet
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.outcome === "won" ? (
                            <Badge variant="good">won</Badge>
                          ) : c.outcome === "lost" ? (
                            <Badge variant="crit">lost</Badge>
                          ) : c.outcome === "settled" ? (
                            <Badge variant="brand">settled</Badge>
                          ) : (
                            <span className="text-muted-foreground">open</span>
                          )}
                        </TableCell>
                      </>
                    )}

                    <TableCell>
                      <TurnTag c={c} />
                    </TableCell>
                    <TableCell>
                      <AgeTag c={c} timed={TIMED.has(id) || RFV} />
                    </TableCell>
                    <TableCell>
                      <Who uid={c.by || "anna"} c={c} />
                      {c.claim && (
                        <Badge variant="good" className="ml-1">
                          claimed by {personName(c.claim)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.team || "external"}</Badge>
                    </TableCell>
                    <TableCell>
                      <TicketLink c={c} />
                      {c.rtn && (
                        <Badge variant="warn" className="ml-1">
                          return
                        </Badge>
                      )}
                      {c.atts ? (
                        <Badge variant="secondary" className="ml-1">
                          📎 {c.atts}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {c.doneBy ? (
                        <Who uid={c.doneBy} />
                      ) : c.retracted && c.retractedBy ? (
                        <Who uid={c.retractedBy} />
                      ) : c.claim ? (
                        <Who uid={c.claim} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {id === "cancel" && (
                      <TableCell className="whitespace-nowrap font-mono text-xs">
                        {c.doneAt
                          ? new Date(c.doneAt).toLocaleString("en-GB")
                          : "—"}
                      </TableCell>
                    )}

                    <TableCell>
                      {c.retracted ? (
                        <Badge variant="secondary" title={c.retractNote ? `Retracted: ${c.retractNote}` : "Retracted"}>
                          retracted
                        </Badge>
                      ) : c.done ? (
                        <Badge variant="good">done</Badge>
                      ) : role === "checker" ? (
                        <Badge variant="secondary">review only</Badge>
                      ) : adjusting === c.id ? (
                        <AdjustRow
                          c={c}
                          store={s}
                          session={session}
                          onDone={realAct}
                          onCancel={() => setAdjusting(null)}
                        />
                      ) : retracting === c.id ? (
                        <RetractRow
                          c={c}
                          onDone={realAct}
                          onCancel={() => setRetracting(null)}
                          onClose={() => setRetracting(null)}
                        />
                      ) : moving === c.id ? (
                        <MoveRow
                          c={c}
                          id={id}
                          session={session}
                          onDone={realAct}
                          onCancel={() => setMoving(null)}
                        />
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(RFV ||
                            id === "voucher" ||
                            id === "repl" ||
                            id === "modify" ||
                            (refundStage && c.moneyRoute !== "shopify")) && (
                            <Button asChild variant="outline" size="xs">
                              <a
                                href={pt.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {pt.label}
                                <ExternalLink className="ml-1 h-3 w-3" />
                              </a>
                            </Button>
                          )}
                          <Button
                            size="xs"
                            disabled={
                              locked ||
                              ((id === "voucher" || id === "repl") && !c.code2)
                            }
                            title={
                              locked
                                ? lockReason(c)
                                : (id === "voucher" || id === "repl") &&
                                    !c.code2
                                  ? id === "voucher"
                                    ? "Add the voucher code first"
                                    : "Add the draft order number first"
                                  : undefined
                            }
                            onClick={() => processOne(c)}
                            loading={busy(c, "process")}
                          >
                            {realRefund(c)
                              ? c.refundSent
                                ? "Check refund"
                                : `Refund via ${refundVia(c)}`
                              : refundStage
                                ? c.moneyRoute === "shopify"
                                  ? "Check refund"
                                  : "Refund"
                              : c.dept === "modify" && c.shopifyEdit
                                ? "Edit in Shopify"
                                : (dept(c.dept) || d).act}
                          </Button>
                          {id === "supplier" &&
                            (role === "cj" || role === "dayone") &&
                            !c.claim && (
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() =>
                                  realAct(
                                    () => casesApi.claim(c.id),
                                    "Claimed.",
                                    `${c.id}:claim`,
                                  )
                                }
                                loading={busy(c, "claim")}
                              >
                                I will take it
                              </Button>
                            )}
                          {RFV && !locked && (
                            <Button
                              variant="outline"
                              size="xs"
                              className={cn(
                                c.nofunds && "border-crit text-crit",
                              )}
                              onClick={() =>
                                realAct(() => casesApi.toggleNoFunds(c.id), undefined, `${c.id}:nofunds`)
                              }
                              loading={busy(c, "nofunds")}
                            >
                              {c.nofunds ? "Funds are back" : "No funds"}
                            </Button>
                          )}
                          {RFV && !locked && !c.refundSent && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => setAdjusting(c.id)}
                            >
                              Adjust
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="xs"
                            title={
                              canTransfer(c, session)
                                ? "In the wrong tab? Transfer it to another one"
                                : "Ask a CS lead to transfer this one."
                            }
                            disabled={!canTransfer(c, session)}
                            onClick={() => setMoving(c.id)}
                          >
                            <CornerUpLeft className="mr-1 h-3 w-3" />
                            Transfer
                          </Button>
                          {canRetract(c, session) && (
                            <Button
                              variant="outline"
                              size="xs"
                              title="Opened by mistake? Take it back, with a note saying why"
                              onClick={() => setRetracting(c.id)}
                            >
                              Retract
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

/** The items a returns / dispute / outreach / supplier case is about; "Whole order" when none were named. */
function PickedCell({ c }) {
  const list = c.picked || [];
  if (!list.length)
    return (
      <TableCell className="text-sm text-muted-foreground">Whole order</TableCell>
    );
  const text = list
    .map((p) => `${p.title || p.name}${p.variant ? ` (${p.variant})` : ""}${p.qty > 1 || p.orderedQty > 1 ? ` × ${p.qty}` : ""}`)
    .join("; ");
  return (
    <TableCell className="max-w-[220px] truncate text-sm" title={text}>
      {text}
    </TableCell>
  );
}

/** A cell that is a text field for the people who may fill it in. */
function InlineField({
  editable,
  value,
  placeholder,
  onSave,
  empty,
  display,
  className,
}) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => setV(value), [value]);
  if (!editable)
    return value ? (
      <Badge variant="brand">{display || value}</Badge>
    ) : (
      <span className="text-sm text-muted-foreground">{empty}</span>
    );
  return (
    <Input
      value={v}
      placeholder={placeholder}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className={cn("h-8 w-36 font-mono text-xs", className)}
    />
  );
}

/** Adjust the percentage, or reject outright. Same ladder as at intake. */
function AdjustRow({ c, store, session, onDone, onCancel }) {
  const [saving, setSaving] = React.useState(false);
  const steps = [0].concat(c.refundSteps?.length ? c.refundSteps : LADDER[ladderKeyFor(store)] || [15, 25, 30, 100]);
  if (c.pct && steps.indexOf(c.pct) < 0) steps.push(c.pct);
  steps.sort((a, b) => a - b);
  const [pct, setPct] = React.useState(String(c.pct || steps[0]));
  const [reason, setReason] = React.useState(ADJUST_REASONS[0]);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Select value={pct} onValueChange={setPct}>
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {steps.map((s) => (
            <SelectItem key={s} value={String(s)}>
              {s === 0 ? "Reject" : `${s}%`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={reason} onValueChange={setReason}>
        <SelectTrigger className="h-8 w-48 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ADJUST_REASONS.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="xs"
        loading={saving}
        onClick={async () => {
          setSaving(true);
          await onDone(() => casesApi.adjust(c.id, Number(pct), reason), Number(pct) === 0 ? "Rejected." : "Adjusted.");
          setSaving(false);
        }}
      >
        Save
      </Button>
      <Button size="xs" variant="ghost" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
    </div>
  );
}

/** Taking a case back: the reason is required, and the case is kept (under Retracted), not deleted. */
function RetractRow({ c, onDone, onCancel }) {
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  return (
    <div className="flex min-w-[260px] flex-col gap-1.5">
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Why is it being retracted? (required)"
        autoFocus
        className="h-8 text-xs"
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          size="xs"
          variant="destructive"
          disabled={note.trim().length < 3}
          loading={saving}
          onClick={async () => {
            setSaving(true);
            await onDone(() => casesApi.retract(c.id, note.trim()), `${c.ref} retracted.`);
            setSaving(false);
          }}
        >
          Retract {c.ref}
        </Button>
        <Button size="xs" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/**
 * Moving a case is reaching into someone else's queue: only whoever
 * could process it themselves, and never a supplier.
 */
function MoveRow({ c, id, session, onDone, onCancel }) {
  const [saving, setSaving] = React.useState(false);
  const options = DEPTS.filter((x) => {
    if (
      x.id === id ||
      x.id === c.dept ||
      x.admin ||
      x.adminOnly ||
      x.intakeOnly ||
      TASK_QUEUES.has(x.id)
    )
      return false;
    /* COG claims are opened by the dashboard itself; nothing is pushed in. */
    if (x.id === "cog") return false;
    if (!canSee(x.id, session)) return false;
    if (x.id === "rf_paypal" && session.role !== "paypal") return false;
    if (
      isRefundQueue(x.id) &&
      !(session.role === "lead" || session.role === "paypal" || session.isAdmin)
    )
      return false;
    return true;
  });
  const [to, setTo] = React.useState(options[0] ? options[0].id : "");
  if (!options.length)
    return (
      <span className="text-xs text-muted-foreground">
        Nowhere to move this one.
      </span>
    );
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
      <Button
        size="xs"
        loading={saving}
        onClick={async () => {
          setSaving(true);
          await onDone(() => casesApi.move(c.id, to), "Transferred.");
          setSaving(false);
        }}
      >
        Transfer
      </Button>
      <Button size="xs" variant="ghost" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
    </div>
  );
}
