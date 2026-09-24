import type { Request, Response, NextFunction } from "express";
import ApiResponse from "../utils/response";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const requests = new Map<string, { count: number; resetAt: number }>();

export const locationAutocompleteRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const key = req.user?.userId ?? req.ip ?? "unknown";
  const now = Date.now();
  const current = requests.get(key);

  if (!current || current.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (current.count >= MAX_REQUESTS) {
    return ApiResponse.error(res, {
      statusCode: 429,
      message: "Too many location autocomplete requests",
      code: "LOCATION_AUTOCOMPLETE_RATE_LIMIT",
    });
  }

  current.count += 1;
  return next();
};
