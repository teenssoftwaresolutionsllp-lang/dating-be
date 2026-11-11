import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { db } from "../db/index";
import { userDevices } from "../db/schema";
import ApiResponse from "../utils/response";

const router = Router();

// Protect all user device routes with JWT authentication
router.use(authenticate);

/**
 * POST /api/v1/users/push-token
 * Register or update device push token for the authenticated user
 */
router.post(
  "/push-token",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const { pushToken, platform = "android" } = req.body as {
      pushToken?: string;
      platform?: string;
    };

    if (!pushToken || typeof pushToken !== "string" || !pushToken.trim()) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "pushToken is required",
        code: "VALIDATION_ERROR",
      });
    }

    const normalizedToken = pushToken.trim();

    await db
      .insert(userDevices)
      .values({
        userId,
        deviceToken: normalizedToken,
        platform,
        lastActiveAt: new Date(),
        revokedAt: null,
      })
      .onConflictDoUpdate({
        target: userDevices.deviceToken,
        set: {
          userId,
          platform,
          lastActiveAt: new Date(),
          revokedAt: null,
        },
      });

    return ApiResponse.success(res, {
      message: "Push token registered successfully",
      data: { success: true },
    });
  })
);

export default router;
