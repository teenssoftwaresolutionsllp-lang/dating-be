import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./core";

/**
 * ============================================================================
 * CALLS SCHEMA (Audio & Video Real-Time Communication)
 * ============================================================================
 */
export const calls = pgTable(
  "calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    callerId: uuid("caller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channelName: varchar("channel_name", { length: 128 }).notNull().unique(),
    callType: varchar("call_type", { length: 20 }).notNull().default("video"), // "audio" | "video"
    status: varchar("status", { length: 30 }).notNull().default("initiated"), // "initiated" | "ringing" | "accepted" | "rejected" | "missed" | "ended"
    durationSeconds: integer("duration_seconds").default(0).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("calls_caller_id_idx").on(table.callerId),
    index("calls_receiver_id_idx").on(table.receiverId),
    index("calls_channel_idx").on(table.channelName),
    index("calls_status_idx").on(table.status),
  ]
);

export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
