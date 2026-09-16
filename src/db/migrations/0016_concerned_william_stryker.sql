DROP INDEX "education_user_id_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "education_user_id_unique" ON "education" USING btree ("user_id");