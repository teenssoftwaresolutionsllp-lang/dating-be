import type { Request, Response, NextFunction } from "express";
import ApiResponse from "../utils/response";

/**
 * Require Admin role middleware
 */
export const requireAdminRole = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== "admin") {
    return ApiResponse.error(res, {
      statusCode: 403,
      message: "Access forbidden: Admin permissions required",
      code: "FORBIDDEN",
    });
  }
  return next();
};

export default requireAdminRole;
