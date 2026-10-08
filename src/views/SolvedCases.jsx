import * as React from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";

import { solvedApi, solverLabel } from "@/api/solved";
import { currencyStyle } from "@/api/orders";
import { HttpError } from "@/api/http";
import { useApp } from "@/store/app";
import { canSee, dept } from "@/lib/rules/permissions";
import { money } from "@/lib/rules/format";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterSelect } from "@/components/common/Filters";
import { Pagination } from "@/components/common/Pagination";
import { ShopifyOrderLink } from "@/components/common/ShopifyOrderLink";

const REFUND_QUEUES = ["rf_paypal", "rf_whop", "rf_cj"];
/* The tabs of the dashboard that hold cases of their own (the three refund queues are one tab). */
const CASE_TABS = ["cancel", "modify", "refund", "repl", "voucher", "returns", "dispute", "outreach", "supplier", "cog"];
const TICKET_TABS = [
  ["manual", "Manual tickets"],
  ["suptix", "Supplier tickets"],
];
const PERIODS = [
  ["all", "All time"],
  ["today", "Today"],
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
  ["custom", "Pick dates…"],
];

const tabLabel = (tab) =>
  tab === "refund" ? "Refund request" : TICKET_TABS.find(([k]) => k === tab)?.[1] || dept(tab)?.t || tab;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** The from/to a period stands for, in the browser's day. */
function rangeOf(period, fromText, toText) {
  const now = new Date();
  if (period === "today") return { from: startOfDay(now) };
  if (period === "7d") return { from: new Date(now.getTime() - 7 * 86_400_000) };
  if (period === "30d") return { from: new Date(now.getTime() - 30 * 86_400_000) };
  if (period === "custom")
    return {
      from: fromText ? new Date(`${fromText}T00:00:00`) : undefined,
      to: toText ? new Date(`${toText}T23:59:59.999`) : undefined,
    };
  return {};
}

/**
 * Everything that has been solved, from every tab, in one list: the cases of
 * this dashboard and the closed Re:amaze tickets. A case moves here by itself
 * when it is processed and leaves the active queues; each row says who
 * closed it and when.
 */
export function SolvedCases() {
  const { session, setOpenId, setOpenTaskId } = useApp();
  const [tab, setTab] = React.useState("all");
  const [by, setBy] = React.useState("all");
  const [period, setPeriod] = React.useState("all");
  const [fromText, setFromText] = React.useState("");
  const [toText, setToText] = React.useState("");
  const [text, setText] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [note, setNote] = React.useState(null);
  const [people, setPeople] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const staff = session.role === "lead" || session.role === "agent" || session.role === "checker";
  const tabs = [
    ...CASE_TABS.filter((t) => (t === "refund" ? REFUND_QUEUES.some((q) => canSee(q, session)) : canSee(t, session))).map((t) => [t, tabLabel(t)]),
    ...(staff ? TICKET_TABS : []),
  ];
  const tabOptions = [["all", "All tabs"], ...tabs];
  const personOptions = [["all", "Everyone"], ...people.map((n) => [n, solverLabel(n)])];

  React.useEffect(() => {
    solvedApi
      .people()
      .then((r) => setPeople(r.people || []))
      .catch(() => setPeople([]));
  }, []);

  React.useEffect(() => {
    const id = setTimeout(() => {
      setSearch(text.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [text]);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    const { from, to } = rangeOf(period, fromText, toText);
    solvedApi
      .list({ tab, from, to, by: by === "all" ? undefined : by, search: search || undefined, page, pageSize })
      .then((res) => {
        if (!alive) return;
        setRows(res.rows);
        setTotal(res.total);
        setNote(res.note || null);
      })
      .catch((err) => alive && toast.error(err instanceof HttpError ? err.detail || err.code : "Could not load the solved cases."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tab, by, period, fromText, toText, search, page, pageSize]);

  const filtered = tab !== "all" || by !== "all" || period !== "all" || !!text;
  const reset = () => {
    setTab("all");
    setBy("all");
    setPeriod("all");
    setFromText("");
    setToText("");
    setText("");
    setPage(1);
  };
  const pick = (setter) => (v) => {
    setter(v);
    setPage(1);
  };
  const open = (r) => (r.kind === "case" ? setOpenId(r.id, true) : setOpenTaskId(Number(r.id)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect label="Tab" options={tabOptions} value={tab} onChange={pick(setTab)} />
        <FilterSelect label="Processed by" options={personOptions} value={by} onChange={pick(setBy)} />
        <FilterSelect label="Period" options={PERIODS} value={period} onChange={pick(setPeriod)} />
        {period === "custom" && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Input type="date" value={fromText} max={toText || undefined} onChange={(e) => pick(setFromText)(e.target.value)} className="h-8 w-36 text-xs" aria-label="From" />
            to
            <Input type="date" value={toText} min={fromText || undefined} onChange={(e) => pick(setToText)(e.target.value)} className="h-8 w-36 text-xs" aria-label="To" />
          </div>
        )}
        {filtered && (
          <Button variant="ghost" size="xs" onClick={reset}>
            Clear filters
          </Button>
        )}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Order, case number or store" className="h-8 pl-8 text-xs" />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {total} solved · newest first
        {filtered ? " · filters on" : ""}
      </p>
      {note && <p className="rounded-md border border-warn/40 bg-warn-soft px-3 py-2 text-xs text-warn">{note}</p>}

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case ID</TableHead>
              <TableHead>Tab</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Reason / outcome</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Processed by</TableHead>
              <TableHead>Processed at</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-xs text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-xs text-muted-foreground">
                  {filtered ? "Nothing solved matches these filters." : "No solved cases yet."}
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              rows.map((r) => (
                <TableRow key={`${r.kind}-${r.id}`} className="cursor-pointer" onClick={() => open(r)}>
                  <TableCell className="font-mono text-xs text-primary">{r.ref}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tabLabel(r.tab)}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.order ? <ShopifyOrderLink order={r.order}>{r.order}</ShopifyOrderLink> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">{r.store || "—"}</TableCell>
                  <TableCell className="max-w-[260px] truncate text-sm" title={r.reason || ""}>
                    {r.kind === "ticket" && r.outcome ? String(r.outcome).replace(/_/g, " ") : r.reason || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {r.amount ? (r.currency ? money(currencyStyle(r.currency), r.amount) : r.amount.toFixed(2)) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{solverLabel(r.solvedBy)}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {r.solvedAt ? new Date(r.solvedAt).toLocaleString("en-GB") : "—"}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  );
}
