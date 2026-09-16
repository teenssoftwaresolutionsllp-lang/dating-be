import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const profilePhotos = pgTable(
  "profile_photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.user_id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    url: text("url").notNull(),
    displayOrder: smallint("display_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
    verificationStatus: varchar("verification_status", { length: 20 })
      .notNull()
      .default("pending"),
    moderationStatus: varchar("moderation_status", { length: 20 })
      .notNull()
      .default("pending"),
    moderationReason: text("moderation_reason"),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    mimeType: varchar("mime_type", { length: 50 }).notNull().default("image/jpeg"),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("profile_photos_user_id_idx").on(table.userId)],
);

export type ProfilePhoto = typeof profilePhotos.$inferSelect;
export type NewProfilePhoto = typeof profilePhotos.$inferInsert;
