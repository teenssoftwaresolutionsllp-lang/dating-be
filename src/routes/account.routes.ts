import { Router } from "express";
import AccountController from "../controllers/account.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { confirmAccountDeletionSchema } from "../validation";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Account
 *     description: Account management (deactivation and deletion)
 */

/**
 * @swagger
 * /api/v1/account/deactivate:
 *   post:
 *     summary: Deactivate account (scheduled for deletion in 30 days)
 *     tags: [Account]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deactivated successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/deactivate", asyncHandler(AccountController.deactivate));

/**
 * @swagger
 * /api/v1/account/deletion-otp:
 *   post:
 *     summary: Request OTP for permanent account deletion
 *     tags: [Account]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deletion OTP sent to registered phone number
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/deletion-otp",
  asyncHandler(AccountController.requestDeletionOtp),
);

/**
 * @swagger
 * /api/v1/account/delete:
 *   post:
 *     summary: Confirm and permanently delete account using OTP
 *     tags: [Account]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp]
 *             properties:
 *               otp:
 *                 type: string
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: Account permanently deleted
 *       202:
 *         description: Account deleted, media cleanup pending
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid OTP
 */
router.post(
  "/delete",
  validateBody(confirmAccountDeletionSchema),
  asyncHandler(AccountController.confirmDeletion),
);

export default router;
