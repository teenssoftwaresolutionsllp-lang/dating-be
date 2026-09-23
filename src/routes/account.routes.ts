import { Router } from "express";
import UserController from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { deleteAccountOtpSchema } from "../validation";

const router = Router();

router.post(
  "/me/deactivate",
  authenticate,
  asyncHandler(UserController.deactivateAccount),
);

router.post(
  "/me/delete/request-otp",
  authenticate,
  asyncHandler(UserController.requestAccountDeletionOtp),
);

router.post(
  "/me/delete/confirm",
  authenticate,
  validateBody(deleteAccountOtpSchema),
  asyncHandler(UserController.confirmAccountDeletion),
);

export default router;
