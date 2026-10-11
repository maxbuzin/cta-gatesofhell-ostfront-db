import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getFactions, getResearchTree } from "@/lib/db/queries/units";
import { FACTIONS } from "@/lib/factions";
import { cn } from "@/lib/utils";
import { ResearchTreeClient } from "@/components/research/research-tree-client";
import { Skeleton } from "@/components/ui/skeleton";
import { withQueryFallback } from "@/lib/safe-query";
import { isKnownFactionSlug } from "@/lib/faction-slug";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ faction: string }> };

export function generateStaticParams() {
  return FACTIONS.map((f) => ({ faction: f.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { faction } = await params;
  if (!isKnownFactionSlug(faction)) {
    return { title: "Research not found" };
  }
  return { title: `Research Tree – ${faction}` };
}

async function ResearchContent({ params }: Props) {
  const { faction } = await params;
  if (!isKnownFactionSlug(faction)) notFound();
  const emptyTree = { nodes: [], edges: [], faction: null };
  const [factions, tree] = await Promise.all([
    withQueryFallback(() => getFactions(), [], "Failed to load factions"),
    withQueryFallback(
      () => getResearchTree(faction),
      emptyTree,
      "Failed to load research tree",
    ),
  ]);

  const tabs =
    factions.length > 0
      ? factions.map((f) => ({
          slug: f.slug,
          nameEn:
            FACTIONS.find((d) => d.slug === f.slug)?.nameEn || f.nameEn,
          color: f.color,
        }))
      : FACTIONS;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <h1 className="page-title">Research Tree</h1>
      <div className="flex flex-wrap gap-2">
        {tabs.map((f) => (
          <Link
            key={f.slug}
            href={`/research/${f.slug}`}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              f.slug === faction
                ? "border-brass bg-brass/10"
                : "border-border hover:border-primary/50",
            )}
          >
            {f.nameEn}
          </Link>
        ))}
      </div>
      <ResearchTreeClient
        nodes={tree.nodes.map((n) => ({
          id: n.id,
          slug: n.slug,
          name: n.name,
          branch: n.branch,
          researchCost: n.researchCost,
          units: n.units.map((u) => ({
            unitSlug: u.unitSlug,
            unitName: u.unitName,
          })),
        }))}
        edges={tree.edges}
      />
    </div>
  );
}

export default function ResearchPage(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <ResearchContent {...props} />
    </Suspense>
  );
}
