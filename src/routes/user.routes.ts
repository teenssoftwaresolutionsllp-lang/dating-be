import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { db } from "../db/index";
import { notificationSettings, userDevices } from "../db/schema";
import ApiResponse from "../utils/response";

const router = Router();

// Protect all user device routes with JWT authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: User device and push notification management
 */

/**
 * @swagger
 * /api/v1/users/push-token:
 *   post:
 *     summary: Register or update device push token for the authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pushToken]
 *             properties:
 *               pushToken:
 *                 type: string
 *                 description: FCM or APNs device push token
 *                 example: "fcm_token_xyz123"
 *               platform:
 *                 type: string
 *                 enum: [android, ios]
 *                 default: android
 *                 example: "android"
 *     responses:
 *       200:
 *         description: Push token registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Push token registered successfully"
 *       400:
 *         description: pushToken is required
 *       401:
 *         description: Unauthorized
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

/**
 * GET /api/v1/users/notification-settings
 * Retrieve notification channel preferences for the authenticated user
 */
router.get(
  "/notification-settings",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const [settings] = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId))
      .limit(1);

    return ApiResponse.success(res, {
      message: "Notification settings retrieved successfully",
      data: {
        pushEnabled: settings?.pushEnabled ?? true,
        newMatches: settings?.newMatches ?? true,
        newMessages: settings?.newMessages ?? true,
        newLikes: settings?.newLikes ?? true,
        marketing: settings?.marketing ?? false,
      },
    });
  })
);

/**
 * PATCH /api/v1/users/notification-settings
 * Update notification channel preferences in notification_settings table
 */
router.patch(
  "/notification-settings",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const body = req.body as Partial<{
      pushEnabled: boolean;
      newMatches: boolean;
      newMessages: boolean;
      newLikes: boolean;
      marketing: boolean;
    }>;

    const now = new Date();
    const values = {
      ...(typeof body.pushEnabled === "boolean" ? { pushEnabled: body.pushEnabled } : {}),
      ...(typeof body.newMatches === "boolean" ? { newMatches: body.newMatches } : {}),
      ...(typeof body.newMessages === "boolean" ? { newMessages: body.newMessages } : {}),
      ...(typeof body.newLikes === "boolean" ? { newLikes: body.newLikes } : {}),
      ...(typeof body.marketing === "boolean" ? { marketing: body.marketing } : {}),
      updatedAt: now,
    };

    const [saved] = await db
      .insert(notificationSettings)
      .values({
        userId,
        pushEnabled: body.pushEnabled ?? true,
        newMatches: body.newMatches ?? true,
        newMessages: body.newMessages ?? true,
        newLikes: body.newLikes ?? true,
        marketing: body.marketing ?? false,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: notificationSettings.userId,
        set: values,
      })
      .returning();

    return ApiResponse.success(res, {
      message: "Notification settings updated successfully",
      data: {
        pushEnabled: saved.pushEnabled,
        newMatches: saved.newMatches,
        newMessages: saved.newMessages,
        newLikes: saved.newLikes,
        marketing: saved.marketing,
      },
    });
  })
);

export default router;
