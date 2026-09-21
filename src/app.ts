import "dotenv/config";

import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";
import matchRoutes from "./routes/match.routes";
import messageRoutes from "./routes/message.routes";
import userRoutes from "./routes/user.routes";
import adminRoutes from "./routes/admin.routes";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware";

const app: Express = express();

// Security and utility middleware
app.use(cors());
app.use(helmet());
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root & Health Check
app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Dating App Backend is running 🚀",
    version: "1.0.0",
    docs: "/api/v1/auth",
  });
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "API is healthy ❤️",
    timestamp: new Date().toISOString(),
  });
});

app.get("/favicon.ico", (_req: Request, res: Response) => {
  res.status(204).end();
});

// =================================================================
// API Routes (v1)
// =================================================================
// Authentication — Mounted under /api/v1/auth and /auth (legacy)
app.use("/api/v1/auth", authRoutes);
app.use("/auth", authRoutes);

// User account management
app.use("/api/v1/users", userRoutes);

// Profile management
app.use("/api/v1/profile", profileRoutes);

// Match / Swipe
app.use("/api/v1/matches", matchRoutes);

// Messaging
app.use("/api/v1/messages", messageRoutes);

// Admin panel (requires admin role)
app.use("/api/v1/admin", adminRoutes);

// =================================================================
// Error Handling
// =================================================================
// 404 and Global Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
