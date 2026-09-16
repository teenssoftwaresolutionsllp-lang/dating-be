import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  smallint,
  timestamp,
  date,
  doublePrecision,
  inet,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * ============================================================================
 * CORE TABLES (Identity, Authentication, Profiles, Settings & Devices)
 * ============================================================================
 */

/**
 * users
 * Root user account and security entity. Stores authentication credentials,
 * verification states, roles, and brute-force lockout attributes.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    phone: varchar("phone", { length: 20 }),
    passwordHash: text("password_hash"),
    authProvider: varchar("auth_provider", { length: 30 })
      .default("email")
      .notNull(),
    role: varchar("role", { length: 20 }).default("user").notNull(), // user, moderator, admin
    status: varchar("status", { length: 20 }).default("active").notNull(), // active, suspended, banned, deleted
    emailVerified: boolean("email_verified").default(false).notNull(),
    phoneVerified: boolean("phone_verified").default(false).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    failedLoginAttempts: smallint("failed_login_attempts").default(0).notNull(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("users_phone_unique_idx")
      .on(table.phone)
      .where(sql`${table.phone} IS NOT NULL`),
    index("users_status_idx").on(table.status),
    index("users_role_idx").on(table.role),
    index("users_created_at_idx").on(table.createdAt),
    index("users_last_active_at_idx").on(table.lastActiveAt),
    check(
      "users_failed_attempts_non_negative_check",
      sql`${table.failedLoginAttempts} >= 0`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/**
 * profiles
 * Candidate-facing profile information shown to other users, including structured
 * location coordinates for geographic matching algorithms.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    gender: varchar("gender", { length: 30 }).notNull(), // male, female, non_binary, other
    religion: varchar("religion", { length: 50 }),
    heightCm: smallint("height_cm"),
    bio: text("bio"),
    relationshipStatus: varchar("relationship_status", { length: 30 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    country: varchar("country", { length: 100 }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    locationUpdatedAt: timestamp("location_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("profiles_user_id_unique_idx").on(table.userId),
    index("profiles_gender_idx").on(table.gender),
    index("profiles_dob_idx").on(table.dateOfBirth),
    index("profiles_city_idx").on(table.city),
    index("profiles_lat_long_idx").on(table.latitude, table.longitude),
    check(
      "profiles_height_positive_check",
      sql`${table.heightCm} IS NULL OR ${table.heightCm} > 0`,
    ),
  ],
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

/**
 * user_devices
 * Registered client devices for push notifications (APNs / FCM) and hardware tracking.
 */
export const userDevices = pgTable(
  "user_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceToken: text("device_token").notNull().unique(),
    platform: varchar("platform", { length: 20 }).notNull(), // ios, android, web
    appVersion: varchar("app_version", { length: 30 }),
    osVersion: varchar("os_version", { length: 30 }),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("user_devices_user_id_idx").on(table.userId),
    uniqueIndex("user_devices_token_unique_idx").on(table.deviceToken),
  ],
);

export type UserDevice = typeof userDevices.$inferSelect;
export type NewUserDevice = typeof userDevices.$inferInsert;

/**
 * user_sessions
 * Active login sessions and hashed refresh tokens. Uses PostgreSQL INET for native IP validation.
 */
export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").references(() => userDevices.id, {
      onDelete: "set null",
    }),
    refreshTokenHash: text("refresh_token_hash").notNull().unique(),
    deviceInfo: text("device_info"),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("user_sessions_user_id_idx").on(table.userId),
    uniqueIndex("user_sessions_refresh_hash_unique_idx").on(
      table.refreshTokenHash,
    ),
    index("user_sessions_expires_at_idx").on(table.expiresAt),
    index("user_sessions_device_id_idx").on(table.deviceId),
  ],
);

export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;

/**
 * otp_verifications
 * Verification records for phone/email OTP, password resets, and login challenges.
 */
export const otpVerifications = pgTable(
  "otp_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    identifier: varchar("identifier", { length: 255 }).notNull(), // phone number or email
    purpose: varchar("purpose", { length: 30 }).notNull(), // login, register, reset_password, phone_verification, email_verification
    codeHash: text("code_hash").notNull(),
    attempts: smallint("attempts").default(0).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("otp_identifier_purpose_idx").on(table.identifier, table.purpose),
    index("otp_expires_at_idx").on(table.expiresAt),
    index("otp_user_id_idx").on(table.userId),
    check("otp_attempts_non_negative_check", sql`${table.attempts} >= 0`),
  ],
);

export type OtpVerification = typeof otpVerifications.$inferSelect;
export type NewOtpVerification = typeof otpVerifications.$inferInsert;

/**
 * password_reset_tokens
 * Secure tokens generated for forgot-password workflows with explicit expiry and consumption tracking.
 */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("pwd_reset_user_id_idx").on(table.userId),
    uniqueIndex("pwd_reset_token_hash_unique_idx").on(table.tokenHash),
    index("pwd_reset_expires_at_idx").on(table.expiresAt),
  ],
);

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;

/**
 * user_login_events
 * Security audit log tracking successful and failed authentication attempts with client metadata.
 */
export const userLoginEvents = pgTable(
  "user_login_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    email: varchar("email", { length: 255 }),
    success: boolean("success").notNull(),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    failureReason: varchar("failure_reason", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("login_events_user_id_idx").on(table.userId),
    index("login_events_email_idx").on(table.email),
    index("login_events_created_at_idx").on(table.createdAt),
  ],
);

export type UserLoginEvent = typeof userLoginEvents.$inferSelect;
export type NewUserLoginEvent = typeof userLoginEvents.$inferInsert;

/**
 * user_settings
 * Privacy and account visibility preferences (e.g. stealth mode, precision of distance displayed).
 */
export const userSettings = pgTable(
  "user_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    profileVisibility: boolean("profile_visibility").default(true).notNull(),
    showVerifiedOnly: boolean("show_verified_only").default(false).notNull(),
    locationVisibility: varchar("location_visibility", { length: 20 })
      .default("approximate")
      .notNull(), // precise, approximate, hidden
    onlineStatusVisibility: boolean("online_status_visibility")
      .default(true)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("user_settings_user_id_unique_idx").on(table.userId)],
);

export type UserSetting = typeof userSettings.$inferSelect;
export type NewUserSetting = typeof userSettings.$inferInsert;

/**
 * notification_settings
 * Granular opt-in/opt-out notification channel controls per user.
 */
export const notificationSettings = pgTable(
  "notification_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    newMatches: boolean("new_matches").default(true).notNull(),
    newMessages: boolean("new_messages").default(true).notNull(),
    newLikes: boolean("new_likes").default(true).notNull(),
    marketing: boolean("marketing").default(false).notNull(),
    pushEnabled: boolean("push_enabled").default(true).notNull(),
    emailEnabled: boolean("email_enabled").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("notif_settings_user_id_unique_idx").on(table.userId),
  ],
);

export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type NewNotificationSetting = typeof notificationSettings.$inferInsert;
