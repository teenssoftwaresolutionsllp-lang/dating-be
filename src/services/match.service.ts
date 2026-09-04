import { db } from "../db/index";
import { users } from "../db/schema/users";
import { eq, and, or, desc, count } from "drizzle-orm";
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
 * In-memory match store (replace with a real DB table once schema is migrated)
 * Structure: Map<`${userId}-${targetUserId}`, MatchRecord>
 */
const swipeStore = new Map<string, MatchRecord>();
let matchIdCounter = 1;

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
      .select({ id: users.id, phone: users.phone, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, targetUserId));

    if (!targetUser || !targetUser.isActive) {
      const error = new Error("Target user not found or inactive") as AppError;
      error.statusCode = 404;
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    // Prevent duplicate swipes
    const swipeKey = `${userId}-${targetUserId}`;
    if (swipeStore.has(swipeKey)) {
      const error = new Error(
        "You have already swiped on this user"
      ) as AppError;
      error.statusCode = 409;
      error.code = "ALREADY_SWIPED";
      throw error;
    }

    const now = new Date();
    const record: MatchRecord = {
      id: matchIdCounter++,
      userId,
      targetUserId,
      direction,
      isMatch: false,
      createdAt: now,
    };

    swipeStore.set(swipeKey, record);

    // Check if the other user already liked us back
    let isMatch = false;
    let matchId: number | undefined;

    if (direction === "like" || direction === "superlike") {
      const reverseKey = `${targetUserId}-${userId}`;
      const reverseSwipe = swipeStore.get(reverseKey);

      if (
        reverseSwipe &&
        (reverseSwipe.direction === "like" ||
          reverseSwipe.direction === "superlike")
      ) {
        isMatch = true;
        matchId = record.id;
        // Mark both records as matched
        swipeStore.set(swipeKey, { ...record, isMatch: true });
        swipeStore.set(reverseKey, { ...reverseSwipe, isMatch: true });
      }
    }

    return {
      direction,
      isMatch,
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
    const allMatches = Array.from(swipeStore.values()).filter(
      (r) => r.isMatch && r.userId === userId
    );

    const total = allMatches.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const items = allMatches
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return { items, total, page, limit, totalPages };
  }

  /**
   * Remove a match (unmatch)
   */
  static async unmatch(userId: number, matchedUserId: number): Promise<void> {
    const keyA = `${userId}-${matchedUserId}`;
    const keyB = `${matchedUserId}-${userId}`;

    const recordA = swipeStore.get(keyA);
    const recordB = swipeStore.get(keyB);

    if (!recordA?.isMatch && !recordB?.isMatch) {
      const error = new Error("Match not found") as AppError;
      error.statusCode = 404;
      error.code = "MATCH_NOT_FOUND";
      throw error;
    }

    swipeStore.delete(keyA);
    swipeStore.delete(keyB);
  }

  /**
   * Get swipe history for a user
   */
  static async getSwipeHistory(
    userId: number,
    direction?: SwipeDirection
  ): Promise<MatchRecord[]> {
    return Array.from(swipeStore.values())
      .filter(
        (r) =>
          r.userId === userId && (direction ? r.direction === direction : true)
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export default MatchService;
