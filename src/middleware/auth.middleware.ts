import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { db } from "../db/index";
import { users } from "../db/schema";
import { eq, and } from "drizzle-orm";
import ApiResponse from "../utils/response";
import type { TokenPayload, SafeUser } from "../types/index";

/**
 * Authenticate JWT Access Token
 * Production: Strictly enforces JWT Bearer Token.
 * Development / Test: Allows testing with JWT OR Dev-header / Seeded User fallback.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const isDev = process.env.NODE_ENV !== "production";

    // 1. STANDARD PRODUCTION JWT AUTHENTICATION
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];

      if (!token) {
        return ApiResponse.error(res, {
          statusCode: 401,
          message: "Malformed Bearer token",
          code: "UNAUTHORIZED",
        });
      }

      const decoded = verifyAccessToken(token) as TokenPayload;

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          phone: users.phone,
          role: users.role,
          status: users.status,
          emailVerified: users.emailVerified,
          phoneVerified: users.phoneVerified,
          authProvider: users.authProvider,
          lastLoginAt: users.lastLoginAt,
          lastActiveAt: users.lastActiveAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
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

      if (user.status !== "active") {
        return ApiResponse.error(res, {
          statusCode: 403,
          message: "User account is suspended or deactivated",
          code: "ACCOUNT_INACTIVE",
        });
      }

      req.user = user as SafeUser;
      return next();
    }

    // 2. DEVELOPMENT-ONLY CONVENIENCE FALLBACK (For rapid local testing)
    if (isDev) {
      // Check if developer specified a user ID via header
      const devUserId = req.headers["x-user-id"] as string | undefined;

      let devUser;
      if (devUserId) {
        [devUser] = await db
          .select({
            id: users.id,
            email: users.email,
            phone: users.phone,
            role: users.role,
            status: users.status,
            emailVerified: users.emailVerified,
            phoneVerified: users.phoneVerified,
            authProvider: users.authProvider,
            lastLoginAt: users.lastLoginAt,
            lastActiveAt: users.lastActiveAt,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(and(eq(users.id, devUserId), eq(users.status, "active")));
      } else {
        // Fallback to the first active user in database for instant 1-click testing
        [devUser] = await db
          .select({
            id: users.id,
            email: users.email,
            phone: users.phone,
            role: users.role,
            status: users.status,
            emailVerified: users.emailVerified,
            phoneVerified: users.phoneVerified,
            authProvider: users.authProvider,
            lastLoginAt: users.lastLoginAt,
            lastActiveAt: users.lastActiveAt,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(eq(users.status, "active"))
          .limit(1);
      }

      if (devUser) {
        req.user = devUser as SafeUser;
        return next();
      }
    }

    // 3. UNAUTHORIZED IF NO TOKEN IN PRODUCTION OR NO DEV USER FOUND
    return ApiResponse.error(res, {
      statusCode: 401,
      message: "Authorization token required (Bearer <token>)",
      code: "UNAUTHORIZED",
    });
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
            email: users.email,
            phone: users.phone,
            role: users.role,
            status: users.status,
            emailVerified: users.emailVerified,
            phoneVerified: users.phoneVerified,
            authProvider: users.authProvider,
            lastLoginAt: users.lastLoginAt,
            lastActiveAt: users.lastActiveAt,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(eq(users.id, decoded.id));

        if (user && user.status === "active") {
          req.user = user as SafeUser;
        }
      }
    }
    return next();
  } catch {
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
