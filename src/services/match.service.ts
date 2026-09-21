import { db } from "../db/index";
import {
  users,
  profiles,
  profilePhotos,
  education,
  languages,
  profileLanguages,
  kycVerifications,
  swipes,
  swipeEvents,
  matches,
  conversations,
  conversationMembers,
  blocks,
  reports,
} from "../db/schema";
import { eq, and, or, desc, notInArray, sql, inArray } from "drizzle-orm";
import type { AppError, SwipeDirection } from "../types/index";
import {
  calculateTrustScore,
  calculateAge,
  formatHeightToFeet,
  type TrustScoreResult,
} from "../utils/trustScore";

export interface DiscoveryCard {
  userId: string;
  name: string;
  age: number | null;
  heightCm: number | null;
  heightFt: string | null;
  isOnline: boolean;
  location: string | null;
  distanceKm?: number;
  bio: string | null;
  relationshipStatus: string | null;
  trustScore: TrustScoreResult;
  photos: {
    id: string;
    url: string;
    isPrimary: boolean;
    displayOrder: number;
  }[];
  education: {
    educationLevel?: string | null;
    qualification?: string | null;
    profession?: string | null;
    companyName?: string | null;
    incomeRange?: string | null;
  } | null;
  languages: string[];
}

export interface SwipeResponse {
  direction: SwipeDirection;
  isMatch: boolean;
  matchId?: string;
  matchedUser?: {
    id: string;
    name: string;
    photo: string | null;
    age: number | null;
    trustScore: TrustScoreResult;
  };
}

export interface MatchListItem {
  matchId: string;
  matchedAt: Date;
  status: string;
  hasChatStarted: boolean;
  conversationId?: string | null;
  user: {
    id: string;
    name: string;
    age: number | null;
    heightFt: string | null;
    city: string | null;
    primaryPhoto: string | null;
    isOnline: boolean;
    trustScore: TrustScoreResult;
    education?: {
      qualification?: string | null;
      profession?: string | null;
    } | null;
  };
}

