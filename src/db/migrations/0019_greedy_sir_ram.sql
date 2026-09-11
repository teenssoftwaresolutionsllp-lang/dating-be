ALTER TABLE "users" DROP CONSTRAINT "users_phone_unique";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP CONSTRAINT "user_sessions_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "education" DROP CONSTRAINT "education_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "kyc_verifications" DROP CONSTRAINT "kyc_verifications_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "profile_photos" DROP CONSTRAINT "profile_photos_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "dating_preferences" DROP CONSTRAINT "dating_preferences_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "swipes" DROP CONSTRAINT "swipes_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "swipes" DROP CONSTRAINT "swipes_target_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "matches" DROP CONSTRAINT "matches_user1_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "matches" DROP CONSTRAINT "matches_user2_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation_members" DROP CONSTRAINT "conversation_members_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_sender_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "message_reads" DROP CONSTRAINT "message_reads_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "blocks" DROP CONSTRAINT "blocks_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "blocks" DROP CONSTRAINT "blocks_blocked_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "reports_reporter_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "reports_reported_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "notification_settings" DROP CONSTRAINT "notification_settings_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_settings" DROP CONSTRAINT "user_settings_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_devices" DROP CONSTRAINT "user_devices_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_user_id_users_user_id_fk";
--> statement-breakpoint
UPDATE "users"
SET "email" = COALESCE("email", "phone" || '@phone.local', "user_id"::text || '@legacy.local')
WHERE "email" IS NULL;--> statement-breakpoint
UPDATE "profiles"
SET
	"name" = COALESCE("name", 'Unknown'),
	"date_of_birth" = COALESCE("date_of_birth", DATE '1970-01-01'),
	"gender" = COALESCE("gender", 'other');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "date_of_birth" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "gender" SET DATA TYPE varchar(30);--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "gender" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "kyc_verifications" ALTER COLUMN "document_number_hash" SET DEFAULT 'aadhar';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_provider" varchar(30) DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_active_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "failed_login_attempts" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "height_cm" smallint;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "state" varchar(100);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "country" varchar(100);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "location_updated_at" timestamp with time zone;--> statement-breakpoint
UPDATE "users" SET "id" = "user_id";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_pkey";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education" ADD CONSTRAINT "education_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_photos" ADD CONSTRAINT "profile_photos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dating_preferences" ADD CONSTRAINT "dating_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_user1_id_users_id_fk" FOREIGN KEY ("user1_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_user2_id_users_id_fk" FOREIGN KEY ("user2_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_user_id_users_id_fk" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_user_id_users_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_last_active_at_idx" ON "users" USING btree ("last_active_at");--> statement-breakpoint
CREATE INDEX "profiles_gender_idx" ON "profiles" USING btree ("gender");--> statement-breakpoint
CREATE INDEX "profiles_dob_idx" ON "profiles" USING btree ("date_of_birth");--> statement-breakpoint
CREATE INDEX "profiles_city_idx" ON "profiles" USING btree ("city");--> statement-breakpoint
CREATE INDEX "profiles_lat_long_idx" ON "profiles" USING btree ("latitude","longitude");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "onboarding_step";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "onboarding_completed_at";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "height";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "location";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_failed_attempts_non_negative_check" CHECK ("users"."failed_login_attempts" >= 0);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_height_positive_check" CHECK ("profiles"."height_cm" IS NULL OR "profiles"."height_cm" > 0);