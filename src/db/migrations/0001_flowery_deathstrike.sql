ALTER TABLE "kyc_verifications" ALTER COLUMN "provider_reference" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "food_preference" varchar(50);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "drinking" varchar(50);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "smoking" varchar(50);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "vibes" jsonb;