export class MatchService {
  /**
   * 1. GET DISCOVERY FEED
   * Returns candidate cards (Ammu, 23, 5.6 fts, Trust Score %, education, languages, photos)
   */
  static async getDiscoveryFeed({
    userId,
    page = 1,
    limit = 10,
  }: {
    userId: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: DiscoveryCard[]; total: number; page: number; limit: number }> {
    // 1. Get list of user IDs already swiped on by this user
    const userSwipes = await db
      .select({ targetUserId: swipes.targetUserId })
      .from(swipes)
      .where(eq(swipes.userId, userId));
    const swipedUserIds = userSwipes.map((s) => s.targetUserId);

    // 2. Get list of blocked user IDs (either direction)
    const userBlocks = await db
      .select({
        blockedUserId: blocks.blockedUserId,
        userId: blocks.userId,
      })
      .from(blocks)
      .where(or(eq(blocks.userId, userId), eq(blocks.blockedUserId, userId)));
    const blockedUserIds = userBlocks.map((b) =>
      b.userId === userId ? b.blockedUserId : b.userId
    );

    // Excluded IDs = self + already swiped + blocked
    const excludedIds = Array.from(
      new Set([userId, ...swipedUserIds, ...blockedUserIds])
    );

    // 3. Query candidate active users
    const candidateQuery = db
      .select({
        id: users.id,
        lastActiveAt: users.lastActiveAt,
      })
      .from(users)
      .where(
        and(
          eq(users.status, "active"),
          excludedIds.length > 0 ? notInArray(users.id, excludedIds) : undefined
        )
      )
      .orderBy(desc(users.lastActiveAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const candidateUsers = await candidateQuery;
    if (candidateUsers.length === 0) {
      return { items: [], total: 0, page, limit };
    }

    const candidateIds = candidateUsers.map((u) => u.id);

    // 4. Fetch Profiles
    const candidateProfiles = await db
      .select()
      .from(profiles)
      .where(inArray(profiles.userId, candidateIds));

    // 5. Fetch Photos
    const candidatePhotos = await db
      .select({
        id: profilePhotos.id,
        userId: profilePhotos.userId,
        url: profilePhotos.url,
        isPrimary: profilePhotos.isPrimary,
        displayOrder: profilePhotos.displayOrder,
      })
      .from(profilePhotos)
      .where(inArray(profilePhotos.userId, candidateIds))
      .orderBy(profilePhotos.displayOrder);

    // 6. Fetch Education
    const candidateEdu = await db
      .select()
      .from(education)
      .where(inArray(education.userId, candidateIds));

    // 7. Fetch KYC
    const candidateKyc = await db
      .select({
        userId: kycVerifications.userId,
        status: kycVerifications.status,
      })
      .from(kycVerifications)
      .where(inArray(kycVerifications.userId, candidateIds));

    // 8. Fetch Spoken Languages
    const profileIds = candidateProfiles.map((p) => p.id);
    const candidateLangs = profileIds.length > 0
      ? await db
          .select({
            profileId: profileLanguages.profileId,
            languageName: languages.name,
          })
          .from(profileLanguages)
          .innerJoin(languages, eq(profileLanguages.languageId, languages.id))
          .where(inArray(profileLanguages.profileId, profileIds))
      : [];

    // Map candidate cards
    const items: DiscoveryCard[] = candidateUsers.map((u) => {
      const prof = candidateProfiles.find((p) => p.userId === u.id);
      const edu = candidateEdu.find((e) => e.userId === u.id);
      const userPhotos = candidatePhotos.filter((p) => p.userId === u.id);
      const kyc = candidateKyc.find((k) => k.userId === u.id);
      const userLangs = prof
        ? candidateLangs
            .filter((l) => l.profileId === prof.id)
            .map((l) => l.languageName)
        : [];

      const isOnline = u.lastActiveAt
        ? Date.now() - new Date(u.lastActiveAt).getTime() < 10 * 60 * 1000
        : false;

      const hasBasicInfo = Boolean(
        prof?.name && prof?.dateOfBirth && prof?.gender && (prof?.bio || prof?.city)
      );
      const hasEducation = Boolean(
        edu?.educationLevel || edu?.qualification || edu?.profession
      );
      const hasPhotosAndLanguages = Boolean(
        userPhotos.length >= 1 || userLangs.length >= 1
      );
      const isKycVerified = kyc?.status === "verified";

      const trustScore = calculateTrustScore({
        hasBasicInfo,
        hasEducation,
        hasPhotosAndLanguages,
        isKycVerified,
      });

      return {
        userId: u.id,
        name: prof?.name || "Discovery User",
        age: calculateAge(prof?.dateOfBirth),
        heightCm: prof?.heightCm || null,
        heightFt: formatHeightToFeet(prof?.heightCm),
        isOnline,
        location: prof?.city ? `Lives in ${prof.city}` : null,
        bio: prof?.bio || null,
        relationshipStatus: prof?.relationshipStatus || null,
        trustScore,
        photos: userPhotos.map((p) => ({
          id: p.id,
          url: p.url,
          isPrimary: p.isPrimary,
          displayOrder: p.displayOrder,
        })),
        education: edu
          ? {
              educationLevel: edu.educationLevel,
              qualification: edu.qualification,
              profession: edu.profession,
              companyName: edu.companyName,
              incomeRange: edu.incomeRange,
            }
          : null,
        languages: userLangs,
      };
    });

    return { items, total: items.length, page, limit };
  }

  /**
   * 2. SWIPE ENGINE
   * Handles Like (Heart), Pass (X), and Superlike (Blue Chat)
   * If mutual like: creates match, but keeps chat voluntary.
   */
  static async swipe({
    userId,
    targetUserId,
    direction,
  }: {
    userId: string;
    targetUserId: string;
    direction: SwipeDirection;
  }): Promise<SwipeResponse> {
    if (userId === targetUserId) {
      const error = new Error("Cannot swipe on yourself") as AppError;
      error.statusCode = 400;
      error.code = "INVALID_SWIPE_TARGET";
      throw error;
    }

    // Verify target user exists
    const [targetUser] = await db
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.id, targetUserId));

    if (!targetUser || targetUser.status !== "active") {
      const error = new Error("Target user not found or inactive") as AppError;
      error.statusCode = 404;
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    // 1. Record / Upsert Swipe
    const [existingSwipe] = await db
      .select()
      .from(swipes)
      .where(
        and(eq(swipes.userId, userId), eq(swipes.targetUserId, targetUserId))
      );

    if (existingSwipe) {
      await db
        .update(swipes)
        .set({ action: direction, updatedAt: new Date() })
        .where(eq(swipes.id, existingSwipe.id));
    } else {
      await db.insert(swipes).values({
        userId,
        targetUserId,
        action: direction,
        source: "discovery",
      });
    }

    // Record Immutable Event
    await db.insert(swipeEvents).values({
      userId,
      targetUserId,
      action: direction,
      source: "discovery",
    });

    // 2. Check for Mutual Like / Superlike
    let isMatch = false;
    let matchId: string | undefined;
    let matchedUserDetails: SwipeResponse["matchedUser"];

    if (direction === "like" || direction === "superlike") {
      const [reverseSwipe] = await db
        .select()
        .from(swipes)
        .where(
          and(
            eq(swipes.userId, targetUserId),
            eq(swipes.targetUserId, userId),
            or(eq(swipes.action, "like"), eq(swipes.action, "superlike"))
          )
        );

      if (reverseSwipe) {
        isMatch = true;

        // Canonical Sorting (user1Id < user2Id) to ensure single row per pair
        const user1Id = userId < targetUserId ? userId : targetUserId;
        const user2Id = userId < targetUserId ? targetUserId : userId;

        // Check if match already exists
        const [existingMatch] = await db
          .select()
          .from(matches)
          .where(
            and(eq(matches.user1Id, user1Id), eq(matches.user2Id, user2Id))
          );

        if (existingMatch) {
          matchId = existingMatch.id;
          if (existingMatch.status !== "active") {
            await db
              .update(matches)
              .set({ status: "active", matchedAt: new Date() })
              .where(eq(matches.id, existingMatch.id));
          }
        } else {
          const [newMatch] = await db
            .insert(matches)
            .values({
              user1Id,
              user2Id,
              status: "active",
            })
            .returning({ id: matches.id });
          matchId = newMatch.id;
        }

        // Fetch target user's profile and Trust Score for match popup
        const [targetProfile] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.userId, targetUserId));

        const [primaryPhoto] = await db
          .select({ url: profilePhotos.url })
          .from(profilePhotos)
          .where(
            and(
              eq(profilePhotos.userId, targetUserId),
              eq(profilePhotos.isPrimary, true)
            )
          )
          .limit(1);

        const [kyc] = await db
          .select({ status: kycVerifications.status })
          .from(kycVerifications)
          .where(eq(kycVerifications.userId, targetUserId));

        const targetTrustScore = calculateTrustScore({
          hasBasicInfo: Boolean(targetProfile?.name && targetProfile?.dateOfBirth),
          hasEducation: true,
          hasPhotosAndLanguages: Boolean(primaryPhoto?.url),
          isKycVerified: kyc?.status === "verified",
        });

        matchedUserDetails = {
          id: targetUserId,
          name: targetProfile?.name || "Matched User",
          photo: primaryPhoto?.url || null,
          age: calculateAge(targetProfile?.dateOfBirth),
          trustScore: targetTrustScore,
        };
      }
    }

    return {
      direction,
      isMatch,
      matchId,
      matchedUser: matchedUserDetails,
    };
  }

