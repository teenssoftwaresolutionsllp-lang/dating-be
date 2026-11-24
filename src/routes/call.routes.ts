import { Router } from "express";
import CallController from "../controllers/call.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

// Protect all call routes with JWT authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Calls
 *     description: Agora RTC video/audio call management
 */

/**
 * @swagger
 * /api/v1/calls/initiate:
 *   post:
 *     summary: Initiate a call with another user
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [receiverId]
 *             properties:
 *               receiverId:
 *                 type: string
 *                 example: "usr_abc123"
 *               callType:
 *                 type: string
 *                 enum: [audio, video]
 *                 example: "video"
 *     responses:
 *       200:
 *         description: Call initiated, Agora token returned
 *       401:
 *         description: Unauthorized
 */
router.post("/initiate", asyncHandler(CallController.initiateCall));

/**
 * @swagger
 * /api/v1/calls/incoming:
 *   get:
 *     summary: Get current incoming call for the authenticated user
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Incoming call data returned (or null if none)
 *       401:
 *         description: Unauthorized
 */
router.get("/incoming", asyncHandler(CallController.getIncomingCall));

/**
 * @swagger
 * /api/v1/calls/history:
 *   get:
 *     summary: Get call history for the authenticated user
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Call history returned
 *       401:
 *         description: Unauthorized
 */
router.get("/history", asyncHandler(CallController.getCallHistory));

/**
 * @swagger
 * /api/v1/calls/rtm-token:
 *   get:
 *     summary: Get Agora RTM token for real-time messaging
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: RTM token returned
 *       401:
 *         description: Unauthorized
 */
router.get("/rtm-token", asyncHandler(CallController.getRtmToken));

/**
 * @swagger
 * /api/v1/calls/{callId}/accept:
 *   post:
 *     summary: Accept an incoming call
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *         description: Call ID to accept
 *     responses:
 *       200:
 *         description: Call accepted, Agora token returned
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Call not found
 */
router.post("/:callId/accept", asyncHandler(CallController.acceptCall));

/**
 * @swagger
 * /api/v1/calls/{callId}/reject:
 *   post:
 *     summary: Reject an incoming call
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *         description: Call ID to reject
 *     responses:
 *       200:
 *         description: Call rejected
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Call not found
 */
router.post("/:callId/reject", asyncHandler(CallController.rejectCall));

/**
 * @swagger
 * /api/v1/calls/{callId}/end:
 *   post:
 *     summary: End an active call
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *         description: Call ID to end
 *     responses:
 *       200:
 *         description: Call ended
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Call not found
 */
router.post("/:callId/end", asyncHandler(CallController.endCall));

/**
 * @swagger
 * /api/v1/calls/{callId}/status:
 *   get:
 *     summary: Get the status of a call
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *         description: Call ID
 *     responses:
 *       200:
 *         description: Call status returned
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Call not found
 */
router.get("/:callId/status", asyncHandler(CallController.getCallStatus));

export default router;
