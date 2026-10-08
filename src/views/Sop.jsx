import * as React from "react";

import { SOPS } from "@/data/sops";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { FilterChips } from "@/components/common/Filters";

function Node({ n, tone }) {
  const t = n.tone || tone || "accent";
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-2.5 text-center",
        t === "good"
          ? "border-good/40 bg-good-soft text-good"
          : t === "warn"
            ? "border-warn/40 bg-warn-soft text-warn"
            : t === "crit"
              ? "border-crit/40 bg-crit-soft text-crit"
              : t === "muted"
                ? "border-border bg-muted text-muted-foreground"
                : "border-primary/40 bg-accent text-accent-foreground",
      )}
    >
      <b className="block text-[13px] font-semibold">{n.t}</b>
      {n.d && <small className="block text-xs opacity-80">{n.d}</small>}
    </div>
  );
}

function Edge({ label }) {
  return (
    <div className="flex flex-col items-center py-1.5">
      <span className="h-4 w-px bg-border" />
      {label && (
        <span className="my-0.5 text-[11px] text-muted-foreground">
          {label}
        </span>
      )}
      {label && <span className="h-4 w-px bg-border" />}
    </div>
  );
}

/** The flows behind every decision, as the CS team works them. */
export function Sop() {
  const [sopId, setSopId] = React.useState(SOPS[0].id);
  const f = SOPS.filter((x) => x.id === sopId)[0];

  return (
    <div className="space-y-4">
      <FilterChips
        options={SOPS.map((s) => [s.id, s.name])}
        value={sopId}
        onChange={setSopId}
      />

      <Card className="mx-auto max-w-3xl">
        <CardContent className="p-6">
          <div className="mb-1 text-center font-display text-sm font-semibold">
            {f.head}
          </div>
          <Edge />
          <Node n={f.step} tone="accent" />
          <Edge />
          <Node n={f.dec} tone="accent" />

          <div className="mt-2 grid gap-6 sm:grid-cols-2">
            {[f.left, f.right].map((br) => (
              <div key={br.label}>
                <div className="mb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {br.label}
                </div>
                {br.nodes.map((n, i) => (
                  <React.Fragment key={`${n.t}-${i}`}>
                    <Edge label={i ? n.e : null} />
                    <Node n={n} tone={br.tone} />
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>

          <div
            className={cn(
              "mt-6 rounded-lg border px-4 py-3 text-center",
              f.rule.tone === "good"
                ? "border-good/40 bg-good-soft text-good"
                : "border-border bg-muted",
            )}
          >
            <b className="block text-[13px]">{f.rule.t}</b>
            {f.rule.d && (
              <small className="text-xs opacity-80">{f.rule.d}</small>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        These are the flows the AI follows. If a customer accepts an offer,
        submit the case so a specialist can execute it.
      </p>
    </div>
  );
}
