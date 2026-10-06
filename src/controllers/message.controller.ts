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
      receiverId: string;
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

    if (!receiverId || typeof receiverId !== "string") {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "receiverId is required",
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

    const result = await MessageService.sendMessage({
      senderId,
      receiverId,
      content,
      messageType: messageType ?? "text",
    });

    return ApiResponse.success(res, {
      statusCode: 201,
      message: "Message sent successfully",
      data: result,
    });
  }

  /**
   * GET /api/v1/messages/:userId
   * Get paginated conversation with a specific user
   */
  static async getConversation(req: Request, res: Response): Promise<Response> {
    const currentUserId = req.user?.id;
    const otherUserId = String(req.params.userId);

    if (!currentUserId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    if (!otherUserId) {
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
      data: {
        items: result.items,
        isMatched: result.isMatched,
        messagesRemaining: result.messagesRemaining,
      },
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  }

  /**
   * POST /api/v1/messages/:userId/like
   * Like a person who has sent a pre-match message and unlock the match.
   */
  static async likeConversation(
    req: Request,
    res: Response,
  ): Promise<Response> {
    const userId = req.user?.id;
    const partnerId = String(req.params.userId);
    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }
    if (!partnerId || partnerId === "undefined") {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "Invalid user ID",
        code: "VALIDATION_ERROR",
      });
    }

    await MessageService.likeFromConversation(userId, partnerId);
    return ApiResponse.success(res, {
      statusCode: 200,
      message: "You matched! Unlimited messaging is now available.",
      data: { isMatched: true },
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
    const messageId = String(req.params.messageId);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    if (!messageId) {
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
