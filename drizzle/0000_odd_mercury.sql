CREATE TYPE "public"."ammo_kind" AS ENUM('AP', 'APHE', 'APCR', 'APDS', 'HEAT', 'HE', 'HESH', 'Smoke', 'Shrapnel', 'Ball', 'Tracer', 'Other');--> statement-breakpoint
CREATE TYPE "public"."cost_kind" AS ENUM('cp', 'resources', 'manpower', 'ammo', 'fuel', 'other');--> statement-breakpoint
CREATE TYPE "public"."data_confidence" AS ENUM('verified', 'community', 'estimated', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."game_mode" AS ENUM('conquest', 'skirmish', 'multiplayer', 'campaign');--> statement-breakpoint
CREATE TYPE "public"."image_license" AS ENUM('cc_by_sa', 'own_screenshot', 'permission_granted', 'fair_use_pending', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('google_sheet', 'fandom_wiki', 'infantry_explorer', 'steam_guide', 'game_files_research', 'manual_override', 'community_pr');--> statement-breakpoint
CREATE TYPE "public"."unit_category" AS ENUM('infantry', 'vehicle', 'gun', 'emplacement');--> statement-breakpoint
CREATE TABLE "ammo_types" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ammo_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "ammo_kind" NOT NULL,
	"caliber_mm" numeric(6, 2),
	"muzzle_velocity_ms" integer,
	"damage" numeric(7, 2),
	"he_damage" numeric(7, 2),
	"blast_radius_m" numeric(6, 2),
	"extra" jsonb,
	CONSTRAINT "ammo_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "factions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "factions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_pt" text,
	"color" text,
	"sort_order" smallint DEFAULT 0,
	"strengths" text,
	"weaknesses" text,
	CONSTRAINT "factions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "game_versions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game_versions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text,
	"released_at" date,
	"is_current" boolean DEFAULT false NOT NULL,
	"notes_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_versions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "images_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"unit_id" integer,
	"kind" text,
	"local_path" text,
	"blob_url" text,
	"width" integer,
	"height" integer,
	"blur_data_url" text,
	"alt_en" text,
	"alt_pt" text,
	"license" "image_license" NOT NULL,
	"author" text,
	"source_url" text,
	"attribution_html" text,
	"sha256" text,
	CONSTRAINT "images_sha256_unique" UNIQUE("sha256")
);
--> statement-breakpoint
CREATE TABLE "import_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "import_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"game_version_id" integer,
	"git_sha" text,
	"stats" jsonb,
	"status" text
);
--> statement-breakpoint
CREATE TABLE "penetration_by_range" (
	"ammo_type_id" integer NOT NULL,
	"game_version_id" integer NOT NULL,
	"range_m" integer NOT NULL,
	"angle_deg" smallint DEFAULT 0 NOT NULL,
	"penetration_mm" numeric(6, 1) NOT NULL,
	"source_id" integer,
	CONSTRAINT "penetration_by_range_ammo_type_id_game_version_id_range_m_angle_deg_pk" PRIMARY KEY("ammo_type_id","game_version_id","range_m","angle_deg")
);
--> statement-breakpoint
CREATE TABLE "popular_comparisons" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "popular_comparisons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"unit_slugs" text[] NOT NULL,
	"sort_order" smallint DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "research_edges" (
	"from_node_id" integer NOT NULL,
	"to_node_id" integer NOT NULL,
	"kind" text DEFAULT 'requires' NOT NULL,
	CONSTRAINT "research_edges_from_node_id_to_node_id_pk" PRIMARY KEY("from_node_id","to_node_id"),
	CONSTRAINT "research_edges_no_self" CHECK ("research_edges"."from_node_id" <> "research_edges"."to_node_id")
);
--> statement-breakpoint
CREATE TABLE "research_node_units" (
	"node_id" integer NOT NULL,
	"unit_id" integer NOT NULL,
	CONSTRAINT "research_node_units_node_id_unit_id_pk" PRIMARY KEY("node_id","unit_id")
);
--> statement-breakpoint
CREATE TABLE "research_nodes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "research_nodes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"faction_id" integer NOT NULL,
	"game_version_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"branch" text,
	"tier" smallint,
	"column" smallint,
	"row" smallint,
	"research_cost" integer,
	"source_id" integer
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"kind" "source_kind" NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"license" text,
	"author" text,
	"revision" text,
	"retrieved_at" timestamp with time zone NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "specialties" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "specialties_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"description_en" text,
	"description_pt" text,
	"icon" text,
	CONSTRAINT "specialties_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "unit_aliases" (
	"unit_id" integer NOT NULL,
	"alias" text NOT NULL,
	CONSTRAINT "unit_aliases_unit_id_alias_pk" PRIMARY KEY("unit_id","alias")
);
--> statement-breakpoint
CREATE TABLE "unit_costs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "unit_costs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"unit_id" integer NOT NULL,
	"game_version_id" integer NOT NULL,
	"game_mode" "game_mode" NOT NULL,
	"kind" "cost_kind" NOT NULL,
	"amount" integer NOT NULL,
	"source_id" integer
);
--> statement-breakpoint
CREATE TABLE "unit_specialties" (
	"unit_id" integer NOT NULL,
	"specialty_id" integer NOT NULL,
	CONSTRAINT "unit_specialties_unit_id_specialty_id_pk" PRIMARY KEY("unit_id","specialty_id")
);
--> statement-breakpoint
CREATE TABLE "unit_stats" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "unit_stats_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"unit_id" integer NOT NULL,
	"game_version_id" integer NOT NULL,
	"source_id" integer NOT NULL,
	"hp" integer,
	"armor_front_mm" smallint,
	"armor_side_mm" smallint,
	"armor_rear_mm" smallint,
	"armor_top_mm" smallint,
	"turret_front_mm" smallint,
	"turret_side_mm" smallint,
	"turret_rear_mm" smallint,
	"speed_road_kmh" numeric(5, 1),
	"speed_offroad_kmh" numeric(5, 1),
	"reverse_speed_kmh" numeric(5, 1),
	"turret_traverse_deg_s" numeric(5, 1),
	"hull_traverse_deg_s" numeric(5, 1),
	"reload_s" numeric(5, 2),
	"vision_range_m" smallint,
	"starting_veterancy" smallint,
	"weight_t" numeric(6, 2),
	"fuel_l" smallint,
	"penetration_mm" numeric(6, 1),
	"caliber_mm" numeric(6, 2),
	"range_m" integer,
	"hp_per_soldier" integer,
	"rifles" smallint,
	"semi_auto" smallint,
	"smgs" smallint,
	"mgs" smallint,
	"at_weapons" smallint,
	"sniper_rifles" smallint,
	"extra" jsonb
);
--> statement-breakpoint
CREATE TABLE "unit_types" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "unit_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"category" "unit_category" NOT NULL,
	"name_en" text NOT NULL,
	"sheet_tab" text,
	"icon" text,
	CONSTRAINT "unit_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "unit_weapons" (
	"unit_id" integer NOT NULL,
	"weapon_id" integer NOT NULL,
	"game_version_id" integer NOT NULL,
	"mount" text DEFAULT 'main' NOT NULL,
	"quantity" smallint DEFAULT 1,
	"ammo_capacity" integer,
	CONSTRAINT "unit_weapons_unit_id_weapon_id_game_version_id_mount_pk" PRIMARY KEY("unit_id","weapon_id","game_version_id","mount")
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "units_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"search_name" text NOT NULL,
	"faction_id" integer NOT NULL,
	"unit_type_id" integer NOT NULL,
	"crew_size" smallint,
	"squad_size" smallint,
	"description_en" text,
	"description_pt" text,
	"first_version_id" integer,
	"removed_version_id" integer,
	"confidence" "data_confidence" DEFAULT 'community' NOT NULL,
	"primary_image_id" integer,
	"tier" smallint,
	"notes" text,
	"best_at" text,
	"weak_against" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "units_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "weapon_ammo" (
	"weapon_id" integer NOT NULL,
	"ammo_type_id" integer NOT NULL,
	"game_version_id" integer NOT NULL,
	"is_default" boolean DEFAULT false,
	CONSTRAINT "weapon_ammo_weapon_id_ammo_type_id_game_version_id_pk" PRIMARY KEY("weapon_id","ammo_type_id","game_version_id")
);
--> statement-breakpoint
CREATE TABLE "weapons" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "weapons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"caliber_mm" numeric(6, 2),
	"weapon_class" text,
	"rate_of_fire_rpm" numeric(7, 2),
	"reload_s" numeric(5, 2),
	"max_range_m" integer,
	"accuracy_note" text,
	"extra" jsonb,
	CONSTRAINT "weapons_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_runs" ADD CONSTRAINT "import_runs_game_version_id_game_versions_id_fk" FOREIGN KEY ("game_version_id") REFERENCES "public"."game_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penetration_by_range" ADD CONSTRAINT "penetration_by_range_ammo_type_id_ammo_types_id_fk" FOREIGN KEY ("ammo_type_id") REFERENCES "public"."ammo_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penetration_by_range" ADD CONSTRAINT "penetration_by_range_game_version_id_game_versions_id_fk" FOREIGN KEY ("game_version_id") REFERENCES "public"."game_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penetration_by_range" ADD CONSTRAINT "penetration_by_range_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_edges" ADD CONSTRAINT "research_edges_from_node_id_research_nodes_id_fk" FOREIGN KEY ("from_node_id") REFERENCES "public"."research_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_edges" ADD CONSTRAINT "research_edges_to_node_id_research_nodes_id_fk" FOREIGN KEY ("to_node_id") REFERENCES "public"."research_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_node_units" ADD CONSTRAINT "research_node_units_node_id_research_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."research_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_node_units" ADD CONSTRAINT "research_node_units_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_nodes" ADD CONSTRAINT "research_nodes_faction_id_factions_id_fk" FOREIGN KEY ("faction_id") REFERENCES "public"."factions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_nodes" ADD CONSTRAINT "research_nodes_game_version_id_game_versions_id_fk" FOREIGN KEY ("game_version_id") REFERENCES "public"."game_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_nodes" ADD CONSTRAINT "research_nodes_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_aliases" ADD CONSTRAINT "unit_aliases_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_costs" ADD CONSTRAINT "unit_costs_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_costs" ADD CONSTRAINT "unit_costs_game_version_id_game_versions_id_fk" FOREIGN KEY ("game_version_id") REFERENCES "public"."game_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_costs" ADD CONSTRAINT "unit_costs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_specialties" ADD CONSTRAINT "unit_specialties_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_specialties" ADD CONSTRAINT "unit_specialties_specialty_id_specialties_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_stats" ADD CONSTRAINT "unit_stats_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_stats" ADD CONSTRAINT "unit_stats_game_version_id_game_versions_id_fk" FOREIGN KEY ("game_version_id") REFERENCES "public"."game_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_stats" ADD CONSTRAINT "unit_stats_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_weapons" ADD CONSTRAINT "unit_weapons_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_weapons" ADD CONSTRAINT "unit_weapons_weapon_id_weapons_id_fk" FOREIGN KEY ("weapon_id") REFERENCES "public"."weapons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_weapons" ADD CONSTRAINT "unit_weapons_game_version_id_game_versions_id_fk" FOREIGN KEY ("game_version_id") REFERENCES "public"."game_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_faction_id_factions_id_fk" FOREIGN KEY ("faction_id") REFERENCES "public"."factions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_unit_type_id_unit_types_id_fk" FOREIGN KEY ("unit_type_id") REFERENCES "public"."unit_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_first_version_id_game_versions_id_fk" FOREIGN KEY ("first_version_id") REFERENCES "public"."game_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_removed_version_id_game_versions_id_fk" FOREIGN KEY ("removed_version_id") REFERENCES "public"."game_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weapon_ammo" ADD CONSTRAINT "weapon_ammo_weapon_id_weapons_id_fk" FOREIGN KEY ("weapon_id") REFERENCES "public"."weapons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weapon_ammo" ADD CONSTRAINT "weapon_ammo_ammo_type_id_ammo_types_id_fk" FOREIGN KEY ("ammo_type_id") REFERENCES "public"."ammo_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weapon_ammo" ADD CONSTRAINT "weapon_ammo_game_version_id_game_versions_id_fk" FOREIGN KEY ("game_version_id") REFERENCES "public"."game_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_versions_one_current" ON "game_versions" USING btree ("is_current") WHERE "game_versions"."is_current";--> statement-breakpoint
CREATE INDEX "research_edges_to_idx" ON "research_edges" USING btree ("to_node_id");--> statement-breakpoint
CREATE UNIQUE INDEX "research_nodes_uq" ON "research_nodes" USING btree ("faction_id","game_version_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_costs_uq" ON "unit_costs" USING btree ("unit_id","game_version_id","game_mode","kind");--> statement-breakpoint
CREATE INDEX "unit_costs_version_mode_idx" ON "unit_costs" USING btree ("game_version_id","game_mode");--> statement-breakpoint
CREATE INDEX "unit_specialties_specialty_idx" ON "unit_specialties" USING btree ("specialty_id","unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_stats_unit_version_uq" ON "unit_stats" USING btree ("unit_id","game_version_id");--> statement-breakpoint
CREATE INDEX "unit_stats_version_idx" ON "unit_stats" USING btree ("game_version_id");--> statement-breakpoint
CREATE INDEX "units_faction_type_idx" ON "units" USING btree ("faction_id","unit_type_id");