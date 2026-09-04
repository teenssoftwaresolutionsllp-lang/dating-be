import { integer, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { languages } from "./languages.schema";
import { profiles } from "./profiles.schema";

// A profile can select each language only once.
export const profileLanguages = pgTable(
  "profile_languages",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    languageId: integer("language_id")
      .notNull()
      .references(() => languages.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.profileId, table.languageId] })],
);
