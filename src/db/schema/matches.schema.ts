import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user1Id: uuid("user1_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    user2Id: uuid("user2_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchedAt: timestamp("matched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: varchar("status", { length: 20 }).notNull().default("active"),
  },
  (table) => [
    index("matches_user1_id_idx").on(table.user1Id),
    index("matches_user2_id_idx").on(table.user2Id),
  ],
);
