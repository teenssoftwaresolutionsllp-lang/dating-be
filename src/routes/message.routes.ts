import { Router } from "express";
import MessageController from "../controllers/message.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Messages
 *     description: Messaging and conversation management
 */

/**
 * @swagger
 * /api/v1/messages:
 *   post:
 *     summary: Send a message to a user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipientId, content]
 *             properties:
 *               recipientId:
 *                 type: string
 *                 example: "usr_abc123"
 *               content:
 *                 type: string
 *                 example: "Hey, how are you?"
 *               mediaUrl:
 *                 type: string
 *                 description: Optional image or media URL
 *     responses:
 *       200:
 *         description: Message sent
 *       401:
 *         description: Unauthorized
 */
router.post("/", asyncHandler(MessageController.sendMessage));

/**
 * @swagger
 * /api/v1/messages:
 *   get:
 *     summary: Get all conversations for the authenticated user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conversations list returned
 *       401:
 *         description: Unauthorized
 */
router.get("/", asyncHandler(MessageController.getConversations));

/**
 * @swagger
 * /api/v1/messages/{userId}/like:
 *   post:
 *     summary: Like (star) a conversation with a user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the conversation partner
 *     responses:
 *       200:
 *         description: Conversation liked
 *       401:
 *         description: Unauthorized
 */
router.post("/:userId/like", asyncHandler(MessageController.likeConversation));

/**
 * @swagger
 * /api/v1/messages/{userId}/read:
 *   post:
 *     summary: Mark all incoming messages in a conversation as read
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the conversation partner
 *     responses:
 *       200:
 *         description: Conversation marked as read
 *       401:
 *         description: Unauthorized
 */
router.post("/:userId/read", asyncHandler(MessageController.markAsRead));

/**
 * @swagger
 * /api/v1/messages/{userId}:
 *   get:
 *     summary: Get conversation messages with a specific user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the conversation partner
 *     responses:
 *       200:
 *         description: Conversation messages returned
 *       401:
 *         description: Unauthorized
 */
router.get("/:userId", asyncHandler(MessageController.getConversation));

/**
 * @swagger
 * /api/v1/messages/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID to delete
 *     responses:
 *       200:
 *         description: Message deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message not found
 */
router.delete("/:messageId", asyncHandler(MessageController.deleteMessage));

export default router;
