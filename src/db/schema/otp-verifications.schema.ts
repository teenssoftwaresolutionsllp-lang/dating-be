import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const otpVerifications = pgTable("otp_verifications", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  countryCode: varchar("country_code", { length: 10 }).notNull().default("+91"),
  otp: varchar("otp", { length: 128 }).notNull(),
  purpose: varchar("purpose", { length: 50 }).notNull().default("LOGIN"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  isVerified: boolean("is_verified").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  resendCooldownUntil: timestamp("resend_cooldown_until", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type OtpVerification = typeof otpVerifications.$inferSelect;
export type NewOtpVerification = typeof otpVerifications.$inferInsert;
