import { Router } from "express";
import AuthController from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { validateBody } from "../middleware/validation.middleware";
import {
  sendOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
} from "../validation";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication, OTP, and session management
 */

/**
 * @swagger
 * /api/v1/auth/send-otp:
 *   post:
 *     summary: Send a 4-digit OTP to a mobile number
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Validation error
 */
router.post(
  "/send-otp",
  validateBody(sendOtpSchema),
  asyncHandler(AuthController.sendOtp),
);

/**
 * @swagger
 * /api/v1/auth/resend-otp:
 *   post:
 *     summary: Resend a 4-digit OTP (30-second cooldown enforced)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       429:
 *         description: Too many requests (30-second cooldown active)
 */
router.post(
  "/resend-otp",
  validateBody(sendOtpSchema),
  asyncHandler(AuthController.resendOtp),
);

/**
 * @swagger
 * /api/v1/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and get JWT tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, otp]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *               otp:
 *                 type: string
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: OTP verified, tokens returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       400:
 *         description: Invalid or expired OTP
 */
router.post(
  "/verify-otp",
  validateBody(verifyOtpSchema),
  asyncHandler(AuthController.verifyOtp),
);

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Create a new access token using the refresh token
 *     tags: [Auth]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post(
  "/refresh-token",
  validateBody(refreshTokenSchema.partial()),
  asyncHandler(AuthController.refresh),
);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout - revoke current session
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", asyncHandler(AuthController.logout));

/**
 * @swagger
 * /api/v1/auth/language:
 *   post:
 *     summary: Set preferred display language for the authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [language]
 *             properties:
 *               language:
 *                 type: string
 *                 example: "en"
 *     responses:
 *       200:
 *         description: Language preference updated
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/language",
  authenticate,
  asyncHandler(AuthController.setLanguage),
);

export default router;
