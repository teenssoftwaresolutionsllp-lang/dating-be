import { Router } from "express";
import AuthController from "../controllers/auth.controller";
import {
  validateSendOtp,
  validateVerifyOtp,
  validateSetLanguage,
  validateRefreshToken,
  validateSocialAuth,
} from "../middleware/validation.middleware";
import { authenticate, optionalAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

// =================================================================
// Screen 1: Language Selection APIs
// =================================================================
// Get supported languages (English, Telugu, etc.)
router.get("/languages", asyncHandler(AuthController.getLanguages));

// Set/Update user display language (Authenticated)
router.post(
  "/language",
  authenticate,
  validateSetLanguage,
  asyncHandler(AuthController.setLanguage)
);

// =================================================================
// Screen 2: Mobile Login & Social Logins APIs
// =================================================================
// Send 4-digit OTP to mobile number
router.post("/send-otp", validateSendOtp, asyncHandler(AuthController.sendOtp));

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
  validateVerifyOtp,
  asyncHandler(AuthController.verifyOtp)
);

// =================================================================
// Session & Profile APIs
// =================================================================
// Get current authenticated user profile
router.get("/me", authenticate, asyncHandler(AuthController.getMe));

// Refresh expired access token
router.post(
  "/refresh-token",
  validateRefreshToken,
  asyncHandler(AuthController.refreshToken)
);

// Logout & invalidate session
router.post("/logout", optionalAuth, asyncHandler(AuthController.logout));

export default router;
