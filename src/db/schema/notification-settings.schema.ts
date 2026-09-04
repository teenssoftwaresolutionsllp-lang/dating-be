import { boolean, pgTable, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const notificationSettings = pgTable("notification_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  newMatches: boolean("new_matches").notNull().default(true),
  newMessages: boolean("new_messages").notNull().default(true),
  newLikes: boolean("new_likes").notNull().default(true),
  marketing: boolean("marketing").notNull().default(false),
  pushEnabled: boolean("push_enabled").notNull().default(true),
  emailEnabled: boolean("email_enabled").notNull().default(true),
});
