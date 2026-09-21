import { Router } from "express";
import ProfileController from "../controllers/profile.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

// =================================================================
// Own Profile (Authenticated)
// =================================================================
// GET /api/v1/profile/me — Get own profile
router.get("/me", authenticate, asyncHandler(ProfileController.getMyProfile));

// PATCH /api/v1/profile/me — Update own profile
router.patch("/me", authenticate, asyncHandler(ProfileController.updateProfile));

// POST /api/v1/profile/me/photos — Add a photo to own profile
router.post("/me/photos", authenticate, asyncHandler(ProfileController.addPhoto));

// DELETE /api/v1/profile/me/photos — Remove a photo from own profile
router.delete("/me/photos", authenticate, asyncHandler(ProfileController.deletePhoto));

// =================================================================
// Public Profile (View another user)
// =================================================================
// GET /api/v1/profile/:userId — Get another user's public profile
router.get("/:userId", authenticate, asyncHandler(ProfileController.getUserProfile));

export default router;
