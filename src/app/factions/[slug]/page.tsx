import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getFactionBySlug,
  getFactionUnitCounts,
  getFactions,
} from "@/lib/db/queries/units";
import { EmptyState } from "@/components/units/empty-state";
import { FACTIONS, FACTION_COLORS } from "@/lib/factions";
import { safeCssColor } from "@/lib/safe-css-color";
import { FactionChart } from "@/components/factions/faction-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { withQueryFallback } from "@/lib/safe-query";
import { isKnownFactionSlug } from "@/lib/faction-slug";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return FACTIONS.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isKnownFactionSlug(slug)) {
    return { title: "Faction not found" };
  }
  const faction = await withQueryFallback(
    () => getFactionBySlug(slug),
    null,
    "Failed to load faction metadata",
  );
  return { title: faction ? faction.nameEn : slug };
}

async function FactionContent({ params }: Props) {
  const { slug } = await params;
  if (!isKnownFactionSlug(slug)) notFound();
  const factions = await withQueryFallback(
    () => getFactions(),
    [],
    "Failed to load factions",
  );
  const fallback = FACTIONS.find((f) => f.slug === slug);
  const faction =
    (await withQueryFallback(
      () => getFactionBySlug(slug),
      null,
      "Failed to load faction",
    )) ||
    (factions.length === 0 && fallback
      ? {
          id: 0,
          slug: fallback.slug,
          nameEn: fallback.nameEn,
          namePt: null,
          color: fallback.color,
          sortOrder: 0,
          strengths: null,
          weaknesses: null,
        }
      : null);

  if (!faction) notFound();

  const counts =
    faction.id > 0
      ? await withQueryFallback(
          () => getFactionUnitCounts(faction.id),
          [],
          "Failed to load faction unit counts",
        )
      : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div
        className="rounded-md border border-border px-6 py-10 paper-grain"
        style={{
          borderColor: safeCssColor(
            faction.color || FACTION_COLORS[faction.slug],
          ),
        }}
      >
        <h1 className="page-title">{faction.nameEn}</h1>
        <p className="mt-2 text-muted-foreground">Faction overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-medium">Strong points</h2>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {(faction.strengths || "")
              .split("\n")
              .filter(Boolean)
              .map((l) => (
                <li key={l}>{l}</li>
              ))}
            {!faction.strengths ? <li>--</li> : null}
          </ul>
        </div>
        <div>
          <h2 className="mb-2 font-medium">Weak points</h2>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {(faction.weaknesses || "")
              .split("\n")
              .filter(Boolean)
              .map((l) => (
                <li key={l}>{l}</li>
              ))}
            {!faction.weaknesses ? <li>--</li> : null}
          </ul>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="font-display text-xl tracking-wide">Units by type</h2>
        {counts.length === 0 ? (
          <EmptyState title="No units yet" />
        ) : (
          <FactionChart data={counts} />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl tracking-wide">Signature units</h2>
        <EmptyState title="No signature units yet" />
      </section>

      <Link
        href={`/research/${faction.slug}`}
        className="inline-flex text-primary hover:underline"
      >
        Open research tree
      </Link>
    </div>
  );
}

export default function FactionPage(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <FactionContent {...props} />
    </Suspense>
  );
}
