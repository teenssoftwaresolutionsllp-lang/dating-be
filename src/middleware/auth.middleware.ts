import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import AuthRepository from "../repositories/auth.repository";
import ApiResponse from "../utils/response";
import type { TokenPayload } from "../types/index";

/**
 * Authenticate JWT Access Token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

    if (!decoded.sessionId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Access token is not linked to an active session",
        code: "INVALID_SESSION",
      });
    }

    const session = await AuthRepository.findActiveSessionById(
      decoded.sessionId,
    );

    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Session has been revoked or expired. Please login again.",
        code: "SESSION_REVOKED",
      });
    }

    const user = await AuthRepository.findUserById(session.userId);

    if (!user || user.user_id !== decoded.id) {
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

    req.user = {
      id: user.user_id,
      userId: user.user_id,
      phone: user.phone,
      countryCode: "+1",
      preferredLanguage: "en",
      role: user.role,
      isVerified: user.phoneVerified,
      profileCompleted: false,
    };
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
//test pending
/**
 * Optional Authentication (Attaches req.user if valid token present)
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token) {
        const decoded = verifyAccessToken(token) as unknown as TokenPayload;

        const user = await AuthRepository.findUserById(decoded.id);

        if (user && user.status === "active") {
          req.user = {
            id: user.user_id,
            userId: user.user_id,
            phone: user.phone,
            countryCode: "+1",
            preferredLanguage: "en",
            role: user.role,
            isVerified: user.phoneVerified,
            profileCompleted: false,
          };
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
  next: NextFunction,
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
