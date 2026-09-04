import { boolean, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const userSettings = pgTable("user_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  profileVisibility: boolean("profile_visibility").notNull().default(true),
  showVerifiedOnly: boolean("show_verified_only").notNull().default(false),
  locationVisibility: varchar("location_visibility", { length: 20 })
    .notNull()
    .default("approximate"),
  onlineStatusVisibility: boolean("online_status_visibility")
    .notNull()
    .default(true),
});
