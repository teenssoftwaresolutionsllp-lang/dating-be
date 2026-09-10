import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  smallint,
  integer,
  bigint,
  timestamp,
  jsonb,
  inet,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./core";
import { userDevices } from "./core";

/**
 * ============================================================================
 * DEPENDENT TABLES (Discovery, Matching, Messaging, Safety, Media, Moderation)
 * ============================================================================
 */

/**
 * education
 * Higher education degrees, professions, and career backgrounds for users.
 */
export const education = pgTable(
  "education",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    educationLevel: varchar("education_level", { length: 30 }).notNull(), // high_school, bachelors, masters, phd, other
    qualification: varchar("qualification", { length: 150 }),
    institutionName: varchar("institution_name", { length: 150 }),
    profession: varchar("profession", { length: 100 }),
    occupation: varchar("occupation", { length: 100 }),
    companyName: varchar("company_name", { length: 150 }),
    incomeRange: varchar("income_range", { length: 30 }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("education_user_id_idx").on(table.userId),
    index("education_user_primary_idx").on(table.userId, table.isPrimary),
  ]
);

export type Education = typeof education.$inferSelect;
export type NewEducation = typeof education.$inferInsert;

/**
 * kyc_verifications
 * Government identity verification documents and verification workflow state.
 */
export const kycVerifications = pgTable(
  "kyc_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    documentType: varchar("document_type", { length: 30 }).notNull(), // passport, national_id, driving_license, aadhaar
    documentNumberHash: text("document_number_hash").notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, verified, rejected
    provider: varchar("provider", { length: 50 }),
    providerReference: varchar("provider_reference", { length: 150 }),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("kyc_user_id_unique_idx").on(table.userId),
    uniqueIndex("kyc_provider_ref_unique_idx")
      .on(table.providerReference)
      .where(sql`${table.providerReference} IS NOT NULL`),
    index("kyc_status_idx").on(table.status),
  ]
);

export type KycVerification = typeof kycVerifications.$inferSelect;
export type NewKycVerification = typeof kycVerifications.$inferInsert;

/**
 * profile_photos
 * Profile display photos with moderation status, dimension metadata, and soft delete.
 */
export const profilePhotos = pgTable(
  "profile_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    url: text("url").notNull(),
    displayOrder: smallint("display_order").default(0).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    verificationStatus: varchar("verification_status", { length: 20 })
      .default("pending")
      .notNull(), // pending, verified, rejected
    moderationStatus: varchar("moderation_status", { length: 20 })
      .default("pending")
      .notNull(), // pending, approved, rejected, flagged
    moderationReason: text("moderation_reason"),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    mimeType: varchar("mime_type", { length: 50 }).notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("profile_photos_user_id_idx").on(table.userId),
    index("profile_photos_user_order_idx").on(table.userId, table.displayOrder),
    index("profile_photos_user_primary_idx").on(table.userId, table.isPrimary),
    index("profile_photos_moderation_status_idx").on(table.moderationStatus),
  ]
);

export type ProfilePhoto = typeof profilePhotos.$inferSelect;
export type NewProfilePhoto = typeof profilePhotos.$inferInsert;

/**
 * media_assets
 * Centralized media repository for images, video snippets, and voice prompts.
 */
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    mediaType: varchar("media_type", { length: 20 }).notNull(), // image, video, audio
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
    width: integer("width"),
    height: integer("height"),
    durationSeconds: integer("duration_seconds"),
    status: varchar("status", { length: 20 }).default("ready").notNull(), // processing, ready, blocked
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("media_assets_user_id_idx").on(table.userId),
    index("media_assets_type_idx").on(table.mediaType),
    index("media_assets_status_idx").on(table.status),
  ]
);

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;

/**
 * dating_preferences
 * User matching and discovery filters (age brackets, search radius, target genders, intentions).
 */
