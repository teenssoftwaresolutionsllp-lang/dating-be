import type { Request, Response } from "express";
import PeopleService from "../services/people.service";
import ApiResponse from "../utils/response";

const getPagination = (req: Request) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50
  ) {
    return null;
  }

  return { page, limit };
};

export class PeopleController {
  static async getNearby(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.userId;
    const pagination = getPagination(req);
    const radiusKm = Number(req.query.radiusKm ?? 50);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }
    if (
      !pagination ||
      !Number.isFinite(radiusKm) ||
      radiusKm <= 0 ||
      radiusKm > 500
    ) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message:
          "page must be positive, limit must be 1-50, and radiusKm must be 1-500",
        code: "VALIDATION_ERROR",
      });
    }

    const result = await PeopleService.getNearby(
      userId,
      radiusKm,
      pagination.page,
      pagination.limit,
    );
    return ApiResponse.success(res, {
      message: "Nearby people retrieved successfully",
      data: result.items,
      meta: { page: result.page, limit: result.limit, radiusKm },
    });
  }

  static async getSimilarInterests(
    req: Request,
    res: Response,
  ): Promise<Response> {
    const userId = req.user?.userId;
    const pagination = getPagination(req);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }
    if (!pagination) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "page must be positive and limit must be 1-50",
        code: "VALIDATION_ERROR",
      });
    }

    const result = await PeopleService.getSimilarInterests(
      userId,
      pagination.page,
      pagination.limit,
    );
    return ApiResponse.success(res, {
      message: "People with similar interests retrieved successfully",
      data: result.items,
      meta: { page: result.page, limit: result.limit },
    });
  }
}

export default PeopleController;
