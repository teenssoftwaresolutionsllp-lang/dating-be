import "dotenv/config";

import { pool } from "../index";
import { seedInterests } from "./interests.seed";
import { seedLanguages } from "./languages.seed";

const runSeeds = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required to seed the database.");
    }

    await seedInterests();
    await seedLanguages();
    console.log("All database seeds completed successfully.");
  } catch (error) {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

runSeeds();
