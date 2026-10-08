import * as React from "react";

import { casesApi, toCaseView } from "@/api/cases";
import { HttpError } from "@/api/http";
import { dept } from "@/lib/rules/permissions";

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
import { CaseRef } from "@/components/common/CaseRef";
import { Who } from "@/components/common/Who";

/** Every case on an order or case number, across the queues this person may see — searched on the server. */
export function SearchResults({ q }) {
  const key = q.trim().toUpperCase().replace(/^#/, "");
  const [hits, setHits] = React.useState(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    setHits(null);
    setError("");
    const t = setTimeout(() => {
      casesApi
        .list({ search: key, pageSize: 100 })
        .then((res) => alive && setHits(res.rows.map(toCaseView)))
        .catch((err) => {
          if (!alive) return;
          setHits([]);
          setError(err instanceof HttpError ? err.detail || err.code : "Search failed.");
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [key]);

  if (hits === null) return <div className="text-sm text-muted-foreground">Searching…</div>;

  if (!hits.length)
    return (
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">{error || "No cases found."}</CardContent>
      </Card>
    );

  const byOrder = {};
  hits.forEach((c) => {
    (byOrder[c.order] = byOrder[c.order] || []).push(c);
  });

  return (
    <div className="space-y-5">
      {Object.keys(byOrder).map((oid) => {
        const st = byOrder[oid][0].store;
        return (
          <div key={oid}>
            <h3 className="mb-2 font-display text-sm font-semibold">
              #{oid}
              {st ? ` · ${st.name}${st.supplier ? ` · ${st.supplier}` : ""}` : ""}
            </h3>
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Open</TableHead>
                    <TableHead>Submitted by</TableHead>
                    <TableHead>Processed by</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byOrder[oid].map((c) => (
                    <TableRow key={c.id} className={c.done ? "opacity-55" : undefined}>
                      <TableCell>
                        <CaseRef c={c} />
                      </TableCell>
                      <TableCell className="text-sm">{(dept(c.dept) || { t: c.dept }).t}</TableCell>
                      <TableCell className="text-sm">{c.reason}</TableCell>
                      <TableCell className="font-mono text-xs">{c.amount ? c.amount.toFixed(2) : "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{c.age === 0 ? "just in" : `${c.age}h`}</TableCell>
                      <TableCell>
                        <Who uid={c.by} c={c} />
                      </TableCell>
                      <TableCell>
                        {c.doneBy ? <Who uid={c.doneBy} /> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {c.retracted ? (
                          <Badge variant="secondary" title={c.retractNote || undefined}>
                            retracted
                          </Badge>
                        ) : c.done ? (
                          <Badge variant="good">done</Badge>
                        ) : (
                          <Badge variant="brand">open</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
