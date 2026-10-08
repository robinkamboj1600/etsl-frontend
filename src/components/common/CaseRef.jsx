import * as React from "react";

import { useApp } from "@/store/app";
import { REAL_QUEUES } from "@/api/cases";
import { cn } from "@/lib/utils";

/** The case number, clickable straight into the case. */
export function CaseRef({ c, className }) {
  const { setOpenId } = useApp();
  return (
    <button
      type="button"
      title="Open this case"
      onClick={(e) => {
        e.stopPropagation();
        setOpenId(c.id, REAL_QUEUES.has(c.dept));
      }}
      className={cn(
        "font-mono text-xs text-primary underline-offset-2 hover:underline",
        className,
      )}
    >
      {c.ref}
    </button>
  );
}

/** The order number, clickable into the same case. */
export function OrderRef({ c, className }) {
  const { setOpenId } = useApp();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setOpenId(c.id, REAL_QUEUES.has(c.dept));
      }}
      className={cn("font-mono text-xs text-primary underline-offset-2 hover:underline", className)}
    >
      #{c.order}
    </button>
  );
}
