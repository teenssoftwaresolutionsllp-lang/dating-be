import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

// Store only a one-way document hash; raw identity document numbers are never persisted.
export const kycVerifications = pgTable("kyc_verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  documentType: varchar("document_type", { length: 30 }).notNull(),
  documentNumberHash: text("document_number_hash").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
