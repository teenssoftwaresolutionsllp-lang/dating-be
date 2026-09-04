import { Router } from "express";
import MessageController from "../controllers/message.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

// All message routes require authentication
router.use(authenticate);

// =================================================================
// Conversations (Inbox)
// =================================================================
// GET /api/v1/messages — Get all conversations for authenticated user
router.get("/", asyncHandler(MessageController.getConversations));

// =================================================================
// Send Message
// =================================================================
// POST /api/v1/messages — Send a new message
router.post("/", asyncHandler(MessageController.sendMessage));

// =================================================================
// Conversation Thread
// =================================================================
// GET /api/v1/messages/:userId — Get conversation with a specific user (paginated)
router.get("/:userId", asyncHandler(MessageController.getConversation));

// =================================================================
// Message Management
// =================================================================
// DELETE /api/v1/messages/delete/:messageId — Soft-delete a message (sender only)
router.delete("/delete/:messageId", asyncHandler(MessageController.deleteMessage));

export default router;
