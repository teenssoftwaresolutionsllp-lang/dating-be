import {
  boolean,
  jsonb,
  numeric,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  duration: varchar("duration", { length: 20 }).notNull(),
  features: jsonb("features"),
  isActive: boolean("is_active").notNull().default(true),
});
