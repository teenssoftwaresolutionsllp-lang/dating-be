CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_place_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"city" varchar(120),
	"state" varchar(120),
	"country" varchar(120),
	"latitude" double precision,
	"longitude" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_google_place_id_unique" UNIQUE("google_place_id")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "location_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "locations_google_place_id_unique_idx" ON "locations" USING btree ("google_place_id");--> statement-breakpoint
CREATE INDEX "locations_city_idx" ON "locations" USING btree ("city");--> statement-breakpoint
CREATE INDEX "locations_state_idx" ON "locations" USING btree ("state");--> statement-breakpoint
CREATE INDEX "locations_country_idx" ON "locations" USING btree ("country");--> statement-breakpoint
CREATE INDEX "locations_lat_long_idx" ON "locations" USING btree ("latitude","longitude");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profiles_location_id_idx" ON "profiles" USING btree ("location_id");