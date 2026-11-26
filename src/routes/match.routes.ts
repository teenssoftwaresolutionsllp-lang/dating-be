import { Router } from "express";
import MatchController from "../controllers/match.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Match
 *     description: Discovery feed, swiping, matches, likes, and safety
 */

/**
 * @swagger
 * /api/v1/matches/feed:
 *   get:
 *     summary: Get discovery feed (candidate cards with Trust Score)
 *     tags: [Match]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Discovery feed returned
 *       401:
 *         description: Unauthorized
 */
router.get("/feed", asyncHandler(MatchController.getDiscoveryFeed));

/**
 * @swagger
 * /api/v1/matches/reset-feed:
 *   post:
 *     summary: Reset swipe history to get a fresh discovery feed
 *     tags: [Match]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Feed reset successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/reset-feed", asyncHandler(MatchController.resetFeed));

/**
 * @swagger
 * /api/v1/matches/people-categories:
 *   get:
 *     summary: Get categorized candidates for the People screen
 *     tags: [Match]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: People categories returned
 *       401:
 *         description: Unauthorized
 */
router.get("/people-categories", asyncHandler(MatchController.getPeopleCategories));

/**
 * @swagger
 * /api/v1/matches/swipe:
 *   post:
 *     summary: Swipe on a user (like / dislike / superlike)
 *     tags: [Match]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetUserId, action]
 *             properties:
 *               targetUserId:
 *                 type: string
 *                 example: "usr_abc123"
 *               action:
 *                 type: string
 *                 enum: [like, dislike, superlike]
 *                 example: "like"
 *     responses:
 *       200:
 *         description: Swipe recorded
 *       401:
 *         description: Unauthorized
 */
router.post("/swipe", asyncHandler(MatchController.swipe));

/**
 * @swagger
 * /api/v1/matches:
 *   get:
 *     summary: Get all mutual matches
 *     tags: [Match]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Matches list returned
 *       401:
 *         description: Unauthorized
 */
router.get("/", asyncHandler(MatchController.getMatches));

/**
 * @swagger
 * /api/v1/matches/{matchId}/chat:
 *   post:
 *     summary: Start a chat with a match
 *     tags: [Match]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Match ID
 *     responses:
 *       200:
 *         description: Chat started
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Match not found
 */
router.post("/:matchId/chat", asyncHandler(MatchController.startChat));

/**
 * @swagger
 * /api/v1/matches/{matchId}:
 *   delete:
 *     summary: Unmatch a user
 *     tags: [Match]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Match ID to remove
 *     responses:
 *       200:
 *         description: Unmatched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Match not found
 */
router.delete("/:matchId", asyncHandler(MatchController.unmatch));

/**
 * @swagger
 * /api/v1/matches/likes:
 *   get:
 *     summary: Get list of users who liked the authenticated user
 *     tags: [Match]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Likes received list returned
 *       401:
 *         description: Unauthorized
 */
router.get("/likes", asyncHandler(MatchController.getLikesReceived));

/**
 * @swagger
 * /api/v1/matches/sent-likes:
 *   get:
 *     summary: Get list of users the authenticated user has liked
 *     tags: [Match]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sent likes list returned
 *       401:
 *         description: Unauthorized
 */
router.get("/sent-likes", asyncHandler(MatchController.getSentLikes));

/**
 * @swagger
 * /api/v1/matches/block:
 *   post:
 *     summary: Block a user
 *     tags: [Match]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetUserId]
 *             properties:
 *               targetUserId:
 *                 type: string
 *                 example: "usr_xyz789"
 *     responses:
 *       200:
 *         description: User blocked
 *       401:
 *         description: Unauthorized
 */
router.post("/block", asyncHandler(MatchController.blockUser));

/**
 * @swagger
 * /api/v1/matches/report:
 *   post:
 *     summary: Report a user
 *     tags: [Match]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetUserId, reason]
 *             properties:
 *               targetUserId:
 *                 type: string
 *                 example: "usr_xyz789"
 *               reason:
 *                 type: string
 *                 example: "Inappropriate content"
 *     responses:
 *       200:
 *         description: User reported
 *       401:
 *         description: Unauthorized
 */
router.post("/report", asyncHandler(MatchController.reportUser));

/**
 * @swagger
 * /api/v1/matches/profile-view:
 *   post:
 *     summary: Record a profile view and emit real-time event
 *     tags: [Match]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [viewedUserId]
 *             properties:
 *               viewedUserId:
 *                 type: string
 *                 example: "usr_abc123"
 *     responses:
 *       200:
 *         description: Profile view recorded
 *       401:
 *         description: Unauthorized
 */
router.post("/profile-view", asyncHandler(MatchController.recordProfileView));

/**
 * @swagger
 * /api/v1/matches/profile-viewers:
 *   get:
 *     summary: Get recent profile viewers list
 *     tags: [Match]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile viewers list returned
 *       401:
 *         description: Unauthorized
 */
router.get("/profile-viewers", asyncHandler(MatchController.getProfileViewers));

export default router;
