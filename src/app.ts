import path from "node:path";
import express, { type Express, type Request, type Response } from "express";
import swaggerUiExpress from "swagger-ui-express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes";
import accountRoutes from "./routes/account.routes";
import profileRoutes from "./routes/profile.routes";
import locationRoutes from "./routes/location.routes";
import matchRoutes from "./routes/match.routes";
import messageRoutes from "./routes/message.routes";
import callRoutes from "./routes/call.routes";
import userRoutes from "./routes/user.routes";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware";
import swaggerDocument from "./swagger";

const app: Express = express();

// Security and utility middleware
app.use(cors());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Swagger UI - served from inline spec (no file scanning)
app.use("/api-docs", swaggerUiExpress.serve, swaggerUiExpress.setup(swaggerDocument));

// Root & Health Check
app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Dating App Backend is running 🚀",
    version: "1.0.0",
    docs: "/api-docs",
  });
});

app.get(["/api/health", "/api/v1/health"], (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "API is healthy ❤️",
    timestamp: new Date().toISOString(),
  });
});

app.get("/favicon.ico", (_req: Request, res: Response) => res.status(204).end());

// API Routes (v1)
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/account", accountRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1", locationRoutes);
app.use("/api/v1/matches", matchRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/calls", callRoutes);
app.use("/api/v1/users", userRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
