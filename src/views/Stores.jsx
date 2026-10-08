import * as React from "react";
import { toast } from "sonner";
import { Download, Search } from "lucide-react";

import { storesApi, toStoreView } from "@/api/stores";
import { HttpError } from "@/api/http";
import { RETURN_FORMS } from "@/data/returnForms";
import { COUNTRY, flag } from "@/data/geo";

import { useApp } from "@/store/app";
import { adminUrl, helpdeskUrl, returnFormUrl } from "@/lib/rules/links";
import { signatureFor } from "@/lib/rules/confirmations";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { StableLabel } from "@/components/ui/stable-label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterChips } from "@/components/common/Filters";
import { Pagination } from "@/components/common/Pagination";

const isOff = (st) => (st.note || "").toUpperCase().indexOf("OFFBOARD") > -1;
const PAGE_SIZE = 25;

/** Download a return form as a real file, not a navigation. */
function FormButton({ countries }) {
  const only = countries.filter((c) => RETURN_FORMS[c]);
  if (!only.length)
    return (
      <span className="text-xs text-muted-foreground">
        {countries.length ? `${countries.length} · no file` : "—"}
      </span>
    );
  if (only.length === 1)
    return (
      <Button
        asChild
        variant="outline"
        size="xs"
        onClick={(e) => e.stopPropagation()}
      >
        <a
          href={returnFormUrl(only[0])}
          download={`Return form ${COUNTRY[only[0]] || only[0]}.pdf`}
          title={`Download the return form for ${COUNTRY[only[0]] || only[0]}`}
        >
          <Download className="mr-1 h-3 w-3" />
          {flag(only[0])} form
        </a>
      </Button>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          size="xs"
          title="Pick a country and download its return form"
        >
          <Download className="mr-1 h-3 w-3" />
          {only.length} forms
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel>Return form</DropdownMenuLabel>
        {only.map((c) => (
          <DropdownMenuItem key={c} asChild>
            <a
              href={returnFormUrl(c)}
              download={`Return form ${COUNTRY[c] || c}.pdf`}
            >
              {flag(c)} {COUNTRY[c] || c}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Copy the signature in the customer's own language. */
function SignatureCopy({ st }) {
  const [done, setDone] = React.useState("");
  const copy = async (cc) => {
    try {
      await navigator.clipboard.writeText(signatureFor(st, cc));
      setDone(cc);
      setTimeout(() => setDone(""), 1600);
    } catch {
      setDone("");
    }
  };
  if (!st.sgf) return null;
  if (st.cc.length <= 1)
    return (
      <Button
        variant="outline"
        size="xs"
        onClick={(e) => {
          e.stopPropagation();
          copy(st.cc[0] || "UK");
        }}
      >
        <StableLabel value={done ? "Copied" : "Copy"} options={["Copy", "Copied"]} />
      </Button>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          size="xs"
          title="Pick the customer's country — the signature is copied in that language"
        >
          <StableLabel value={done ? "Copied" : "Copy ▾"} options={["Copy ▾", "Copied"]} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel>Copy signature</DropdownMenuLabel>
        {st.cc.map((cc) => (
          <DropdownMenuItem key={cc} onClick={() => copy(cc)}>
            {flag(cc)} {COUNTRY[cc] || cc}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Stores() {
  const { session, setOpenStore } = useApp();
  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [filter, setFilter] = React.useState("active");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(PAGE_SIZE);
  const [list, setList] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [counts, setCounts] = React.useState({ all: 0, active: 0, off: 0, issue: 0 });
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [lastSynced, setLastSynced] = React.useState(null);

  /* A supplier only sees the stores they ship for, and never our Shopify
     admin, helpdesk or signatures. */
  const supOnly = session.org ? (session.role === "cj" ? "CJ" : "DayOne") : null;

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  React.useEffect(() => setPage(1), [debouncedQ, filter, pageSize]);

  const load = React.useCallback(() => {
    setLoading(true);
    storesApi
      .list({ search: debouncedQ || undefined, status: filter, page, pageSize })
      .then((res) => {
        const rows = res.rows.map(toStoreView);
        setList(supOnly ? rows.filter((x) => x.sup === supOnly) : rows);
        setTotal(res.total);
        setCounts(res.counts);
        setLastSynced(res.lastSyncedAt || null);
      })
      .catch((err) => {
        toast.error(err instanceof HttpError ? err.detail || err.code : "Could not load stores.");
      })
      .finally(() => setLoading(false));
  }, [debouncedQ, filter, page, pageSize, supOnly]);

  React.useEffect(() => {
    load();
  }, [load]);

  const opts = [
    ["all", "All stores", counts.all],
    ["active", "Active", counts.active],
    ["issue", "Needs attention", counts.issue],
    ["off", "Offboarded", counts.off],
  ];

  const syncFromSheet = async () => {
    setSyncing(true);
    try {
      const res = await storesApi.sync();
      toast(`Synced ${res.stored} store${res.stored === 1 ? "" : "s"} from the sheet.`);
      load();
    } catch (err) {
      toast.error(err instanceof HttpError ? err.detail || err.code : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChips options={opts} value={filter} onChange={setFilter} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Last synced: {lastSynced ? new Date(lastSynced).toLocaleString("en-GB") : "not yet"} · syncs every day
          </span>
          {session.isAdmin && (
            <Button variant="outline" size="xs" onClick={syncFromSheet} loading={syncing}>
              Sync from sheet
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a store, domain or country…"
            className="pl-8"
          />
        </div>
        {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead>Store URL</TableHead>
              <TableHead>Niche</TableHead>
              <TableHead>Sells to</TableHead>
              {!supOnly && <TableHead>Shopify admin</TableHead>}
              <TableHead>Supplier</TableHead>
              {!supOnly && <TableHead>COG %</TableHead>}
              <TableHead>Return forms</TableHead>
              {!supOnly && <TableHead>Helpdesk</TableHead>}
              {!supOnly && <TableHead>Signature</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && list.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={supOnly ? 5 : 9}
                  className="py-10 text-center text-xs text-muted-foreground"
                >
                  No stores match this filter.
                </TableCell>
              </TableRow>
            )}
            {list.map((st) => (
              <TableRow
                key={st.n}
                className={cn("cursor-pointer", isOff(st) && "opacity-55")}
                onClick={(e) => {
                  if (e.target && e.target.tagName === "A") return;
                  setOpenStore(st);
                }}
              >
                <TableCell>
                  <div className="text-sm">{st.n}</div>
                  {st.note && <Badge variant="warn">{st.note}</Badge>}
                </TableCell>
                <TableCell>
                  <a
                    href={`https://${st.u}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline-offset-2 hover:underline"
                  >
                    {st.u}
                  </a>
                </TableCell>
                <TableCell className="text-sm">{st.ni || "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    {st.cc.slice(0, 4).map((x) => (
                      <button
                        key={x}
                        type="button"
                        title={`Signature in ${COUNTRY[x] || x}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenStore(st, x);
                        }}
                        className="rounded border px-1.5 py-0.5 font-mono text-[11px] hover:bg-accent"
                      >
                        {flag(x)} {x}
                      </button>
                    ))}
                    {st.cc.length > 4 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenStore(st);
                        }}
                        className="rounded border px-1.5 py-0.5 font-mono text-[11px] hover:bg-accent"
                      >
                        +{st.cc.length - 4}
                      </button>
                    )}
                    {st.cc.length > 1 && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        translate
                      </span>
                    )}
                  </div>
                </TableCell>
                {!supOnly && (
                  <TableCell>
                    {st.sd ? (
                      <a
                        href={adminUrl(st.sd)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                      >
                        {st.sd}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                )}
                <TableCell>
                  {st.sup ? <Badge variant="secondary">{st.sup}</Badge> : "—"}
                </TableCell>
                {!supOnly && (
                  <TableCell className="text-sm">
                    {st.cog != null ? `${st.cog}%` : "—"}
                  </TableCell>
                )}
                <TableCell>
                  <FormButton countries={st.rf || []} />
                </TableCell>
                {!supOnly && (
                  <TableCell>
                    {st.hd && helpdeskUrl(st) ? (
                      <a
                        href={helpdeskUrl(st)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title={`${st.mail ? `${st.mail} · ` : ""}open ${st.n} in ${st.hd}`}
                        className="text-xs text-primary underline-offset-2 hover:underline"
                      >
                        {st.hd}
                      </a>
                    ) : (
                      st.hd || "—"
                    )}
                  </TableCell>
                )}
                {!supOnly && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <SignatureCopy st={st} />
                      <span className="max-w-[180px] truncate text-xs text-muted-foreground">
                        {st.sg || "—"}
                      </span>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <p className="text-xs text-muted-foreground">
        A store that sells to more than one country needs the reply written
        in the language of the customer's country, not the store's own.
      </p>
    </div>
  );
}
