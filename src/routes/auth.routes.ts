import { Router } from "express";
import AuthController from "../controllers/auth.controller";
import {
  validateSendOtp,
  validateVerifyOtp,
  validateSetLanguage,
  validateRefreshToken,
  validateSocialAuth,
  validateResendOtp,
} from "../middleware/validation.middleware";
import { authenticate, optionalAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { authenticate } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { sendOtpSchema, verifyOtpSchema } from "../validation";

const router = Router();

// Start phone authentication by sending an OTP to the user's phone.
router.post(
  "/send-otp",
  validateBody(sendOtpSchema),
  asyncHandler(AuthController.sendOtp),
);

// =================================================================
// Screen 2: Mobile Login & Social Logins APIs
// =================================================================
// Send 4-digit OTP to mobile number
router.post("/send-otp", validateSendOtp, asyncHandler(AuthController.sendOtp));

// =================================================================
// Screen 2 (OTP Screen): Resend OTP API
// =================================================================
/**
 * POST /api/v1/auth/resend-otp
 * Request a new 4-digit OTP.
 * - 30-second cooldown is enforced (returns 429 if requested too soon).
 * - Generates a fresh OTP with a new 10-minute validity window.
 */
router.post("/resend-otp", validateResendOtp, asyncHandler(AuthController.resendOtp));

// Optional Social Login buttons on Screen 2
router.post(
  "/google",
  validateSocialAuth("google"),
  asyncHandler(AuthController.googleAuth)
);
router.post(
  "/facebook",
  validateSocialAuth("facebook"),
  asyncHandler(AuthController.facebookAuth)
);
router.post(
  "/instagram",
  validateSocialAuth("instagram"),
  asyncHandler(AuthController.instagramAuth)
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
router.get("/profile", authenticate, asyncHandler(AuthController.getProfile));

export default router;
