ALTER TABLE "users" DROP CONSTRAINT "users_location_id_locations_id_fk";
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "profiles" AS profile
SET "location_id" = users."location_id"
FROM "users"
WHERE profile."user_id" = users."id"
	AND users."location_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "location_id";
