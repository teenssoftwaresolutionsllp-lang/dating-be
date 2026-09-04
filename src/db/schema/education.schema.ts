import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const education = pgTable(
  "education",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    educationLevel: varchar("education_level", { length: 30 }).notNull(),
    qualification: varchar("qualification", { length: 100 }),
    profession: varchar("profession", { length: 100 }),
    occupation: varchar("occupation", { length: 100 }),
    companyName: varchar("company_name", { length: 150 }),
    incomeRange: varchar("income_range", { length: 30 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("education_user_id_idx").on(table.userId)],
);
