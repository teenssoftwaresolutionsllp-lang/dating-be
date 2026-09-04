import "dotenv/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pool } from "./index";

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../drizzle",
);

const runMigration = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required to run migrations.");
    }

    console.log(
      "Connecting to PostgreSQL at:",
      process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@"),
    );
    const db = drizzle(pool);
    console.log(`Applying migrations from ${migrationsFolder}...`);
    await migrate(db, { migrationsFolder });
    console.log("All migrations applied successfully. Tables are ready.");
  } catch (error) {
    console.error("Migration failed with error:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

runMigration();
