import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  numeric,
  timestamp,
  uuid,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * ============================================================================
 * INDEPENDENT TABLES (Master Catalogs & Lookups with 0 Foreign Dependencies)
 * ============================================================================
 */

/**
 * languages
 * Reusable master list of languages that candidate profiles can select from.
 */
export const languages = pgTable(
  "languages",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 50 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("languages_name_unique_idx").on(table.name),
  ]
);

export type Language = typeof languages.$inferSelect;
export type NewLanguage = typeof languages.$inferInsert;

/**
 * interests
 * Reusable master list of interests/hobbies categorized for discovery filters.
 */
export const interests = pgTable(
  "interests",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 50 }).notNull().unique(),
    category: varchar("category", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("interests_name_unique_idx").on(table.name),
    index("interests_category_idx").on(table.category),
  ]
);

export type Interest = typeof interests.$inferSelect;
export type NewInterest = typeof interests.$inferInsert;

/**
 * subscription_plans
 * Master list of premium membership plans offered by the dating platform.
 */
export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 50 }).notNull().unique(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    duration: varchar("duration", { length: 20 }).notNull(), // monthly, quarterly, yearly
    features: text("features"), // summary/json description
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("sub_plans_name_unique_idx").on(table.name),
    index("sub_plans_is_active_idx").on(table.isActive),
    check("sub_plan_price_non_negative_check", sql`${table.price} >= 0`),
  ]
);

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

/**
 * subscription_features
 * Master catalog of monetizable capabilities (e.g. UNLIMITED_LIKES, SEE_WHO_LIKED, PROFILE_BOOST).
 */
export const subscriptionFeatures = pgTable(
  "subscription_features",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).notNull().unique(), // UNLIMITED_LIKES, SUPER_LIKE, SEE_WHO_LIKED, ADVANCED_FILTERS
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("sub_features_code_unique_idx").on(table.code),
  ]
);

export type SubscriptionFeature = typeof subscriptionFeatures.$inferSelect;
export type NewSubscriptionFeature = typeof subscriptionFeatures.$inferInsert;
