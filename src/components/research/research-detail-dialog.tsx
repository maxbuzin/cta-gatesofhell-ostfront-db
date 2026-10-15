"use client";

import { useEffect, useState, type ReactNode } from "react";

import { UnitFacts } from "@/components/units/unit-facts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatCell } from "@/components/units/stat-cell";
import { loadUnitFacts } from "@/lib/load-unit-facts";
import type { UnitFacts as Facts } from "@/lib/unit-facts";

type LinkedUnit = { unitSlug: string; unitName: string; period: string | null };

export type ResearchDetailNode = {
  name: string;
  branch: string | null;
  researchCost: number | null;
  imageUrl: string | null;
  units: LinkedUnit[];
};

function unitLabel(unit: LinkedUnit, units: LinkedUnit[]) {
  const shared = units.filter((row) => row.unitName === unit.unitName).length > 1;
  return shared && unit.period ? `${unit.unitName} (${unit.period})` : unit.unitName;
}

export function ResearchDetailDialog({
  node,
  onClose,
  children,
}: {
  node: ResearchDetailNode | null;
  onClose: () => void;
  children?: ReactNode;
}) {
  const slugs = node?.units.map((unit) => unit.unitSlug).join("\n") ?? "";
  const list = slugs ? slugs.split("\n") : [];
  const [pick, setPick] = useState<string | null>(null);
  const [pack, setPack] = useState<{ slugs: string; facts: Facts[]; error: string | null } | null>(null);
  const active = pick && list.includes(pick) ? pick : (list[0] ?? "");
  const ready = slugs === "" || pack?.slugs === slugs;
  const facts = ready && pack?.slugs === slugs ? pack.facts : [];
  const error = ready && pack?.slugs === slugs ? pack.error : null;

  useEffect(() => {
    if (!slugs) return;
    let cancel = false;
    loadUnitFacts(slugs.split("\n"))
      .then((rows) => {
        if (!cancel) setPack({ slugs, facts: rows, error: null });
      })
      .catch(() => {
        if (!cancel) setPack({ slugs, facts: [], error: "Could not load this unit." });
      });
    return () => {
      cancel = true;
    };
  }, [slugs]);

  const shown = error ? null : (facts.find((row) => row.slug === active) ?? null);

  return (
    <Dialog open={!!node} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        {node ? (
          <>
            <DialogHeader>
              <DialogTitle>{node.name}</DialogTitle>
              <DialogDescription className="sr-only">{node.name} stats</DialogDescription>
            </DialogHeader>
            {node.imageUrl ? (
              <img
                src={node.imageUrl}
                alt={node.name}
                className="aspect-video w-full rounded-md border border-border object-contain"
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              {node.researchCost != null ? (
                <StatCell value={node.researchCost} label="Research cost" group="gray" icon="Coins" direction="lower" />
              ) : null}
              {node.branch ? (
                <StatCell value={node.branch} label="Branch" group="purple" icon="Star" direction="neutral" />
              ) : null}
            </div>
            {node.units.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {node.units.map((unit) => (
                  <Button
                    key={unit.unitSlug}
                    type="button"
                    size="sm"
                    variant={unit.unitSlug === active ? "default" : "outline"}
                    onClick={() => setPick(unit.unitSlug)}
                  >
                    {unitLabel(unit, node.units)}
                  </Button>
                ))}
              </div>
            ) : null}
            {!ready && slugs ? <p className="text-sm text-muted-foreground">Loading</p> : null}
            {ready && error ? <p className="text-sm text-destructive">{error}</p> : null}
            {ready && !error && node.units.length === 0 ? (
              <p className="text-sm text-muted-foreground">No units linked</p>
            ) : null}
            {ready && !error && node.units.length > 0 && !shown ? (
              <p className="text-sm text-muted-foreground">No stats for this unit.</p>
            ) : null}
            {shown ? <UnitFacts facts={shown} /> : null}
            {children}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
