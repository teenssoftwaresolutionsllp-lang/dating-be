import "dotenv/config";

import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";
import matchRoutes from "./routes/match.routes";
import messageRoutes from "./routes/message.routes";
import peopleRoutes from "./routes/people.routes";
import accountRoutes from "./routes/account.routes";
import locationRoutes from "./routes/location.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

const app: Express = express();

// Security and utility middleware
app.use(
  cors({
    origin:
      process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()) ||
      true,
    credentials: true,
  }),
);
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
// API Routes

//authentication routes
app.use("/api/v1/auth", authRoutes);

//profile creation routes
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/people", peopleRoutes);
app.use("/api/v1/matches", matchRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/account", accountRoutes);
app.use("/api/v1", locationRoutes);

// =================================================================
// Error Handling
// =================================================================
// 404 and Global Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
