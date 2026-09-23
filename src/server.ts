import "dotenv/config";

import app from "./app";
import { startAccountCleanupJob } from "./jobs/account-cleanup.job";

const PORT: number = Number(process.env.PORT) || 5000;

startAccountCleanupJob();

app.listen(PORT, () => {
  console.log(`🚀 Dating App Backend running on http://localhost:${PORT}`);
});
