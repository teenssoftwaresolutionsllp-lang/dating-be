import "dotenv/config";

import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

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
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", profileRoutes);
// =================================================================
// API Routes (v1)
// =================================================================
// Authentication — Mounted under /api/v1/auth and /auth (legacy)
// app.use("/api/v1/auth", authRoutes);
// app.use("/auth", authRoutes);

// =================================================================
// Error Handling
// =================================================================
// 404 and Global Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
