export type TabName =
  | "Infantry"
  | "Tanks"
  | "Tank Destroyers & SPG"
  | "Armored Cars & Light Vehicles"
  | "Support Vehicles & Trucks"
  | "AT Guns"
  | "AA Guns"
  | "Artillery"
  | "Mortars & Rockets"
  | "MG Emplacements";

export type RawRow = {
  tab: TabName;
  rowNumber: number; // 1-based sheet row (header = 1)
  cells: Record<string, string>;
};

export type Issue = {
  level: "warning" | "error" | "info";
  code: string;
  tab: string;
  row?: number;
  message: string;
};

export type ParsedCost = { kind: "cp" | "resources"; amount: number };

export type UnitDraft = {
  tab: TabName;
  rowNumber: number;
  identityKey: string;
  name: string;
  factionSlug: string;
  unitTypeCode: string;
  slug?: string;
  notes: string | null;
  tier: number | null;
  squadSize: number | null;
  crewSize: number | null;
  specialties: string[];
  sourceKey: string;
  costs: ParsedCost[];
  weaponName: string | null;
  stats: Record<string, number | string | null>;
  extra: Record<string, number | string>;
  discriminator: string | null;
  rawFingerprint: string;
};

export type MergeResult = {
  units: UnitDraft[];
  merged: { kept: string; dropped: string }[];
  rejected: { tab: string; row: number; reason: string }[];
  issues: Issue[];
};

export type EtlCounts = {
  read: number;
  units: number;
  withStats: number;
  weapons: number;
  factions: number;
  merged: number;
  rejected: number;
  costs: number;
  specialties: number;
  unitSpecialties: number;
};

export type DryRunReport = {
  patch: string;
  dryRun: boolean;
  counts: EtlCounts;
  expected?: Partial<EtlCounts>;
  matchesExpected: boolean | null;
  rejected: MergeResult["rejected"];
  merged: MergeResult["merged"];
  issues: Issue[];
};
