import type { Request, Response } from "express";
import UserService from "../services/user.service";
import { db } from "../db/index";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import ApiResponse from "../utils/response";

export class UserController {
  /**
   * GET /api/v1/users/me
   * Get the authenticated user's profile
   */
  static async getProfile(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const user = await UserService.getProfile(userId);

    if (!user) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "User profile retrieved successfully",
      data: { user },
    });
  }

  /**
   * PATCH /api/v1/users/me
   * Update basic account info (email)
   */
  static async updateProfile(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const { email } = req.body as {
      email?: string;
    };

    const updates: {
      updatedAt: Date;
      email?: string;
    } = { updatedAt: new Date() };

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: "Invalid email address format",
          code: "INVALID_EMAIL",
        });
      }
      updates.email = email.trim().toLowerCase();
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        phone: users.phone,
        email: users.email,
        role: users.role,
        status: users.status,
        emailVerified: users.emailVerified,
        phoneVerified: users.phoneVerified,
        updatedAt: users.updatedAt,
      });

    if (!updated) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Account updated successfully",
      data: { user: updated },
    });
  }

  /**
   * DELETE /api/v1/users/me
   * Deactivate (soft-delete) the authenticated user's account
   */
  static async deleteAccount(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const [user] = await db
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    if (user.status === "deleted") {
      return ApiResponse.error(res, {
        statusCode: 409,
        message: "Account is already deactivated",
        code: "ALREADY_INACTIVE",
      });
    }

    // Soft-delete: set status to deleted and record deletedAt
    const now = new Date();
    await db
      .update(users)
      .set({ status: "deleted", deletedAt: now, updatedAt: now })
      .where(eq(users.id, userId));

    return ApiResponse.success(res, {
      statusCode: 200,
      message:
        "Account deactivated successfully. Your data will be retained for 30 days before permanent deletion.",
    });
  }
}

export default UserController;
