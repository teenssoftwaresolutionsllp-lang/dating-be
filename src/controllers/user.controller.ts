import type { Request, Response } from "express";
import UserService from "../services/user.service";
import { db } from "../db/index";
import { users } from "../db/schema/users";
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
   * Update basic account info (email, preferred language)
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

    const { email, preferredLanguage } = req.body as {
      email?: string;
      preferredLanguage?: string;
    };

    // Build update payload — only update provided fields
    const updates: {
      updatedAt: Date;
      email?: string;
      preferredLanguage?: string;
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

    if (preferredLanguage !== undefined) {
      updates.preferredLanguage = preferredLanguage;
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        phone: users.phone,
        email: users.email,
        countryCode: users.countryCode,
        preferredLanguage: users.preferredLanguage,
        role: users.role,
        isVerified: users.isVerified,
        profileCompleted: users.profileCompleted,
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
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    if (!user.isActive) {
      return ApiResponse.error(res, {
        statusCode: 409,
        message: "Account is already deactivated",
        code: "ALREADY_INACTIVE",
      });
    }

    // Soft-delete: set isActive to false
    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return ApiResponse.success(res, {
      statusCode: 200,
      message:
        "Account deactivated successfully. Your data will be retained for 30 days before permanent deletion.",
    });
  }
}

export default UserController;
