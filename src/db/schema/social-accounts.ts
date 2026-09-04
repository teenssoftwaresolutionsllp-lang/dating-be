import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const socialAccounts = pgTable("social_accounts", {
  id: serial("id").primaryKey(),

  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  provider: varchar("provider", {
    length: 50,
  }).notNull(),

  providerUserId: varchar("provider_user_id", {
    length: 255,
  }).notNull(),

  providerEmail: varchar("provider_email", {
    length: 255,
  }),

  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow(),
});

export type SocialAccount = typeof socialAccounts.$inferSelect;
export type NewSocialAccount = typeof socialAccounts.$inferInsert;
