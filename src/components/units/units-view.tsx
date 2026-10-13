"use client";

import { useQueryState, parseAsString } from "nuqs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/units/empty-state";
import { UnitCard, type UnitListRow } from "@/components/units/unit-card";

export type { UnitListRow };

export function UnitsView({
  rows,
  total,
  pageSize,
  nextCursor,
}: {
  rows: UnitListRow[];
  total: number;
  pageSize: number;
  nextCursor: string | null;
}) {
  const [cursor, setCursor] = useQueryState(
    "cursor",
    parseAsString.withOptions({ shallow: false }),
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No units yet"
        description="Unit data will appear here after the ETL import. Filters and search are ready."
      />
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      <p className="font-stat text-sm text-muted-foreground">
        {total} unit{total === 1 ? "" : "s"}
        {total > pageSize ? ` · showing ${rows.length}` : ""}
      </p>
      <div className="grid w-full min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
        {rows.map((unit) => (
          <UnitCard key={unit.slug} unit={unit} />
        ))}
      </div>
      {(cursor || nextCursor) && (
        <div className="flex items-center justify-end gap-2 pt-2">
          {cursor ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void setCursor(null)}
            >
              First page
            </Button>
          ) : null}
          {nextCursor ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void setCursor(nextCursor)}
            >
              Next
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
