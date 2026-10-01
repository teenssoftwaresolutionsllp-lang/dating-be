import { Router } from "express";
import AccountController from "../controllers/account.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { confirmAccountDeletionSchema } from "../validation";

const router = Router();

router.use(authenticate);
router.post("/deactivate", asyncHandler(AccountController.deactivate));
router.post(
  "/deletion-otp",
  asyncHandler(AccountController.requestDeletionOtp),
);
router.post(
  "/delete",
  validateBody(confirmAccountDeletionSchema),
  asyncHandler(AccountController.confirmDeletion),
);

export default router;
