import { db } from "../db/index";
import {
  conversationMembers,
  conversations,
  matches,
  messages,
  users,
} from "../db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import type {
  AppError,
  SendMessageParams,
  MessageRecord,
  GetConversationParams,
  ConversationSummary,
  DeleteMessageParams,
  PaginatedResult,
} from "../types/index";

const findConversationId = async (userId: string, otherUserId: string) => {
  const ownConversations = await db
    .select({ conversationId: conversationMembers.conversationId })
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, userId));
  for (const ownConversation of ownConversations) {
    const [member] = await db
      .select({ conversationId: conversationMembers.conversationId })
      .from(conversationMembers)
      .where(
        and(
          eq(
            conversationMembers.conversationId,
            ownConversation.conversationId,
          ),
          eq(conversationMembers.userId, otherUserId),
        ),
      );
    if (member) return member.conversationId;
  }
  return undefined;
};

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
        "Message content exceeds maximum length of 2000 characters",
      ) as AppError;
      error.statusCode = 400;
      error.code = "MESSAGE_TOO_LONG";
      throw error;
    }

    // Verify receiver exists
    const [receiver] = await db
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.id, receiverId));

    if (!receiver || receiver.status !== "active") {
      const error = new Error("Receiver not found or inactive") as AppError;
      error.statusCode = 404;
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    const conversationId = await findConversationId(senderId, receiverId);
    if (!conversationId) {
      throw new Error("Messaging is available only after a mutual match");
    }
    const [message] = await db
      .insert(messages)
      .values({
        conversationId,
        senderId,
        content: content.trim(),
        messageType,
      })
      .returning();
    return {
      id: message.id,
      senderId: message.senderId,
      receiverId,
      content: message.content || "",
      messageType: message.messageType,
      isRead: false,
      isDeleted: false,
      createdAt: message.createdAt,
      updatedAt: message.editedAt || message.createdAt,
    };
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
    const conversationId = await findConversationId(userId, otherUserId);
    if (!conversationId)
      return { items: [], total: 0, page, limit, totalPages: 0 };
    const rows = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          isNull(messages.deletedAt),
        ),
      )
      .orderBy(desc(messages.createdAt));
    const allMessages = rows.map((message) => ({
      id: message.id,
      senderId: message.senderId,
      receiverId: message.senderId === userId ? otherUserId : userId,
      content: message.content || "",
      messageType: message.messageType,
      isRead: message.senderId === userId,
      isDeleted: false,
      createdAt: message.createdAt,
      updatedAt: message.editedAt || message.createdAt,
    }));
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
    userId: string,
  ): Promise<ConversationSummary[]> {
    const memberships = await db
      .select({ conversationId: conversationMembers.conversationId })
      .from(conversationMembers)
      .where(eq(conversationMembers.userId, userId));
    const userMessages: MessageRecord[] = [];
    for (const membership of memberships) {
      const rows = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, membership.conversationId),
            isNull(messages.deletedAt),
          ),
        )
        .orderBy(desc(messages.createdAt));
      userMessages.push(
        ...rows.map((message) => ({
          id: message.id,
          senderId: message.senderId,
          receiverId: message.senderId === userId ? "" : userId,
          content: message.content || "",
          messageType: message.messageType,
          isRead: message.senderId === userId,
          isDeleted: false,
          createdAt: message.createdAt,
          updatedAt: message.editedAt || message.createdAt,
        })),
      );
    }

    // Build unique conversation partner list
    const partnerMap = new Map<string, ConversationSummary>();

    for (const msg of userMessages.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;

      if (!partnerMap.has(partnerId)) {
        const unreadCount = userMessages.filter(
          (m) =>
            !m.isDeleted &&
            m.senderId === partnerId &&
            m.receiverId === userId &&
            !m.isRead,
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
    const [message] = await db
      .select({ id: messages.id, senderId: messages.senderId })
      .from(messages)
      .where(eq(messages.id, messageId));
    if (!message) {
      const error = new Error("Message not found") as AppError;
      error.statusCode = 404;
      error.code = "MESSAGE_NOT_FOUND";
      throw error;
    }

    if (message.senderId !== userId) {
      const error = new Error(
        "Forbidden: You can only delete your own messages",
      ) as AppError;
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }

    await db
      .update(messages)
      .set({ deletedAt: new Date() })
      .where(eq(messages.id, messageId));
  }
}

export default MessageService;
