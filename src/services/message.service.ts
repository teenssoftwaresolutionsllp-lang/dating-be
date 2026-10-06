import { db } from "../db/index";
import {
  conversationMembers,
  conversations,
  matches,
  messageReads,
  messages,
  profilePhotos,
  profiles,
  swipeEvents,
  swipes,
  users,
} from "../db/schema";
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNull,
  ne,
  or,
} from "drizzle-orm";
import type {
  AppError,
  SendMessageParams,
  MessageRecord,
  SendMessageResult,
  ConversationHistory,
  GetConversationParams,
  ConversationSummary,
  DeleteMessageParams,
} from "../types/index";

const PRE_MATCH_MESSAGE_LIMIT = 2;

const findConversation = async (userId: string, otherUserId: string) => {
  const [conversation] = await db
    .select({
      conversationId: conversations.id,
      matchId: matches.id,
      matchStatus: matches.status,
    })
    .from(conversationMembers)
    .innerJoin(
      conversations,
      eq(conversationMembers.conversationId, conversations.id),
    )
    .innerJoin(matches, eq(conversations.matchId, matches.id))
    .where(
      and(
        eq(conversationMembers.userId, userId),
        inArray(matches.status, ["active", "pending"]),
        inArray(
          conversations.id,
          db
            .select({ conversationId: conversationMembers.conversationId })
            .from(conversationMembers)
            .where(eq(conversationMembers.userId, otherUserId)),
        ),
      ),
    )
    .limit(1);
  return conversation;
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
  }: SendMessageParams): Promise<SendMessageResult> {
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

    return db.transaction(async (tx) => {
      const user1Id = senderId < receiverId ? senderId : receiverId;
      const user2Id = senderId < receiverId ? receiverId : senderId;
      let [match] = await tx
        .select()
        .from(matches)
        .where(and(eq(matches.user1Id, user1Id), eq(matches.user2Id, user2Id)))
        .for("update");

      if (!match) {
        await tx
          .insert(matches)
          .values({ user1Id, user2Id, status: "pending" })
          .onConflictDoNothing();
        [match] = await tx
          .select()
          .from(matches)
          .where(
            and(eq(matches.user1Id, user1Id), eq(matches.user2Id, user2Id)),
          )
          .for("update");
      }

      if (!match || match.status === "unmatched") {
        const error = new Error(
          "This conversation is unavailable. You can message after matching.",
        ) as AppError;
        error.statusCode = 403;
        error.code = "MATCH_REQUIRED";
        throw error;
      }

      let [conversation] = await tx
        .select()
        .from(conversations)
        .where(eq(conversations.matchId, match.id));
      if (!conversation) {
        [conversation] = await tx
          .insert(conversations)
          .values({ matchId: match.id })
          .onConflictDoNothing()
          .returning();
        if (!conversation) {
          [conversation] = await tx
            .select()
            .from(conversations)
            .where(eq(conversations.matchId, match.id));
        }
      }
      if (!conversation) {
        throw new Error("Could not create a conversation for this match.");
      }

      await tx
        .insert(conversationMembers)
        .values([
          { conversationId: conversation.id, userId: user1Id },
          { conversationId: conversation.id, userId: user2Id },
        ])
        .onConflictDoNothing();

      const [{ sentCount }] = await tx
        .select({ sentCount: count() })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversation.id),
            eq(messages.senderId, senderId),
          ),
        );
      if (match.status === "pending" && sentCount >= PRE_MATCH_MESSAGE_LIMIT) {
        const error = new Error(
          "You have sent your two introductory messages. Wait for them to reply or like you to unlock unlimited chat.",
        ) as AppError;
        error.statusCode = 403;
        error.code = "PRE_MATCH_MESSAGE_LIMIT";
        throw error;
      }

      const [message] = await tx
        .insert(messages)
        .values({
          conversationId: conversation.id,
          senderId,
          content: content.trim(),
          messageType,
        })
        .returning();
      await tx
        .update(conversations)
        .set({ updatedAt: message.createdAt })
        .where(eq(conversations.id, conversation.id));

      return {
        message: {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          receiverId,
          content: message.content || "",
          messageType: message.messageType,
          isRead: false,
          isOwn: true,
          isDeleted: false,
          createdAt: message.createdAt,
          updatedAt: message.editedAt || message.createdAt,
        },
        isMatched: match.status === "active",
        messagesRemaining:
          match.status === "active"
            ? null
            : Math.max(0, PRE_MATCH_MESSAGE_LIMIT - sentCount - 1),
      };
    });
  }

  /**
   * Get paginated conversation between two users
   */
  static async getConversation({
    userId,
    otherUserId,
    page = 1,
    limit = 50,
  }: GetConversationParams): Promise<ConversationHistory> {
    const currentPage = Math.max(1, page);
    const pageLimit = Math.min(100, Math.max(1, limit));
    const conversation = await findConversation(userId, otherUserId);
    if (!conversation) {
      const user1Id = userId < otherUserId ? userId : otherUserId;
      const user2Id = userId < otherUserId ? otherUserId : userId;
      const [match] = await db
        .select()
        .from(matches)
        .where(and(eq(matches.user1Id, user1Id), eq(matches.user2Id, user2Id)));
      return {
        items: [],
        total: 0,
        page: currentPage,
        limit: pageLimit,
        totalPages: 0,
        isMatched: match?.status === "active",
        messagesRemaining:
          match?.status === "active"
            ? null
            : PRE_MATCH_MESSAGE_LIMIT,
      };
    }

    const messageFilter = and(
      eq(messages.conversationId, conversation.conversationId),
      isNull(messages.deletedAt),
    );
    const [{ total }] = await db
      .select({ total: count() })
      .from(messages)
      .where(messageFilter);
    const rows = await db
      .select()
      .from(messages)
      .where(messageFilter)
      .orderBy(desc(messages.createdAt))
      .limit(pageLimit)
      .offset((currentPage - 1) * pageLimit);
    const incomingMessageIds = rows
      .filter((message) => message.senderId !== userId)
      .map((message) => message.id);

    if (incomingMessageIds.length > 0) {
      await db
        .insert(messageReads)
        .values(
          incomingMessageIds.map((messageId) => ({ messageId, userId })),
        )
        .onConflictDoNothing();
    }

    const receipts =
      rows.length > 0
        ? await db
            .select({
              messageId: messageReads.messageId,
              userId: messageReads.userId,
            })
            .from(messageReads)
            .where(
              inArray(
                messageReads.messageId,
                rows.map((message) => message.id),
              ),
            )
        : [];
    const readByUser = new Set(
      receipts.map((receipt) => `${receipt.messageId}:${receipt.userId}`),
    );

    const allMessages = rows.map((message) => ({
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      receiverId: message.senderId === userId ? otherUserId : userId,
      content: message.content || "",
      messageType: message.messageType,
      isRead: readByUser.has(
        `${message.id}:${message.senderId === userId ? otherUserId : userId}`,
      ),
      isOwn: message.senderId === userId,
      isDeleted: false,
      createdAt: message.createdAt,
      updatedAt: message.editedAt || message.createdAt,
    }));
    const totalPages = Math.ceil(total / pageLimit);

    const [{ sentCount }] = await db
      .select({ sentCount: count() })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversation.conversationId),
          eq(messages.senderId, userId),
        ),
      );

    return {
      items: allMessages,
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages,
      isMatched: conversation.matchStatus === "active",
      messagesRemaining:
        conversation.matchStatus === "active"
          ? null
          : Math.max(0, PRE_MATCH_MESSAGE_LIMIT - sentCount),
    };
  }

  /**
   * Get conversation list (inbox) for a user
   */
  static async getConversations(
    userId: string,
  ): Promise<ConversationSummary[]> {
    const memberships = await db
      .select({
        conversationId: conversationMembers.conversationId,
        updatedAt: conversations.updatedAt,
        matchStatus: matches.status,
      })
      .from(conversationMembers)
      .innerJoin(
        conversations,
        eq(conversationMembers.conversationId, conversations.id),
      )
      .innerJoin(matches, eq(conversations.matchId, matches.id))
      .where(
        and(
          eq(conversationMembers.userId, userId),
          inArray(matches.status, ["active", "pending"]),
        ),
      );

    if (memberships.length === 0) return [];

    const conversationIds = memberships.map(
      (membership) => membership.conversationId,
    );
    const members = await db
      .select({
        conversationId: conversationMembers.conversationId,
        userId: conversationMembers.userId,
      })
      .from(conversationMembers)
      .where(inArray(conversationMembers.conversationId, conversationIds));
    const partnerIds = Array.from(
      new Set(
        members
          .filter((member) => member.userId !== userId)
          .map((member) => member.userId),
      ),
    );
    if (partnerIds.length === 0) return [];

    const [
      partnerProfiles,
      partnerAccounts,
      partnerPhotos,
      latestMessages,
      unreadCounts,
      outgoingCounts,
    ] = await Promise.all([
      db
        .select({ userId: profiles.userId, name: profiles.name })
        .from(profiles)
        .where(inArray(profiles.userId, partnerIds)),
      db
        .select({ id: users.id, lastActiveAt: users.lastActiveAt })
        .from(users)
        .where(inArray(users.id, partnerIds)),
      db
        .select({
          userId: profilePhotos.userId,
          url: profilePhotos.url,
          isPrimary: profilePhotos.isPrimary,
          displayOrder: profilePhotos.displayOrder,
        })
        .from(profilePhotos)
        .where(inArray(profilePhotos.userId, partnerIds))
        .orderBy(desc(profilePhotos.isPrimary), profilePhotos.displayOrder),
      Promise.all(
        conversationIds.map((conversationId) =>
          db
            .select()
            .from(messages)
            .where(
              and(
                eq(messages.conversationId, conversationId),
                isNull(messages.deletedAt),
              ),
            )
            .orderBy(desc(messages.createdAt))
            .limit(1),
        ),
      ),
      db
        .select({
          conversationId: messages.conversationId,
          unreadCount: count(),
        })
        .from(messages)
        .leftJoin(
          messageReads,
          and(
            eq(messageReads.messageId, messages.id),
            eq(messageReads.userId, userId),
          )
        )
        .where(
          and(
            inArray(messages.conversationId, conversationIds),
            isNull(messages.deletedAt),
            ne(messages.senderId, userId),
            isNull(messageReads.messageId),
          ),
        )
        .groupBy(messages.conversationId),
      db
        .select({
          conversationId: messages.conversationId,
          sentCount: count(),
        })
        .from(messages)
        .where(
          and(
            inArray(messages.conversationId, conversationIds),
            eq(messages.senderId, userId),
          ),
        )
        .groupBy(messages.conversationId),
    ]);

    const summaries = memberships.flatMap((membership, index) => {
      const partnerId = members.find(
        (member) =>
          member.conversationId === membership.conversationId &&
          member.userId !== userId,
      )?.userId;
      if (!partnerId) return [];

      const profile = partnerProfiles.find(
        (record) => record.userId === partnerId,
      );
      const account = partnerAccounts.find(
        (record) => record.id === partnerId,
      );
      const photo = partnerPhotos.find(
        (record) => record.userId === partnerId,
      );
      const latestMessage = latestMessages[index]?.[0];
      const unreadCount =
        unreadCounts.find(
          (record) => record.conversationId === membership.conversationId,
        )?.unreadCount ?? 0;
      const lastActivityAt = latestMessage?.createdAt ?? membership.updatedAt;

      return [
        {
          conversationId: membership.conversationId,
          partner: {
            id: partnerId,
            name: profile?.name || "Matched User",
            primaryPhoto: photo?.url ?? null,
            isOnline: account?.lastActiveAt
              ? Date.now() - account.lastActiveAt.getTime() < 10 * 60 * 1000
              : false,
          },
          lastMessage: latestMessage
            ? {
                id: latestMessage.id,
                content: latestMessage.content,
                senderId: latestMessage.senderId,
                messageType: latestMessage.messageType,
                createdAt: latestMessage.createdAt,
                isOwnMessage: latestMessage.senderId === userId,
              }
            : null,
          unreadCount,
          lastActivityAt,
          isMatched: membership.matchStatus === "active",
          messagesRemaining: membership.matchStatus === "active"
            ? null
            : Math.max(
                0,
                PRE_MATCH_MESSAGE_LIMIT -
                  (outgoingCounts.find(
                    (record) =>
                      record.conversationId === membership.conversationId,
                  )?.sentCount ?? 0),
              ),
        },
      ];
    });

    return summaries.sort(
      (left, right) =>
        right.lastActivityAt.getTime() - left.lastActivityAt.getTime(),
    );
  }

  static async likeFromConversation(
    userId: string,
    partnerId: string,
  ): Promise<void> {
    if (userId === partnerId) {
      const error = new Error("Cannot like yourself") as AppError;
      error.statusCode = 400;
      error.code = "INVALID_MATCH_TARGET";
      throw error;
    }

    const user1Id = userId < partnerId ? userId : partnerId;
    const user2Id = userId < partnerId ? partnerId : userId;

    await db.transaction(async (tx) => {
      const [match] = await tx
        .select()
        .from(matches)
        .where(and(eq(matches.user1Id, user1Id), eq(matches.user2Id, user2Id)))
        .for("update");

      if (!match || match.status === "unmatched") {
        const error = new Error(
          "This person has not messaged you yet, or this conversation is unavailable.",
        ) as AppError;
        error.statusCode = 404;
        error.code = "CONVERSATION_NOT_FOUND";
        throw error;
      }

      const [conversation] = await tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(eq(conversations.matchId, match.id));
      if (!conversation) {
        const error = new Error("Conversation not found") as AppError;
        error.statusCode = 404;
        error.code = "CONVERSATION_NOT_FOUND";
        throw error;
      }
      const [incomingMessage] = await tx
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversation.id),
            eq(messages.senderId, partnerId),
            isNull(messages.deletedAt),
          ),
        )
        .limit(1);
      if (!incomingMessage) {
        const error = new Error(
          "Wait for this person to send you a message before liking them here.",
        ) as AppError;
        error.statusCode = 400;
        error.code = "INCOMING_MESSAGE_REQUIRED";
        throw error;
      }

      const [existingSwipe] = await tx
        .select({ id: swipes.id })
        .from(swipes)
        .where(and(eq(swipes.userId, userId), eq(swipes.targetUserId, partnerId)));
      if (existingSwipe) {
        await tx
          .update(swipes)
          .set({ action: "like", updatedAt: new Date() })
          .where(eq(swipes.id, existingSwipe.id));
      } else {
        await tx.insert(swipes).values({
          userId,
          targetUserId: partnerId,
          action: "like",
          source: "chat",
        });
      }
      await tx.insert(swipeEvents).values({
        userId,
        targetUserId: partnerId,
        action: "like",
        source: "chat",
      });
      if (match.status !== "active") {
        await tx
          .update(matches)
          .set({ status: "active", matchedAt: new Date() })
          .where(eq(matches.id, match.id));
      }
    });
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
