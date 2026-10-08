import * as React from "react";

import { useApp } from "@/store/app";
import { HttpError } from "@/api/http";
import { since, tasksApi } from "@/api/tasks";
import { DUP_TAGS, dupRole, whatOf } from "@/lib/taskLabels";
import { useCasesChangedTick } from "@/lib/casesChanged";

import { ShopifyOrderLink } from "@/components/common/ShopifyOrderLink";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const PAGE = 50;

function Chip({ on, onClick, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children} <span className="ml-1 opacity-70">{count}</span>
    </button>
  );
}

/**
 * Manual tickets, spam tickets and AI feedback: tasks that live in the
 * Re:amaze task service. The open ones come straight from it; the solved
 * tab lists what people closed from this dashboard.
 */
export function TaskQueue({ queue }) {
  const { setOpenTaskId, session } = useApp();
  const changed = useCasesChangedTick();
  const [tab, setTab] = React.useState("open");
  const [page, setPage] = React.useState(1);
  const [text, setText] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [data, setData] = React.useState({ rows: [], total: 0, truncated: false });
  const [solvedTotal, setSolvedTotal] = React.useState(0);
  const [tabTotals, setTabTotals] = React.useState({ open: 0, progress: 0 });
  const [unmapped, setUnmapped] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [poll, setPoll] = React.useState(0);
  const shown = React.useRef("");

  React.useEffect(() => {
    const id = setTimeout(() => {
      setSearch(text.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [text]);

  React.useEffect(() => {
    let alive = true;
    let timer;
    const key = `${queue}|${tab}|${page}|${search}`;
    if (shown.current !== key) {
      shown.current = key;
      setLoading(true);
    }
    const main =
      tab !== "solved"
        ? tasksApi.list({ queue, search, tab, page, pageSize: PAGE })
        : tasksApi.solved({ queue, search, page, pageSize: PAGE });
    Promise.all([main, tasksApi.solved({ queue, page: 1, pageSize: 1 }), session.isAdmin ? tasksApi.counts() : null])
      .then(([res, solved, counts]) => {
        if (!alive) return;
        setError("");
        setData(res);
        setSolvedTotal(solved.total);
        if (tab !== "solved") setTabTotals({ open: res.openTotal ?? 0, progress: res.progressTotal ?? 0 });
        setUnmapped(counts?.unmapped || {});
        if (res.loading) timer = setTimeout(() => setPoll((p) => p + 1), 4000);
      })
      .catch((err) => alive && setError(err instanceof HttpError ? err.detail || err.code : "Could not load this queue."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [queue, tab, page, search, changed, poll, session.isAdmin]);

  const pages = Math.max(1, Math.ceil(data.total / PAGE));
  const open = (id) => setOpenTaskId(Number(id));
  const unmappedList = Object.entries(unmapped);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Chip on={tab === "open"} count={tabTotals.open} onClick={() => { setTab("open"); setPage(1); }}>
          Open
        </Chip>
        <Chip on={tab === "progress"} count={tabTotals.progress} onClick={() => { setTab("progress"); setPage(1); }}>
          In progress
        </Chip>
        <Chip on={tab === "solved"} count={solvedTotal} onClick={() => { setTab("solved"); setPage(1); }}>
          Solved cases
        </Chip>
        {(
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Find by order, store or ticket" className="ml-auto h-8 w-64 text-xs" />
        )}
      </div>

      {unmappedList.length > 0 && (
        <p className="mb-3 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          The task service also has tasks in queues this dashboard does not show yet:{" "}
          {unmappedList.map(([k, n]) => `${k} (${n})`).join(", ")}.
        </p>
      )}
      {data.loading && (
        <p className="mb-3 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Still reading the older tasks from Re:amaze ({data.progress?.loaded ?? 0} of {data.progress?.total ?? "?"}). More may appear in a
          moment.
        </p>
      )}
      {data.error && (
        <p className="mb-3 rounded-md border border-warn/40 bg-warn-soft px-3 py-2 text-xs text-warn">
          Re:amaze did not answer completely ({data.error}). Showing what was read; it will try again shortly.
        </p>
      )}

      {error ? (
        <Card className="p-6 text-sm text-crit">{error}</Card>
      ) : loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : data.rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">{tab === "open" ? "Nothing open." : tab === "progress" ? "Nothing in progress." : "Nothing solved yet."}</Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {(tab === "open"
                  ? ["Case ID", "Store", "Ticket", "Action needed", "Order", "Priority", "Waiting", "Status", ""]
                  : tab === "progress"
                  ? ["Case ID", "Store", "Ticket", "Action needed", "Order", "Priority", "Answered", "Status", ""]
                  : ["Case ID", "Store", "Ticket", "Outcome", "Closed by", "Closed at", ""]
                ).map((h, i) => (
                  <TableHead key={`${h}-${i}`}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tab !== "solved"
                ? data.rows.map((t) => (
                    <TableRow key={t.id} className="cursor-pointer" onClick={() => open(t.id)}>
                      <TableCell className="font-mono text-xs text-primary">#{t.id}</TableCell>
                      <TableCell className="text-sm">{t.store_slug}</TableCell>
                      <TableCell>
                        {t.ticket_url ? (
                          <a
                            href={t.ticket_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                          >
                            {t.ticket_slug}
                          </a>
                        ) : (
                          <span className="font-mono text-xs">{t.ticket_slug}</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[260px] text-sm" title={whatOf(t).hint}>
                        <span className="line-clamp-2">{whatOf(t).label}</span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {t.order_number || t.order_number_found ? (
                          <ShopifyOrderLink order={t.order_number || t.order_number_found}>{t.order_number || t.order_number_found}</ShopifyOrderLink>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {t.priority ? <Badge variant={String(t.priority).toLowerCase() === "urgent" ? "crit" : "secondary"}>{t.priority}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {since(tab === "progress" ? t.approved_at || t.customer_waiting_since : t.customer_waiting_since)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {dupRole(t) && (
                            <Badge variant={DUP_TAGS[dupRole(t)].variant} title={DUP_TAGS[dupRole(t)].hint}>
                              {DUP_TAGS[dupRole(t)].label}
                            </Badge>
                          )}
                          {tab === "progress" && (
                            <Badge variant="secondary">{t.state === "waiting" ? "reply sent" : "waiting for customer"}</Badge>
                          )}
                          {t.submit_reply && <Badge variant="good">ticked</Badge>}
                          {t.customer_replied_since_draft && <Badge variant="warn">customer replied</Badge>}
                          {t.fault && <Badge variant="secondary">{String(t.fault).replace(/_/g, " ")}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="xs" variant="outline" onClick={(e) => { e.stopPropagation(); open(t.id); }}>
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                : data.rows.map((t) => (
                    <TableRow key={t.id} className="cursor-pointer" onClick={() => open(t.id)}>
                      <TableCell className="font-mono text-xs text-primary">#{t.id}</TableCell>
                      <TableCell className="text-sm">{t.store_slug}</TableCell>
                      <TableCell className="max-w-[240px] truncate font-mono text-xs" title={t.ticket_slug}>
                        {t.ticket_slug}
                      </TableCell>
                      <TableCell className="text-sm">{String(t.outcome || "").replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-sm">{t.resolved_by || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs">
                        {t.resolved_at ? new Date(t.resolved_at).toLocaleString("en-GB") : "—"}
                      </TableCell>
                      <TableCell>
                        <Button size="xs" variant="outline" onClick={(ev) => { ev.stopPropagation(); open(t.id); }}>
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {pages > 1 && !error && (
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>
            Page {page} of {pages}
          </span>
          <Button size="xs" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <Button size="xs" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
