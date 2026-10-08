import * as React from "react";
import { toast } from "sonner";

import { storesApi, toStoreView } from "@/api/stores";
import { casesApi } from "@/api/cases";
import { HttpError } from "@/api/http";
import { nf } from "@/lib/rules/format";
import { useApp } from "@/store/app";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FilterChips } from "@/components/common/Filters";

const EMPTY = { refunds: 0, cancellations: 0, replacements: 0, vouchers: 0, disputes: 0 };

function Kpi({ label, value, sub }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="font-display text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

const fail = (err, msg) => toast.error(err instanceof HttpError ? err.detail || err.code : msg);

export function Overview() {
  const { setOpenStore } = useApp();
  const [q, setQ] = React.useState("");
  const [sup, setSup] = React.useState("all");
  const [days, setDays] = React.useState("30");
  const [sort, setSort] = React.useState("refunds");
  const [storeList, setStoreList] = React.useState([]);
  const [stats, setStats] = React.useState({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    storesApi
      .list({ status: "active", pageSize: 200 })
      .then((res) => alive && setStoreList(res.rows.map(toStoreView)))
      .catch((err) => fail(err, "Could not load stores."));
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    casesApi
      .storeStats(Number(days))
      .then((res) => {
        if (!alive) return;
        const m = {};
        res.rows.forEach((r) => (m[r.storeId] = r));
        setStats(m);
      })
      .catch((err) => fail(err, "Could not load the case counts."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [days]);

  const rowsD = storeList.map((st) => ({ ...EMPTY, ...(stats[st.id] || {}), st }));
  const tot = rowsD.reduce(
    (a, d) => ({
      refunds: a.refunds + d.refunds,
      cancellations: a.cancellations + d.cancellations,
      replacements: a.replacements + d.replacements,
      vouchers: a.vouchers + d.vouchers,
      disputes: a.disputes + d.disputes,
    }),
    { ...EMPTY },
  );

  let list = rowsD.filter((d) => {
    if (sup !== "all" && d.st.sup !== sup) return false;
    if (!q.trim()) return true;
    return `${d.st.n} ${d.st.u}`.toLowerCase().indexOf(q.toLowerCase().trim()) > -1;
  });
  list = list.slice().sort((a, b) => b[sort] - a[sort] || a.st.n.localeCompare(b.st.n));

  const headers = [
    ["Store", ""],
    ["Supplier", ""],
    ["Refunds", "refunds"],
    ["Cancellations", "cancellations"],
    ["Replacements", "replacements"],
    ["Vouchers", "vouchers"],
    ["Disputes", "disputes"],
  ];
  const period = `last ${days} days`;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-accent/40 px-4 py-3 text-sm">
        <b>Case counts from the dashboard, {period}.</b>
        <p className="mt-1 text-xs text-muted-foreground">
          Every number is counted from the cases opened in this dashboard (rejected ones left out). Refund and
          chargeback <i>rates</i> need each store's order count from Shopify, which is not connected yet — so no rate
          is shown rather than a guessed one.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Refunds" value={nf(tot.refunds)} sub={period} />
        <Kpi label="Cancellations" value={nf(tot.cancellations)} sub={period} />
        <Kpi label="Replacements" value={nf(tot.replacements)} sub={period} />
        <Kpi label="Vouchers" value={nf(tot.vouchers)} sub={period} />
        <Kpi label="Disputes" value={nf(tot.disputes)} sub={period} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a store…" className="w-56" />
        <FilterChips
          className="mb-0"
          options={[
            ["all", "All suppliers"],
            ["CJ", "CJ"],
            ["DayOne", "DayOne"],
          ]}
          value={sup}
          onChange={setSup}
        />
        <FilterChips
          className="mb-0"
          options={[
            ["7", "7 days"],
            ["30", "30 days"],
            ["90", "90 days"],
          ]}
          value={days}
          onChange={setDays}
        />
        <span className="text-xs text-muted-foreground">Click a column header to sort by it.</span>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map(([label, key]) => (
                <TableHead
                  key={label}
                  onClick={key ? () => setSort(key) : undefined}
                  className={cn(key && "cursor-pointer select-none", sort === key && "text-primary")}
                >
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={headers.length} className="py-8 text-center text-xs text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              list.map((d) => (
                <TableRow key={d.st.id} className="cursor-pointer" onClick={() => setOpenStore(d.st)}>
                  <TableCell className="text-sm">{d.st.n}</TableCell>
                  <TableCell>{d.st.sup ? <Badge variant="secondary">{d.st.sup}</Badge> : "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{d.refunds}</TableCell>
                  <TableCell className="font-mono text-xs">{d.cancellations}</TableCell>
                  <TableCell className="font-mono text-xs">{d.replacements}</TableCell>
                  <TableCell className="font-mono text-xs">{d.vouchers}</TableCell>
                  <TableCell className="font-mono text-xs">{d.disputes}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      <p className="text-xs text-muted-foreground">{list.length} active stores.</p>
    </div>
  );
}
