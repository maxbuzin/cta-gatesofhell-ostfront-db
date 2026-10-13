"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  type FactionOpt,
} from "@/components/units/filter-panel";

export function UnitsBrowse({
  factions,
  legend,
  children,
}: {
  factions: FactionOpt[];
  legend?: ReactNode;
  children: ReactNode;
}) {
  const [params] = useUnitFilters();
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(true);
  const count = countActiveFilters(params);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const apply = () => {
      el.style.setProperty("--sb", `${el.offsetWidth - el.clientWidth}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      data-units-frame
      className="flex h-full min-h-0 flex-col overflow-hidden lg:flex-row"
    >
      <div
        ref={scrollRef}
        data-units-scroll
        className="min-h-0 min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto pt-[calc(0.75rem+var(--sb,0px))] pr-3 pb-[calc(0.75rem+var(--sb,0px))]! pl-[calc(0.75rem+var(--sb,0px))]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h1 className="page-title">Units</h1>
            {legend}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 lg:hidden"
            onClick={() => setOpen(true)}
          >
            <SlidersHorizontal className="size-4" />
            Filters{count > 0 ? ` (${count})` : ""}
          </Button>
        </div>
        {children}
      </div>

      {wide ? (
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-card p-4 lg:block">
          <FilterPanel factions={factions} />
        </aside>
      ) : null}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-sm">
          <SheetHeader className="border-b border-border pr-10">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {open && !wide ? <FilterPanel factions={factions} /> : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
