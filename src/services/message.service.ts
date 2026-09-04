import { db } from "../db/index";
import { users } from "../db/schema/users";
import { eq } from "drizzle-orm";
import type {
  AppError,
  SendMessageParams,
  MessageRecord,
  GetConversationParams,
  ConversationSummary,
  DeleteMessageParams,
  PaginatedResult,
} from "../types/index";

/**
 * In-memory message store (replace with DB table once schema is migrated)
 */
const messageStore: MessageRecord[] = [];
let msgIdCounter = 1;

export class MessageService {
  /**
   * Send a message from sender to receiver
   */
  static async sendMessage({
    senderId,
    receiverId,
    content,
    messageType = "text",
  }: SendMessageParams): Promise<MessageRecord> {
    if (senderId === receiverId) {
      const error = new Error("Cannot send a message to yourself") as AppError;
      error.statusCode = 400;
      error.code = "INVALID_MESSAGE_TARGET";
      throw error;
    }

    if (!content || content.trim().length === 0) {
      const error = new Error("Message content cannot be empty") as AppError;
      error.statusCode = 400;
      error.code = "EMPTY_MESSAGE";
      throw error;
    }

    if (content.length > 2000) {
      const error = new Error(
        "Message content exceeds maximum length of 2000 characters"
      ) as AppError;
      error.statusCode = 400;
      error.code = "MESSAGE_TOO_LONG";
      throw error;
    }

    // Verify receiver exists
    const [receiver] = await db
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, receiverId));

    if (!receiver || !receiver.isActive) {
      const error = new Error("Receiver not found or inactive") as AppError;
      error.statusCode = 404;
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    const now = new Date();
    const message: MessageRecord = {
      id: msgIdCounter++,
      senderId,
      receiverId,
      content: content.trim(),
      messageType,
      isRead: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    messageStore.push(message);
    return message;
  }

  /**
   * Get paginated conversation between two users
   */
  static async getConversation({
    userId,
    otherUserId,
    page = 1,
    limit = 50,
  }: GetConversationParams): Promise<PaginatedResult<MessageRecord>> {
    const allMessages = messageStore.filter(
      (m) =>
        !m.isDeleted &&
        ((m.senderId === userId && m.receiverId === otherUserId) ||
          (m.senderId === otherUserId && m.receiverId === userId))
    );

    // Mark messages from other user as read
    allMessages.forEach((m) => {
      if (m.senderId === otherUserId && !m.isRead) {
        m.isRead = true;
        m.updatedAt = new Date();
      }
    });

    const total = allMessages.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const items = allMessages
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return { items, total, page, limit, totalPages };
  }

  /**
   * Get conversation list (inbox) for a user
   */
  static async getConversations(
    userId: number
  ): Promise<ConversationSummary[]> {
    const userMessages = messageStore.filter(
      (m) => !m.isDeleted && (m.senderId === userId || m.receiverId === userId)
    );

    // Build unique conversation partner list
    const partnerMap = new Map<number, ConversationSummary>();

    for (const msg of userMessages.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )) {
      const partnerId =
        msg.senderId === userId ? msg.receiverId : msg.senderId;

      if (!partnerMap.has(partnerId)) {
        const unreadCount = messageStore.filter(
          (m) =>
            !m.isDeleted &&
            m.senderId === partnerId &&
            m.receiverId === userId &&
            !m.isRead
        ).length;

        partnerMap.set(partnerId, {
          userId: partnerId,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount,
        });
      }
    }

    return Array.from(partnerMap.values());
  }

  /**
   * Soft-delete a message (only sender can delete their own messages)
   */
  static async deleteMessage({
    messageId,
    userId,
  }: DeleteMessageParams): Promise<void> {
    const msgIndex = messageStore.findIndex((m) => m.id === messageId);

    if (msgIndex === -1) {
      const error = new Error("Message not found") as AppError;
      error.statusCode = 404;
      error.code = "MESSAGE_NOT_FOUND";
      throw error;
    }

    const message = messageStore[msgIndex];

    if (message.senderId !== userId) {
      const error = new Error(
        "Forbidden: You can only delete your own messages"
      ) as AppError;
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }

    messageStore[msgIndex] = {
      ...message,
      isDeleted: true,
      updatedAt: new Date(),
    };
  }
}

export default MessageService;
