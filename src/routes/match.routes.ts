import { Router } from "express";
import MatchController from "../controllers/match.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

router.use(authenticate);

// =================================================================
// Discovery Feed (Explore / People tab cards)
// =================================================================
// GET /api/v1/matches/feed — Get candidate cards with Trust Score %
router.get("/feed", asyncHandler(MatchController.getDiscoveryFeed));

// GET /api/v1/matches/people-categories — Get categorized candidates for People screen
router.get("/people-categories", asyncHandler(MatchController.getPeopleCategories));

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
// Likes Tab (Who liked me / You Liked)
// =================================================================
// GET /api/v1/matches/likes — Get list of admirers who liked current user (Liked You)
router.get("/likes", asyncHandler(MatchController.getLikesReceived));

// GET /api/v1/matches/sent-likes — Get list of users the current user liked (You Liked)
router.get("/sent-likes", asyncHandler(MatchController.getSentLikes));

// =================================================================
// Safety (Block & Report)
// =================================================================
// POST /api/v1/matches/block — Block a user
router.post("/block", asyncHandler(MatchController.blockUser));

// POST /api/v1/matches/report — Report a user
router.post("/report", asyncHandler(MatchController.reportUser));

export default router;
