import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { otpVerifications, users } from "../db/schema";
import AuthRepository from "../repositories/auth.repository";
import { cloudinaryConfigured } from "../config/cloudinary";
import { deleteCloudinaryUserAssets } from "./cloudinary.service";
import { OTP_CONFIG, OTP_PURPOSES } from "../config/constants";
import { generateOTP, sendSmsOTP } from "../utils/otp";
import type { AppError } from "../types/index";

const ACCOUNT_DEACTIVATION_DAYS = 30;

const addCalendarDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

class UserService {
  static hashOtp(otp: string): string {
    return createHash("sha256").update(otp).digest("hex");
  }

  static async requestAccountDeletionOtp(userId: string) {
    const user = await AuthRepository.findUserById(userId);
    if (!user || !user.phone) {
      const error = new Error(
        "A verified phone number is required",
      ) as AppError;
      error.statusCode = 400;
      error.code = "PHONE_NUMBER_REQUIRED";
      throw error;
    }

    const now = new Date();
    const latestOtp = await AuthRepository.findLatestActiveOtpForUser(
      userId,
      OTP_PURPOSES.DELETE_ACCOUNT,
    );
    if (latestOtp) {
      const cooldownEndsAt =
        new Date(latestOtp.createdAt).getTime() +
        OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000;
      if (cooldownEndsAt > now.getTime()) {
        const error = new Error(
          "Please wait before requesting another OTP",
        ) as AppError;
        error.statusCode = 429;
        error.code = "OTP_COOLDOWN_ACTIVE";
        throw error;
      }
    }

    const otp = generateOTP(OTP_CONFIG.LENGTH);
    await AuthRepository.createOtp({
      userId,
      identifier: user.phone,
      purpose: OTP_PURPOSES.DELETE_ACCOUNT,
      codeHash: UserService.hashOtp(otp),
      attempts: 0,
      expiresAt: new Date(
        now.getTime() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000,
      ),
    });

    await sendSmsOTP({ phone: user.phone, countryCode: "", otp });

    return {
      expiresIn: OTP_CONFIG.EXPIRY_MINUTES * 60,
      resendCooldown: OTP_CONFIG.RESEND_COOLDOWN_SECONDS,
      ...(process.env.NODE_ENV !== "production" ? { devOtp: otp } : {}),
    };
  }

  static async confirmAccountDeletion(
    userId: string,
    otp: string,
  ): Promise<void> {
    const otpRecord = await AuthRepository.findLatestActiveOtpForUser(
      userId,
      OTP_PURPOSES.DELETE_ACCOUNT,
    );
    const now = new Date();

    if (!otpRecord) {
      const error = new Error(
        "No active account deletion OTP found",
      ) as AppError;
      error.statusCode = 400;
      error.code = "DELETE_OTP_NOT_FOUND";
      throw error;
    }
    if (new Date(otpRecord.expiresAt).getTime() <= now.getTime()) {
      const error = new Error("Account deletion OTP has expired") as AppError;
      error.statusCode = 400;
      error.code = "DELETE_OTP_EXPIRED";
      throw error;
    }
    if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      const error = new Error("Maximum OTP attempts exceeded") as AppError;
      error.statusCode = 400;
      error.code = "DELETE_OTP_MAX_ATTEMPTS_EXCEEDED";
      throw error;
    }
    if (otpRecord.codeHash !== UserService.hashOtp(otp)) {
      const updatedOtp = await AuthRepository.incrementOtpAttempts(
        otpRecord.id,
        OTP_CONFIG.MAX_ATTEMPTS,
        now,
      );
      const error = new Error("Invalid account deletion OTP") as AppError;
      error.statusCode = 400;
      error.code = "INVALID_DELETE_OTP";
      error.remainingAttempts = Math.max(
        0,
        OTP_CONFIG.MAX_ATTEMPTS -
          (updatedOtp?.attempts ?? OTP_CONFIG.MAX_ATTEMPTS),
      );
      throw error;
    }

    await AuthRepository.markOtpVerified(otpRecord.id, now);
    await UserService.permanentlyDeleteAccount(userId);
  }

  static async getProfile(userId: string) {
    const [user] = await db
      .select({
        id: users.id,
        phone: users.phone,
        email: users.email,
        role: users.role,
        status: users.status,
        emailVerified: users.emailVerified,
        phoneVerified: users.phoneVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    return user;
  }

  static async deactivateAccount(userId: string) {
    const now = new Date();
    const scheduledDeletionAt = addCalendarDays(now, ACCOUNT_DEACTIVATION_DAYS);

    const [user] = await db
      .update(users)
      .set({
        status: "deactivated",
        deactivatedAt: now,
        scheduledDeletionAt,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        scheduledDeletionAt: users.scheduledDeletionAt,
      });

    if (user) {
      await AuthRepository.revokeAllSessions(userId);
    }

    return user;
  }

  static async reactivateAccount(userId: string) {
    const now = new Date();
    const [user] = await db
      .update(users)
      .set({
        status: "active",
        deactivatedAt: null,
        scheduledDeletionAt: null,
        lastLoginAt: now,
        lastActiveAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
      .returning();

    return user;
  }

  static async permanentlyDeleteAccount(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));

    if (cloudinaryConfigured) {
      await deleteCloudinaryUserAssets(userId);
    }
  }

  static async purgeExpiredDeactivatedAccounts(): Promise<number> {
    const deactivatedUsers = await db
      .select({ id: users.id, scheduledDeletionAt: users.scheduledDeletionAt })
      .from(users)
      .where(eq(users.status, "deactivated"));

    let purgedCount = 0;
    for (const user of deactivatedUsers) {
      if (
        user.scheduledDeletionAt &&
        new Date(user.scheduledDeletionAt).getTime() <= Date.now()
      ) {
        await UserService.permanentlyDeleteAccount(user.id);
        purgedCount += 1;
      }
    }

    return purgedCount;
  }
}

export default UserService;
