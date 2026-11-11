import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getMessaging, type SendResponse } from "firebase-admin/messaging";
import fs from "node:fs";
import path from "node:path";
import { db } from "../db/index";
import { userDevices } from "../db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";

let isFirebaseInitialized = false;

// Initialize Firebase Admin safely using modular SDK (firebase-admin v14+)
if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const resolvedPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      if (fs.existsSync(resolvedPath)) {
        const fileContent = fs.readFileSync(resolvedPath, "utf-8");
        const serviceAccount = JSON.parse(fileContent);
        initializeApp({
          credential: cert(serviceAccount),
        });
        isFirebaseInitialized = true;
        console.log("🔥 Firebase Admin initialized successfully from service account file.");
      } else {
        console.warn(`[NotificationService] Service account file not found at: ${resolvedPath}`);
      }
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({
        credential: cert(serviceAccount),
      });
      isFirebaseInitialized = true;
      console.log("🔥 Firebase Admin initialized successfully from FIREBASE_SERVICE_ACCOUNT env.");
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      initializeApp({
        credential: applicationDefault(),
      });
      isFirebaseInitialized = true;
      console.log("🔥 Firebase Admin initialized successfully via applicationDefault.");
    } else {
      console.info(
        "ℹ️ [NotificationService] Firebase credentials not configured. Push notifications will be logged/mocked until credentials are provided."
      );
    }
  } catch (err) {
    console.warn("⚠️ [NotificationService] Failed to initialize Firebase Admin:", err);
  }
} else {
  isFirebaseInitialized = true;
}

export interface SendCallPushNotificationParams {
  receiverId: string;
  callerName: string;
  callType: string; // 'audio' | 'video'
  channelName: string;
  callId: string;
  callerAvatar?: string | null;
}

/**
 * Dispatches an incoming call push notification to all active devices registered to receiverId
 */
export async function sendCallPushNotification({
  receiverId,
  callerName,
  callType,
  channelName,
  callId,
  callerAvatar,
}: SendCallPushNotificationParams): Promise<void> {
  try {
    const devices = await db
      .select({ pushToken: userDevices.deviceToken })
      .from(userDevices)
      .where(
        and(
          eq(userDevices.userId, receiverId),
          isNull(userDevices.revokedAt)
        )
      );

    if (!devices.length) {
      console.log(`[NotificationService] No push devices registered for receiver ${receiverId}`);
      return;
    }

    const tokens = devices.map((d) => d.pushToken).filter(Boolean);
    if (!tokens.length) return;

    if (!isFirebaseInitialized) {
      console.log(
        `[NotificationService] (Mock Push) Incoming ${callType} call from "${callerName}" to user ${receiverId} across ${tokens.length} device(s).`
      );
      return;
    }

    const response = await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: "Incoming Call",
        body: `${callerName} wants to connect with you via ${callType} call.`,
      },
      data: {
        type: "INCOMING_CALL",
        callId,
        channelName,
        callType,
        callerName: callerName || "Match",
        callerAvatar: callerAvatar || "",
      },
      android: {
        priority: "high",
        notification: {
          channelId: "calls",
          sound: "default",
          priority: "high",
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            contentAvailable: true,
          },
        },
      },
    });

    // Cleanup stale or invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens: string[] = [];
      response.responses.forEach((resp: SendResponse, idx: number) => {
        if (!resp.success && resp.error) {
          const errCode = resp.error.code;
          if (
            errCode === "messaging/invalid-registration-token" ||
            errCode === "messaging/registration-token-not-registered"
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await db
          .delete(userDevices)
          .where(inArray(userDevices.deviceToken, invalidTokens))
          .catch((cleanupErr) =>
            console.warn("[NotificationService] Token cleanup failed:", cleanupErr)
          );
      }
    }

    console.log(
      `[NotificationService] Call push notification dispatched: ${response.successCount} succeeded, ${response.failureCount} failed.`
    );
  } catch (err) {
    console.warn("[NotificationService] Failed to dispatch call push notification:", err);
  }
}

/**
 * Generic push notification sender for messages, likes, and matches
 */
export async function sendPushNotification({
  userId,
  title,
  body,
  data = {},
}: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  try {
    const devices = await db
      .select({ pushToken: userDevices.deviceToken })
      .from(userDevices)
      .where(
        and(
          eq(userDevices.userId, userId),
          isNull(userDevices.revokedAt)
        )
      );

    if (!devices.length) return;

    const tokens = devices.map((d) => d.pushToken).filter(Boolean);
    if (!tokens.length) return;

    if (!isFirebaseInitialized) {
      console.log(`[NotificationService] (Mock Push) to ${userId}: ${title} - ${body}`);
      return;
    }

    await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title,
        body,
      },
      data,
      android: {
        priority: "high",
        notification: {
          channelId: "default",
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    });
  } catch (err) {
    console.warn("[NotificationService] Failed to send push notification:", err);
  }
}
