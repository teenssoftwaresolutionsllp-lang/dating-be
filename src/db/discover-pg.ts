import pg from "pg";

const { Client } = pg;

interface TestConnectionResult {
  success: boolean;
  port?: number;
  databases?: string[];
  error?: string;
}

const testConnection = async (
  port: number,
  database: string,
  user: string,
  password: string
): Promise<TestConnectionResult> => {
  const client = new Client({
    host: "localhost",
    port,
    database,
    user,
    password,
  });

  try {
    await client.connect();
    console.log(`✅ Connected successfully to port ${port}, db: "${database}"`);
    const res = await client.query<{ datname: string }>("SELECT datname FROM pg_database;");
    console.log("Databases on this instance:", res.rows.map((r) => r.datname));
    await client.end();
    return { success: true, port, databases: res.rows.map((r) => r.datname) };
  } catch (err: unknown) {
    const errorMsg = (err as Error).message;
    console.log(`❌ Failed port ${port}, db "${database}": ${errorMsg}`);
    try {
      await client.end();
    } catch {}
    return { success: false, error: errorMsg };
  }
};

const main = async (): Promise<void> => {
  console.log("--- Testing Port 5432 (default) ---");
  await testConnection(5432, "postgres", "postgres", "7032");
  await testConnection(5432, "Dating", "postgres", "7032");
  await testConnection(5432, "dating", "postgres", "7032");

  console.log("\n--- Testing Port 5433 (PostgreSQL 18 default when 17 exists) ---");
  await testConnection(5433, "postgres", "postgres", "7032");
  await testConnection(5433, "Dating", "postgres", "7032");
  await testConnection(5433, "dating", "postgres", "7032");

  console.log("\n--- Testing Port 5434 ---");
  await testConnection(5434, "postgres", "postgres", "7032");
  await testConnection(5434, "Dating", "postgres", "7032");
};

main();
