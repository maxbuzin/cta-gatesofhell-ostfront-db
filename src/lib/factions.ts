export type FactionDef = {
  slug: string;
  nameEn: string;
  color: string;
};

/** Canonical faction list for UI fallbacks (empty DB). Exactly one British entry. */
export const FACTIONS: FactionDef[] = [
  { slug: "germany", nameEn: "Germany", color: "#5E6B73" },
  { slug: "ussr", nameEn: "USSR", color: "#B23A2F" },
  { slug: "usa", nameEn: "USA", color: "#4A6B3A" },
  { slug: "british", nameEn: "British Commonwealth", color: "#A8834A" },
  { slug: "finland", nameEn: "Finland", color: "#3E6FA8" },
  { slug: "japan", nameEn: "Japan", color: "#C9C2B0" },
  { slug: "canada", nameEn: "Canada", color: "#B85C38" },
  { slug: "poland", nameEn: "Poland", color: "#8C3A4A" },
];

export const FACTION_COLORS: Record<string, string> = Object.fromEntries(
  FACTIONS.map((f) => [f.slug, f.color]),
);

/** Color lookup including legacy slug aliases. */
FACTION_COLORS["british-commonwealth"] = FACTION_COLORS.british;

export function factionLabel(slug: string, nameEn?: string | null): string {
  if (nameEn) return nameEn;
  return FACTIONS.find((f) => f.slug === slug)?.nameEn ?? slug;
}
