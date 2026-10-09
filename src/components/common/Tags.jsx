import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { ageLevel, hoursLeft } from "@/lib/rules/age";

/** Whose turn it is. The word carries the meaning, the colour only helps. */
export function TurnTag({ c }) {
  if (c.nofunds) return <Badge variant="crit">no funds</Badge>;
  if (c.turn === "wij") return <Badge variant="brand">our turn</Badge>;
  if (c.turn === "supplier") return <Badge variant="warn">supplier</Badge>;
  return <Badge variant="secondary">customer</Badge>;
}

const AGE_PILL = {
  ok: "border-transparent bg-good-soft text-good",
  soon: "border-transparent bg-warn-soft text-warn",
  late: "border-transparent bg-crit-soft text-crit",
};
const AGE_HINT = {
  ok: "Under 8 hours open",
  soon: "Open 8 to 24 hours: getting late",
  late: "Open more than 24 hours: overdue",
};

/**
 * How long it has been open, and how long is left when the case has an
 * evidence deadline. With `timed`, an open case shows a coloured pill by age.
 */
export function AgeTag({ c, timed = false }) {
  const age = c.age === 0 ? "just in" : `${c.age}h`;
  const left = hoursLeft(c);
  const deadline =
    left == null ? null : (
      <span
        className={
          left <= 24 ? "text-crit" : left <= 72 ? "text-warn" : "text-muted-foreground"
        }
      >
        · {left <= 0 ? "overdue" : left < 48 ? `${left}h left` : `${Math.round(left / 24)}d left`}
      </span>
    );

  if (timed && !c.done && !c.retracted) {
    const level = ageLevel(c.age);
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs">
        <span
          title={AGE_HINT[level]}
          className={`inline-flex items-center rounded-full border px-2 py-0.5 font-semibold ${AGE_PILL[level]}`}
        >
          {age}
        </span>
        {deadline}
      </span>
    );
  }
  const tone = c.age >= 48 ? "text-crit" : c.age >= 24 ? "text-warn" : "text-muted-foreground";
  return (
    <span className={`font-mono text-xs ${tone}`}>
      {age} {deadline}
    </span>
  );
}
