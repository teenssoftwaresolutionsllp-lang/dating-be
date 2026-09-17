import { db } from "../db/index";
import {
  conversationMembers,
  conversations,
  matches,
  swipeEvents,
  swipes,
  users,
} from "../db/schema";
import { and, desc, eq, or } from "drizzle-orm";
import type {
  AppError,
  SwipeParams,
  SwipeResult,
  MatchRecord,
  GetMatchesParams,
  PaginatedResult,
  SwipeDirection,
} from "../types/index";

/**
 * In-memory match store (used by match controllers pending DB query integration)
 * Structure: Map<`${userId}-${targetUserId}`, MatchRecord>
 */
const swipeStore = new Map<string, MatchRecord>();
let matchIdCounter = 1;

const actionForDirection = (direction: SwipeDirection): string =>
  direction === "dislike" ? "reject" : direction;

const directionForAction = (action: string): SwipeDirection =>
  action === "reject" ? "dislike" : (action as SwipeDirection);

export class MatchService {
  /**
   * Record a swipe and detect mutual match
   */
  static async swipe({
    userId,
    targetUserId,
    direction,
  }: SwipeParams): Promise<SwipeResult> {
    if (userId === targetUserId) {
      const error = new Error("Cannot swipe on yourself") as AppError;
      error.statusCode = 400;
      error.code = "INVALID_SWIPE_TARGET";
      throw error;
    }

    // Verify target user exists
    const [targetUser] = await db
      .select({ id: users.id, phone: users.phone, status: users.status })
      .from(users)
      .where(eq(users.id, targetUserId));

    if (!targetUser || targetUser.status !== "active") {
      const error = new Error("Target user not found or inactive") as AppError;
      error.statusCode = 404;
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    const [existing] = await db
      .select({ id: swipes.id })
      .from(swipes)
      .where(
        and(eq(swipes.userId, userId), eq(swipes.targetUserId, targetUserId)),
      );
    if (existing) {
      const error = new Error(
        "You have already swiped on this user",
      ) as AppError;
      error.statusCode = 409;
      error.code = "ALREADY_SWIPED";
      throw error;
    }

    const action = actionForDirection(direction);
    await db
      .insert(swipes)
      .values({ userId, targetUserId, action, source: "discovery" });
    await db
      .insert(swipeEvents)
      .values({ userId, targetUserId, action, source: "discovery" });

    let matchId: string | undefined;
    if (action === "like" || action === "superlike") {
      const [reverse] = await db
        .select({ id: swipes.id })
        .from(swipes)
        .where(
          and(eq(swipes.userId, targetUserId), eq(swipes.targetUserId, userId)),
        );
      if (reverse) {
        const [match] = await db
          .insert(matches)
          .values({
            user1Id: userId < targetUserId ? userId : targetUserId,
            user2Id: userId < targetUserId ? targetUserId : userId,
            status: "active",
          })
          .onConflictDoNothing()
          .returning({ id: matches.id });
        matchId = match?.id;
        if (matchId) {
          const [conversation] = await db
            .insert(conversations)
            .values({ matchId })
            .onConflictDoNothing()
            .returning({ id: conversations.id });
          if (conversation) {
            await db
              .insert(conversationMembers)
              .values([
                { conversationId: conversation.id, userId },
                { conversationId: conversation.id, userId: targetUserId },
              ])
              .onConflictDoNothing();
          }
        }
      }
    }

    return {
      direction,
      isMatch: Boolean(matchId),
      matchId,
      targetUser: {
        id: targetUser.id,
        phone: targetUser.phone,
      },
    };
  }

  /**
   * Get all mutual matches for a user
   */

  static async getMatches({
    userId,
    page = 1,
    limit = 20,
  }: GetMatchesParams): Promise<PaginatedResult<MatchRecord>> {
    const rows = await db
      .select({
        id: matches.id,
        user1Id: matches.user1Id,
        user2Id: matches.user2Id,
        matchedAt: matches.matchedAt,
      })
      .from(matches)
      .where(
        and(
          eq(matches.status, "active"),
          or(eq(matches.user1Id, userId), eq(matches.user2Id, userId)),
        ),
      )
      .orderBy(desc(matches.matchedAt));
    const total = rows.length;
    const items = rows.slice((page - 1) * limit, page * limit).map((row) => ({
      id: row.id,
      userId,
      targetUserId: row.user1Id === userId ? row.user2Id : row.user1Id,
      direction: "like" as SwipeDirection,
      isMatch: true,
      createdAt: row.matchedAt,
    }));
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Remove a match (unmatch)
   */
  static async unmatch(userId: string, matchedUserId: string): Promise<void> {
    const user1Id = userId < matchedUserId ? userId : matchedUserId;
    const user2Id = userId < matchedUserId ? matchedUserId : userId;
    const [updated] = await db
      .update(matches)
      .set({
        status: "unmatched",
        unmatchedAt: new Date(),
        unmatchedBy: userId,
      })
      .where(
        and(
          eq(matches.user1Id, user1Id),
          eq(matches.user2Id, user2Id),
          eq(matches.status, "active"),
        ),
      )
      .returning({ id: matches.id });
    if (!updated) {
      const error = new Error("Match not found") as AppError;
      error.statusCode = 404;
      error.code = "MATCH_NOT_FOUND";
      throw error;
    }
  }

  /**
   * Get swipe history for a user
   */
  static async getSwipeHistory(
    userId: string,
    direction?: SwipeDirection,
  ): Promise<MatchRecord[]> {
    const rows = await db
      .select()
      .from(swipes)
      .where(eq(swipes.userId, userId))
      .orderBy(desc(swipes.createdAt));
    return rows
      .filter(
        (row) => !direction || directionForAction(row.action) === direction,
      )
      .map((row) => ({
        id: row.id,
        userId: row.userId,
        targetUserId: row.targetUserId,
        direction: directionForAction(row.action),
        isMatch: false,
        createdAt: row.createdAt,
      }));
  }
}

export default MatchService;
