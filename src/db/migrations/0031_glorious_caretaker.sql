DROP INDEX "profiles_city_idx";--> statement-breakpoint
DROP INDEX "profiles_lat_long_idx";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "city";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "state";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "country";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "latitude";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "longitude";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "location_updated_at";