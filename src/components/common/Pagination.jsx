import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** First, last, current, and one neighbour on each side — everything
    else collapses into a single "…". */
function pageWindow(current, total) {
  const pages = new Set([1, total, current, current - 1, current + 1]);
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = pageWindow(page, pageCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          Showing{" "}
          <b className="font-medium text-foreground">
            {from}–{to}
          </b>{" "}
          of <b className="font-medium text-foreground">{total}</b>
        </span>
        {onPageSizeChange && (
          <>
            <span className="text-border">·</span>
            <span>Rows:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="h-7 w-[68px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          {pages.map((p, i) => {
            const prev = pages[i - 1];
            const gap = prev != null && p - prev > 1;
            return (
              <React.Fragment key={p}>
                {gap && (
                  <span className="px-0.5 text-xs text-muted-foreground">
                    …
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onPageChange(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    p === page
                      ? "bg-primary text-primary-foreground"
                      : "border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {p}
                </button>
              </React.Fragment>
            );
          })}

          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
