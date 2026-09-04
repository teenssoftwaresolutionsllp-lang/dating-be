import { pgTable, serial, varchar } from "drizzle-orm/pg-core";

export const interests = pgTable("interests", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  category: varchar("category", { length: 50 }),
});
