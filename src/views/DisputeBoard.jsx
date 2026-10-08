import * as React from "react";
import { toast } from "sonner";

import { casesApi } from "@/api/cases";
import { HttpError } from "@/api/http";
import { nf } from "@/lib/rules/format";
import { useApp } from "@/store/app";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const toneText = { crit: "text-crit", warn: "text-warn", good: "text-good", "": "" };

function Kpi({ label, value, tone, sub }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={cn("font-display text-2xl font-bold", toneText[tone || ""])}>{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

/** The dispute queue in this dashboard, counted by the backend. */
export function DisputeBoard() {
  const { setView } = useApp();
  const [s, setS] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    casesApi
      .disputeStats()
      .then((res) => alive && setS(res))
      .catch((err) => toast.error(err instanceof HttpError ? err.detail || err.code : "Could not load disputes."));
    return () => {
      alive = false;
    };
  }, []);

  if (!s) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const maxMonth = s.months.reduce((a, m) => Math.max(a, m.n), 1);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-accent/40 px-4 py-3 text-sm">
        <b>Dispute cases in this dashboard.</b>
        <p className="mt-1 text-xs text-muted-foreground">
          Counted from the dispute queue. The live PayPal and Whop dispute feeds (and the history in the monitoring
          sheet) are not connected yet, so disputes only show here once someone opens a dispute case.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Open" value={nf(s.open)} sub="waiting on us or the processor" />
        <Kpi label="Past the due date" value={nf(s.pastDue)} tone={s.pastDue ? "crit" : ""} sub="open, deadline already passed" />
        <Kpi label="Answered" value={nf(s.answered)} sub="with a response date recorded" />
        <Kpi label="Closed" value={nf(s.resolved)} sub="resolved in the dashboard" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 text-sm font-semibold">Opened per month</div>
            {s.months.length === 0 ? (
              <p className="text-xs text-muted-foreground">No dispute cases in the last 12 months.</p>
            ) : (
              <div className="space-y-1.5">
                {s.months.map((m) => (
                  <div key={m.month} className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-mono">{m.month}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <i className="block h-full rounded-full bg-primary" style={{ width: `${(m.n / maxMonth) * 100}%` }} />
                    </div>
                    <span className="w-10 text-right font-mono">{m.n}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="mb-3 text-sm font-semibold">Outcomes</div>
            {s.outcomes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No outcome recorded yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {s.outcomes.map((o) => (
                  <Badge key={o.outcome} variant="secondary">
                    {o.outcome} · {o.n}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-1 text-sm font-semibold">Products in dispute threats</div>
          <p className="mb-3 text-xs text-muted-foreground">
            Counted from the products named on dispute cases in the last 12 months — to see which product keeps causing them.
          </p>
          {(s.products || []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No product has been named on a dispute case yet.</p>
          ) : (
            <div className="space-y-2">
              {s.products.map((p) => (
                <div key={`${p.productId}-${p.title}`} className="rounded-md border px-3 py-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium">{p.title}</span>
                    <Badge variant="secondary">
                      {p.cases} case{p.cases === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  {p.variants.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.variants.map((v) => (
                        <span key={v.variant} className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                          {v.variant} · {v.cases}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Open disputes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.stores.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-xs text-muted-foreground">
                  No open dispute cases.
                </TableCell>
              </TableRow>
            )}
            {s.stores.map((st) => (
              <TableRow key={st.storeId} className="cursor-pointer" onClick={() => setView("dispute")}>
                <TableCell className="text-sm">{st.name}</TableCell>
                <TableCell>{st.supplier ? <Badge variant="secondary">{st.supplier}</Badge> : "—"}</TableCell>
                <TableCell className="font-mono text-xs">{st.open}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
