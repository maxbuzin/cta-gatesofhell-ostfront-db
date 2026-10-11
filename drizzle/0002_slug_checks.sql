-- Slug format, faction color hex, primary_image_id FK
-- Apply after 0000 + 0001, as Neon owner.

ALTER TABLE "factions" ADD CONSTRAINT "factions_slug_format"
  CHECK ("slug" ~ '^[a-z0-9-]{1,80}$');
--> statement-breakpoint
ALTER TABLE "factions" ADD CONSTRAINT "factions_color_hex"
  CHECK ("color" IS NULL OR "color" ~ '^#[0-9A-Fa-f]{6}$');
--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_slug_format"
  CHECK ("slug" ~ '^[a-z0-9-]{1,80}$');
--> statement-breakpoint
ALTER TABLE "weapons" ADD CONSTRAINT "weapons_slug_format"
  CHECK ("slug" ~ '^[a-z0-9-]{1,80}$');
--> statement-breakpoint
ALTER TABLE "ammo_types" ADD CONSTRAINT "ammo_types_slug_format"
  CHECK ("slug" ~ '^[a-z0-9-]{1,80}$');
--> statement-breakpoint
ALTER TABLE "specialties" ADD CONSTRAINT "specialties_slug_format"
  CHECK ("slug" ~ '^[a-z0-9-]{1,80}$');
--> statement-breakpoint
ALTER TABLE "research_nodes" ADD CONSTRAINT "research_nodes_slug_format"
  CHECK ("slug" ~ '^[a-z0-9-]{1,80}$');
--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_primary_image_id_images_id_fk"
  FOREIGN KEY ("primary_image_id") REFERENCES "public"."images"("id")
  ON DELETE set null ON UPDATE no action;
