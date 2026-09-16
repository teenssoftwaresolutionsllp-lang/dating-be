DO $$
DECLARE
	constraint_record record;
BEGIN
	FOR constraint_record IN
		SELECT conrelid::regclass AS table_name, conname
		FROM pg_constraint
		WHERE contype = 'f' AND confrelid = 'public.users'::regclass
	LOOP
		EXECUTE format(
			'ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I',
			constraint_record.table_name,
			constraint_record.conname
		);
	END LOOP;
END $$;--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id'
	) AND EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'user_id'
	) THEN
		UPDATE "user_sessions" child SET "user_id" = parent."id"
		FROM "users" parent WHERE child."user_id" = parent."user_id";
		UPDATE "profiles" child SET "user_id" = parent."id"
		FROM "users" parent WHERE child."user_id" = parent."user_id";
		UPDATE "education" child SET "user_id" = parent."id"
		FROM "users" parent WHERE child."user_id" = parent."user_id";
		UPDATE "kyc_verifications" child SET "user_id" = parent."id"
		FROM "users" parent WHERE child."user_id" = parent."user_id";
		UPDATE "profile_photos" child SET "user_id" = parent."id"
		FROM "users" parent WHERE child."user_id" = parent."user_id";
		UPDATE "dating_preferences" child SET "user_id" = parent."id"
		FROM "users" parent WHERE child."user_id" = parent."user_id";
		UPDATE "swipes" child SET "user_id" = parent."id"
		FROM "users" parent WHERE child."user_id" = parent."user_id";
		UPDATE "swipes" child SET "target_user_id" = parent."id"
		FROM "users" parent WHERE child."target_user_id" = parent."user_id";
		UPDATE "matches" child SET "user1_id" = parent."id"
		FROM "users" parent WHERE child."user1_id" = parent."user_id";
		UPDATE "matches" child SET "user2_id" = parent."id"
		FROM "users" parent WHERE child."user2_id" = parent."user_id";
		UPDATE "conversation_members" child SET "user_id" = parent."id"
		FROM "users" parent WHERE child."user_id" = parent."user_id";
		UPDATE "messages" child SET "sender_id" = parent."id"
		FROM "users" parent WHERE child."sender_id" = parent."user_id";
		UPDATE "message_reads" child SET "user_id" = parent."id"
		FROM "users" parent WHERE child."user_id" = parent."user_id";
		UPDATE "blocks" child SET "user_id" = parent."id"
		FROM "users" parent WHERE child."user_id" = parent."user_id";
		UPDATE "blocks" child SET "blocked_user_id" = parent."id"
		FROM "users" parent WHERE child."blocked_user_id" = parent."user_id";
		UPDATE "reports" child SET "reporter_id" = parent."id"
		FROM "users" parent WHERE child."reporter_id" = parent."user_id";
		UPDATE "reports" child SET "reported_user_id" = parent."id"
		FROM "users" parent WHERE child."reported_user_id" = parent."user_id";
		UPDATE "notifications" child SET "user_id" = parent."id"
		FROM "users" parent WHERE child."user_id" = parent."user_id";
		UPDATE "notification_settings" child SET "user_id" = parent."id"
		FROM "users" parent WHERE child."user_id" = parent."user_id";
		UPDATE "user_settings" child SET "user_id" = parent."id"
		FROM "users" parent WHERE child."user_id" = parent."user_id";
		UPDATE "user_devices" child SET "user_id" = parent."id"
		FROM "users" parent WHERE child."user_id" = parent."user_id";
		UPDATE "subscriptions" child SET "user_id" = parent."id"
		FROM "users" parent WHERE child."user_id" = parent."user_id";
		UPDATE "payments" child SET "user_id" = parent."id"
		FROM "users" parent WHERE child."user_id" = parent."user_id";
		ALTER TABLE "users" DROP COLUMN "user_id";
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id'
	) THEN
		ALTER TABLE "users" RENAME COLUMN "id" TO "user_id";
	END IF;
END $$;--> statement-breakpoint
DO $$
DECLARE
	constraint_record record;
