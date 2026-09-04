import type { Request, Response } from "express";
import { db } from "../db/index";
import { users } from "../db/schema/users";
import { eq, ilike, and, count, sql } from "drizzle-orm";
import ApiResponse from "../utils/response";
import type {
  AdminUserListParams,
  AdminUserRecord,
  DashboardStats,
  AppError,
} from "../types/index";

export class AdminController {
  /**
   * GET /api/v1/admin/users
   * List all users with optional filters and pagination
   */
  static async getAllUsers(req: Request, res: Response): Promise<Response> {
    const {
      page = "1",
      limit = "20",
      search,
      role,
      isActive,
    } = req.query as Record<string, string | undefined>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Build query
    const allUsers = await db
      .select({
        id: users.id,
        phone: users.phone,
        email: users.email,
        countryCode: users.countryCode,
        preferredLanguage: users.preferredLanguage,
        role: users.role,
        isVerified: users.isVerified,
        isActive: users.isActive,
        profileCompleted: users.profileCompleted,
        createdAt: users.createdAt,
      })
      .from(users)
      .limit(limitNum)
      .offset(offset);

    // Apply in-memory filters (replace with WHERE clauses once full ORM migration is done)
    let filtered = allUsers as AdminUserRecord[];

    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.phone?.includes(lower) || u.email?.toLowerCase().includes(lower)
      );
    }

    if (role) {
      filtered = filtered.filter((u) => u.role === role);
    }

    if (isActive !== undefined) {
      const active = isActive === "true";
      filtered = filtered.filter((u) => u.isActive === active);
    }

    const totalPages = Math.ceil(filtered.length / limitNum);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Users retrieved successfully",
      data: { users: filtered },
      meta: {
        total: filtered.length,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    });
  }

  /**
   * GET /api/v1/admin/users/:id
   * Get a single user's details by ID
   */
  static async getUserById(req: Request, res: Response): Promise<Response> {
    const userId = parseInt(String(req.params.id), 10);

    if (isNaN(userId)) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "Invalid user ID",
        code: "INVALID_USER_ID",
      });
    }

    const [user] = await db
      .select({
        id: users.id,
        phone: users.phone,
        email: users.email,
        countryCode: users.countryCode,
        preferredLanguage: users.preferredLanguage,
        role: users.role,
        isVerified: users.isVerified,
        isActive: users.isActive,
        profileCompleted: users.profileCompleted,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "User retrieved successfully",
      data: { user },
    });
  }

  /**
   * PATCH /api/v1/admin/users/:id/ban
   * Suspend (ban) a user account
   */
  static async banUser(req: Request, res: Response): Promise<Response> {
    const targetUserId = parseInt(String(req.params.id), 10);
    const adminId = req.user?.id;

    if (isNaN(targetUserId)) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "Invalid user ID",
        code: "INVALID_USER_ID",
      });
    }

    if (targetUserId === adminId) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "Admins cannot ban themselves",
        code: "CANNOT_BAN_SELF",
      });
    }

    const [target] = await db
      .select({ id: users.id, role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, targetUserId));

    if (!target) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    if (target.role === "admin") {
      return ApiResponse.error(res, {
        statusCode: 403,
        message: "Cannot ban another admin",
        code: "FORBIDDEN",
      });
    }

    if (!target.isActive) {
      return ApiResponse.error(res, {
        statusCode: 409,
        message: "User is already banned",
        code: "ALREADY_BANNED",
      });
    }

    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, targetUserId));

    return ApiResponse.success(res, {
      statusCode: 200,
      message: `User #${targetUserId} has been banned successfully`,
      data: { userId: targetUserId, isActive: false },
    });
  }

  /**
   * PATCH /api/v1/admin/users/:id/unban
   * Reactivate a banned user account
   */
  static async unbanUser(req: Request, res: Response): Promise<Response> {
    const targetUserId = parseInt(String(req.params.id), 10);

    if (isNaN(targetUserId)) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "Invalid user ID",
        code: "INVALID_USER_ID",
      });
    }

    const [target] = await db
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, targetUserId));

    if (!target) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    if (target.isActive) {
      return ApiResponse.error(res, {
        statusCode: 409,
        message: "User is already active",
        code: "ALREADY_ACTIVE",
      });
    }

    await db
      .update(users)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(users.id, targetUserId));

    return ApiResponse.success(res, {
      statusCode: 200,
      message: `User #${targetUserId} has been unbanned successfully`,
      data: { userId: targetUserId, isActive: true },
    });
  }

  /**
   * GET /api/v1/admin/dashboard
   * Aggregate dashboard statistics
   */
  static async getDashboardStats(
    _req: Request,
    res: Response
  ): Promise<Response> {
    const allUsers = await db
      .select({
        id: users.id,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats: DashboardStats = {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter((u) => u.isActive).length,
      newUsersToday: allUsers.filter(
        (u) => new Date(u.createdAt).getTime() >= today.getTime()
      ).length,
      bannedUsers: allUsers.filter((u) => !u.isActive).length,
      // These will be real counts once match/message tables are created
      totalMatches: 0,
      totalMessages: 0,
    };

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Dashboard statistics retrieved successfully",
      data: { stats },
    });
  }
}

export default AdminController;
