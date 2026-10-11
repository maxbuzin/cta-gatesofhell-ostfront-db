ALTER TABLE "units" ADD CONSTRAINT "units_primary_image_id_images_id_fk" FOREIGN KEY ("primary_image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "unit_aliases_trgm_idx" ON "unit_aliases" USING gin (lower(immutable_unaccent("alias")) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "units_search_trgm_idx" ON "units" USING gin ("search_name" gin_trgm_ops);--> statement-breakpoint
ALTER TABLE "ammo_types" ADD CONSTRAINT "ammo_types_slug_format" CHECK ("ammo_types"."slug" ~ '^[a-z0-9][a-z0-9-]{0,79}$');--> statement-breakpoint
ALTER TABLE "factions" ADD CONSTRAINT "factions_slug_format" CHECK ("factions"."slug" ~ '^[a-z0-9][a-z0-9-]{0,79}$');--> statement-breakpoint
ALTER TABLE "factions" ADD CONSTRAINT "factions_color_hex" CHECK ("factions"."color" IS NULL OR "factions"."color" ~ '^#[0-9A-Fa-f]{6}$');--> statement-breakpoint
ALTER TABLE "research_nodes" ADD CONSTRAINT "research_nodes_slug_format" CHECK ("research_nodes"."slug" ~ '^[a-z0-9][a-z0-9-]{0,79}$');--> statement-breakpoint
ALTER TABLE "specialties" ADD CONSTRAINT "specialties_slug_format" CHECK ("specialties"."slug" ~ '^[a-z0-9][a-z0-9-]{0,79}$');--> statement-breakpoint
ALTER TABLE "unit_costs" ADD CONSTRAINT "unit_costs_nonneg_amount" CHECK ("unit_costs"."amount" >= 0);--> statement-breakpoint
ALTER TABLE "unit_stats" ADD CONSTRAINT "unit_stats_nonneg_hp" CHECK ("unit_stats"."hp" IS NULL OR "unit_stats"."hp" >= 0);--> statement-breakpoint
ALTER TABLE "unit_stats" ADD CONSTRAINT "unit_stats_nonneg_armor" CHECK ("unit_stats"."armor_front_mm" IS NULL OR "unit_stats"."armor_front_mm" >= 0);--> statement-breakpoint
ALTER TABLE "unit_stats" ADD CONSTRAINT "unit_stats_nonneg_pen" CHECK ("unit_stats"."penetration_mm" IS NULL OR "unit_stats"."penetration_mm" >= 0);--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_slug_format" CHECK ("units"."slug" ~ '^[a-z0-9][a-z0-9-]{0,79}$');--> statement-breakpoint
ALTER TABLE "weapons" ADD CONSTRAINT "weapons_slug_format" CHECK ("weapons"."slug" ~ '^[a-z0-9][a-z0-9-]{0,79}$');