import { OTP_CONFIG, OTP_PURPOSES } from "../config/constants";
import AccountRepository from "../repositories/account.repository";
import AuthService from "./auth.service";
import {
  deleteStoredMedia,
  type StoredMediaProvider,
} from "./cloudinary.service";
import { generateOTP, sendSmsOTP } from "../utils/otp";
import type { AppError } from "../types/index";
import { getDeactivationDeadline } from "./account-lifecycle.rules";

const createError = (
  message: string,
  statusCode: number,
  code: string,
  extra?: Record<string, unknown>,
): AppError =>
  Object.assign(new Error(message), { statusCode, code, ...extra });

const splitPhoneForSms = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  const countryDigits =
    digits.length > 10 ? digits.slice(0, digits.length - 10) : "91";
  return {
    countryCode: `+${countryDigits}`,
    phone: digits.slice(-10),
  };
};

class AccountService {
  async deactivateAccount(userId: string) {
    const now = new Date();
    const deletionScheduledAt = getDeactivationDeadline(now, 30);
    const user = await AccountRepository.deactivateUser(
      userId,
      now,
      deletionScheduledAt,
    );

    if (!user) {
      const existingUser = await AccountRepository.findUserById(userId);
      if (!existingUser) {
        throw createError("Account not found", 404, "ACCOUNT_NOT_FOUND");
      }
      throw createError(
        "Only an active account can be deactivated",
        409,
        "ACCOUNT_NOT_ACTIVE",
      );
    }

    return { deactivatedAt: now, deletionScheduledAt };
  }

  async requestDeletionOtp(userId: string) {
    const now = new Date();
    const otp = generateOTP(OTP_CONFIG.LENGTH);
    const result = await AccountRepository.requestDeletionOtp(
      userId,
      AuthService.hashOtp(otp),
      new Date(now.getTime() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000),
      now,
      OTP_CONFIG.RESEND_COOLDOWN_SECONDS,
    );

    if (!result.ok && result.code === "OTP_COOLDOWN_ACTIVE") {
      throw createError(
        "Please wait before requesting another account deletion code",
        429,
        result.code,
        { remainingSeconds: result.remainingSeconds },
      );
    }
    if (!result.ok) {
      throw createError(
        "An active account phone number is required for deletion",
        404,
        result.code,
      );
    }

    const smsParts = splitPhoneForSms(result.phone);
    await sendSmsOTP({ ...smsParts, otp });

    return {
      purpose: OTP_PURPOSES.DELETE_ACCOUNT,
      expiresIn: OTP_CONFIG.EXPIRY_MINUTES * 60,
      resendCooldown: OTP_CONFIG.RESEND_COOLDOWN_SECONDS,
      ...(process.env.NODE_ENV !== "production" ? { devOtp: otp } : {}),
    };
  }

  async confirmAccountDeletion(userId: string, otp: string) {
    const result = await AccountRepository.confirmDeletionOtp(
      userId,
      AuthService.hashOtp(otp),
      new Date(),
      OTP_CONFIG.MAX_ATTEMPTS,
    );

    if (!result.ok) {
      const statusCode =
        result.code === "ACCOUNT_NOT_FOUND"
          ? 404
          : result.code === "ACCOUNT_INACTIVE"
            ? 403
            : result.code === "OTP_MAX_ATTEMPTS_EXCEEDED"
              ? 429
              : 400;
      throw createError(
        result.code === "INVALID_OTP"
          ? `Invalid deletion code. ${result.remainingAttempts} attempt(s) remaining.`
          : "The account deletion code is invalid or expired",
        statusCode,
        result.code,
        result.remainingAttempts === undefined
          ? undefined
          : { remainingAttempts: result.remainingAttempts },
      );
    }

    const pendingMediaCount = await AccountRepository.countPendingMediaCleanup(
      result.cleanupJobIds,
    );
    return {
      deleted: true,
      mediaCleanupPending: pendingMediaCount > 0,
      pendingMediaCount,
    };
  }

  async runExpirationCleanup(): Promise<{
    accountsDeleted: number;
    mediaDeleted: number;
    mediaFailures: number;
  }> {
    const now = new Date();
    const dueUserIds = await AccountRepository.findDueDeactivatedUserIds(
      now,
      100,
    );
    let accountsDeleted = 0;

    for (const userId of dueUserIds) {
      const result = await AccountRepository.deleteExpiredDeactivatedUser(
        userId,
        now,
      );
      if (result.deleted) accountsDeleted += 1;
    }

    const pendingJobs = await AccountRepository.findPendingMediaCleanup(100);
    let mediaDeleted = 0;
    let mediaFailures = 0;
    for (const job of pendingJobs) {
      try {
        await deleteStoredMedia({
          provider: job.provider as StoredMediaProvider,
          resourceType: job.resourceType as "image" | "video" | "raw",
          storageKey: job.storageKey,
          storageUrl: job.storageUrl,
        });
        await AccountRepository.deleteMediaCleanupJob(job.id);
        mediaDeleted += 1;
      } catch (error) {
        mediaFailures += 1;
        const message =
          error instanceof Error ? error.message : "Unknown storage error";
        await AccountRepository.recordMediaCleanupFailure(job.id, message);
        console.error("Account media cleanup failed; retry queued", {
          cleanupJobId: job.id,
          error: message,
        });
      }
    }

    return { accountsDeleted, mediaDeleted, mediaFailures };
  }
}

export default new AccountService();
