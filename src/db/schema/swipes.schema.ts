import {
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const swipes = pgTable(
  "swipes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetUserId: uuid("target_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 20 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("swipes_user_target_unique").on(table.userId, table.targetUserId),
    index("swipes_user_id_idx").on(table.userId),
    index("swipes_target_user_id_idx").on(table.targetUserId),
    index("swipes_action_idx").on(table.action),
    index("swipes_created_at_idx").on(table.createdAt),
  ],
);
