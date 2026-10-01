import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  getDeactivationDeadline,
  getPhoneLoginAction,
} from "./services/account-lifecycle.rules";

const fixedNow = new Date("2026-01-31T12:30:00.000Z");

test("deactivation deadline is 30 UTC calendar days later", () => {
  assert.equal(
    getDeactivationDeadline(fixedNow).toISOString(),
    "2026-03-02T12:30:00.000Z",
  );
});

test("phone login decisions respect deadline and account status", () => {
  assert.equal(getPhoneLoginAction("active", null, fixedNow), "login");
  assert.equal(
    getPhoneLoginAction(
      "deactivated",
      new Date("2026-02-01T00:00:00Z"),
      fixedNow,
    ),
    "reactivate",
  );
  assert.equal(
    getPhoneLoginAction("deactivated", fixedNow, fixedNow),
    "replace",
  );
  assert.equal(getPhoneLoginAction("deactivated", null, fixedNow), "replace");
  assert.equal(getPhoneLoginAction("deleted", null, fixedNow), "replace");
  assert.equal(getPhoneLoginAction("suspended", null, fixedNow), "reject");
  assert.equal(getPhoneLoginAction("banned", null, fixedNow), "reject");
});

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

test(
  "account lifecycle database, OTP, cascades, and media cleanup",
  {
    skip: testDatabaseUrl
      ? false
      : "Set TEST_DATABASE_URL to an isolated database with migrations applied",
  },
  async () => {
    const databaseName = testDatabaseUrl
      ? new URL(testDatabaseUrl).pathname.toLowerCase()
      : "";
    assert.match(
      databaseName,
      /test/,
      "TEST_DATABASE_URL must name a test database",
    );

    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.CLOUDINARY_CLOUD_NAME = "";
    process.env.CLOUDINARY_API_KEY = "";
    process.env.CLOUDINARY_API_SECRET = "";
    process.env.NODE_ENV = "test";

    const { db, pool } = await import("./db/index");
    const schema = await import("./db/schema");
    const AccountRepository = (
      await import("./repositories/account.repository")
    ).default;
    const AccountService = (await import("./services/account.service")).default;
    const AuthService = (await import("./services/auth.service")).default;
    const { uploadProfilePhoto } =
      await import("./services/cloudinary.service");
    const ownedPhones: string[] = [];
    const ownedUserIds: string[] = [];
    const ownedStorageKeys: string[] = [];

    const newPhone = () => {
      const phone = `+91${randomInt(1_000_000_000, 9_999_999_999)}`;
      ownedPhones.push(phone);
      return phone;
    };

    const createUser = async (
      phone: string,
      values: Partial<typeof schema.users.$inferInsert> = {},
    ) => {
      const [user] = await db
        .insert(schema.users)
        .values({
          phone,
          phoneVerified: true,
          authProvider: "phone",
          status: "active",
          ...values,
        })
        .returning();
      ownedUserIds.push(user.id);
      return user;
    };

    const createLoginOtp = async (phone: string, code = "1234") => {
      await db.insert(schema.otpVerifications).values({
        identifier: phone,
        purpose: "LOGIN",
        codeHash: AuthService.hashOtp(code),
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
    };

    const addProfile = async (userId: string) => {
      const [profile] = await db
        .insert(schema.profiles)
        .values({ userId, name: "Lifecycle test", gender: "other" })
        .returning();
      return profile;
    };

    const addStoredPhoto = async (userId: string) => {
      const photo = await uploadProfilePhoto(
        Buffer.from("account-lifecycle-test"),
        userId,
        `${randomUUID()}.jpg`,
      );
      ownedStorageKeys.push(photo.public_id);
      await db.insert(schema.profilePhotos).values({
        userId,
        storageKey: photo.public_id,
        url: photo.secure_url,
        mimeType: "image/jpeg",
        fileSizeBytes: 22,
      });
      return photo;
    };

    try {
      const accountPhone = newPhone();
      const account = await createUser(accountPhone);
      await addProfile(account.id);
      await db.insert(schema.userSessions).values({
        userId: account.id,
        refreshTokenHash: randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const deactivation = await AccountService.deactivateAccount(account.id);
      assert.equal(
        deactivation.deletionScheduledAt.toISOString(),
        getDeactivationDeadline(deactivation.deactivatedAt).toISOString(),
      );
      const [deactivated] = await db
        .select()
        .from(schema.users)
        .where((await import("drizzle-orm")).eq(schema.users.id, account.id));
      assert.equal(deactivated.status, "deactivated");
      assert.ok(deactivated.deactivatedAt);
      assert.ok(deactivated.deletionScheduledAt);
      const [revokedSession] = await db
        .select()
        .from(schema.userSessions)
        .where(
          (await import("drizzle-orm")).eq(
            schema.userSessions.userId,
            account.id,
          ),
        );
      assert.ok(revokedSession.revokedAt);

      await createLoginOtp(accountPhone);
      const localPhone = accountPhone.replace(/^\+91/, "");
      const reactivated = await AuthService.verifyOtp({
        phone: localPhone,
        countryCode: "+91",
        otp: "1234",
      });
      assert.equal(reactivated.user.id, account.id);
      assert.equal(reactivated.isNewUser, false);
      const [reactivatedRow] = await db
        .select()
        .from(schema.users)
        .where((await import("drizzle-orm")).eq(schema.users.id, account.id));
      assert.equal(reactivatedRow.status, "active");
      assert.equal(reactivatedRow.deactivatedAt, null);
      assert.equal(reactivatedRow.deletionScheduledAt, null);
      assert.ok(reactivatedRow.lastLoginAt);

      const expiredPhone = newPhone();
      const expiredUser = await createUser(expiredPhone, {
        status: "deactivated",
        deactivatedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        deletionScheduledAt: new Date(Date.now() - 1000),
      });
      await addProfile(expiredUser.id);
      const expiredPhoto = await addStoredPhoto(expiredUser.id);
      await db.insert(schema.userLoginEvents).values({
        userId: expiredUser.id,
        success: true,
      });
      await createLoginOtp(expiredPhone);

      const replacement = await AuthService.verifyOtp({
        phone: expiredPhone.replace(/^\+91/, ""),
        countryCode: "+91",
        otp: "1234",
      });
      assert.equal(replacement.isNewUser, true);
      assert.notEqual(replacement.user.id, expiredUser.id);
      assert.equal(
        (
          await db
            .select()
            .from(schema.profiles)
            .where(
              (await import("drizzle-orm")).eq(
                schema.profiles.userId,
                expiredUser.id,
              ),
            )
        ).length,
        0,
      );
      assert.equal(
        (
          await db
            .select()
            .from(schema.userLoginEvents)
            .where(
              (await import("drizzle-orm")).eq(
                schema.userLoginEvents.userId,
                expiredUser.id,
              ),
            )
        ).length,
        0,
      );
      assert.ok(
        (
          await db
            .select()
            .from(schema.accountDeletionMedia)
            .where(
              (await import("drizzle-orm")).eq(
                schema.accountDeletionMedia.storageKey,
                expiredPhoto.public_id,
              ),
            )
        ).length > 0,
      );

      const scheduledPhone = newPhone();
      const scheduledUser = await createUser(scheduledPhone, {
        status: "deactivated",
        deactivatedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        deletionScheduledAt: new Date(Date.now() - 1000),
      });
      await addProfile(scheduledUser.id);
      const schedulerCleanup = await AccountService.runExpirationCleanup();
      assert.ok(schedulerCleanup.accountsDeleted >= 1);
      assert.equal(
        (
          await db
            .select()
            .from(schema.users)
            .where(
              (await import("drizzle-orm")).eq(
                schema.users.id,
                scheduledUser.id,
              ),
            )
        ).length,
        0,
      );

      const deletionPhone = newPhone();
      const deletionUser = await createUser(deletionPhone);
      const profile = await addProfile(deletionUser.id);
      const media = await addStoredPhoto(deletionUser.id);
      const documentAsset = await uploadProfilePhoto(
        Buffer.from("test-kyc-document"),
        `${deletionUser.id}-kyc`,
        `${randomUUID()}.jpg`,
      );
      const selfieAsset = await uploadProfilePhoto(
        Buffer.from("test-kyc-selfie"),
        `${deletionUser.id}-kyc-selfie`,
        `${randomUUID()}.jpg`,
      );
      ownedStorageKeys.push(documentAsset.public_id, selfieAsset.public_id);
      await db.insert(schema.kycVerifications).values({
        userId: deletionUser.id,
        documentType: "passport",
        documentNumberHash: AuthService.hashOtp(randomUUID()),
        documentImageStorageKey: documentAsset.public_id,
        documentImageUrl: documentAsset.secure_url,
        selfieStorageKey: selfieAsset.public_id,
        providerReference: selfieAsset.secure_url,
        status: "verified",
      });
      await db.insert(schema.userSettings).values({ userId: deletionUser.id });
      await db
        .insert(schema.notificationSettings)
        .values({ userId: deletionUser.id });
      await db.insert(schema.education).values({
        userId: deletionUser.id,
        educationLevel: "other",
      });
      await db
        .insert(schema.datingPreferences)
        .values({ userId: deletionUser.id });
      await db.insert(schema.mediaAssets).values({
        userId: deletionUser.id,
        storageKey: media.public_id,
        mediaType: "image",
        mimeType: "image/jpeg",
        fileSizeBytes: 22,
      });
      const otherUser = await createUser(newPhone());
      const [user1Id, user2Id] = [deletionUser.id, otherUser.id].sort();
      const [match] = await db
        .insert(schema.matches)
        .values({ user1Id, user2Id })
        .returning();
      const [conversation] = await db
        .insert(schema.conversations)
        .values({ matchId: match.id })
        .returning();
      await db.insert(schema.conversationMembers).values([
        { conversationId: conversation.id, userId: deletionUser.id },
        { conversationId: conversation.id, userId: otherUser.id },
      ]);
      const [message] = await db
        .insert(schema.messages)
        .values({
          conversationId: conversation.id,
          senderId: deletionUser.id,
          content: "lifecycle cleanup",
          mediaStorageKey: media.public_id,
        })
        .returning();
      await db.insert(schema.messageReads).values({
        messageId: message.id,
        userId: otherUser.id,
      });
      await db.insert(schema.swipes).values({
        userId: deletionUser.id,
        targetUserId: otherUser.id,
        action: "like",
      });
      await db.insert(schema.swipeEvents).values({
        userId: deletionUser.id,
        targetUserId: otherUser.id,
        action: "like",
      });
      await db.insert(schema.blocks).values({
        userId: deletionUser.id,
        blockedUserId: otherUser.id,
      });
      const [report] = await db
        .insert(schema.reports)
        .values({
          reporterId: deletionUser.id,
          reportedUserId: otherUser.id,
          reason: "spam",
        })
        .returning();
      await db.insert(schema.reportActions).values({
        reportId: report.id,
        moderatorId: deletionUser.id,
        action: "dismiss",
      });
      await db.insert(schema.userSuspensions).values({
        userId: deletionUser.id,
        type: "temporary",
        reason: "test",
        createdBy: otherUser.id,
      });
      await db.insert(schema.adminAuditLogs).values({
        adminId: deletionUser.id,
        action: "test",
        entityType: "user",
      });
      const [notification] = await db
        .insert(schema.notifications)
        .values({
          userId: deletionUser.id,
          type: "system",
          title: "test",
          message: "test",
        })
        .returning();
      const [device] = await db
        .insert(schema.userDevices)
        .values({
          userId: deletionUser.id,
          deviceToken: randomUUID(),
          platform: "web",
        })
        .returning();
      await db.insert(schema.pushNotificationDeliveries).values({
        notificationId: notification.id,
        deviceId: device.id,
        provider: "test",
        status: "sent",
      });
      const [plan] = await db
        .insert(schema.subscriptionPlans)
        .values({
          name: `lifecycle-${randomUUID()}`,
          price: "0",
          duration: "month",
        })
        .returning();
      const [subscription] = await db
        .insert(schema.subscriptions)
        .values({
          userId: deletionUser.id,
          planId: plan.id,
          provider: "test",
          expiresAt: new Date(Date.now() + 60_000),
        })
        .returning();
      await db.insert(schema.payments).values({
        userId: deletionUser.id,
        subscriptionId: subscription.id,
        provider: "test",
        providerPaymentId: randomUUID(),
        amount: "1",
      });

      const deletionOtp = await AccountService.requestDeletionOtp(
        deletionUser.id,
      );
      assert.equal(deletionOtp.purpose, "DELETE_ACCOUNT");
      const [accountStillPresent] = await db
        .select()
        .from(schema.users)
        .where(
          (await import("drizzle-orm")).eq(schema.users.id, deletionUser.id),
        );
      assert.equal(accountStillPresent.id, deletionUser.id);
      const deletionOtpRow = await AccountRepository.findLatestDeletionOtp(
        deletionUser.id,
      );
      assert.ok(deletionOtpRow);
      assert.equal(deletionOtpRow.identifier, deletionPhone);
      assert.notEqual(deletionOtpRow.codeHash, deletionOtp.devOtp);
      await assert.rejects(
        AccountService.requestDeletionOtp(deletionUser.id),
        (error: { code?: string }) => error.code === "OTP_COOLDOWN_ACTIVE",
      );

      const deletionResult = await AccountService.confirmAccountDeletion(
        deletionUser.id,
        deletionOtp.devOtp ?? "0000",
      );
      assert.equal(deletionResult.deleted, true);
      assert.equal(deletionResult.mediaCleanupPending, true);
      assert.equal(
        (
          await db
            .select()
            .from(schema.users)
            .where(
              (await import("drizzle-orm")).eq(
                schema.users.id,
                deletionUser.id,
              ),
            )
        ).length,
        0,
      );
      assert.equal(
        (
          await db
            .select()
            .from(schema.profiles)
            .where(
              (await import("drizzle-orm")).eq(schema.profiles.id, profile.id),
            )
        ).length,
        0,
      );
      for (const [table, column] of [
        [schema.kycVerifications, schema.kycVerifications.userId],
        [schema.profilePhotos, schema.profilePhotos.userId],
        [schema.mediaAssets, schema.mediaAssets.userId],
        [schema.userSessions, schema.userSessions.userId],
        [schema.userSettings, schema.userSettings.userId],
        [schema.notificationSettings, schema.notificationSettings.userId],
        [schema.education, schema.education.userId],
        [schema.datingPreferences, schema.datingPreferences.userId],
        [schema.userDevices, schema.userDevices.userId],
        [schema.swipes, schema.swipes.userId],
        [schema.swipeEvents, schema.swipeEvents.userId],
        [schema.blocks, schema.blocks.userId],
        [schema.reports, schema.reports.reporterId],
        [schema.reportActions, schema.reportActions.moderatorId],
        [schema.userSuspensions, schema.userSuspensions.userId],
        [schema.adminAuditLogs, schema.adminAuditLogs.adminId],
        [schema.notifications, schema.notifications.userId],
        [
          schema.pushNotificationDeliveries,
          schema.pushNotificationDeliveries.deviceId,
        ],
        [schema.featureUsage, schema.featureUsage.userId],
      ] as const) {
        assert.equal(
          (
            await db
              .select()
              .from(table)
              .where((await import("drizzle-orm")).eq(column, deletionUser.id))
          ).length,
          0,
        );
      }
      assert.equal(
        (
          await db
            .select()
            .from(schema.otpVerifications)
            .where(
              (await import("drizzle-orm")).eq(
                schema.otpVerifications.identifier,
                deletionPhone,
              ),
            )
        ).length,
        0,
      );
      assert.equal(
        (
          await db
            .select()
            .from(schema.matches)
            .where(
              (await import("drizzle-orm")).eq(schema.matches.id, match.id),
            )
        ).length,
        0,
      );
      assert.equal(
        (
          await db
            .select()
            .from(schema.conversations)
            .where(
              (await import("drizzle-orm")).eq(
                schema.conversations.id,
                conversation.id,
              ),
            )
        ).length,
        0,
      );
      assert.equal(
        (
          await db
            .select()
            .from(schema.messages)
            .where(
              (await import("drizzle-orm")).eq(schema.messages.id, message.id),
            )
        ).length,
        0,
      );
      assert.equal(
        (
          await db
            .select()
            .from(schema.subscriptions)
            .where(
              (await import("drizzle-orm")).eq(
                schema.subscriptions.userId,
                deletionUser.id,
              ),
            )
        ).length,
        0,
      );
      assert.equal(
        (
          await db
            .select()
            .from(schema.payments)
            .where(
              (await import("drizzle-orm")).eq(
                schema.payments.userId,
                deletionUser.id,
              ),
            )
        ).length,
        0,
      );

      const beforeMediaCleanup = path.join(
        process.cwd(),
        media.secure_url.replace(/^\//, ""),
      );
      assert.ok(existsSync(beforeMediaCleanup));

      const failedOtpPhone = newPhone();
      const failedOtpUser = await createUser(failedOtpPhone);
      await db.insert(schema.otpVerifications).values({
        userId: failedOtpUser.id,
        identifier: failedOtpPhone,
        purpose: "DELETE_ACCOUNT",
        codeHash: AuthService.hashOtp("9876"),
        attempts: 0,
        expiresAt: new Date(Date.now() + 60_000),
      });
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await assert.rejects(
          AccountService.confirmAccountDeletion(failedOtpUser.id, "0000"),
          (error: { code?: string }) => error.code === "INVALID_OTP",
        );
      }
      await assert.rejects(
        AccountService.confirmAccountDeletion(failedOtpUser.id, "0000"),
        (error: { code?: string }) =>
          error.code === "OTP_MAX_ATTEMPTS_EXCEEDED",
      );
      const [stillActive] = await db
        .select()
        .from(schema.users)
        .where(
          (await import("drizzle-orm")).eq(schema.users.id, failedOtpUser.id),
        );
      assert.equal(stillActive.status, "active");

      const expiredOtpPhone = newPhone();
      const expiredOtpUser = await createUser(expiredOtpPhone);
      await db.insert(schema.otpVerifications).values({
        userId: expiredOtpUser.id,
        identifier: expiredOtpPhone,
        purpose: "DELETE_ACCOUNT",
        codeHash: AuthService.hashOtp("5678"),
        attempts: 0,
        expiresAt: new Date(Date.now() - 1000),
      });
      await assert.rejects(
        AccountService.confirmAccountDeletion(expiredOtpUser.id, "5678"),
        (error: { code?: string }) => error.code === "OTP_EXPIRED",
      );

      const cloudinaryJob = await db
        .insert(schema.accountDeletionMedia)
        .values({
          provider: "cloudinary",
          resourceType: "video",
          storageKey: `test-lifecycle-${randomUUID()}`,
        })
        .returning()
        .then(([job]) => job);
      const cleanup = await AccountService.runExpirationCleanup();
      assert.ok(cleanup.mediaDeleted >= 1);
      assert.ok(cleanup.mediaFailures >= 1);
      const [retryableJob] = await db
        .select()
        .from(schema.accountDeletionMedia)
        .where(
          (await import("drizzle-orm")).eq(
            schema.accountDeletionMedia.id,
            cloudinaryJob.id,
          ),
        );
      assert.equal(retryableJob.attempts, 1);
      assert.equal(retryableJob.resourceType, "video");
      assert.ok(retryableJob.lastError);
      assert.equal(existsSync(beforeMediaCleanup), false);

      await createLoginOtp(deletionPhone);
      const freshRegistration = await AuthService.verifyOtp({
        phone: deletionPhone.replace(/^\+91/, ""),
        countryCode: "+91",
        otp: "1234",
      });
      ownedUserIds.push(freshRegistration.user.id);
      assert.equal(freshRegistration.isNewUser, true);
      assert.notEqual(freshRegistration.user.id, deletionUser.id);
      assert.equal(
        (
          await db
            .select()
            .from(schema.profiles)
            .where(
              (await import("drizzle-orm")).eq(
                schema.profiles.userId,
                freshRegistration.user.id,
              ),
            )
        ).length,
        0,
      );
    } finally {
      const { inArray, like } = await import("drizzle-orm");
      if (ownedUserIds.length > 0) {
        await db
          .delete(schema.users)
          .where(inArray(schema.users.id, ownedUserIds));
      }
      if (ownedPhones.length > 0) {
        await db
          .delete(schema.otpVerifications)
          .where(inArray(schema.otpVerifications.identifier, ownedPhones));
      }
      if (ownedStorageKeys.length > 0) {
        await db
          .delete(schema.accountDeletionMedia)
          .where(
            inArray(schema.accountDeletionMedia.storageKey, ownedStorageKeys),
          );
      }
      await db
        .delete(schema.accountDeletionMedia)
        .where(
          like(schema.accountDeletionMedia.storageKey, "test-lifecycle-%"),
        );
      await pool.end();
    }
  },
);
