import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  phone: varchar("phone", {
    length: 20,
  }).unique(),

  countryCode: varchar("country_code", {
    length: 10,
  })
    .notNull()
    .default("+91"),

  email: varchar("email", {
    length: 255,
  }).unique(),

  password: varchar("password", {
    length: 255,
  }),

  preferredLanguage: varchar("preferred_language", {
    length: 20,
  })
    .notNull()
    .default("en"),

  role: varchar("role", {
    length: 50,
  })
    .notNull()
    .default("user"),

  isVerified: boolean("is_verified").notNull().default(false),

  isActive: boolean("is_active").notNull().default(true),

  profileCompleted: boolean("profile_completed").notNull().default(false),

  createdAt: timestamp("created_at").notNull().defaultNow(),

  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
