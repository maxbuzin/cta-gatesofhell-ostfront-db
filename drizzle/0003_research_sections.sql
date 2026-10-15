CREATE TABLE "research_sections" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "research_sections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"faction_id" integer NOT NULL,
	"game_version_id" integer NOT NULL,
	"name" text,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "research_sections" ADD CONSTRAINT "research_sections_faction_id_factions_id_fk" FOREIGN KEY ("faction_id") REFERENCES "public"."factions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_sections" ADD CONSTRAINT "research_sections_game_version_id_game_versions_id_fk" FOREIGN KEY ("game_version_id") REFERENCES "public"."game_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "research_sections_faction_idx" ON "research_sections" USING btree ("faction_id","game_version_id","sort_order");--> statement-breakpoint
ALTER TABLE "research_nodes" ADD COLUMN "section_id" integer;--> statement-breakpoint
ALTER TABLE "research_nodes" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "research_nodes" ADD CONSTRAINT "research_nodes_section_id_research_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."research_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "research_nodes_section_idx" ON "research_nodes" USING btree ("section_id","sort_order");--> statement-breakpoint
INSERT INTO "research_sections" ("faction_id", "game_version_id", "name", "sort_order")
SELECT DISTINCT "faction_id", "game_version_id", NULL, 0
FROM "research_nodes";
--> statement-breakpoint
UPDATE "research_nodes" AS n
SET "section_id" = s."id",
    "sort_order" = ranked."ord"
FROM "research_sections" AS s,
     (
       SELECT "id",
              "faction_id",
              "game_version_id",
              (row_number() OVER (PARTITION BY "faction_id", "game_version_id" ORDER BY "id") - 1)::integer AS "ord"
       FROM "research_nodes"
     ) AS ranked
WHERE ranked."id" = n."id"
  AND s."faction_id" = n."faction_id"
  AND s."game_version_id" = n."game_version_id"
  AND s."sort_order" = 0;
