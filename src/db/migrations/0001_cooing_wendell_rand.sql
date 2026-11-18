CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caller_id" uuid NOT NULL,
	"receiver_id" uuid NOT NULL,
	"channel_name" varchar(128) NOT NULL,
	"call_type" varchar(20) DEFAULT 'video' NOT NULL,
	"status" varchar(30) DEFAULT 'initiated' NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calls_channel_name_unique" UNIQUE("channel_name")
);
--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_caller_id_users_id_fk" FOREIGN KEY ("caller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calls_caller_id_idx" ON "calls" USING btree ("caller_id");--> statement-breakpoint
CREATE INDEX "calls_receiver_id_idx" ON "calls" USING btree ("receiver_id");--> statement-breakpoint
CREATE INDEX "calls_channel_idx" ON "calls" USING btree ("channel_name");--> statement-breakpoint
CREATE INDEX "calls_status_idx" ON "calls" USING btree ("status");