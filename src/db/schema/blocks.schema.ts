import { index, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const blocks = pgTable(
  "blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedUserId: uuid("blocked_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("blocks_user_blocked_unique").on(table.userId, table.blockedUserId),
    index("blocks_user_id_idx").on(table.userId),
    index("blocks_blocked_user_id_idx").on(table.blockedUserId),
  ],
);
