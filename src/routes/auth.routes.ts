import { Router } from "express";
import AuthController from "../controllers/auth.controller";
import { validateSocialAuth } from "../middleware/validation.middleware";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { sendOtpSchema, verifyOtpSchema } from "../validation";

const router = Router();

// =================================================================
// Screen 2: Mobile Login & Social Logins APIs
// =================================================================
// Send 4-digit OTP to mobile number
router.post(
  "/send-otp",
  validateBody(sendOtpSchema),
  asyncHandler(AuthController.sendOtp),
);

// =================================================================
// Screen 2 (OTP Screen): Resend OTP API
// =================================================================
/**
 * POST /api/v1/auth/resend-otp
 * Request a new 4-digit OTP.
 * - 30-second cooldown is enforced (returns 429 if requested too soon).
 * - Generates a fresh OTP with a new 10-minute validity window.
 */
router.post(
  "/resend-otp",
  validateBody(sendOtpSchema),
  asyncHandler(AuthController.resendOtp),
);

// Optional Social Login buttons on Screen 2
router.post(
  "/google",
  validateSocialAuth("google"),
  asyncHandler(AuthController.socialAuth),
);
router.post(
  "/facebook",
  validateSocialAuth("facebook"),
  asyncHandler(AuthController.socialAuth),
);
router.post(
  "/instagram",
  validateSocialAuth("instagram"),
  asyncHandler(AuthController.socialAuth),
);

// =================================================================
// Screen 3: OTP Verification API
// =================================================================
// Verify 4-digit OTP, auto-create/login user, return JWT tokens
router.post(
  "/verify-otp",
  validateBody(verifyOtpSchema),
  asyncHandler(AuthController.verifyOtp),
);

// Create a new access token using the refresh-token cookie.
router.post("/refresh-token", asyncHandler(AuthController.refresh));

// Revoke the current session and clear the refresh-token cookie.
router.post("/logout", asyncHandler(AuthController.logout));

// Revoke all active sessions for the authenticated user.
router.post(
  "/logout-all",
  authenticate,
  asyncHandler(AuthController.logoutAll),
);

// Return basic account information for the authenticated user.
router.get("/profile", authenticate, asyncHandler(AuthController.getMe));

export default router;
