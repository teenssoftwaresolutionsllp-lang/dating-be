CREATE TABLE "account_deletion_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(20) NOT NULL,
	"storage_key" text NOT NULL,
	"storage_url" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deactivated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deletion_scheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "kyc_verifications" ADD COLUMN "selfie_storage_key" text;--> statement-breakpoint
CREATE INDEX "account_deletion_media_created_idx" ON "account_deletion_media" USING btree ("created_at");