  /**
   * 3. GET MUTUAL MATCHES LIST
   * Returns all active mutual matches with Trust Score & chat initiation status
   */
  static async getMatches({
    userId,
    page = 1,
    limit = 20,
  }: {
    userId: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: MatchListItem[]; total: number; page: number; limit: number }> {
    // 1. Fetch active matches where current user is user1 or user2
    const activeMatches = await db
      .select()
      .from(matches)
      .where(
        and(
          or(eq(matches.user1Id, userId), eq(matches.user2Id, userId)),
          eq(matches.status, "active")
        )
      )
      .orderBy(desc(matches.matchedAt))
      .limit(limit)
      .offset((page - 1) * limit);

    if (activeMatches.length === 0) {
      return { items: [], total: 0, page, limit };
    }

    const matchIds = activeMatches.map((m) => m.id);
    const otherUserIds = activeMatches.map((m) =>
      m.user1Id === userId ? m.user2Id : m.user1Id
    );

    // 2. Fetch other users' profile details
    const userProfiles = await db
      .select()
      .from(profiles)
      .where(inArray(profiles.userId, otherUserIds));

    const photos = await db
      .select({
        userId: profilePhotos.userId,
        url: profilePhotos.url,
        isPrimary: profilePhotos.isPrimary,
      })
      .from(profilePhotos)
      .where(inArray(profilePhotos.userId, otherUserIds));

    const edus = await db
      .select()
      .from(education)
      .where(inArray(education.userId, otherUserIds));

    const kycs = await db
      .select({
        userId: kycVerifications.userId,
        status: kycVerifications.status,
      })
      .from(kycVerifications)
      .where(inArray(kycVerifications.userId, otherUserIds));

    const userAccounts = await db
      .select({
        id: users.id,
        lastActiveAt: users.lastActiveAt,
      })
      .from(users)
      .where(inArray(users.id, otherUserIds));

    // 3. Check which matches already have an active conversation
    const activeConvs = await db
      .select({
        id: conversations.id,
        matchId: conversations.matchId,
      })
      .from(conversations)
      .where(inArray(conversations.matchId, matchIds));

    const items: MatchListItem[] = activeMatches.map((m) => {
      const otherId = m.user1Id === userId ? m.user2Id : m.user1Id;
      const prof = userProfiles.find((p) => p.userId === otherId);
      const userPhoto = photos.find((p) => p.userId === otherId && p.isPrimary) ||
        photos.find((p) => p.userId === otherId);
      const edu = edus.find((e) => e.userId === otherId);
      const kyc = kycs.find((k) => k.userId === otherId);
      const account = userAccounts.find((u) => u.id === otherId);
      const conv = activeConvs.find((c) => c.matchId === m.id);

      const isOnline = account?.lastActiveAt
        ? Date.now() - new Date(account.lastActiveAt).getTime() < 10 * 60 * 1000
        : false;

      const trustScore = calculateTrustScore({
        hasBasicInfo: Boolean(prof?.name && prof?.dateOfBirth),
        hasEducation: Boolean(edu?.qualification || edu?.profession),
        hasPhotosAndLanguages: Boolean(userPhoto?.url),
        isKycVerified: kyc?.status === "verified",
      });

      return {
        matchId: m.id,
        matchedAt: m.matchedAt,
        status: m.status,
        hasChatStarted: Boolean(conv),
        conversationId: conv?.id || null,
        user: {
          id: otherId,
          name: prof?.name || "Matched User",
          age: calculateAge(prof?.dateOfBirth),
          heightFt: formatHeightToFeet(prof?.heightCm),
          city: prof?.city || null,
          primaryPhoto: userPhoto?.url || null,
          isOnline,
          trustScore,
          education: edu
            ? {
                qualification: edu.qualification,
                profession: edu.profession,
              }
            : null,
        },
      };
    });

    return { items, total: items.length, page, limit };
  }

  /**
   * 4. START CHAT VOLUNTARILY
   * Creates or returns conversation thread when user taps "Chat" on a match
   */
  static async startChat({
    userId,
    matchId,
  }: {
    userId: string;
    matchId: string;
  }): Promise<{ conversationId: string; matchId: string }> {
    // 1. Verify match exists and user belongs to it
    const [match] = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.id, matchId),
          or(eq(matches.user1Id, userId), eq(matches.user2Id, userId)),
          eq(matches.status, "active")
        )
      );

    if (!match) {
      const error = new Error("Active match not found") as AppError;
      error.statusCode = 404;
      error.code = "MATCH_NOT_FOUND";
      throw error;
    }

    // 2. Check if conversation already exists
    const [existingConv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.matchId, matchId));

    if (existingConv) {
      return { conversationId: existingConv.id, matchId };
    }

    // 3. Create new conversation and add both members
    const [newConv] = await db
      .insert(conversations)
      .values({ matchId })
      .returning({ id: conversations.id });

    await db.insert(conversationMembers).values([
      { conversationId: newConv.id, userId: match.user1Id },
      { conversationId: newConv.id, userId: match.user2Id },
    ]);

    return { conversationId: newConv.id, matchId };
  }

  /**
   * 5. GET LIKES RECEIVED (For "Likes" tab in bottom bar)
   */
  static async getLikesReceived({
    userId,
    page = 1,
    limit = 20,
  }: {
    userId: string;
    page?: number;
    limit?: number;
  }) {
    const receivedSwipes = await db
      .select({
        swiperId: swipes.userId,
        createdAt: swipes.createdAt,
        action: swipes.action,
      })
      .from(swipes)
      .where(
        and(
          eq(swipes.targetUserId, userId),
          or(eq(swipes.action, "like"), eq(swipes.action, "superlike"))
        )
      )
      .orderBy(desc(swipes.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    if (receivedSwipes.length === 0) {
      return { items: [], total: 0, page, limit };
    }

    const swiperIds = receivedSwipes.map((s) => s.swiperId);

    const swiperProfiles = await db
      .select()
      .from(profiles)
      .where(inArray(profiles.userId, swiperIds));

    const photos = await db
      .select({
        userId: profilePhotos.userId,
        url: profilePhotos.url,
      })
      .from(profilePhotos)
      .where(
        and(
          inArray(profilePhotos.userId, swiperIds),
          eq(profilePhotos.isPrimary, true)
        )
      );

    const kycs = await db
      .select({
        userId: kycVerifications.userId,
        status: kycVerifications.status,
      })
      .from(kycVerifications)
      .where(inArray(kycVerifications.userId, swiperIds));

    const items = receivedSwipes.map((s) => {
      const prof = swiperProfiles.find((p) => p.userId === s.swiperId);
      const photo = photos.find((p) => p.userId === s.swiperId);
      const kyc = kycs.find((k) => k.userId === s.swiperId);

      const trustScore = calculateTrustScore({
        hasBasicInfo: Boolean(prof?.name && prof?.dateOfBirth),
        hasEducation: true,
        hasPhotosAndLanguages: Boolean(photo?.url),
        isKycVerified: kyc?.status === "verified",
      });

      return {
        userId: s.swiperId,
        name: prof?.name || "Admirer",
        age: calculateAge(prof?.dateOfBirth),
        city: prof?.city || null,
        photo: photo?.url || null,
        action: s.action,
        likedAt: s.createdAt,
        trustScore,
      };
    });

    return { items, total: items.length, page, limit };
  }

  /**
   * 6. UNMATCH A USER
   */
  static async unmatch(userId: string, matchId: string): Promise<void> {
    const [match] = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.id, matchId),
          or(eq(matches.user1Id, userId), eq(matches.user2Id, userId))
        )
      );

    if (!match) {
      const error = new Error("Match not found") as AppError;
      error.statusCode = 404;
      error.code = "MATCH_NOT_FOUND";
      throw error;
    }

    await db
      .update(matches)
      .set({
        status: "unmatched",
        unmatchedBy: userId,
        unmatchedAt: new Date(),
      })
      .where(eq(matches.id, matchId));
  }

  /**
   * 7. BLOCK A USER
   */
  static async blockUser(userId: string, targetUserId: string): Promise<void> {
    if (userId === targetUserId) {
      const error = new Error("Cannot block yourself") as AppError;
      error.statusCode = 400;
      error.code = "CANNOT_BLOCK_SELF";
      throw error;
    }

    const [existingBlock] = await db
      .select()
      .from(blocks)
      .where(
        and(eq(blocks.userId, userId), eq(blocks.blockedUserId, targetUserId))
      );

    if (!existingBlock) {
      await db.insert(blocks).values({
        userId,
        blockedUserId: targetUserId,
      });
    }

    // If active match exists, mark it unmatched
    const user1Id = userId < targetUserId ? userId : targetUserId;
    const user2Id = userId < targetUserId ? targetUserId : userId;

    await db
      .update(matches)
      .set({
        status: "unmatched",
        unmatchedBy: userId,
        unmatchedAt: new Date(),
      })
      .where(and(eq(matches.user1Id, user1Id), eq(matches.user2Id, user2Id)));
  }

  /**
   * 8. REPORT A USER
   */
  static async reportUser({
    userId,
    targetUserId,
    reason,
    description,
  }: {
    userId: string;
    targetUserId: string;
    reason: string;
    description?: string;
  }): Promise<void> {
    await db.insert(reports).values({
      reporterId: userId,
      reportedUserId: targetUserId,
      reason,
      description: description || null,
      status: "pending",
    });
  }
}

export default MatchService;