BEGIN
	FOR constraint_record IN
		SELECT conrelid::regclass AS table_name, conname
		FROM pg_constraint
		WHERE contype = 'f' AND confrelid = 'public.users'::regclass
	LOOP
		EXECUTE format(
			'ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I',
			constraint_record.table_name,
			constraint_record.conname
		);
	END LOOP;
END $$;--> statement-breakpoint
DELETE FROM "user_sessions" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."user_id");--> statement-breakpoint
DELETE FROM "profiles" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."user_id");--> statement-breakpoint
DELETE FROM "education" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."user_id");--> statement-breakpoint
DELETE FROM "kyc_verifications" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."user_id");--> statement-breakpoint
DELETE FROM "profile_photos" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."user_id");--> statement-breakpoint
DELETE FROM "dating_preferences" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."user_id");--> statement-breakpoint
DELETE FROM "swipes" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."user_id");--> statement-breakpoint
DELETE FROM "swipes" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."target_user_id");--> statement-breakpoint
DELETE FROM "matches" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."user1_id");--> statement-breakpoint
DELETE FROM "matches" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."user2_id");--> statement-breakpoint
DELETE FROM "conversation_members" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."user_id");--> statement-breakpoint
DELETE FROM "messages" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."sender_id");--> statement-breakpoint
DELETE FROM "message_reads" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."user_id");--> statement-breakpoint
DELETE FROM "blocks" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."user_id");--> statement-breakpoint
DELETE FROM "blocks" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."blocked_user_id");--> statement-breakpoint
DELETE FROM "reports" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."reporter_id");--> statement-breakpoint
DELETE FROM "reports" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."reported_user_id");--> statement-breakpoint
DELETE FROM "notifications" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."user_id");--> statement-breakpoint
DELETE FROM "notification_settings" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."user_id");--> statement-breakpoint
DELETE FROM "user_settings" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."user_id");--> statement-breakpoint
DELETE FROM "user_devices" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."user_id");--> statement-breakpoint
DELETE FROM "subscriptions" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."user_id");--> statement-breakpoint
DELETE FROM "payments" child WHERE NOT EXISTS (SELECT 1 FROM "users" parent WHERE parent."user_id" = child."user_id");--> statement-breakpoint
ALTER TABLE "user_sessions" DROP CONSTRAINT IF EXISTS "user_sessions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "profiles_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "education" DROP CONSTRAINT IF EXISTS "education_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "kyc_verifications" DROP CONSTRAINT IF EXISTS "kyc_verifications_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "profile_photos" DROP CONSTRAINT IF EXISTS "profile_photos_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "dating_preferences" DROP CONSTRAINT IF EXISTS "dating_preferences_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "swipes" DROP CONSTRAINT IF EXISTS "swipes_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "swipes" DROP CONSTRAINT IF EXISTS "swipes_target_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "matches" DROP CONSTRAINT IF EXISTS "matches_user1_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "matches" DROP CONSTRAINT IF EXISTS "matches_user2_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation_members" DROP CONSTRAINT IF EXISTS "conversation_members_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_sender_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "message_reads" DROP CONSTRAINT IF EXISTS "message_reads_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "blocks" DROP CONSTRAINT IF EXISTS "blocks_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "blocks" DROP CONSTRAINT IF EXISTS "blocks_blocked_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_reporter_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_reported_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "notification_settings" DROP CONSTRAINT IF EXISTS "notification_settings_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_settings" DROP CONSTRAINT IF EXISTS "user_settings_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_devices" DROP CONSTRAINT IF EXISTS "user_devices_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education" ADD CONSTRAINT "education_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_photos" ADD CONSTRAINT "profile_photos_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dating_preferences" ADD CONSTRAINT "dating_preferences_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_target_user_id_users_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_user1_id_users_user_id_fk" FOREIGN KEY ("user1_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_user2_id_users_user_id_fk" FOREIGN KEY ("user2_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_user_id_users_user_id_fk" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_user_id_users_user_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_verifications" DROP COLUMN "firebase_uid";