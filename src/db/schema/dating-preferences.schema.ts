import {
  boolean,
  integer,
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
    .references(() => users.id, { onDelete: "cascade" }),
  minAge: smallint("min_age").notNull().default(18),
  maxAge: smallint("max_age").notNull().default(60),
  maxDistance: integer("max_distance").notNull().default(50),
  preferredGender: varchar("preferred_gender", { length: 20 }),
  relationshipIntention: varchar("relationship_intention", { length: 30 }),
  religionPreference: varchar("religion_preference", { length: 30 }),
  communityPreference: varchar("community_preference", { length: 30 }),
  verifiedOnly: boolean("verified_only").notNull().default(false),
});