export const datingPreferences = pgTable(
  "dating_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    minAge: smallint("min_age").default(18).notNull(),
    maxAge: smallint("max_age").default(60).notNull(),
    maxDistanceKm: integer("max_distance_km").default(50).notNull(),
    preferredGenders: jsonb("preferred_genders").$type<string[]>(), // e.g. ["female", "non_binary"]
    relationshipIntentions: jsonb("relationship_intentions").$type<string[]>(), // e.g. ["long_term", "marriage"]
    religionPreferences: jsonb("religion_preferences").$type<string[]>(),
    communityPreferences: jsonb("community_preferences").$type<string[]>(),
    verifiedOnly: boolean("verified_only").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("dating_pref_user_id_unique_idx").on(table.userId),
    check("dating_pref_min_age_check", sql`${table.minAge} >= 18`),
    check("dating_pref_max_age_check", sql`${table.maxAge} >= ${table.minAge}`),
    check("dating_pref_distance_check", sql`${table.maxDistanceKm} > 0`),
  ]
);

export type DatingPreference = typeof datingPreferences.$inferSelect;
export type NewDatingPreference = typeof datingPreferences.$inferInsert;

/**
 * swipes
 * Current like/reject/super_like state per user pair. Guarantees 1 active decision per pair.
 */
export const swipes = pgTable(
  "swipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetUserId: uuid("target_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 20 }).notNull(), // like, reject, super_like
    source: varchar("source", { length: 30 }), // discovery, boost, recommendation
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("swipes_user_target_unique_idx").on(
      table.userId,
      table.targetUserId
    ),
    index("swipes_target_action_idx").on(table.targetUserId, table.action),
    index("swipes_created_at_idx").on(table.createdAt),
    check(
      "swipes_prevent_self_swipe_check",
      sql`${table.userId} <> ${table.targetUserId}`
    ),
  ]
);

export type Swipe = typeof swipes.$inferSelect;
export type NewSwipe = typeof swipes.$inferInsert;

/**
 * swipe_events
 * Append-only immutable swipe event log for analytics, ML recommendation models, and audit history.
 */
export const swipeEvents = pgTable(
  "swipe_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetUserId: uuid("target_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 20 }).notNull(),
    source: varchar("source", { length: 30 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("swipe_events_user_id_idx").on(table.userId),
    index("swipe_events_target_user_id_idx").on(table.targetUserId),
    index("swipe_events_created_at_idx").on(table.createdAt),
  ]
);

export type SwipeEvent = typeof swipeEvents.$inferSelect;
export type NewSwipeEvent = typeof swipeEvents.$inferInsert;

/**
 * matches
 * Confirmed mutual connections. Uses canonical sorting (user1_id < user2_id) to eliminate duplicates.
 */
export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user1Id: uuid("user1_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    user2Id: uuid("user2_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).default("active").notNull(), // active, unmatched
    matchedAt: timestamp("matched_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    unmatchedAt: timestamp("unmatched_at", { withTimezone: true }),
    unmatchedBy: uuid("unmatched_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("matches_canonical_pair_unique_idx").on(
      table.user1Id,
      table.user2Id
    ),
    index("matches_user1_idx").on(table.user1Id),
    index("matches_user2_idx").on(table.user2Id),
    index("matches_status_idx").on(table.status),
    index("matches_last_activity_idx").on(table.lastActivityAt),
    check(
      "matches_canonical_order_check",
      sql`${table.user1Id} < ${table.user2Id}`
    ),
  ]
);

export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;

/**
 * conversations
 * Direct chat threads created automatically for confirmed matches.
 */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .unique()
      .references(() => matches.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("conversations_match_id_unique_idx").on(table.matchId),
    index("conversations_updated_at_idx").on(table.updatedAt),
  ]
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

/**
 * messages
 * Individual chat messages with client message ID idempotency, reply hierarchies, and soft deletion.
 */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientMessageId: uuid("client_message_id"), // Client-generated UUID for network retry idempotency
    messageType: varchar("message_type", { length: 20 })
      .default("text")
      .notNull(), // text, image, video, audio, system
    content: text("content"), // Nullable for media-only messages
    mediaStorageKey: text("media_storage_key"),
    replyToMessageId: uuid("reply_to_message_id"), // Self-referencing FK
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("messages_sender_client_id_unique_idx")
      .on(table.senderId, table.clientMessageId)
      .where(sql`${table.clientMessageId} IS NOT NULL`),
    index("messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt
    ),
    index("messages_sender_id_idx").on(table.senderId),
    index("messages_reply_to_idx").on(table.replyToMessageId),
    index("messages_deleted_at_idx").on(table.deletedAt),
  ]
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

/**
 * blocks
 * User-to-user blocking records to enforce mutual discovery and chat exclusion.
 */
