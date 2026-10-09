import * as React from "react";
import { ChevronDown, Download } from "lucide-react";

import { PERIODS } from "@/lib/period";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FilterSelect } from "@/components/common/Filters";

export const NO_FILTERS = { period: "all", from: "", to: "", submittedBy: "all", handledBy: "all", storeId: "all" };

export const filtersOn = (f) =>
  f.period !== "all" || f.submittedBy !== "all" || f.handledBy !== "all" || f.storeId !== "all";

const withAll = (label, list) => [["all", label]].concat(list);

/**
 * The filters every case list shares: when it was opened, who submitted it,
 * who handled it and which store. `onExport(kind)` adds an Export CSV menu.
 */
export function CaseFilterBar({ filters, onChange, options, onExport, exporting }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const people = (list) => withAll("Anyone", (list || []).map((n) => [n, n]));
  const stores = withAll("All stores", (options?.stores || []).map((s) => [s.id, s.name]));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect label="Opened" options={PERIODS} value={filters.period} onChange={(v) => set({ period: v })} />
      {filters.period === "custom" && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value })} className="h-8 w-36 text-xs" aria-label="From" />
          to
          <Input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value })} className="h-8 w-36 text-xs" aria-label="To" />
        </div>
      )}
      <FilterSelect label="Submitted by" options={people(options?.submittedBy)} value={filters.submittedBy} onChange={(v) => set({ submittedBy: v })} />
      <FilterSelect label="Handled by" options={people(options?.handledBy)} value={filters.handledBy} onChange={(v) => set({ handledBy: v })} />
      <FilterSelect label="Store" options={stores} value={filters.storeId} onChange={(v) => set({ storeId: v })} />
      {filtersOn(filters) && (
        <Button variant="ghost" size="xs" onClick={() => onChange(NO_FILTERS)}>
          Clear filters
        </Button>
      )}
      {onExport && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto h-8 gap-1.5 text-xs" loading={exporting}>
              <Download className="h-3.5 w-3.5" /> Export CSV <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onExport("open")}>Open cases</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onExport("resolved")}>Solved cases</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onExport("retracted")}>Retracted cases</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
