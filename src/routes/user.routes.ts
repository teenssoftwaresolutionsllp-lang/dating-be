import { Router } from "express";
import UserController from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

// All user account routes require authentication
router.use(authenticate);

// =================================================================
// User Account
// =================================================================
// GET /api/v1/users/me — Get own user profile (safe fields)
router.get("/me", asyncHandler(UserController.getProfile));

// PATCH /api/v1/users/me — Update email / preferred language
router.patch("/me", asyncHandler(UserController.updateProfile));

// DELETE /api/v1/users/me — Soft-delete (deactivate) account
router.delete("/me", asyncHandler(UserController.deleteAccount));

export default router;
