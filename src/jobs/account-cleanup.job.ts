import UserService from "../services/user.service";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

export const startAccountCleanupJob = (): NodeJS.Timeout => {
  const run = async (): Promise<void> => {
    try {
      await UserService.purgeExpiredDeactivatedAccounts();
    } catch (error) {
      console.error("Expired account cleanup failed:", error);
    }
  };

  void run();
  const timer = setInterval(() => void run(), CLEANUP_INTERVAL_MS);
  timer.unref();
  return timer;
};
