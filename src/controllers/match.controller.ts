import type { Request, Response } from "express";
import MatchService from "../services/match.service";
import ApiResponse from "../utils/response";
import type { SwipeDirection } from "../types/index";

/**
 * Resolve the current user ID from the authenticated request context.
 */
async function resolveUserId(req: Request): Promise<string | null> {
  return req.user?.id ?? null;
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
   * GET /api/v1/matches/sent-likes
   * Get list of users the current user liked (You Liked tab)
   */
  static async getSentLikes(req: Request, res: Response): Promise<Response> {
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

    const result = await MatchService.getSentLikes({ userId, page, limit });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Sent likes retrieved successfully",
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
   * GET /api/v1/matches/people-categories
   * Get categorized candidates for People screen (Active, Near You, You May Like, etc.)
   */
  static async getPeopleCategories(req: Request, res: Response): Promise<Response> {
    const userId = await resolveUserId(req);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "No active user found in database.",
        code: "NO_USER_FOUND",
      });
    }

    const result = await MatchService.getPeopleCategories({ userId });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "People categories retrieved successfully",
      data: result,
      meta: {
        activeUserId: userId,
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
