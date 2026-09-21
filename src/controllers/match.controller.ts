import type { Request, Response } from "express";
import MatchService from "../services/match.service";
import ApiResponse from "../utils/response";
import type { SwipeDirection } from "../types/index";
import { db } from "../db/index";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Helper: Resolve current user ID from token, header, query, body, or fallback test user
 */
async function resolveUserId(req: Request): Promise<string | null> {
  // 1. From authenticated req.user
  if (req.user?.id) {
    return req.user.id;
  }

  // 2. From x-user-id header
  const headerUserId = req.headers["x-user-id"] as string | undefined;
  if (headerUserId) {
    return headerUserId;
  }

  // 3. From query param (?userId=...)
  const queryUserId = req.query.userId as string | undefined;
  if (queryUserId) {
    return queryUserId;
  }

  // 4. From body (userId: ...)
  const bodyUserId = (req.body as { userId?: string })?.userId;
  if (bodyUserId) {
    return bodyUserId;
  }

  // 5. Fallback to first active user in database
  const [defaultUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.status, "active"))
    .limit(1);

  return defaultUser?.id || null;
}

export class MatchController {
  /**
   * GET /api/v1/matches/feed
   * Get discovery candidate cards for the Explore/People tab
   */
  static async getDiscoveryFeed(req: Request, res: Response): Promise<Response> {
    const userId = await resolveUserId(req);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "No active user found in database. Please run 'npm run db:seed' first.",
        code: "NO_USER_FOUND",
      });
    }

    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "10", 10);

    const result = await MatchService.getDiscoveryFeed({ userId, page, limit });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Discovery feed retrieved successfully",
      data: result.items,
      meta: {
        activeUserId: userId,
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  }

  /**
   * POST /api/v1/matches/swipe
   * Record a swipe (like / dislike / superlike)
   */
  static async swipe(req: Request, res: Response): Promise<Response> {
    const userId = await resolveUserId(req);
    const { targetUserId, direction } = req.body as {
      targetUserId: string;
      direction: SwipeDirection;
    };

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "No active user found in database. Please run 'npm run db:seed' first.",
        code: "NO_USER_FOUND",
      });
    }

    if (!targetUserId || typeof targetUserId !== "string") {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "targetUserId is required in request body",
        code: "VALIDATION_ERROR",
      });
    }

    const validDirections: SwipeDirection[] = ["like", "dislike", "superlike"];
    if (!direction || !validDirections.includes(direction)) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: `direction must be one of: ${validDirections.join(", ")}`,
        code: "VALIDATION_ERROR",
      });
    }

    const result = await MatchService.swipe({
      userId,
      targetUserId,
      direction,
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: result.isMatch
        ? "🎉 It's a match! You can now find them in your Matches tab."
        : `Swipe recorded: ${direction}`,
      data: result,
    });
  }

  /**
   * GET /api/v1/matches
   * Get all mutual matches for the user (Matches tab)
   */
  static async getMatches(req: Request, res: Response): Promise<Response> {
    const userId = await resolveUserId(req);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "No active user found in database.",
        code: "NO_USER_FOUND",
      });
    }

    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "20", 10);

    const result = await MatchService.getMatches({ userId, page, limit });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Matches retrieved successfully",
      data: result.items,
      meta: {
        activeUserId: userId,
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  }

  /**
   * GET /api/v1/matches/likes
   * Get list of users who liked the user (Likes tab)
   */
  static async getLikesReceived(req: Request, res: Response): Promise<Response> {
    const userId = await resolveUserId(req);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "No active user found in database.",
        code: "NO_USER_FOUND",
      });
    }

    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "20", 10);

    const result = await MatchService.getLikesReceived({ userId, page, limit });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Likes received retrieved successfully",
      data: result.items,
      meta: {
        activeUserId: userId,
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  }

  /**
   * POST /api/v1/matches/:matchId/chat
   * Voluntarily initiate / get a chat conversation with a match
   */
  static async startChat(req: Request, res: Response): Promise<Response> {
    const userId = await resolveUserId(req);
    const matchId = String(req.params.matchId);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "No active user found in database.",
        code: "NO_USER_FOUND",
      });
    }

    if (!matchId) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "matchId is required in URL parameters",
        code: "VALIDATION_ERROR",
      });
    }

    const result = await MatchService.startChat({ userId, matchId });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Chat session ready",
      data: result,
    });
  }

  /**
   * DELETE /api/v1/matches/:matchId
   * Unmatch a user
   */
  static async unmatch(req: Request, res: Response): Promise<Response> {
    const userId = await resolveUserId(req);
    const matchId = String(req.params.matchId);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "No active user found in database.",
        code: "NO_USER_FOUND",
      });
    }

    if (!matchId) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "matchId is required in URL parameters",
        code: "VALIDATION_ERROR",
      });
    }

    await MatchService.unmatch(userId, matchId);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Unmatched successfully",
    });
  }

  /**
   * POST /api/v1/matches/block
   * Block a user
   */
  static async blockUser(req: Request, res: Response): Promise<Response> {
    const userId = await resolveUserId(req);
    const { targetUserId } = req.body as { targetUserId: string };

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "No active user found in database.",
        code: "NO_USER_FOUND",
      });
    }

    if (!targetUserId) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "targetUserId is required in request body",
        code: "VALIDATION_ERROR",
      });
    }

    await MatchService.blockUser(userId, targetUserId);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "User blocked successfully",
    });
  }

  /**
   * POST /api/v1/matches/report
   * Report a user
   */
  static async reportUser(req: Request, res: Response): Promise<Response> {
    const userId = await resolveUserId(req);
    const { targetUserId, reason, description } = req.body as {
      targetUserId: string;
      reason: string;
      description?: string;
    };

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "No active user found in database.",
        code: "NO_USER_FOUND",
      });
    }

    if (!targetUserId || !reason) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "targetUserId and reason are required in request body",
        code: "VALIDATION_ERROR",
      });
    }

    await MatchService.reportUser({
      userId,
      targetUserId,
      reason,
      description,
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Report submitted successfully. Our safety team will review it.",
    });
  }
}

export default MatchController;
