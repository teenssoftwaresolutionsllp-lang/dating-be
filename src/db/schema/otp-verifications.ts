import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const otpVerifications = pgTable("otp_verifications", {
  id: serial("id").primaryKey(),

  phone: varchar("phone", {
    length: 20,
  }),

  countryCode: varchar("country_code", {
    length: 10,
  }).default("+91"),

  email: varchar("email", {
    length: 255,
  }),

  otp: varchar("otp", {
    length: 255,
  }).notNull(),

  purpose: varchar("purpose", {
    length: 50,
  })
    .notNull()
    .default("LOGIN"),

  attempts: integer("attempts")
    .notNull()
    .default(0),

  maxAttempts: integer("max_attempts")
    .notNull()
    .default(3),

  isVerified: boolean("is_verified")
    .notNull()
    .default(false),

  expiresAt: timestamp("expires_at").notNull(),

  resendCooldownUntil: timestamp("resend_cooldown_until"),

  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow(),
});

export type OtpVerification = typeof otpVerifications.$inferSelect;
export type NewOtpVerification = typeof otpVerifications.$inferInsert;
