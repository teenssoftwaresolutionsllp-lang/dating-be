import { boolean, index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { subscriptionPlans } from "./subscription-plans.schema";
import { users } from "./users.schema";

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.user_id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id),
    provider: varchar("provider", { length: 30 }).notNull().default("razorpay"),
    providerSubscriptionId: varchar("provider_subscription_id", { length: 150 }),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    autoRenew: boolean("auto_renew").notNull().default(true),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("subscriptions_user_id_idx").on(table.userId),
    index("subscriptions_plan_id_idx").on(table.planId),
  ],
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
