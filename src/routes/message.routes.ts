import { Router } from "express";
import MessageController from "../controllers/message.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

router.use(authenticate);
router.post("/", asyncHandler(MessageController.sendMessage));
router.get("/", asyncHandler(MessageController.getConversations));
router.get("/:userId", asyncHandler(MessageController.getConversation));
router.delete("/:messageId", asyncHandler(MessageController.deleteMessage));

export default router;
