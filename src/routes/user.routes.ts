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

export default router;
