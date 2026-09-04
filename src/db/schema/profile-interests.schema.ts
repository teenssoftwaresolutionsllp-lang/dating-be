import { integer, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { interests } from "./interests.schema";
import { profiles } from "./profiles.schema";

// A profile can select each interest only once.
export const profileInterests = pgTable(
  "profile_interests",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    interestId: integer("interest_id")
      .notNull()
      .references(() => interests.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.profileId, table.interestId] })],
);
