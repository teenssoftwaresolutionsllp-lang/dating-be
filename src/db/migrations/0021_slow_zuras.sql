CREATE TABLE "subscription_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_features_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_login_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email" varchar(255),
	"success" boolean NOT NULL,
	"ip_address" "inet",
	"user_agent" text,
	"failure_reason" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_features" (
	"plan_id" uuid NOT NULL,
	"feature_id" uuid NOT NULL,
	"limit_value" integer,
	CONSTRAINT "plan_features_plan_id_feature_id_pk" PRIMARY KEY("plan_id","feature_id"),
	CONSTRAINT "plan_features_limit_value_check" CHECK ("plan_features"."limit_value" IS NULL OR "plan_features"."limit_value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"media_type" varchar(20) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"duration_seconds" integer,
	"status" varchar(20) DEFAULT 'ready' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "push_notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"provider" varchar(30) NOT NULL,
	"provider_message_id" varchar(150),
	"status" varchar(20) NOT NULL,
	"error_code" varchar(100),
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"moderator_id" uuid NOT NULL,
	"action" varchar(30) NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swipe_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"action" varchar(20) NOT NULL,
	"source" varchar(30),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_suspensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"reason" text NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"feature_id" uuid NOT NULL,
	"usage_date" date NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_usage_count_non_negative_check" CHECK ("feature_usage"."usage_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "subscription_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(30) NOT NULL,
	"event_id" varchar(150) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'received' NOT NULL,
	"processed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
ALTER TABLE "swipes" DROP CONSTRAINT "swipes_user_target_unique";--> statement-breakpoint
ALTER TABLE "blocks" DROP CONSTRAINT "blocks_user_blocked_unique";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_subscription_id_subscriptions_id_fk";
--> statement-breakpoint
DROP INDEX "education_user_id_unique";--> statement-breakpoint
DROP INDEX "swipes_user_id_idx";--> statement-breakpoint
DROP INDEX "swipes_target_user_id_idx";--> statement-breakpoint
DROP INDEX "swipes_action_idx";--> statement-breakpoint
DROP INDEX "matches_user1_id_idx";--> statement-breakpoint
DROP INDEX "matches_user2_id_idx";--> statement-breakpoint
DROP INDEX "conversation_members_user_id_idx";--> statement-breakpoint
DROP INDEX "messages_conversation_id_idx";--> statement-breakpoint
DROP INDEX "messages_created_at_idx";--> statement-breakpoint
DROP INDEX "message_reads_user_id_idx";--> statement-breakpoint
DROP INDEX "notifications_user_id_idx";--> statement-breakpoint
DROP INDEX "notifications_created_at_idx";--> statement-breakpoint
ALTER TABLE "otp_verifications" ALTER COLUMN "purpose" SET DATA TYPE varchar(30);--> statement-breakpoint
ALTER TABLE "otp_verifications" ALTER COLUMN "purpose" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "otp_verifications" ALTER COLUMN "attempts" SET DATA TYPE smallint;--> statement-breakpoint
ALTER TABLE "user_sessions" ALTER COLUMN "ip_address" SET DATA TYPE inet USING "ip_address"::inet;--> statement-breakpoint
ALTER TABLE "education" ALTER COLUMN "qualification" SET DATA TYPE varchar(150);--> statement-breakpoint
ALTER TABLE "kyc_verifications" ALTER COLUMN "document_number_hash" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "content" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plans" ALTER COLUMN "features" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DATA TYPE varchar(30);--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "subscription_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "provider_payment_id" SET DATA TYPE varchar(150);--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "amount" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "otp_verifications" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "otp_verifications" ADD COLUMN "identifier" varchar(255);--> statement-breakpoint
ALTER TABLE "otp_verifications" ADD COLUMN "code_hash" text;--> statement-breakpoint
ALTER TABLE "otp_verifications" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
UPDATE "otp_verifications"
SET
	"identifier" = COALESCE("phone", "id"::text),
	"code_hash" = "otp",
	"verified_at" = CASE WHEN "is_verified" THEN "updated_at" ELSE NULL END;--> statement-breakpoint
ALTER TABLE "otp_verifications" ALTER COLUMN "identifier" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "otp_verifications" ALTER COLUMN "code_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "device_id" uuid;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "last_used_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "languages" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "education" ADD COLUMN "institution_name" varchar(150);--> statement-breakpoint
ALTER TABLE "education" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "kyc_verifications" ADD COLUMN "provider" varchar(50);--> statement-breakpoint
ALTER TABLE "kyc_verifications" ADD COLUMN "provider_reference" varchar(150);--> statement-breakpoint
ALTER TABLE "kyc_verifications" ADD COLUMN "submitted_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "kyc_verifications" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "profile_photos" ADD COLUMN "moderation_status" varchar(20) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_photos" ADD COLUMN "moderation_reason" text;--> statement-breakpoint
ALTER TABLE "profile_photos" ADD COLUMN "moderated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profile_photos" ADD COLUMN "mime_type" varchar(50) DEFAULT 'application/octet-stream' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_photos" ADD COLUMN "file_size_bytes" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_photos" ADD COLUMN "width" integer;--> statement-breakpoint
ALTER TABLE "profile_photos" ADD COLUMN "height" integer;--> statement-breakpoint
ALTER TABLE "profile_photos" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profile_photos" ALTER COLUMN "mime_type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "profile_photos" ALTER COLUMN "file_size_bytes" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "interests" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "dating_preferences" ADD COLUMN "max_distance_km" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "dating_preferences" ADD COLUMN "preferred_genders" jsonb;--> statement-breakpoint
ALTER TABLE "dating_preferences" ADD COLUMN "relationship_intentions" jsonb;--> statement-breakpoint
ALTER TABLE "dating_preferences" ADD COLUMN "religion_preferences" jsonb;--> statement-breakpoint
ALTER TABLE "dating_preferences" ADD COLUMN "community_preferences" jsonb;--> statement-breakpoint
ALTER TABLE "dating_preferences" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "dating_preferences" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "swipes" ADD COLUMN "source" varchar(30);--> statement-breakpoint
ALTER TABLE "swipes" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "last_activity_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "unmatched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "unmatched_by" uuid;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "client_message_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "media_storage_key" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "reply_to_message_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_devices" ADD COLUMN "app_version" varchar(30);--> statement-breakpoint
ALTER TABLE "user_devices" ADD COLUMN "os_version" varchar(30);--> statement-breakpoint
ALTER TABLE "user_devices" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "provider" varchar(30) NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "provider_subscription_id" varchar(150);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "auto_renew" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "trial_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "trial_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "provider_order_id" varchar(150);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "failure_code" varchar(100);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refund_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_login_events" ADD CONSTRAINT "user_login_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_feature_id_subscription_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."subscription_features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_notification_deliveries" ADD CONSTRAINT "push_notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_notification_deliveries" ADD CONSTRAINT "push_notification_deliveries_device_id_user_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."user_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_actions" ADD CONSTRAINT "report_actions_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_actions" ADD CONSTRAINT "report_actions_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipe_events" ADD CONSTRAINT "swipe_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipe_events" ADD CONSTRAINT "swipe_events_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_suspensions" ADD CONSTRAINT "user_suspensions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_suspensions" ADD CONSTRAINT "user_suspensions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_usage" ADD CONSTRAINT "feature_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_usage" ADD CONSTRAINT "feature_usage_feature_id_subscription_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."subscription_features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sub_features_code_unique_idx" ON "subscription_features" USING btree ("code");--> statement-breakpoint
CREATE INDEX "pwd_reset_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pwd_reset_token_hash_unique_idx" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "pwd_reset_expires_at_idx" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "login_events_user_id_idx" ON "user_login_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "login_events_email_idx" ON "user_login_events" USING btree ("email");--> statement-breakpoint
CREATE INDEX "login_events_created_at_idx" ON "user_login_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_logs_admin_id_idx" ON "admin_audit_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "admin_logs_entity_idx" ON "admin_audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "admin_logs_created_at_idx" ON "admin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "media_assets_user_id_idx" ON "media_assets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "media_assets_type_idx" ON "media_assets" USING btree ("media_type");--> statement-breakpoint
CREATE INDEX "media_assets_status_idx" ON "media_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "push_delivery_notif_idx" ON "push_notification_deliveries" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "push_delivery_device_idx" ON "push_notification_deliveries" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "push_delivery_status_idx" ON "push_notification_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "report_actions_report_id_idx" ON "report_actions" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "report_actions_moderator_id_idx" ON "report_actions" USING btree ("moderator_id");--> statement-breakpoint
CREATE INDEX "report_actions_created_at_idx" ON "report_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "swipe_events_user_id_idx" ON "swipe_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "swipe_events_target_user_id_idx" ON "swipe_events" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "swipe_events_created_at_idx" ON "swipe_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_suspensions_user_id_idx" ON "user_suspensions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_suspensions_duration_idx" ON "user_suspensions" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_usage_user_feature_date_unique_idx" ON "feature_usage" USING btree ("user_id","feature_id","usage_date");--> statement-breakpoint
CREATE INDEX "feature_usage_user_date_idx" ON "feature_usage" USING btree ("user_id","usage_date");--> statement-breakpoint
CREATE UNIQUE INDEX "sub_events_event_id_unique_idx" ON "subscription_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "sub_events_provider_type_idx" ON "subscription_events" USING btree ("provider","event_type");--> statement-breakpoint
CREATE INDEX "sub_events_status_idx" ON "subscription_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sub_events_created_at_idx" ON "subscription_events" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_device_id_user_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."user_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_unmatched_by_users_id_fk" FOREIGN KEY ("unmatched_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "otp_identifier_purpose_idx" ON "otp_verifications" USING btree ("identifier","purpose");--> statement-breakpoint
CREATE INDEX "otp_expires_at_idx" ON "otp_verifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "otp_user_id_idx" ON "otp_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_sessions_refresh_hash_unique_idx" ON "user_sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_sessions_device_id_idx" ON "user_sessions" USING btree ("device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_id_unique_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "languages_name_unique_idx" ON "languages" USING btree ("name");--> statement-breakpoint
CREATE INDEX "profile_languages_language_id_idx" ON "profile_languages" USING btree ("language_id");--> statement-breakpoint
CREATE INDEX "education_user_id_idx" ON "education" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "education_user_primary_idx" ON "education" USING btree ("user_id","is_primary");--> statement-breakpoint
CREATE UNIQUE INDEX "kyc_user_id_unique_idx" ON "kyc_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kyc_provider_ref_unique_idx" ON "kyc_verifications" USING btree ("provider_reference") WHERE "kyc_verifications"."provider_reference" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "kyc_status_idx" ON "kyc_verifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "profile_photos_user_order_idx" ON "profile_photos" USING btree ("user_id","display_order");--> statement-breakpoint
CREATE INDEX "profile_photos_user_primary_idx" ON "profile_photos" USING btree ("user_id","is_primary");--> statement-breakpoint
CREATE INDEX "profile_photos_moderation_status_idx" ON "profile_photos" USING btree ("moderation_status");--> statement-breakpoint
CREATE UNIQUE INDEX "interests_name_unique_idx" ON "interests" USING btree ("name");--> statement-breakpoint
CREATE INDEX "interests_category_idx" ON "interests" USING btree ("category");--> statement-breakpoint
CREATE INDEX "profile_interests_interest_id_idx" ON "profile_interests" USING btree ("interest_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dating_pref_user_id_unique_idx" ON "dating_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "swipes_user_target_unique_idx" ON "swipes" USING btree ("user_id","target_user_id");--> statement-breakpoint
CREATE INDEX "swipes_target_action_idx" ON "swipes" USING btree ("target_user_id","action");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_canonical_pair_unique_idx" ON "matches" USING btree ("user1_id","user2_id");--> statement-breakpoint
CREATE INDEX "matches_user1_idx" ON "matches" USING btree ("user1_id");--> statement-breakpoint
CREATE INDEX "matches_user2_idx" ON "matches" USING btree ("user2_id");--> statement-breakpoint
CREATE INDEX "matches_status_idx" ON "matches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "matches_last_activity_idx" ON "matches" USING btree ("last_activity_at");--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_match_id_unique_idx" ON "conversations" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "conversations_updated_at_idx" ON "conversations" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "conv_members_user_id_idx" ON "conversation_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_sender_client_id_unique_idx" ON "messages" USING btree ("sender_id","client_message_id") WHERE "messages"."client_message_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "messages_conversation_created_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_reply_to_idx" ON "messages" USING btree ("reply_to_message_id");--> statement-breakpoint
CREATE INDEX "messages_deleted_at_idx" ON "messages" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "message_reads_user_read_at_idx" ON "message_reads" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "blocks_user_blocked_unique_idx" ON "blocks" USING btree ("user_id","blocked_user_id");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reports_created_at_idx" ON "reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notif_settings_user_id_unique_idx" ON "notification_settings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_settings_user_id_unique_idx" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_devices_token_unique_idx" ON "user_devices" USING btree ("device_token");--> statement-breakpoint
CREATE UNIQUE INDEX "sub_plans_name_unique_idx" ON "subscription_plans" USING btree ("name");--> statement-breakpoint
CREATE INDEX "sub_plans_is_active_idx" ON "subscription_plans" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_expires_at_idx" ON "subscriptions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_provider_sub_unique_idx" ON "subscriptions" USING btree ("provider_subscription_id") WHERE "subscriptions"."provider_subscription_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_payment_id_unique_idx" ON "payments" USING btree ("provider_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_order_id_unique_idx" ON "payments" USING btree ("provider_order_id") WHERE "payments"."provider_order_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "otp_verifications" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "otp_verifications" DROP COLUMN "country_code";--> statement-breakpoint
ALTER TABLE "otp_verifications" DROP COLUMN "otp";--> statement-breakpoint
ALTER TABLE "otp_verifications" DROP COLUMN "max_attempts";--> statement-breakpoint
ALTER TABLE "otp_verifications" DROP COLUMN "is_verified";--> statement-breakpoint
ALTER TABLE "otp_verifications" DROP COLUMN "resend_cooldown_until";--> statement-breakpoint
ALTER TABLE "otp_verifications" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "dating_preferences" DROP COLUMN "max_distance";--> statement-breakpoint
ALTER TABLE "dating_preferences" DROP COLUMN "preferred_gender";--> statement-breakpoint
ALTER TABLE "dating_preferences" DROP COLUMN "relationship_intention";--> statement-breakpoint
ALTER TABLE "dating_preferences" DROP COLUMN "religion_preference";--> statement-breakpoint
ALTER TABLE "dating_preferences" DROP COLUMN "community_preference";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_attempts_non_negative_check" CHECK ("otp_verifications"."attempts" >= 0);--> statement-breakpoint
ALTER TABLE "dating_preferences" ADD CONSTRAINT "dating_pref_min_age_check" CHECK ("dating_preferences"."min_age" >= 18);--> statement-breakpoint
ALTER TABLE "dating_preferences" ADD CONSTRAINT "dating_pref_max_age_check" CHECK ("dating_preferences"."max_age" >= "dating_preferences"."min_age");--> statement-breakpoint
ALTER TABLE "dating_preferences" ADD CONSTRAINT "dating_pref_distance_check" CHECK ("dating_preferences"."max_distance_km" > 0);--> statement-breakpoint
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_prevent_self_swipe_check" CHECK ("swipes"."user_id" <> "swipes"."target_user_id");--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_canonical_order_check" CHECK ("matches"."user1_id" < "matches"."user2_id");--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_prevent_self_block_check" CHECK ("blocks"."user_id" <> "blocks"."blocked_user_id");--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_prevent_self_report_check" CHECK ("reports"."reporter_id" <> "reports"."reported_user_id");--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "sub_plan_price_non_negative_check" CHECK ("subscription_plans"."price" >= 0);--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive_check" CHECK ("payments"."amount" >= 0);--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_refund_non_negative_check" CHECK ("payments"."refund_amount" >= 0);