import "dotenv/config";
import http from "http";

import app from "./app";
import { startAccountCleanupScheduler } from "./services/account-cleanup.scheduler";
import { SocketService } from "./services/socket.service";

const PORT: number = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

const server = http.createServer(app);

// Initialize WebSocket server
SocketService.init(server);

server.listen(PORT, HOST, () => {
  startAccountCleanupScheduler();
  console.log(`🚀 Dating App Backend running on http://localhost:${PORT}`);
  console.log(`📡 Network accessible on http://0.0.0.0:${PORT}`);
  console.log(`⚡ WebSocket Server active on ws://${HOST}:${PORT}`);
});
