ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "profiles_location_id_locations_id_fk";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "location_id";--> statement-breakpoint
DROP TABLE IF EXISTS "locations" CASCADE;