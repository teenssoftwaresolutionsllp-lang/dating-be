ALTER TABLE "profile_interests" RENAME COLUMN "interest_id" TO "interest_ids";--> statement-breakpoint
ALTER TABLE "profile_interests" DROP CONSTRAINT "profile_interests_interest_id_interests_id_fk";
--> statement-breakpoint
DROP INDEX "profile_interests_interest_id_idx";--> statement-breakpoint
ALTER TABLE "profile_interests" DROP CONSTRAINT "profile_interests_profile_id_interest_id_pk";--> statement-breakpoint
DELETE FROM "profile_interests" a USING "profile_interests" b WHERE a.ctid < b.ctid AND a.profile_id = b.profile_id;--> statement-breakpoint
ALTER TABLE "profile_interests" ALTER COLUMN "interest_ids" TYPE integer[] USING ARRAY["interest_ids"];--> statement-breakpoint
ALTER TABLE "profile_interests" ADD PRIMARY KEY ("profile_id");--> statement-breakpoint
CREATE INDEX "profile_interests_interest_ids_gin_idx" ON "profile_interests" USING gin ("interest_ids");