import { Router } from "express";
import MatchController from "../controllers/match.controller";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

// =================================================================
// Discovery Feed (Explore / People tab cards)
// =================================================================
// GET /api/v1/matches/feed — Get candidate cards with Trust Score %
router.get("/feed", asyncHandler(MatchController.getDiscoveryFeed));

// =================================================================
// Swipe Actions
// =================================================================
// POST /api/v1/matches/swipe — Swipe on a user (like/dislike/superlike)
router.post("/swipe", asyncHandler(MatchController.swipe));

// =================================================================
// Matches Tab
// =================================================================
// GET /api/v1/matches — Get all mutual matches
router.get("/", asyncHandler(MatchController.getMatches));

// POST /api/v1/matches/:matchId/chat — Voluntarily start chat with a match
router.post("/:matchId/chat", asyncHandler(MatchController.startChat));

// DELETE /api/v1/matches/:matchId — Unmatch a user
router.delete("/:matchId", asyncHandler(MatchController.unmatch));

// =================================================================
// Likes Tab (Who liked me)
// =================================================================
// GET /api/v1/matches/likes — Get list of admirers who liked current user
router.get("/likes", asyncHandler(MatchController.getLikesReceived));

// =================================================================
// Safety (Block & Report)
// =================================================================
// POST /api/v1/matches/block — Block a user
router.post("/block", asyncHandler(MatchController.blockUser));

// POST /api/v1/matches/report — Report a user
router.post("/report", asyncHandler(MatchController.reportUser));

export default router;
