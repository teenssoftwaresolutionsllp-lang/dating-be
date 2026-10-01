import {
  and,
  desc,
  eq,
  inArray,
  isNull,
  isNotNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { cloudinaryConfigured } from "../config/cloudinary";
import { getPhoneLoginAction } from "../services/account-lifecycle.rules";
import { db } from "../db/index";
import {
  accountDeletionMedia,
  conversations,
  kycVerifications,
  matches,
  mediaAssets,
  messages,
  otpVerifications,
  profilePhotos,
  userSessions,
  userLoginEvents,
  users,
  type User,
} from "../db/schema";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const getStorageProvider = (storageKey: string, storageUrl?: string | null) => {
  const location = `${storageKey} ${storageUrl ?? ""}`.toLowerCase();
  if (location.includes("/uploads/") || location.startsWith("file:")) {
    return "local";
  }
  if (
    location.includes("res.cloudinary.com") ||
    storageKey.startsWith("dating-app/")
  ) {
    return "cloudinary";
  }
  return cloudinaryConfigured ? "cloudinary" : "local";
};

const enqueueUserMedia = async (
  transaction: Transaction,
  userId: string,
): Promise<string[]> => {
  const [photos, assets, kyc, messageAssets] = await Promise.all([
    transaction
      .select({
        storageKey: profilePhotos.storageKey,
        storageUrl: profilePhotos.url,
      })
      .from(profilePhotos)
      .where(eq(profilePhotos.userId, userId)),
    transaction
      .select({
        storageKey: mediaAssets.storageKey,
        mediaType: mediaAssets.mediaType,
      })
      .from(mediaAssets)
      .where(eq(mediaAssets.userId, userId)),
    transaction
      .select({
        documentKey: kycVerifications.documentImageStorageKey,
        documentUrl: kycVerifications.documentImageUrl,
        selfieKey: kycVerifications.selfieStorageKey,
        selfieUrl: kycVerifications.providerReference,
      })
      .from(kycVerifications)
      .where(eq(kycVerifications.userId, userId)),
    transaction
      .select({
        storageKey: messages.mediaStorageKey,
        mediaType: messages.messageType,
      })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .innerJoin(matches, eq(conversations.matchId, matches.id))
      .where(
        and(
          or(eq(matches.user1Id, userId), eq(matches.user2Id, userId)),
          isNotNull(messages.mediaStorageKey),
        ),
      ),
  ]);

  const storedAssets: Array<{
    storageKey: string | null;
    storageUrl?: string | null;
    mediaType?: string;
  }> = [...photos, ...assets, ...messageAssets];

  for (const record of kyc) {
    if (record.documentKey) {
      storedAssets.push({
        storageKey: record.documentKey,
        storageUrl: record.documentUrl,
      });
    }
    if (record.selfieKey) {
      storedAssets.push({
        storageKey: record.selfieKey,
        storageUrl: record.selfieUrl,
      });
    } else if (record.selfieUrl?.includes("res.cloudinary.com")) {
      const publicId = record.selfieUrl
        .split("/")
        .slice(record.selfieUrl.split("/").indexOf("upload") + 1)
        .join("/")
        .replace(/^v\d+\//, "")
        .replace(/\.[^/.]+$/, "");
      if (publicId) {
        storedAssets.push({
          storageKey: publicId,
          storageUrl: record.selfieUrl,
        });
      }
    } else if (record.selfieUrl?.includes("/uploads/")) {
      storedAssets.push({
        storageKey: record.selfieUrl,
        storageUrl: record.selfieUrl,
      });
    }
  }

  const uniqueAssets = new Map<
    string,
    { storageKey: string; storageUrl?: string | null; mediaType?: string }
  >();
  for (const asset of storedAssets) {
    if (!asset.storageKey) continue;
    const provider = getStorageProvider(asset.storageKey, asset.storageUrl);
    uniqueAssets.set(`${provider}:${asset.storageKey}`, {
      storageKey: asset.storageKey,
      storageUrl: asset.storageUrl,
      mediaType: asset.mediaType,
    });
  }

  const values = [...uniqueAssets.entries()].map(([key, asset]) => ({
    provider: key.slice(0, key.indexOf(":")),
    resourceType:
      asset.mediaType === "audio" || asset.mediaType === "video"
        ? "video"
        : "image",
    storageKey: asset.storageKey,
    storageUrl: asset.storageUrl ?? null,
  }));

  if (values.length === 0) return [];

  const inserted = await transaction
    .insert(accountDeletionMedia)
    .values(values)
    .returning({ id: accountDeletionMedia.id });

  return inserted.map((job) => job.id);
};

const deleteUserInTransaction = async (
  transaction: Transaction,
  userId: string,
): Promise<string[]> => {
  const [account] = await transaction
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, userId));
  const jobIds = await enqueueUserMedia(transaction, userId);
  await transaction
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)),
    );
  await transaction
    .delete(userLoginEvents)
    .where(eq(userLoginEvents.userId, userId));
  await transaction
    .delete(otpVerifications)
    .where(
      account?.phone
        ? or(
            eq(otpVerifications.userId, userId),
            eq(otpVerifications.identifier, account.phone),
          )
        : eq(otpVerifications.userId, userId),
    );
  await transaction.delete(users).where(eq(users.id, userId));
  return jobIds;
};

