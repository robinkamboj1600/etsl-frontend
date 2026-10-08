import * as React from "react";

import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * The chip row used on the smaller pages. Each chip carries its own count,
 * so the number you see is the number of rows you get.
 */
export function FilterChips({ options, value, onChange, className }) {
  return (
    <div className={cn("mb-3 flex flex-wrap gap-1.5", className)}>
      {options.map(([key, label, count]) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === key
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {label}
          {count != null && (
            <span className={cn("font-mono", value === key ? "opacity-90" : "opacity-70")}>
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * The status of a queue as tabs (All · To do · Solved · Retracted …), the
 * way most work tools do it: one row, the open tab underlined, a count on
 * each. On a narrow screen the row scrolls instead of wrapping.
 */
export function StatusTabs({ options, value, onChange, className }) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_0_hsl(var(--border))] [scrollbar-width:thin]",
        className,
      )}
    >
      {options.map(([key, label, count]) => {
        const on = value === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              on
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {label}
            {count != null && (
              <span
                className={cn(
                  "min-w-[1.4rem] rounded-full px-1.5 py-0.5 text-center font-mono text-[11px] leading-none",
                  on ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A narrowing filter as a dropdown ("Route: All"), for filters that sit
 * next to the tabs rather than replace them. Options are [key, label, count].
 */
export function FilterSelect({ label, options, value, onChange }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-auto min-w-[10rem] gap-2 text-xs" aria-label={label}>
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([key, text, count]) => (
          <SelectItem key={key} value={key}>
            {text}
            {count != null && <span className="ml-2 font-mono text-muted-foreground">{count}</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
