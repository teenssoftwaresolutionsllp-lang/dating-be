CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_place_id" varchar(255) NOT NULL,
	"name" varchar(255),
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100),
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_google_place_id_unique" UNIQUE("google_place_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "locations_google_place_id_unique_idx" ON "locations" USING btree ("google_place_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
