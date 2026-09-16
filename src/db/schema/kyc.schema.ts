import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

// Store only a one-way document hash; raw identity document numbers are never persisted.
export const kycVerifications = pgTable("kyc_verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.user_id, { onDelete: "cascade" }),
  documentType: varchar("document_type", { length: 30 }).notNull(),
  documentNumberHash: text("document_number_hash").notNull().default("aadhar"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  provider: varchar("provider", { length: 50 }),
  providerReference: varchar("provider_reference", { length: 150 }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  reviewedBy: uuid("reviewed_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type KycVerification = typeof kycVerifications.$inferSelect;
export type NewKycVerification = typeof kycVerifications.$inferInsert;
