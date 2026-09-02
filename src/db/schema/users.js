import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  email: varchar("email", {
    length: 255,
  }).notNull().unique(),

  password: varchar("password", {
    length: 255,
  }).notNull(),

  isVerified: boolean("is_verified")
    .notNull()
    .default(false),

  isActive: boolean("is_active")
    .notNull()
    .default(true),

  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow(),
});