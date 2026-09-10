UPDATE "users"
SET "status" = 'active', "updated_at" = now()
WHERE "status" = 'onboarding';