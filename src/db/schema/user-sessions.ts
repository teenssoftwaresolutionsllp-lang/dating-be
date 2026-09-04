import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),

  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  refreshToken: text("refresh_token")
    .notNull()
    .unique(),

  userAgent: text("user_agent"),

  ipAddress: varchar("ip_address", {
    length: 100,
  }),

  isRevoked: boolean("is_revoked")
    .notNull()
    .default(false),

  expiresAt: timestamp("expires_at").notNull(),

  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow(),
});

export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
