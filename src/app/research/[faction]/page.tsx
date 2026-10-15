import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getFactions, getResearchTree, listResearchChoices } from "@/lib/db/queries/units";
import { editsOpen } from "@/lib/local-edit";
import { AddNew } from "@/components/edit/add-new";
import { FACTIONS } from "@/lib/factions";
import { cn } from "@/lib/utils";
import { ResearchTreeClient } from "@/components/research/research-tree-client";
import { Skeleton } from "@/components/ui/skeleton";
import { withQueryFallback } from "@/lib/safe-query";
import { isKnownFactionSlug } from "@/lib/faction-slug";
import { publicImageUrl, researchImageRel } from "@/lib/public-image";

type Params = { params: Promise<{ faction: string }> };
type Props = Params & {
  searchParams: Promise<{ unit?: string | string[] }>;
};

function oneUnit(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(value)) return null;
  return value;
}

export function generateStaticParams() {
  return FACTIONS.map((f) => ({ faction: f.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { faction } = await params;
  if (!isKnownFactionSlug(faction)) {
    return { title: "Research not found" };
  }
  return { title: `Research Tree – ${faction}` };
}

async function ResearchContent({ params, searchParams }: Props) {
  const { faction } = await params;
  const highlightSlug = oneUnit((await searchParams).unit);
  if (!isKnownFactionSlug(faction)) notFound();
  const emptyTree = { nodes: [], edges: [], faction: null };
  const editable = await editsOpen();
  const [factions, tree, research] = await Promise.all([
    withQueryFallback(() => getFactions(), [], "Failed to load factions"),
    withQueryFallback(
      () => getResearchTree(faction),
      emptyTree,
      "Failed to load research tree",
    ),
    editable
      ? withQueryFallback(() => listResearchChoices(), [], "Failed to load research")
      : Promise.resolve([]),
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
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="page-title">Research Tree</h1>
        {editable ? (
          <AddNew
            factions={factions.map((row) => ({ slug: row.slug, nameEn: row.nameEn }))}
            research={research}
          />
        ) : null}
      </div>
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
          imageUrl: publicImageUrl(researchImageRel(faction, n.slug)),
          units: n.units.map((u) => ({
            unitSlug: u.unitSlug,
            unitName: u.unitName,
            period: u.period,
          })),
        }))}
        edges={tree.edges}
        highlightSlug={highlightSlug}
        factionSlug={faction}
        editable={editable}
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
