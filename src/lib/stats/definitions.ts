export type StatGroup =
  | "green"
  | "yellow"
  | "red"
  | "pink"
  | "blue"
  | "gray"
  | "purple";

export type StatDirection = "higher" | "lower" | "neutral";

export type StatDef = {
  key: string;
  label: string;
  group: StatGroup;
  direction: StatDirection;
  unit: string;
  icon:
    | "Gauge"
    | "Timer"
    | "Shield"
    | "Heart"
    | "Crosshair"
    | "CircleDot"
    | "Ruler"
    | "HardHat"
    | "Coins"
    | "Star"
    | "Eye"
    | "Users"
    | "Weight";
  family: "Cost" | "Survivability" | "Mobility" | "Firepower" | "Vision" | "Other";
};

export const STATS = {
  speedRoadKmh: {
    key: "speedRoadKmh",
    label: "Speed",
    group: "green",
    direction: "higher",
    unit: "km/h",
    icon: "Gauge",
    family: "Mobility",
  },
  reloadS: {
    key: "reloadS",
    label: "Reload",
    group: "green",
    direction: "lower",
    unit: "s",
    icon: "Timer",
    family: "Firepower",
  },
  armorFrontMm: {
    key: "armorFrontMm",
    label: "Armor",
    group: "yellow",
    direction: "higher",
    unit: "mm",
    icon: "Shield",
    family: "Survivability",
  },
  hp: {
    key: "hp",
    label: "HP",
    group: "yellow",
    direction: "higher",
    unit: "",
    icon: "Heart",
    family: "Survivability",
  },
  penetrationMm: {
    key: "penetrationMm",
    label: "Penetration",
    group: "red",
    direction: "higher",
    unit: "mm",
    icon: "Crosshair",
    family: "Firepower",
  },
  caliberMm: {
    key: "caliberMm",
    label: "Caliber",
    group: "pink",
    direction: "neutral",
    unit: "mm",
    icon: "CircleDot",
    family: "Firepower",
  },
  rangeM: {
    key: "rangeM",
    label: "Range",
    group: "blue",
    direction: "higher",
    unit: "m",
    icon: "Ruler",
    family: "Firepower",
  },
  visionRangeM: {
    key: "visionRangeM",
    label: "Line of sight",
    group: "blue",
    direction: "higher",
    unit: "m",
    icon: "Eye",
    family: "Vision",
  },
  costCp: {
    key: "costCp",
    label: "Helmet (CP)",
    group: "gray",
    direction: "lower",
    unit: "CP",
    icon: "HardHat",
    family: "Cost",
  },
  costResources: {
    key: "costResources",
    label: "Shield (Resources)",
    group: "gray",
    direction: "lower",
    unit: "",
    icon: "Coins",
    family: "Cost",
  },
  startingVeterancy: {
    key: "startingVeterancy",
    label: "Starting Veterancy",
    group: "purple",
    direction: "higher",
    unit: "",
    icon: "Star",
    family: "Other",
  },
  squadSize: {
    key: "squadSize",
    label: "Squad size",
    group: "purple",
    direction: "neutral",
    unit: "",
    icon: "Users",
    family: "Other",
  },
  weightT: {
    key: "weightT",
    label: "Weight",
    group: "purple",
    direction: "neutral",
    unit: "t",
    icon: "Weight",
    family: "Other",
  },
} as const satisfies Record<string, StatDef>;

export const FACTION_COLORS: Record<string, string> = {
  germany: "#5E6B73",
  ussr: "#B23A2F",
  usa: "#4A6B3A",
  british: "#A8834A",
  "british-commonwealth": "#A8834A",
  finland: "#3E6FA8",
  japan: "#C9C2B0",
};

export const UNIT_TYPE_TILES = [
  { code: "tank", label: "Tanks", icon: "Tank" },
  { code: "tank_destroyer", label: "Tank Destroyers & SPG", icon: "Crosshair" },
  { code: "armored_car", label: "Armored Cars & Light Vehicles", icon: "Car" },
  { code: "support_vehicle", label: "Support Vehicles & Trucks", icon: "Truck" },
  { code: "at_gun", label: "AT Guns", icon: "Target" },
  { code: "aa_gun", label: "AA Guns", icon: "Radar" },
  { code: "artillery", label: "Artillery", icon: "Bomb" },
  { code: "mortar", label: "Mortars & Rockets", icon: "Rocket" },
  { code: "mg_emplacement", label: "MG Emplacements", icon: " fort" },
  { code: "infantry_squad", label: "Infantry", icon: "Users" },
] as const;

/** Intensity 0 (worst) to 1 (best) for a value in a cohort. */
export function gradeIntensity(
  value: number | null | undefined,
  min: number,
  max: number,
  direction: StatDirection,
): number {
  if (value === null || value === undefined || min === max) return 0.35;
  const t = (value - min) / (max - min);
  if (direction === "lower") return 1 - t;
  if (direction === "neutral") return 0.45;
  return t;
}

export function intensityStyle(
  group: StatGroup,
  intensity: number,
): { backgroundColor: string } {
  const alpha = Math.max(0.1, Math.min(0.5, 0.1 + intensity * 0.4));
  return {
    backgroundColor: `color-mix(in srgb, var(--stat-${group}) ${Math.round(alpha * 100)}%, transparent)`,
  };
}
