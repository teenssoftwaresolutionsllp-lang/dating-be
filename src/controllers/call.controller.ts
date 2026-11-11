import type { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index";
import {
  calls,
  profiles,
  profilePhotos,
  users,
  matches,
  conversations,
  conversationMembers,
  messages,
} from "../db/schema";
import { eq, and, or, desc, lt, gt, inArray } from "drizzle-orm";
import { AgoraService } from "../services/agora.service";
import { sendCallPushNotification } from "../services/notification.service";
import ApiResponse from "../utils/response";

export class CallController {
  /**
   * Helper: Synchronize call status/event to conversation messages
   * Creates or updates a message in the 1-on-1 chat so it appears like WhatsApp
   */
  static async syncCallToConversationMessage({
    callId,
    callerId,
    receiverId,
    callType,
    status,
    durationSeconds = 0,
  }: {
    callId: string;
    callerId: string;
    receiverId: string;
    callType: "audio" | "video";
    status: string;
    durationSeconds?: number;
  }): Promise<void> {
    try {
      const user1Id = callerId < receiverId ? callerId : receiverId;
      const user2Id = callerId < receiverId ? receiverId : callerId;

      let [match] = await db
        .select()
        .from(matches)
        .where(and(eq(matches.user1Id, user1Id), eq(matches.user2Id, user2Id)));

      if (!match) {
        await db
          .insert(matches)
          .values({ user1Id, user2Id, status: "pending" })
          .onConflictDoNothing();
        [match] = await db
          .select()
          .from(matches)
          .where(and(eq(matches.user1Id, user1Id), eq(matches.user2Id, user2Id)));
      }

      if (!match) return;

      let [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.matchId, match.id));

      if (!conversation) {
        await db
          .insert(conversations)
          .values({ matchId: match.id })
          .onConflictDoNothing();
        [conversation] = await db
          .select()
          .from(conversations)
          .where(eq(conversations.matchId, match.id));
      }

      if (!conversation) return;

      await db
        .insert(conversationMembers)
        .values([
          { conversationId: conversation.id, userId: user1Id },
          { conversationId: conversation.id, userId: user2Id },
        ])
        .onConflictDoNothing();

      const typeLabel = callType === "video" ? "Video call" : "Voice call";
      let contentText = typeLabel;
      if (status === "ringing" || status === "initiated") {
        contentText = typeLabel;
      } else if (status === "missed") {
        contentText = `Missed ${callType === "video" ? "video" : "voice"} call`;
      } else if (status === "rejected") {
        contentText = `${typeLabel} declined`;
      } else if (status === "ended") {
        if (durationSeconds > 0) {
          const mins = Math.floor(durationSeconds / 60);
          const secs = durationSeconds % 60;
          let durStr = "";
          if (mins > 0 && secs > 0) {
            durStr = `${mins} min ${secs} sec`;
          } else if (mins > 0) {
            durStr = `${mins} min`;
          } else {
            durStr = `${secs} sec`;
          }
          contentText = `${typeLabel} (${durStr})`;
        } else {
          contentText = `${typeLabel} (No answer)`;
        }
      }

      const [existingMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.clientMessageId, callId))
        .limit(1);

      if (existingMessage) {
        await db
          .update(messages)
          .set({
            content: contentText,
            metadata: {
              callId,
              callType,
              status,
              durationSeconds,
            },
          })
          .where(eq(messages.id, existingMessage.id));
      } else {
        await db
          .insert(messages)
          .values({
            conversationId: conversation.id,
            senderId: callerId,
            clientMessageId: callId,
            messageType: "call",
            content: contentText,
            metadata: {
              callId,
              callType,
              status,
              durationSeconds,
            },
          })
          .onConflictDoNothing();
      }

      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversation.id));
    } catch (err) {
      console.warn("Failed to sync call to conversation message:", err);
    }
  }

  /**
   * POST /api/v1/calls/initiate
   * User A initiates a 1-on-1 audio/video call to User B
   */
  static async initiateCall(req: Request, res: Response): Promise<Response> {
    const callerId = req.user?.id;
    const { receiverId, callType = "video" } = req.body as {
      receiverId?: string;
      callType?: "audio" | "video";
    };

    if (!callerId) {
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

    if (callerId === receiverId) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "You cannot initiate a call with yourself",
        code: "INVALID_OPERATION",
      });
    }

    // Auto-expire any stale calls (> 35s) in 'ringing' or 'initiated' state
    const staleThreshold = new Date(Date.now() - 35 * 1000);
    await db
      .update(calls)
      .set({ status: "missed", endedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          or(eq(calls.status, "ringing"), eq(calls.status, "initiated")),
          lt(calls.createdAt, staleThreshold)
        )
      );

    // Auto-expire any stale calls in 'accepted' state older than 4 hours
    const staleAcceptedThreshold = new Date(Date.now() - 4 * 60 * 60 * 1000);
    await db
      .update(calls)
      .set({ status: "ended", endedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(calls.status, "accepted"),
          lt(calls.startedAt, staleAcceptedThreshold)
        )
      );

    // Cancel any previous ringing calls initiated by this caller
    await db
      .update(calls)
      .set({ status: "ended", endedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(calls.callerId, callerId),
          eq(calls.status, "ringing")
        )
      );

    // Verify receiver exists and check availability
    const [receiverUser] = await db
      .select({
        id: users.id,
        status: users.status,
        lastActiveAt: users.lastActiveAt,
      })
      .from(users)
      .where(eq(users.id, receiverId))
      .limit(1);

    if (!receiverUser) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    if (receiverUser.status !== "active") {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "User is not available for calls",
        code: "USER_INACTIVE",
      });
    }

    // Check if receiver is already busy in an active call
    const [busyCall] = await db
      .select({ id: calls.id })
      .from(calls)
      .where(
        and(
          or(eq(calls.callerId, receiverId), eq(calls.receiverId, receiverId)),
          or(eq(calls.status, "ringing"), eq(calls.status, "accepted"))
        )
      )
      .limit(1);

    if (busyCall) {
      return ApiResponse.error(res, {
        statusCode: 409,
        message: "User is currently busy on another call",
        code: "USER_BUSY",
      });
    }

    const isReceiverOnline = receiverUser.lastActiveAt
      ? Date.now() - new Date(receiverUser.lastActiveAt).getTime() < 10 * 60 * 1000
      : false;

    // Fetch receiver profile & photo so caller has receiver's details
    const [receiverProfile] = await db
      .select({ name: profiles.name })
      .from(profiles)
      .where(eq(profiles.userId, receiverId))
      .limit(1);

    const [receiverPhoto] = await db
      .select({ url: profilePhotos.url })
      .from(profilePhotos)
      .where(
        and(
          eq(profilePhotos.userId, receiverId),
          eq(profilePhotos.isPrimary, true)
        )
      )
      .limit(1);

    const fallbackReceiverPhoto = receiverPhoto || (
      await db
        .select({ url: profilePhotos.url })
        .from(profilePhotos)
        .where(eq(profilePhotos.userId, receiverId))
        .limit(1)
    )[0];

    // Generate unique channel name and numeric UID for caller
    const channelName = `call_${uuidv4().replace(/-/g, "").slice(0, 20)}`;
    const callerNumericUid = Math.floor(Math.random() * 900000) + 100000;

    // Generate Agora RTC Token for Caller
    const token = AgoraService.generateRtcToken(channelName, callerNumericUid);
    const appId = AgoraService.getAppId();

    // Insert call record with 'ringing' status
    const [newCall] = await db
      .insert(calls)
      .values({
        callerId,
        receiverId,
        channelName,
        callType,
        status: "ringing",
        startedAt: new Date(),
      })
      .returning();

    // Sync call event to conversation message
    await CallController.syncCallToConversationMessage({
      callId: newCall.id,
      callerId,
      receiverId,
      callType,
      status: "ringing",
      durationSeconds: 0,
    });

    // Fetch caller's profile and avatar to include in push notification
    const [callerProfile] = await db
      .select({ name: profiles.name })
      .from(profiles)
      .where(eq(profiles.userId, callerId))
      .limit(1);

    const [callerPhoto] = await db
      .select({ url: profilePhotos.url })
      .from(profilePhotos)
      .where(
        and(
          eq(profilePhotos.userId, callerId),
          eq(profilePhotos.isPrimary, true)
        )
      )
      .limit(1);

    // Trigger Mobile Push Notification (FCM / APNs)
    sendCallPushNotification({
      receiverId,
      callerName: callerProfile?.name || "Someone",
      callType,
      channelName,
      callId: newCall.id,
      callerAvatar: callerPhoto?.url || null,
    }).catch((pushErr) =>
      console.warn("Failed to dispatch call push notification:", pushErr)
    );

    return ApiResponse.success(res, {
      statusCode: 201,
      message: "Call initiated successfully",
      data: {
        callId: newCall.id,
        channelName,
        appId,
        token,
        uid: callerNumericUid,
        callType,
        isReceiverOnline,
        receiverName: receiverProfile?.name || "Match",
        receiverAvatar: receiverPhoto?.url || fallbackReceiverPhoto?.url || null,
        callerName: callerProfile?.name || "Match",
        callerAvatar: callerPhoto?.url || null,
      },
    });
  }

  /**
   * GET /api/v1/calls/incoming
   * Check for any active incoming call for the current user
   */
  static async getIncomingCall(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    // Refresh user's lastActiveAt timestamp so user is marked online
    await db
      .update(users)
      .set({ lastActiveAt: new Date() })
      .where(eq(users.id, userId));

    // Auto-expire any stale calls (> 35s) for this receiver
    const staleThreshold = new Date(Date.now() - 35 * 1000);
    const staleCalls = await db
      .select({
        id: calls.id,
        callerId: calls.callerId,
        receiverId: calls.receiverId,
        callType: calls.callType,
      })
      .from(calls)
      .where(
        and(
          eq(calls.receiverId, userId),
          or(eq(calls.status, "initiated"), eq(calls.status, "ringing")),
          lt(calls.createdAt, staleThreshold)
        )
      );

    if (staleCalls.length > 0) {
      await db
        .update(calls)
        .set({ status: "missed", endedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(calls.receiverId, userId),
            or(eq(calls.status, "initiated"), eq(calls.status, "ringing")),
            lt(calls.createdAt, staleThreshold)
          )
        );

      for (const sc of staleCalls) {
        await CallController.syncCallToConversationMessage({
          callId: sc.id,
          callerId: sc.callerId,
          receiverId: sc.receiverId,
          callType: sc.callType as "audio" | "video",
          status: "missed",
          durationSeconds: 0,
        });
      }
    }

    // Find any active incoming call created in the last 35 seconds
    const [incomingCall] = await db
      .select({
        id: calls.id,
        callerId: calls.callerId,
        receiverId: calls.receiverId,
        channelName: calls.channelName,
        callType: calls.callType,
        status: calls.status,
        createdAt: calls.createdAt,
      })
      .from(calls)
      .where(
        and(
          eq(calls.receiverId, userId),
          or(eq(calls.status, "initiated"), eq(calls.status, "ringing")),
          gt(calls.createdAt, staleThreshold)
        )
      )
      .orderBy(desc(calls.createdAt))
      .limit(1);

    if (!incomingCall) {
      return ApiResponse.success(res, {
        data: null,
        message: "No active incoming calls",
      });
    }

    // Fetch caller's profile info
    const [callerProfile] = await db
      .select({
        name: profiles.name,
      })
      .from(profiles)
      .where(eq(profiles.userId, incomingCall.callerId))
      .limit(1);

    const [callerPhoto] = await db
      .select({
        url: profilePhotos.url,
      })
      .from(profilePhotos)
      .where(
        and(
          eq(profilePhotos.userId, incomingCall.callerId),
          eq(profilePhotos.isPrimary, true)
        )
      )
      .limit(1);

    const fallbackCallerPhoto = callerPhoto || (
      await db
        .select({ url: profilePhotos.url })
        .from(profilePhotos)
        .where(eq(profilePhotos.userId, incomingCall.callerId))
        .limit(1)
    )[0];

    return ApiResponse.success(res, {
      message: "Incoming call found",
      data: {
        ...incomingCall,
        callerName: callerProfile?.name || "Matched User",
        callerAvatar: callerPhoto?.url || fallbackCallerPhoto?.url || null,
      },
    });
  }

  /**
   * POST /api/v1/calls/:callId/accept
   * Receiver accepts the call and receives their Agora RTC Token
   */
  static async acceptCall(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;
    const callId = String(req.params.callId);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const [callRecord] = await db
      .select()
      .from(calls)
      .where(eq(calls.id, callId))
      .limit(1);

    if (!callRecord) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: "Call not found",
        code: "NOT_FOUND",
      });
    }

    if (callRecord.receiverId !== userId) {
      return ApiResponse.error(res, {
        statusCode: 403,
        message: "You are not authorized to accept this call",
        code: "FORBIDDEN",
      });
    }

    if (callRecord.status === "ended" || callRecord.status === "rejected") {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: `Call has already ${callRecord.status}`,
        code: "CALL_INACTIVE",
      });
    }

    // Generate Agora RTC Token for Callee
    const calleeNumericUid = Math.floor(Math.random() * 900000) + 100000;
    const token = AgoraService.generateRtcToken(
      callRecord.channelName,
      calleeNumericUid
    );
    const appId = AgoraService.getAppId();

    // Update call status
    await db
      .update(calls)
      .set({
        status: "accepted",
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(calls.id, callId));

    return ApiResponse.success(res, {
      message: "Call accepted successfully",
      data: {
        callId: callRecord.id,
        channelName: callRecord.channelName,
        appId,
        token,
        uid: calleeNumericUid,
        callType: callRecord.callType,
      },
    });
  }

  /**
   * POST /api/v1/calls/:callId/reject
   * Receiver rejects the call
   */
  static async rejectCall(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;
    const callId = String(req.params.callId);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const [callRecord] = await db
      .select()
      .from(calls)
      .where(eq(calls.id, callId))
      .limit(1);

    if (!callRecord) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: "Call not found",
        code: "NOT_FOUND",
      });
    }

    await db
      .update(calls)
      .set({
        status: "rejected",
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(calls.id, callId));

    await CallController.syncCallToConversationMessage({
      callId: callRecord.id,
      callerId: callRecord.callerId,
      receiverId: callRecord.receiverId,
      callType: callRecord.callType as "audio" | "video",
      status: "rejected",
      durationSeconds: 0,
    });

    return ApiResponse.success(res, {
      message: "Call rejected",
      data: { callId },
    });
  }

  /**
   * POST /api/v1/calls/:callId/end
   * Ends call and records total duration
   */
  static async endCall(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;
    const callId = String(req.params.callId);
    const { durationSeconds = 0 } = req.body as { durationSeconds?: number };

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const [callRecord] = await db
      .select()
      .from(calls)
      .where(eq(calls.id, callId))
      .limit(1);

    if (!callRecord) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: "Call not found",
        code: "NOT_FOUND",
      });
    }

    // Calculate final duration: explicitly passed, or calculated from startedAt if call was accepted
    let finalDuration = Math.max(0, Number(durationSeconds) || 0);
    if (finalDuration === 0 && callRecord.startedAt && callRecord.status === "accepted") {
      const elapsed = Math.round((Date.now() - new Date(callRecord.startedAt).getTime()) / 1000);
      if (elapsed > 0) {
        finalDuration = elapsed;
      }
    }
    if (callRecord.durationSeconds && callRecord.durationSeconds > finalDuration) {
      finalDuration = callRecord.durationSeconds;
    }

    // If caller ends call before accepted, mark as missed (No answer)
    let finalStatus = "ended";
    if (callRecord.status === "ringing" || callRecord.status === "initiated") {
      finalStatus = "missed";
      finalDuration = 0;
    }

    await db
      .update(calls)
      .set({
        status: finalStatus,
        durationSeconds: finalDuration,
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(calls.id, callId));

    await CallController.syncCallToConversationMessage({
      callId: callRecord.id,
      callerId: callRecord.callerId,
      receiverId: callRecord.receiverId,
      callType: callRecord.callType as "audio" | "video",
      status: finalStatus,
      durationSeconds: finalDuration,
    });

    return ApiResponse.success(res, {
      message: "Call ended successfully",
      data: { callId, durationSeconds: finalDuration, status: finalStatus },
    });
  }

  /**
   * GET /api/v1/calls/:callId/status
   * Poll or check current call status
   */
  static async getCallStatus(req: Request, res: Response): Promise<Response> {
    const callId = String(req.params.callId);

    const [callRecord] = await db
      .select()
      .from(calls)
      .where(eq(calls.id, callId))
      .limit(1);

    if (!callRecord) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: "Call not found",
        code: "NOT_FOUND",
      });
    }

    // Auto-expire to 'missed' if ringing or initiated for > 30 seconds without answer
    const ageMs = Date.now() - new Date(callRecord.createdAt).getTime();
    if (
      (callRecord.status === "initiated" || callRecord.status === "ringing") &&
      ageMs > 30000
    ) {
      await db
        .update(calls)
        .set({ status: "missed", endedAt: new Date(), updatedAt: new Date() })
        .where(eq(calls.id, callId));
      callRecord.status = "missed";

      await CallController.syncCallToConversationMessage({
        callId: callRecord.id,
        callerId: callRecord.callerId,
        receiverId: callRecord.receiverId,
        callType: callRecord.callType as "audio" | "video",
        status: "missed",
        durationSeconds: 0,
      });
    }

    return ApiResponse.success(res, {
      data: callRecord,
    });
  }

  /**
   * GET /api/v1/calls/history
   * Retrieve complete call history for the current user
   */
  static async getCallHistory(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const userCalls = await db
      .select()
      .from(calls)
      .where(or(eq(calls.callerId, userId), eq(calls.receiverId, userId)))
      .orderBy(desc(calls.createdAt))
      .limit(60);

    if (userCalls.length === 0) {
      return ApiResponse.success(res, {
        data: [],
        message: "No calls found",
      });
    }

    const partnerIds = Array.from(
      new Set(
        userCalls.map((c) => (c.callerId === userId ? c.receiverId : c.callerId))
      )
    );

    const partnerProfiles = await db
      .select({
        userId: profiles.userId,
        name: profiles.name,
      })
      .from(profiles)
      .where(inArray(profiles.userId, partnerIds));

    const partnerPhotos = await db
      .select({
        userId: profilePhotos.userId,
        url: profilePhotos.url,
      })
      .from(profilePhotos)
      .where(
        and(
          inArray(profilePhotos.userId, partnerIds),
          eq(profilePhotos.isPrimary, true)
        )
      );

    const profileMap = new Map(partnerProfiles.map((p) => [p.userId, p.name]));
    const photoMap = new Map(partnerPhotos.map((p) => [p.userId, p.url]));

    const history = userCalls.map((c) => {
      const isCaller = c.callerId === userId;
      const partnerId = isCaller ? c.receiverId : c.callerId;
      return {
        id: c.id,
        partnerId,
        partnerName: profileMap.get(partnerId) || "Match",
        partnerAvatar: photoMap.get(partnerId) || null,
        callType: c.callType,
        direction: isCaller ? ("outgoing" as const) : ("incoming" as const),
        status: c.status,
        durationSeconds: c.durationSeconds || 0,
        createdAt: c.createdAt,
        startedAt: c.startedAt,
        endedAt: c.endedAt,
      };
    });

    return ApiResponse.success(res, {
      data: history,
      message: "Call history retrieved successfully",
    });
  }

  /**
   * GET /api/v1/calls/rtm-token
   * Returns Agora RTM token and App ID for instant real-time messaging
   */
  static async getRtmToken(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const appId = AgoraService.getAppId();
    const token = AgoraService.generateRtmToken(userId);

    return ApiResponse.success(res, {
      message: "RTM token generated successfully",
      data: {
        appId,
        token,
        userId,
      },
    });
  }
}

export default CallController;
