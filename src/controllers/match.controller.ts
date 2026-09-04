import type { Request, Response } from "express";
import MatchService from "../services/match.service";
import ApiResponse from "../utils/response";
import type { SwipeDirection } from "../types/index";

export class MatchController {
  /**
   * POST /api/v1/matches/swipe
   * Record a swipe (like / dislike / superlike)
   */
  static async swipe(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;
    const { targetUserId, direction } = req.body as {
      targetUserId: number;
      direction: SwipeDirection;
    };

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    if (!targetUserId || isNaN(Number(targetUserId))) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "targetUserId is required and must be a number",
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
      targetUserId: Number(targetUserId),
      direction,
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: result.isMatch
        ? "🎉 It's a match!"
        : `Swipe recorded: ${direction}`,
      data: result,
    });
  }

  /**
   * GET /api/v1/matches
   * Get all mutual matches for the authenticated user
   */
  static async getMatches(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
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
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  }

  /**
   * DELETE /api/v1/matches/:matchedUserId
   * Unmatch (remove match with a user)
   */
  static async unmatch(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;
    const matchedUserId = parseInt(String(req.params.matchedUserId), 10);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    if (isNaN(matchedUserId)) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "Invalid matchedUserId",
        code: "VALIDATION_ERROR",
      });
    }

    await MatchService.unmatch(userId, matchedUserId);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Unmatched successfully",
    });
  }

  /**
   * GET /api/v1/matches/history
   * Get swipe history for the authenticated user
   */
  static async getSwipeHistory(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const direction = req.query.direction as SwipeDirection | undefined;

    const history = await MatchService.getSwipeHistory(userId, direction);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Swipe history retrieved successfully",
      data: history,
    });
  }
}

export default MatchController;
