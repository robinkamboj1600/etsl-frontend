import * as React from "react";

import { Badge } from "@/components/ui/badge";

/** Whose turn it is. The word carries the meaning, the colour only helps. */
export function TurnTag({ c }) {
  if (c.nofunds) return <Badge variant="crit">no funds</Badge>;
  if (c.turn === "wij") return <Badge variant="brand">our turn</Badge>;
  if (c.turn === "supplier") return <Badge variant="warn">supplier</Badge>;
  return <Badge variant="secondary">customer</Badge>;
}

/**
 * How long it has been open, and how long is left when the case has an
 * evidence deadline.
 */
export function AgeTag({ c }) {
  const age = c.age === 0 ? "just in" : `${c.age}h`;
  const tone =
    c.age >= 48
      ? "text-crit"
      : c.age >= 24
        ? "text-warn"
        : "text-muted-foreground";
  if (!c.due) return <span className={`font-mono text-xs ${tone}`}>{age}</span>;
  const left = c.due - c.age;
  const dtone =
    left <= 24
      ? "text-crit"
      : left <= 72
        ? "text-warn"
        : "text-muted-foreground";
  return (
    <span className={`font-mono text-xs ${tone}`}>
      {age}{" "}
      <span className={dtone}>
        ·{" "}
        {left <= 0
          ? "overdue"
          : left < 48
            ? `${left}h left`
            : `${Math.round(left / 24)}d left`}
      </span>
    </span>
  );
}
