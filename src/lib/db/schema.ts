import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const unitCategory = pgEnum("unit_category", [
  "infantry",
  "vehicle",
  "gun",
  "emplacement",
]);

export const gameMode = pgEnum("game_mode", [
  "conquest",
  "skirmish",
  "multiplayer",
  "campaign",
]);

export const costKind = pgEnum("cost_kind", [
  "cp",
  "resources",
  "manpower",
  "ammo",
  "fuel",
  "other",
]);

export const sourceKind = pgEnum("source_kind", [
  "google_sheet",
  "fandom_wiki",
  "infantry_explorer",
  "steam_guide",
  "game_files_research",
  "manual_override",
  "community_pr",
]);

export const ammoKind = pgEnum("ammo_kind", [
  "AP",
  "APHE",
  "APCR",
  "APDS",
  "HEAT",
  "HE",
  "HESH",
  "Smoke",
  "Shrapnel",
  "Ball",
  "Tracer",
  "Other",
]);

export const dataConfidence = pgEnum("data_confidence", [
  "verified",
  "community",
  "estimated",
  "disputed",
]);

export const imageLicense = pgEnum("image_license", [
  "cc_by_sa",
  "own_screenshot",
  "permission_granted",
  "fair_use_pending",
  "unknown",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const gameVersions = pgTable(
  "game_versions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    code: text().notNull().unique(),
    name: text(),
    releasedAt: date("released_at"),
    isCurrent: boolean("is_current").notNull().default(false),
    notesUrl: text("notes_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("game_versions_one_current")
      .on(t.isCurrent)
      .where(sql`${t.isCurrent}`),
  ],
);

export const sources = pgTable("sources", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  kind: sourceKind().notNull(),
  title: text().notNull(),
  url: text(),
  license: text(),
  author: text(),
  revision: text(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
  notes: text(),
});

export const factions = pgTable(
  "factions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    slug: text().notNull().unique(),
    nameEn: text("name_en").notNull(),
    namePt: text("name_pt"),
    color: text(),
    sortOrder: smallint("sort_order").default(0),
    strengths: text(),
    weaknesses: text(),
  },
  (t) => [
    check("factions_slug_format", sql`${t.slug} ~ '^[a-z0-9][a-z0-9-]{0,79}$'`),
    check(
      "factions_color_hex",
      sql`${t.color} IS NULL OR ${t.color} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
  ],
);

export const unitTypes = pgTable("unit_types", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  code: text().notNull().unique(),
  category: unitCategory().notNull(),
  nameEn: text("name_en").notNull(),
  sheetTab: text("sheet_tab"),
  icon: text(),
});

export const units = pgTable(
  "units",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    shortName: text("short_name"),
    searchName: text("search_name").notNull(),
    factionId: integer("faction_id")
      .notNull()
      .references(() => factions.id),
    unitTypeId: integer("unit_type_id")
      .notNull()
      .references(() => unitTypes.id),
    crewSize: smallint("crew_size"),
    squadSize: smallint("squad_size"),
    descriptionEn: text("description_en"),
    descriptionPt: text("description_pt"),
    firstVersionId: integer("first_version_id").references(
      () => gameVersions.id,
    ),
    removedVersionId: integer("removed_version_id").references(
      () => gameVersions.id,
    ),
    confidence: dataConfidence().default("community").notNull(),
    primaryImageId: integer("primary_image_id").references(
      (): AnyPgColumn => images.id,
      { onDelete: "set null" },
    ),
    tier: smallint(),
    notes: text(),
    bestAt: text("best_at"),
    weakAgainst: text("weak_against"),
    ...timestamps,
  },
  (t) => [
    index("units_faction_type_idx").on(t.factionId, t.unitTypeId),
    index("units_search_trgm_idx").using(
      "gin",
      sql`${t.searchName} gin_trgm_ops`,
    ),
    check("units_slug_format", sql`${t.slug} ~ '^[a-z0-9][a-z0-9-]{0,79}$'`),
  ],
);

export const unitAliases = pgTable(
  "unit_aliases",
  {
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    alias: text().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.unitId, t.alias] }),
    index("unit_aliases_trgm_idx").using(
      "gin",
      sql`lower(immutable_unaccent(${t.alias})) gin_trgm_ops`,
    ),
  ],
);

export const unitStats = pgTable(
  "unit_stats",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    gameVersionId: integer("game_version_id")
      .notNull()
      .references(() => gameVersions.id),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    hp: integer(),
    armorFrontMm: smallint("armor_front_mm"),
    armorSideMm: smallint("armor_side_mm"),
    armorRearMm: smallint("armor_rear_mm"),
    armorTopMm: smallint("armor_top_mm"),
    turretFrontMm: smallint("turret_front_mm"),
    turretSideMm: smallint("turret_side_mm"),
    turretRearMm: smallint("turret_rear_mm"),
    speedRoadKmh: numeric("speed_road_kmh", {
      precision: 5,
      scale: 1,
      mode: "number",
    }),
    speedOffroadKmh: numeric("speed_offroad_kmh", {
      precision: 5,
      scale: 1,
      mode: "number",
    }),
    reverseSpeedKmh: numeric("reverse_speed_kmh", {
      precision: 5,
      scale: 1,
      mode: "number",
    }),
    turretTraverseDegS: numeric("turret_traverse_deg_s", {
      precision: 5,
      scale: 1,
      mode: "number",
    }),
    hullTraverseDegS: numeric("hull_traverse_deg_s", {
      precision: 5,
      scale: 1,
      mode: "number",
    }),
    reloadS: numeric("reload_s", { precision: 5, scale: 2, mode: "number" }),
    visionRangeM: smallint("vision_range_m"),
    startingVeterancy: smallint("starting_veterancy"),
    weightT: numeric("weight_t", { precision: 6, scale: 2, mode: "number" }),
    fuelL: smallint("fuel_l"),
    penetrationMm: numeric("penetration_mm", {
      precision: 6,
      scale: 1,
      mode: "number",
    }),
    caliberMm: numeric("caliber_mm", {
      precision: 6,
      scale: 2,
      mode: "number",
    }),
    rangeM: integer("range_m"),
    hpPerSoldier: integer("hp_per_soldier"),
    rifles: smallint(),
    semiAuto: smallint("semi_auto"),
    smgs: smallint(),
    mgs: smallint(),
    atWeapons: smallint("at_weapons"),
    sniperRifles: smallint("sniper_rifles"),
    extra: jsonb().$type<Record<string, number | string>>(),
  },
  (t) => [
    uniqueIndex("unit_stats_unit_version_uq").on(t.unitId, t.gameVersionId),
    index("unit_stats_version_idx").on(t.gameVersionId),
    check("unit_stats_nonneg_hp", sql`${t.hp} IS NULL OR ${t.hp} >= 0`),
    check(
      "unit_stats_nonneg_armor",
      sql`${t.armorFrontMm} IS NULL OR ${t.armorFrontMm} >= 0`,
    ),
    check(
      "unit_stats_nonneg_pen",
      sql`${t.penetrationMm} IS NULL OR ${t.penetrationMm} >= 0`,
    ),
  ],
);

export const unitCosts = pgTable(
  "unit_costs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    gameVersionId: integer("game_version_id")
      .notNull()
      .references(() => gameVersions.id),
    gameMode: gameMode("game_mode").notNull(),
    kind: costKind().notNull(),
    amount: integer().notNull(),
    sourceId: integer("source_id").references(() => sources.id),
  },
  (t) => [
    uniqueIndex("unit_costs_uq").on(
      t.unitId,
      t.gameVersionId,
      t.gameMode,
      t.kind,
    ),
    index("unit_costs_version_mode_idx").on(t.gameVersionId, t.gameMode),
    check("unit_costs_nonneg_amount", sql`${t.amount} >= 0`),
  ],
);

export const weapons = pgTable(
  "weapons",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    caliberMm: numeric("caliber_mm", {
      precision: 6,
      scale: 2,
      mode: "number",
    }),
    weaponClass: text("weapon_class"),
    rateOfFireRpm: numeric("rate_of_fire_rpm", {
      precision: 7,
      scale: 2,
      mode: "number",
    }),
    reloadS: numeric("reload_s", { precision: 5, scale: 2, mode: "number" }),
    maxRangeM: integer("max_range_m"),
    accuracyNote: text("accuracy_note"),
    extra: jsonb(),
  },
  (t) => [check("weapons_slug_format", sql`${t.slug} ~ '^[a-z0-9][a-z0-9-]{0,79}$'`)],
);

export const unitWeapons = pgTable(
  "unit_weapons",
  {
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    weaponId: integer("weapon_id")
      .notNull()
      .references(() => weapons.id, { onDelete: "cascade" }),
    gameVersionId: integer("game_version_id")
      .notNull()
      .references(() => gameVersions.id),
    mount: text().notNull().default("main"),
    quantity: smallint().default(1),
    ammoCapacity: integer("ammo_capacity"),
  },
  (t) => [
    primaryKey({
      columns: [t.unitId, t.weaponId, t.gameVersionId, t.mount],
    }),
  ],
);

export const ammoTypes = pgTable(
  "ammo_types",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    kind: ammoKind().notNull(),
    caliberMm: numeric("caliber_mm", {
      precision: 6,
      scale: 2,
      mode: "number",
    }),
    muzzleVelocityMs: integer("muzzle_velocity_ms"),
    damage: numeric({ precision: 7, scale: 2, mode: "number" }),
    heDamage: numeric("he_damage", { precision: 7, scale: 2, mode: "number" }),
    blastRadiusM: numeric("blast_radius_m", {
      precision: 6,
      scale: 2,
      mode: "number",
    }),
    extra: jsonb(),
  },
  (t) => [check("ammo_types_slug_format", sql`${t.slug} ~ '^[a-z0-9][a-z0-9-]{0,79}$'`)],
);

export const weaponAmmo = pgTable(
  "weapon_ammo",
  {
    weaponId: integer("weapon_id")
      .notNull()
      .references(() => weapons.id, { onDelete: "cascade" }),
    ammoTypeId: integer("ammo_type_id")
      .notNull()
      .references(() => ammoTypes.id, { onDelete: "cascade" }),
    gameVersionId: integer("game_version_id")
      .notNull()
      .references(() => gameVersions.id),
    isDefault: boolean("is_default").default(false),
  },
  (t) => [
    primaryKey({
      columns: [t.weaponId, t.ammoTypeId, t.gameVersionId],
    }),
  ],
);

export const penetrationByRange = pgTable(
  "penetration_by_range",
  {
    ammoTypeId: integer("ammo_type_id")
      .notNull()
      .references(() => ammoTypes.id, { onDelete: "cascade" }),
    gameVersionId: integer("game_version_id")
      .notNull()
      .references(() => gameVersions.id),
    rangeM: integer("range_m").notNull(),
    angleDeg: smallint("angle_deg").notNull().default(0),
    penetrationMm: numeric("penetration_mm", {
      precision: 6,
      scale: 1,
      mode: "number",
    }).notNull(),
    sourceId: integer("source_id").references(() => sources.id),
  },
  (t) => [
    primaryKey({
      columns: [t.ammoTypeId, t.gameVersionId, t.rangeM, t.angleDeg],
    }),
  ],
);

export const specialties = pgTable(
  "specialties",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    slug: text().notNull().unique(),
    nameEn: text("name_en").notNull(),
    descriptionEn: text("description_en"),
    descriptionPt: text("description_pt"),
    icon: text(),
  },
  (t) => [check("specialties_slug_format", sql`${t.slug} ~ '^[a-z0-9][a-z0-9-]{0,79}$'`)],
);

export const unitSpecialties = pgTable(
  "unit_specialties",
  {
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    specialtyId: integer("specialty_id")
      .notNull()
      .references(() => specialties.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.unitId, t.specialtyId] }),
    index("unit_specialties_specialty_idx").on(t.specialtyId, t.unitId),
  ],
);

export const researchNodes = pgTable(
  "research_nodes",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    factionId: integer("faction_id")
      .notNull()
      .references(() => factions.id),
    gameVersionId: integer("game_version_id")
      .notNull()
      .references(() => gameVersions.id),
    slug: text().notNull(),
    name: text().notNull(),
    branch: text(),
    tier: smallint(),
    column: smallint(),
    row: smallint(),
    researchCost: integer("research_cost"),
    sourceId: integer("source_id").references(() => sources.id),
  },
  (t) => [
    uniqueIndex("research_nodes_uq").on(
      t.factionId,
      t.gameVersionId,
      t.slug,
    ),
    check("research_nodes_slug_format", sql`${t.slug} ~ '^[a-z0-9][a-z0-9-]{0,79}$'`),
  ],
);

export const researchEdges = pgTable(
  "research_edges",
  {
    fromNodeId: integer("from_node_id")
      .notNull()
      .references(() => researchNodes.id, { onDelete: "cascade" }),
    toNodeId: integer("to_node_id")
      .notNull()
      .references(() => researchNodes.id, { onDelete: "cascade" }),
    kind: text().notNull().default("requires"),
  },
  (t) => [
    primaryKey({ columns: [t.fromNodeId, t.toNodeId] }),
    check("research_edges_no_self", sql`${t.fromNodeId} <> ${t.toNodeId}`),
    index("research_edges_to_idx").on(t.toNodeId),
  ],
);

export const researchNodeUnits = pgTable(
  "research_node_units",
  {
    nodeId: integer("node_id")
      .notNull()
      .references(() => researchNodes.id, { onDelete: "cascade" }),
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.nodeId, t.unitId] })],
);

export const images = pgTable(
  "images",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    unitId: integer("unit_id").references(() => units.id, {
      onDelete: "set null",
    }),
    kind: text(),
    localPath: text("local_path"),
    blobUrl: text("blob_url"),
    width: integer(),
    height: integer(),
    blurDataUrl: text("blur_data_url"),
    altEn: text("alt_en"),
    altPt: text("alt_pt"),
    license: imageLicense().notNull(),
    author: text(),
    sourceUrl: text("source_url"),
    attributionHtml: text("attribution_html"),
    sha256: text().unique(),
  },
);

export const importRuns = pgTable("import_runs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  gameVersionId: integer("game_version_id").references(() => gameVersions.id),
  gitSha: text("git_sha"),
  stats: jsonb(),
  status: text(),
});

export const popularComparisons = pgTable("popular_comparisons", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: text().notNull(),
  unitSlugs: text("unit_slugs").array().notNull(),
  sortOrder: smallint("sort_order").default(0),
});
