import type { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from "express";
import ApiResponse from "../utils/response";
import type { AppError } from "../types/index";

/**
 * Async handler wrapper to catch unhandled promise rejections
 * @param fn Express async route handler
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found Middleware
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  return ApiResponse.error(res, {
    statusCode: 404,
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    code: "NOT_FOUND",
  });
};

/**
 * Global Error Handler Middleware
 */
export const errorHandler: ErrorRequestHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("💥 Unhandled Error:", err);

  const statusCode =
    err.statusCode ||
    (res.statusCode !== 200 && res.statusCode !== 201 ? res.statusCode : 500);
  const message = err.message || "An unexpected error occurred on the server";

  return ApiResponse.error(res, {
    statusCode,
    message,
    code: err.code || "INTERNAL_ERROR",
    errors:
      err.errors ||
      (process.env.NODE_ENV === "development" ? err.stack : undefined),
  });
};
