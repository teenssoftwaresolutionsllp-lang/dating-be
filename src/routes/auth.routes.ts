import { Router } from "express";
import AuthController from "../controllers/auth.controller";

import { asyncHandler } from "../middleware/error.middleware";
import { authenticate } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { sendOtpSchema, verifyOtpSchema } from "../validation/auth.validation";

const router = Router();

// Start phone authentication by sending an OTP to the user's phone.
router.post(
  "/send-otp",
  validateBody(sendOtpSchema),
  asyncHandler(AuthController.sendOtp),
);

// Verify the OTP, create/login the user, and issue access credentials.
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
