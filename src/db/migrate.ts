import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pool } from "./index";

const runMigration = async () => {
  try {
    console.log("Connecting to PostgreSQL at:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@"));
    const db = drizzle(pool);
    console.log("Applying migrations from ./drizzle folder...");
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ All migrations applied successfully! Tables are ready.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed with error:", error);
    process.exit(1);
  }
};

runMigration();
