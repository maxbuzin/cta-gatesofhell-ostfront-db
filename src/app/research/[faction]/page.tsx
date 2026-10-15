import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getFactions, getResearchTree, listResearchChoices, listResearchSections } from "@/lib/db/queries/units";
import { editsOpen } from "@/lib/local-edit";
import { FACTIONS } from "@/lib/factions";
import { ResearchBoard } from "@/components/research/research-board";
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
  const emptyTree = { nodes: [], edges: [], sections: [], faction: null };
  const editable = await editsOpen();
  const [factions, tree, research, sectionRows] = await Promise.all([
    withQueryFallback(() => getFactions(), [], "Failed to load factions"),
    withQueryFallback(
      () => getResearchTree(faction),
      emptyTree,
      "Failed to load research tree",
    ),
    editable
      ? withQueryFallback(() => listResearchChoices(), [], "Failed to load research")
      : Promise.resolve([]),
    editable
      ? withQueryFallback(() => listResearchSections(), [], "Failed to load sections")
      : Promise.resolve([]),
  ]);

  return (
    <ResearchBoard
      editable={editable}
      factions={factions.map((row) => ({ slug: row.slug, nameEn: row.nameEn }))}
      research={research}
      sections={sectionRows}
      highlightSlug={highlightSlug}
      factionSlug={faction}
      nodes={tree.nodes.map((n) => ({
        id: n.id,
        slug: n.slug,
        name: n.name,
        branch: n.branch,
        researchCost: n.researchCost,
        sectionId: n.sectionId,
        column: n.column,
        row: n.row,
        sortOrder: n.sortOrder,
        imageUrl: publicImageUrl(researchImageRel(faction, n.slug)),
        units: n.units.map((u) => ({
          unitSlug: u.unitSlug,
          unitName: u.unitName,
          period: u.period,
        })),
      }))}
      edges={tree.edges}
      treeSections={tree.sections}
    />
  );
}

export default function ResearchPage(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <ResearchContent {...props} />
    </Suspense>
  );
}
