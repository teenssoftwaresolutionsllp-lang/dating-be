CREATE TABLE "profile_languages_new" (
  "profile_id" uuid PRIMARY KEY NOT NULL,
  "language_ids" integer[] NOT NULL,
  CONSTRAINT "profile_languages_new_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO "profile_languages_new" ("profile_id", "language_ids")
SELECT pl."profile_id", array_agg(pl."language_id" ORDER BY pl."language_id")
FROM "profile_languages" pl
GROUP BY pl."profile_id";
--> statement-breakpoint
DROP TABLE "profile_languages";
--> statement-breakpoint
ALTER TABLE "profile_languages_new" RENAME TO "profile_languages";
--> statement-breakpoint
ALTER INDEX "profile_languages_new_pkey" RENAME TO "profile_languages_pkey";
--> statement-breakpoint
CREATE INDEX "profile_languages_language_ids_gin_idx"
  ON "profile_languages" USING gin ("language_ids");