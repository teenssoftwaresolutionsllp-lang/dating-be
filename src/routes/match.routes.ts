import { Router } from "express";
import MatchController from "../controllers/match.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

// All match routes require authentication
router.use(authenticate);

// =================================================================
// Swipe Actions
// =================================================================
// POST /api/v1/matches/swipe — Swipe on a user (like/dislike/superlike)
router.post("/swipe", asyncHandler(MatchController.swipe));

// =================================================================
// Matches
// =================================================================
// GET /api/v1/matches — Get all mutual matches (paginated)
router.get("/", asyncHandler(MatchController.getMatches));

// DELETE /api/v1/matches/:matchedUserId — Unmatch a user
router.delete("/:matchedUserId", asyncHandler(MatchController.unmatch));

// =================================================================
// Swipe History
// =================================================================
// GET /api/v1/matches/history — Get swipe history (optional ?direction=like|dislike|superlike)
router.get("/history", asyncHandler(MatchController.getSwipeHistory));

export default router;
