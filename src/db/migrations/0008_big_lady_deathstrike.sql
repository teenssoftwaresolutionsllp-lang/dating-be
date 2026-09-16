-- OTP rows are short-lived; safe to clear before changing id from serial to uuid.
TRUNCATE TABLE "otp_verifications";--> statement-breakpoint
ALTER TABLE "otp_verifications" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "otp_verifications" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "otp_verifications" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
