import {
  boolean,
  integer,
  jsonb,
  pgTable,
  smallint,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const datingPreferences = pgTable("dating_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.user_id, { onDelete: "cascade" }),
  minAge: smallint("min_age").notNull().default(18),
  maxAge: smallint("max_age").notNull().default(60),
  maxDistanceKm: integer("max_distance_km").notNull().default(50),
  preferredGenders: jsonb("preferred_genders").$type<string[]>(),
  relationshipIntentions: jsonb("relationship_intentions").$type<string[]>(),
  religionPreferences: jsonb("religion_preferences").$type<string[]>(),
  communityPreferences: jsonb("community_preferences").$type<string[]>(),
  verifiedOnly: boolean("verified_only").notNull().default(false),
  createdAt: varchar("created_at", { length: 20 }),
});

export type DatingPreference = typeof datingPreferences.$inferSelect;
export type NewDatingPreference = typeof datingPreferences.$inferInsert;
