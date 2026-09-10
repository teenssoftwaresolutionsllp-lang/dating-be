import type { Request, Response, NextFunction } from "express";
import ApiResponse from "../utils/response";

/**
 * Require a regular user role.
 * Use after authenticate on user-specific routes.
 */
export const requireUserRole = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user || req.user.role !== "user") {
    return ApiResponse.error(res, {
      statusCode: 403,
      message: "Access forbidden: User permissions required",
      code: "FORBIDDEN",
    });
  }

  return next();
};

export default requireUserRole;
