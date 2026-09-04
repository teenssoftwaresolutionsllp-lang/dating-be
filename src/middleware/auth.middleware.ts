import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { db } from "../db/index";
import { users } from "../db/schema/users";
import { eq } from "drizzle-orm";
import ApiResponse from "../utils/response";
import type { TokenPayload } from "../types/index";

/**
 * Authenticate JWT Access Token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Authorization token required (Bearer <token>)",
        code: "UNAUTHORIZED",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Malformed Bearer token",
        code: "UNAUTHORIZED",
      });
    }

    const decoded = verifyAccessToken(token);

    // Verify user exists and is active in database
    const [user] = await db
      .select({
        id: users.id,
        phone: users.phone,
        countryCode: users.countryCode,
        email: users.email,
        preferredLanguage: users.preferredLanguage,
        role: users.role,
        isVerified: users.isVerified,
        isActive: users.isActive,
        profileCompleted: users.profileCompleted,
      })
      .from(users)
      .where(eq(users.id, decoded.id));

    if (!user) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "User account not found or deleted",
        code: "USER_NOT_FOUND",
      });
    }

    if (!user.isActive) {
      return ApiResponse.error(res, {
        statusCode: 403,
        message: "User account is suspended or deactivated",
        code: "ACCOUNT_INACTIVE",
      });
    }

    req.user = user;
    return next();
  } catch (error: unknown) {
    const err = error as { name?: string };
    if (err.name === "TokenExpiredError") {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Access token has expired. Please refresh your token.",
        code: "TOKEN_EXPIRED",
      });
    }

    return ApiResponse.error(res, {
      statusCode: 401,
      message: "Invalid or corrupt access token",
      code: "INVALID_TOKEN",
    });
  }
};

/**
 * Optional Authentication (Attaches req.user if valid token present)
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token) {
        const decoded = verifyAccessToken(token) as TokenPayload;

        const [user] = await db
          .select({
            id: users.id,
            phone: users.phone,
            countryCode: users.countryCode,
            email: users.email,
            preferredLanguage: users.preferredLanguage,
            role: users.role,
            isVerified: users.isVerified,
            isActive: users.isActive,
            profileCompleted: users.profileCompleted,
          })
          .from(users)
          .where(eq(users.id, decoded.id));

        if (user && user.isActive) {
          req.user = user;
        }
      }
    }
    return next();
  } catch {
    // Silently continue without user
    return next();
  }
};

/**
 * Admin authorization check
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== "admin") {
    return ApiResponse.error(res, {
      statusCode: 403,
      message: "Forbidden: Admin privileges required",
      code: "FORBIDDEN",
    });
  }
  return next();
};
