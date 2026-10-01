import type { PoolClient } from "pg";
import { pool } from "../db/index";
import AccountService from "./account.service";

const LOCK_NAMESPACE = 74129;
const LOCK_ID = 1;
const RUN_INTERVAL_MS = 60 * 1000;

let cleanupTimer: NodeJS.Timeout | undefined;
let cleanupRunning = false;

const runCleanupWithLock = async (): Promise<void> => {
  if (cleanupRunning) return;
  cleanupRunning = true;

  let client: PoolClient | undefined;
  let lockAcquired = false;
  try {
    const connection = await pool.connect();
    client = connection;
    const lockResult = await connection.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock($1, $2) AS locked",
      [LOCK_NAMESPACE, LOCK_ID],
    );
    lockAcquired = lockResult.rows[0]?.locked === true;
    if (!lockAcquired) return;

    const result = await AccountService.runExpirationCleanup();
    if (result.accountsDeleted || result.mediaDeleted || result.mediaFailures) {
      console.info("Account lifecycle cleanup completed", result);
    }
  } catch (error) {
    console.error(
      "Account lifecycle cleanup failed; next run will retry",
      error,
    );
  } finally {
    if (client && lockAcquired) {
      try {
        await client.query("SELECT pg_advisory_unlock($1, $2)", [
          LOCK_NAMESPACE,
          LOCK_ID,
        ]);
      } catch (error) {
        console.error("Could not release account cleanup lock", error);
      }
    }
    client?.release();
    cleanupRunning = false;
  }
};

export const startAccountCleanupScheduler = (): void => {
  if (cleanupTimer) return;
  void runCleanupWithLock();
  cleanupTimer = setInterval(() => {
    void runCleanupWithLock();
  }, RUN_INTERVAL_MS);
  cleanupTimer.unref();
};
