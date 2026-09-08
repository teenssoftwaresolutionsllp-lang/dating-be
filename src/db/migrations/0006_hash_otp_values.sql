ALTER TABLE "otp_verifications"
  ALTER COLUMN "otp" TYPE varchar(128);
--> statement-breakpoint
DELETE FROM "otp_verifications";