import { Router } from "express";
import AuthController from "../controllers/auth.controller";

import { asyncHandler } from "../middleware/error.middleware";
import { authenticate } from "../middleware/auth.middleware";
import {
  validateSendOtp,
  validateVerifyOtp,
} from "../middleware/validation.middleware";

const router = Router();

router.post("/send-otp", validateSendOtp, asyncHandler(AuthController.sendOtp));
router.post(
  "/verify-otp",
  validateVerifyOtp,
  asyncHandler(AuthController.verifyOtp),
);

router.post("/refresh", asyncHandler(AuthController.refresh));
router.post("/logout", asyncHandler(AuthController.logout));
router.post(
  "/logout-all",
  authenticate,
  asyncHandler(AuthController.logoutAll),
);

router.get("/profile", authenticate, asyncHandler(AuthController.getProfile));

export default router;