export type PhoneLoginResolution = {
  user: User;
  isNewUser: boolean;
};

export type DeletionOtpResult =
  | { ok: true; cleanupJobIds: string[] }
  | {
      ok: false;
      code:
        | "ACCOUNT_NOT_FOUND"
        | "ACCOUNT_INACTIVE"
        | "OTP_NOT_FOUND"
        | "OTP_EXPIRED"
        | "OTP_MAX_ATTEMPTS_EXCEEDED"
        | "INVALID_OTP";
      remainingAttempts?: number;
    };

export type RequestDeletionOtpResult =
  | { ok: true; phone: string }
  | {
      ok: false;
      code: "ACCOUNT_NOT_FOUND" | "OTP_COOLDOWN_ACTIVE";
      remainingSeconds?: number;
    };

class AccountRepository {
  async findUserById(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  async deactivateUser(
    userId: string,
    now: Date,
    deletionScheduledAt: Date,
  ): Promise<User | undefined> {
    return db.transaction(async (transaction) => {
      const [user] = await transaction
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for("update");

      if (!user || user.status !== "active") return undefined;

      const [deactivatedUser] = await transaction
        .update(users)
        .set({
          status: "deactivated",
          deactivatedAt: now,
          deletionScheduledAt,
          updatedAt: now,
        })
        .where(eq(users.id, userId))
        .returning();

      await transaction
        .update(userSessions)
        .set({ revokedAt: now })
        .where(
          and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)),
        );

      return deactivatedUser;
    });
  }

  async resolvePhoneLogin(
    phone: string,
    now: Date,
  ): Promise<PhoneLoginResolution> {
    return db.transaction(async (transaction) => {
      const [existingUser] = await transaction
        .select()
        .from(users)
        .where(eq(users.phone, phone))
        .for("update");

      if (!existingUser) {
        const [user] = await transaction
          .insert(users)
          .values({
            phone,
            phoneVerified: true,
            status: "active",
            authProvider: "phone",
            lastLoginAt: now,
            lastActiveAt: now,
          })
          .returning();
        return { user, isNewUser: true };
      }

      const loginAction = getPhoneLoginAction(
        existingUser.status,
        existingUser.deletionScheduledAt,
        now,
      );

      if (loginAction === "reject") {
        throw Object.assign(new Error("This account cannot be reactivated"), {
          statusCode: 403,
          code: "ACCOUNT_INACTIVE",
        });
      }

      if (loginAction === "login") {
        const [user] = await transaction
          .update(users)
          .set({
            phoneVerified: true,
            lastLoginAt: now,
            lastActiveAt: now,
            updatedAt: now,
          })
          .where(eq(users.id, existingUser.id))
          .returning();
        return { user, isNewUser: false };
      }

      if (loginAction === "reactivate") {
        const [user] = await transaction
          .update(users)
          .set({
            status: "active",
            deactivatedAt: null,
            deletionScheduledAt: null,
            phoneVerified: true,
            lastLoginAt: now,
            lastActiveAt: now,
            updatedAt: now,
          })
          .where(eq(users.id, existingUser.id))
          .returning();
        return { user, isNewUser: false };
      }

      if (loginAction === "replace") {
        await deleteUserInTransaction(transaction, existingUser.id);
        const [user] = await transaction
          .insert(users)
          .values({
            phone,
            phoneVerified: true,
            status: "active",
            authProvider: "phone",
            lastLoginAt: now,
            lastActiveAt: now,
          })
          .returning();
        return { user, isNewUser: true };
      }

      throw Object.assign(new Error("This account cannot be used"), {
        statusCode: 403,
        code: "ACCOUNT_INACTIVE",
      });
    });
  }

  async createSessionForActiveAccount(
    userId: string,
    values: {
      id: string;
      userId: string;
      refreshTokenHash: string;
      userAgent: string | null;
      ipAddress: string | null;
      expiresAt: Date;
    },
  ): Promise<void> {
    await db.transaction(async (transaction) => {
      const [user] = await transaction
        .select({ status: users.status })
        .from(users)
        .where(eq(users.id, userId))
        .for("update");

      if (!user || user.status !== "active") {
        throw Object.assign(new Error("Account is no longer active"), {
          statusCode: 403,
          code: "ACCOUNT_INACTIVE",
        });
      }

      await transaction.insert(userSessions).values(values);
    });
  }

  async requestDeletionOtp(
    userId: string,
    otpHash: string,
    expiresAt: Date,
    now: Date,
    resendCooldownSeconds: number,
  ): Promise<RequestDeletionOtpResult> {
    return db.transaction(async (transaction) => {
      const [user] = await transaction
        .select({ id: users.id, phone: users.phone, status: users.status })
        .from(users)
        .where(eq(users.id, userId))
        .for("update");

      if (!user || user.status !== "active" || !user.phone) {
        return { ok: false, code: "ACCOUNT_NOT_FOUND" };
      }

      const [latestOtp] = await transaction
        .select()
        .from(otpVerifications)
        .where(
          and(
            eq(otpVerifications.userId, userId),
            eq(otpVerifications.purpose, "DELETE_ACCOUNT"),
            isNull(otpVerifications.verifiedAt),
          ),
        )
        .orderBy(desc(otpVerifications.createdAt))
        .limit(1);

      if (latestOtp) {
        const elapsedSeconds = Math.floor(
          (now.getTime() - latestOtp.createdAt.getTime()) / 1000,
        );
        const remainingSeconds = resendCooldownSeconds - elapsedSeconds;
        if (remainingSeconds > 0) {
          return {
            ok: false,
            code: "OTP_COOLDOWN_ACTIVE",
            remainingSeconds,
          };
        }
      }

      await transaction.insert(otpVerifications).values({
        userId,
        identifier: user.phone,
        purpose: "DELETE_ACCOUNT",
        codeHash: otpHash,
        attempts: 0,
        expiresAt,
        createdAt: now,
      });

      return { ok: true, phone: user.phone };
    });
  }

  async findLatestDeletionOtp(userId: string) {
    const [otp] = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.userId, userId),
          eq(otpVerifications.purpose, "DELETE_ACCOUNT"),
          isNull(otpVerifications.verifiedAt),
        ),
      )
      .orderBy(desc(otpVerifications.createdAt))
      .limit(1);
    return otp;
  }

  async confirmDeletionOtp(
    userId: string,
    otpHash: string,
    now: Date,
    maxAttempts: number,
  ): Promise<DeletionOtpResult> {
    return db.transaction(async (transaction) => {
      const [user] = await transaction
        .select({ id: users.id, status: users.status })
        .from(users)
        .where(eq(users.id, userId))
        .for("update");

      if (!user) return { ok: false, code: "ACCOUNT_NOT_FOUND" };
      if (user.status !== "active") {
        return { ok: false, code: "ACCOUNT_INACTIVE" };
      }

      const [otp] = await transaction
        .select()
        .from(otpVerifications)
        .where(
          and(
            eq(otpVerifications.userId, userId),
            eq(otpVerifications.purpose, "DELETE_ACCOUNT"),
            isNull(otpVerifications.verifiedAt),
          ),
        )
        .orderBy(desc(otpVerifications.createdAt))
        .limit(1)
        .for("update");

      if (!otp) return { ok: false, code: "OTP_NOT_FOUND" };
      if (otp.expiresAt.getTime() <= now.getTime()) {
        return { ok: false, code: "OTP_EXPIRED" };
      }
      if (otp.attempts >= maxAttempts) {
        return { ok: false, code: "OTP_MAX_ATTEMPTS_EXCEEDED" };
      }
      if (otp.codeHash !== otpHash) {
        const [updatedOtp] = await transaction
          .update(otpVerifications)
          .set({ attempts: sql`${otpVerifications.attempts} + 1` })
          .where(eq(otpVerifications.id, otp.id))
          .returning({ attempts: otpVerifications.attempts });
        return {
          ok: false,
          code: "INVALID_OTP",
          remainingAttempts: Math.max(
            0,
            maxAttempts - (updatedOtp?.attempts ?? maxAttempts),
          ),
        };
      }

      await transaction
        .update(otpVerifications)
        .set({ verifiedAt: now })
        .where(eq(otpVerifications.id, otp.id));
      const cleanupJobIds = await deleteUserInTransaction(transaction, userId);
      return { ok: true, cleanupJobIds };
    });
  }

  async deleteExpiredDeactivatedUser(
    userId: string,
    now: Date,
  ): Promise<{ deleted: boolean; cleanupJobIds: string[] }> {
    return db.transaction(async (transaction) => {
      const [user] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.id, userId),
            eq(users.status, "deactivated"),
            isNotNull(users.deletionScheduledAt),
            lte(users.deletionScheduledAt, now),
          ),
        )
        .for("update");
      if (!user) return { deleted: false, cleanupJobIds: [] };
      return {
        deleted: true,
        cleanupJobIds: await deleteUserInTransaction(transaction, user.id),
      };
    });
  }

  async findDueDeactivatedUserIds(now: Date, limit: number): Promise<string[]> {
    const dueUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.status, "deactivated"),
          isNotNull(users.deletionScheduledAt),
          lte(users.deletionScheduledAt, now),
        ),
      )
      .orderBy(users.deletionScheduledAt)
      .limit(limit);
    return dueUsers.map((user) => user.id);
  }

  async findPendingMediaCleanup(limit: number) {
    return db
      .select()
      .from(accountDeletionMedia)
      .orderBy(accountDeletionMedia.createdAt)
      .limit(limit);
  }

  async deleteMediaCleanupJob(jobId: string): Promise<void> {
    await db
      .delete(accountDeletionMedia)
      .where(eq(accountDeletionMedia.id, jobId));
  }

  async recordMediaCleanupFailure(
    jobId: string,
    errorMessage: string,
  ): Promise<void> {
    await db
      .update(accountDeletionMedia)
      .set({
        attempts: sql`${accountDeletionMedia.attempts} + 1`,
        lastError: errorMessage.slice(0, 2000),
        updatedAt: new Date(),
      })
      .where(eq(accountDeletionMedia.id, jobId));
  }

  async countPendingMediaCleanup(jobIds: string[]): Promise<number> {
    if (jobIds.length === 0) return 0;
    const pending = await db
      .select({ id: accountDeletionMedia.id })
      .from(accountDeletionMedia)
      .where(inArray(accountDeletionMedia.id, jobIds));
    return pending.length;
  }
}

export default new AccountRepository();
