import * as React from "react";

import { PEOPLE } from "@/lib/rules/session";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/** The coloured initial every person is recognised by. */
export function Avatar({ uid, large, className }) {
  const u = PEOPLE[uid];
  if (!u)
    return (
      <span
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-semibold",
          className,
        )}
      >
        ?
      </span>
    );
  return (
    <span
      title={`${u.n} · ${u.e}`}
      style={{ background: u.c }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        large ? "h-9 w-9 text-sm" : "h-6 w-6 text-[11px]",
        className,
      )}
    >
      {u.n.charAt(0)}
    </span>
  );
}

/**
 * Who submitted or processed something. A case the AI picked up out of
 * Re:amaze or Zendesk carries its own label instead of a person's name,
 * so feedback on it can be traced back.
 */
export function Who({ uid, c, className }) {
  if (c && c.byAI && (!uid || uid === c.by)) {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <Badge
          variant="brand"
          title={`Opened automatically from the ticket${c.aiConf ? ` · confidence ${c.aiConf}%` : ""}`}
        >
          AI
        </Badge>
        <span className="text-sm">AI agent</span>
      </span>
    );
  }
  const u = PEOPLE[uid];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Avatar uid={uid} />
      <span className="text-sm">{u ? u.n : "—"}</span>
    </span>
  );
}
