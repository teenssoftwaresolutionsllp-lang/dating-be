import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  numeric,
  integer,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./core";
import { subscriptionPlans, subscriptionFeatures } from "./independent";

/**
 * ============================================================================
 * PAYMENTS & MONETIZATION TABLES (Subscriptions, Transactions, Idempotency)
 * ============================================================================
 */

/**
 * subscriptions
 * User premium subscription state, lifecycle tracking, and renewal settings.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "restrict" }),
    provider: varchar("provider", { length: 30 }).notNull(), // razorpay, stripe, apple_iap, google_play
    providerSubscriptionId: varchar("provider_subscription_id", {
      length: 150,
    }),
    status: varchar("status", { length: 30 }).default("active").notNull(), // active, past_due, cancelled, expired, trialing
    autoRenew: boolean("auto_renew").default(true).notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("subscriptions_user_id_idx").on(table.userId),
    index("subscriptions_plan_id_idx").on(table.planId),
    index("subscriptions_status_idx").on(table.status),
    index("subscriptions_expires_at_idx").on(table.expiresAt),
    uniqueIndex("subscriptions_provider_sub_unique_idx")
      .on(table.providerSubscriptionId)
      .where(sql`${table.providerSubscriptionId} IS NOT NULL`),
  ]
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

/**
 * payments
 * Transaction ledgers capturing charges, currency, gateway transaction references, and refunds.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(
      () => subscriptions.id,
      { onDelete: "set null" }
    ),
    provider: varchar("provider", { length: 30 }).notNull(), // razorpay, stripe, apple_iap, google_play
    providerOrderId: varchar("provider_order_id", { length: 150 }),
    providerPaymentId: varchar("provider_payment_id", {
      length: 150,
    })
      .notNull()
      .unique(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("INR").notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, success, failed, refunded, partially_refunded
    failureCode: varchar("failure_code", { length: 100 }),
    failureReason: text("failure_reason"),
    refundAmount: numeric("refund_amount", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("payments_user_id_idx").on(table.userId),
    index("payments_subscription_id_idx").on(table.subscriptionId),
    uniqueIndex("payments_provider_payment_id_unique_idx").on(
      table.providerPaymentId
    ),
    uniqueIndex("payments_provider_order_id_unique_idx")
      .on(table.providerOrderId)
      .where(sql`${table.providerOrderId} IS NOT NULL`),
    index("payments_status_idx").on(table.status),
    index("payments_created_at_idx").on(table.createdAt),
    check("payments_amount_positive_check", sql`${table.amount} >= 0`),
    check(
      "payments_refund_non_negative_check",
      sql`${table.refundAmount} >= 0`
    ),
  ]
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

/**
 * subscription_events
 * Inbound webhook event store with unique event_id ensuring at-most-once processing (Idempotency).
 */
export const subscriptionEvents = pgTable(
  "subscription_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: varchar("provider", { length: 30 }).notNull(),
    eventId: varchar("event_id", { length: 150 }).notNull().unique(), // Provider webhook idempotency key
    eventType: varchar("event_type", { length: 100 }).notNull(),
    payload: jsonb("payload").notNull(),
    status: varchar("status", { length: 20 }).default("received").notNull(), // received, processed, failed, ignored
    processedAt: timestamp("processed_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("sub_events_event_id_unique_idx").on(table.eventId),
    index("sub_events_provider_type_idx").on(table.provider, table.eventType),
    index("sub_events_status_idx").on(table.status),
    index("sub_events_created_at_idx").on(table.createdAt),
  ]
);

export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;
export type NewSubscriptionEvent = typeof subscriptionEvents.$inferInsert;

/**
 * feature_usage
 * Daily consumption tracking of metered features (e.g. 5 Super Likes / day, 1 Boost / week).
 */
export const featureUsage = pgTable(
  "feature_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => subscriptionFeatures.id, { onDelete: "cascade" }),
    usageDate: date("usage_date", { mode: "string" }).notNull(),
    usageCount: integer("usage_count").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("feature_usage_user_feature_date_unique_idx").on(
      table.userId,
      table.featureId,
      table.usageDate
    ),
    index("feature_usage_user_date_idx").on(table.userId, table.usageDate),
    check("feature_usage_count_non_negative_check", sql`${table.usageCount} >= 0`),
  ]
);

export type FeatureUsage = typeof featureUsage.$inferSelect;
export type NewFeatureUsage = typeof featureUsage.$inferInsert;
