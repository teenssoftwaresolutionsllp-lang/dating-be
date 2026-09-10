import {
  pgTable,
  uuid,
  integer,
  timestamp,
  primaryKey,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profiles, users } from "./core";
import { languages, interests, subscriptionPlans, subscriptionFeatures } from "./independent";
import { conversations, messages } from "./dependent";

/**
 * ============================================================================
 * JUNCTION TABLES (Many-to-Many Associative Entities with Composite Primary Keys)
 * ============================================================================
 */

/**
 * profile_languages
 * Associative table linking candidate profiles to languages spoken.
 */
export const profileLanguages = pgTable(
  "profile_languages",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    languageId: integer("language_id")
      .notNull()
      .references(() => languages.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.languageId] }),
    index("profile_languages_language_id_idx").on(table.languageId),
  ]
);

export type ProfileLanguage = typeof profileLanguages.$inferSelect;
export type NewProfileLanguage = typeof profileLanguages.$inferInsert;

/**
 * profile_interests
 * Associative table linking candidate profiles to selected interest tags.
 */
export const profileInterests = pgTable(
  "profile_interests",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    interestId: integer("interest_id")
      .notNull()
      .references(() => interests.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.interestId] }),
    index("profile_interests_interest_id_idx").on(table.interestId),
  ]
);

export type ProfileInterest = typeof profileInterests.$inferSelect;
export type NewProfileInterest = typeof profileInterests.$inferInsert;

/**
 * conversation_members
 * Participants belonging to a chat conversation.
 */
export const conversationMembers = pgTable(
  "conversation_members",
  {
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.conversationId, table.userId] }),
    index("conv_members_user_id_idx").on(table.userId),
  ]
);

export type ConversationMember = typeof conversationMembers.$inferSelect;
export type NewConversationMember = typeof conversationMembers.$inferInsert;

/**
 * message_reads
 * Read status receipts tracking which participant has read which message and when.
 */
export const messageReads = pgTable(
  "message_reads",
  {
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.messageId, table.userId] }),
    index("message_reads_user_read_at_idx").on(table.userId, table.readAt),
  ]
);

export type MessageRead = typeof messageReads.$inferSelect;
export type NewMessageRead = typeof messageReads.$inferInsert;

/**
 * plan_features
 * Subscription plan entitlement mapping with optional quota/limit thresholds.
 */
export const planFeatures = pgTable(
  "plan_features",
  {
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "cascade" }),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => subscriptionFeatures.id, { onDelete: "cascade" }),
    limitValue: integer("limit_value"), // NULL indicates unlimited access, number indicates daily/monthly limit quota
  },
  (table) => [
    primaryKey({ columns: [table.planId, table.featureId] }),
    check(
      "plan_features_limit_value_check",
      sql`${table.limitValue} IS NULL OR ${table.limitValue} >= 0`
    ),
  ]
);

export type PlanFeature = typeof planFeatures.$inferSelect;
export type NewPlanFeature = typeof planFeatures.$inferInsert;
