"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  countActiveFilters,
  FilterPanel,
  useUnitFilters,
  type BrowseFilterOptions,
  type FactionOpt,
} from "@/components/units/filter-panel";

export function UnitsBrowse({
  factions,
  options,
  legend,
  header,
  children,
}: {
  factions: FactionOpt[];
  options: BrowseFilterOptions;
  legend?: ReactNode;
  header?: ReactNode;
  children: ReactNode;
}) {
  const [params] = useUnitFilters();
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(true);
  const count = countActiveFilters(params);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => {
      const matches = mq.matches;
      setWide(matches);
      if (matches) setOpen(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <div>
      <style>{`@media (min-width: 64rem) { :root { --rail-right: 20rem } }`}</style>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h1 className="page-title">Units</h1>
            {legend}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {header}
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setOpen(true)}
            >
              <SlidersHorizontal className="size-4" />
              Filters{count > 0 ? ` (${count})` : ""}
            </Button>
          </div>
        </div>
        {children}
      </div>

      {wide ? (
        <aside
          data-right-rail
          className="fixed top-(--chrome-h) right-0 z-30 hidden h-[calc(100dvh_-_var(--chrome-h)_-_var(--tray-h,0px))] w-[var(--rail-right)] flex-col overflow-hidden border-l border-border bg-card lg:flex"
        >
          <FilterPanel factions={factions} options={options} />
        </aside>
      ) : null}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-sm">
          <SheetHeader className="border-b border-border pr-10">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {open && !wide ? <FilterPanel factions={factions} options={options} /> : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
