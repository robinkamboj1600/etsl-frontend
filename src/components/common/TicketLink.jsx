import * as React from "react";

import { ticketUrl, shortTicket } from "@/lib/rules/links";

/** A helpdesk ticket, shown as "store · id" and opening in a new tab. */
export function TicketLink({ c, label }) {
  const u = ticketUrl(c);
  if (!u) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <a
      href={u}
      title={u}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="font-mono text-xs text-primary underline-offset-2 hover:underline"
    >
      {label || shortTicket(c.turl || u || c.ticket)}
    </a>
  );
}
