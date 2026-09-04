import type { Request, Response } from "express";
import MessageService from "../services/message.service";
import ApiResponse from "../utils/response";

export class MessageController {
  /**
   * POST /api/v1/messages
   * Send a message to another user
   */
  static async sendMessage(req: Request, res: Response): Promise<Response> {
    const senderId = req.user?.id;
    const { receiverId, content, messageType } = req.body as {
      receiverId: number;
      content: string;
      messageType?: "text" | "image" | "audio";
    };

    if (!senderId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    if (!receiverId || isNaN(Number(receiverId))) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "receiverId is required and must be a number",
        code: "VALIDATION_ERROR",
      });
    }

    if (!content || typeof content !== "string") {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "Message content is required",
        code: "VALIDATION_ERROR",
      });
    }

    const message = await MessageService.sendMessage({
      senderId,
      receiverId: Number(receiverId),
      content,
      messageType: messageType ?? "text",
    });

    return ApiResponse.success(res, {
      statusCode: 201,
      message: "Message sent successfully",
      data: { message },
    });
  }

  /**
   * GET /api/v1/messages/:userId
   * Get paginated conversation with a specific user
   */
  static async getConversation(req: Request, res: Response): Promise<Response> {
    const currentUserId = req.user?.id;
    const otherUserId = parseInt(String(req.params.userId), 10);

    if (!currentUserId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    if (isNaN(otherUserId)) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "Invalid user ID",
        code: "VALIDATION_ERROR",
      });
    }

    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "50", 10);

    const result = await MessageService.getConversation({
      userId: currentUserId,
      otherUserId,
      page,
      limit,
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Conversation retrieved successfully",
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  }

  /**
   * GET /api/v1/messages
   * Get all conversations (inbox) for the authenticated user
   */
  static async getConversations(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const conversations = await MessageService.getConversations(userId);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Conversations retrieved successfully",
      data: { conversations },
    });
  }

  /**
   * DELETE /api/v1/messages/:messageId
   * Soft-delete a message (sender only)
   */
  static async deleteMessage(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;
    const messageId = parseInt(String(req.params.messageId), 10);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    if (isNaN(messageId)) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "Invalid message ID",
        code: "VALIDATION_ERROR",
      });
    }

    await MessageService.deleteMessage({ messageId, userId });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Message deleted successfully",
    });
  }
}

export default MessageController;
