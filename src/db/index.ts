import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import * as relations from "./relations";

const { Pool } = pg;

const isCloudDb =
  process.env.DATABASE_URL?.includes("neon.tech") ||
  process.env.DATABASE_URL?.includes("render.com") ||
  process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isCloudDb ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, {
  schema: { ...schema, ...relations },
});

export type DbClient = typeof db;
export * from "./schema";
export * from "./relations";