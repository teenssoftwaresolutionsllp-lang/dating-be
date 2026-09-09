import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl ?? "",
  },
  migrations: {
    table: "__drizzle_migrations",
    schema: "drizzle",
  },
});

//src/db/migrate.ts  = executes migrations

//npm run dev:generate=> Generates a new migration file in the drizzle folder with the current timestamp and a name provided by the user. The migration file contains SQL statements that describe the changes made to the database schema since the last migration. This compares: ex: src/db/schema/ with the previous migration snapshot and creates a new SQL file.

//npm run dev:push=> Applies the generated migration file to the database. It executes the SQL statements in the migration file to update the database schema. This command should be run after generating a new migration file to apply the changes to the database.

/*
    Drizzle workflow:

    - src/db/schema/index.ts is the source schema definition.
    - src/db/migrations contains generated SQL files and the meta snapshots.
    - npm run db:generate compares the schema with the latest snapshot and
      creates a new migration file. It does not change the database.
    - npm run db:migrate runs pending migrations through src/db/migrate.ts.
    - npm run db:push applies the current schema directly and is intended for
      local development, not for production migration history.

    Keep the SQL files and the meta directory together. PostgreSQL records
    applied migration entries in drizzle.__drizzle_migrations.
  */
//npm run dev:reset=> Resets the database to its initial state. It drops all tables and recreates them based on the current schema defined in the src/db/schema/ folder. This command is useful for testing and development purposes when you want to start with a clean database.
//example: npm run dev:reset It resets the database to its initial state. It drops all tables and recreates them based on the current schema defined in the src/db/schema/ folder.