export const blocks = pgTable(
  "blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedUserId: uuid("blocked_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("blocks_user_blocked_unique_idx").on(
      table.userId,
      table.blockedUserId
    ),
    index("blocks_user_id_idx").on(table.userId),
    index("blocks_blocked_user_id_idx").on(table.blockedUserId),
    check(
      "blocks_prevent_self_block_check",
      sql`${table.userId} <> ${table.blockedUserId}`
    ),
  ]
);

export type Block = typeof blocks.$inferSelect;
export type NewBlock = typeof blocks.$inferInsert;

/**
 * reports
 * User safety reports submitted against profiles or bad actors.
 */
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reportedUserId: uuid("reported_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: varchar("reason", { length: 50 }).notNull(), // harassment, fake_profile, inappropriate_content, spam
    description: text("description"),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, reviewed, actioned, dismissed
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("reports_reporter_id_idx").on(table.reporterId),
    index("reports_reported_user_id_idx").on(table.reportedUserId),
    index("reports_status_idx").on(table.status),
    index("reports_created_at_idx").on(table.createdAt),
    check(
      "reports_prevent_self_report_check",
      sql`${table.reporterId} <> ${table.reportedUserId}`
    ),
  ]
);

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

/**
 * report_actions
 * Moderator action log detailing resolutions taken on user reports.
 */
export const reportActions = pgTable(
  "report_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    moderatorId: uuid("moderator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 30 }).notNull(), // warn, suspend, ban, dismiss, delete_content
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("report_actions_report_id_idx").on(table.reportId),
    index("report_actions_moderator_id_idx").on(table.moderatorId),
    index("report_actions_created_at_idx").on(table.createdAt),
  ]
);

export type ReportAction = typeof reportActions.$inferSelect;
export type NewReportAction = typeof reportActions.$inferInsert;

/**
 * user_suspensions
 * Formal account suspensions and ban durations enforced by the trust & safety team.
 */
export const userSuspensions = pgTable(
  "user_suspensions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull(), // temporary, permanent
    reason: text("reason").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("user_suspensions_user_id_idx").on(table.userId),
    index("user_suspensions_duration_idx").on(table.startsAt, table.endsAt),
  ]
);

export type UserSuspension = typeof userSuspensions.$inferSelect;
export type NewUserSuspension = typeof userSuspensions.$inferInsert;

/**
 * admin_audit_logs
 * Comprehensive immutable audit log of administrative actions, config changes, and overrides.
 */
export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 100 }).notNull(), // USER_BAN, PHOTO_DELETE, REFUND_ISSUED, SETTING_UPDATE
    entityType: varchar("entity_type", { length: 50 }).notNull(), // user, report, photo, subscription, payment
    entityId: uuid("entity_id"),
    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),
    ipAddress: inet("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("admin_logs_admin_id_idx").on(table.adminId),
    index("admin_logs_entity_idx").on(table.entityType, table.entityId),
    index("admin_logs_created_at_idx").on(table.createdAt),
  ]
);

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;

/**
 * notifications
 * User in-app notifications inbox events (new matches, likes, chat messages).
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 30 }).notNull(), // new_match, new_like, new_message, system, promotion
    title: varchar("title", { length: 150 }).notNull(),
    message: text("message").notNull(),
    data: jsonb("data"), // Deep link metadata
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notifications_user_created_idx").on(table.userId, table.createdAt),
    index("notifications_user_read_idx").on(table.userId, table.readAt),
  ]
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

/**
 * push_notification_deliveries
 * Delivery tracking log for outbound push notifications to FCM / APNs.
 */
export const pushNotificationDeliveries = pgTable(
  "push_notification_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => userDevices.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 30 }).notNull(), // fcm, apns
    providerMessageId: varchar("provider_message_id", { length: 150 }),
    status: varchar("status", { length: 20 }).notNull(), // queued, sent, delivered, failed
    errorCode: varchar("error_code", { length: 100 }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("push_delivery_notif_idx").on(table.notificationId),
    index("push_delivery_device_idx").on(table.deviceId),
    index("push_delivery_status_idx").on(table.status),
  ]
);

export type PushNotificationDelivery =
  typeof pushNotificationDeliveries.$inferSelect;
export type NewPushNotificationDelivery =
  typeof pushNotificationDeliveries.$inferInsert;
