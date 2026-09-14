import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "./index";

/**
 * ============================================================================
 * DATABASE RESET UTILITY (Development Only)
 * ============================================================================
 * Drops the public schema and recreates it cleanly to allow fresh migrations.
 */

async function reset() {
  if (process.env.NODE_ENV === "production") {
    console.error("⛔ RESET IS STRICTLY FORBIDDEN IN PRODUCTION!");
    process.exit(1);
  }

  console.log("⚠️ Resetting database (dropping public schema)...");
  try {
    await db.execute(sql`DROP SCHEMA public CASCADE;`);
    await db.execute(sql`CREATE SCHEMA public;`);
    await db.execute(sql`GRANT ALL ON SCHEMA public TO public;`);
    console.log("✅ Public schema reset successfully. Ready for fresh migrations.");
  } catch (err) {
    console.error("❌ Reset failed:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

reset();
