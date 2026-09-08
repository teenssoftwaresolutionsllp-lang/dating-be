import { eq, and, desc, isNull, lt, sql } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { db } from "../db/index";
// import { users } from "../db/schema/users";
// import { otpVerifications } from "../db/schema/otp-verifications";
// import { userSessions } from "../db/schema/user-sessions";
// import { socialAccounts } from "../db/schema/social-accounts";

import {
  SUPPORTED_LANGUAGES,
  OTP_CONFIG,
  OTP_PURPOSES,
} from "../config/constants";
import { generateOTP, sendSmsOTP } from "../utils/otp";
import { users } from "../db/schema/users.schema";
import { userSessions } from "../db/schema/sessions.schema";
import { generateTokens, verifyRefreshToken } from "../utils/jwt";
import { otpVerifications } from "../db/schema/otp-verifications.schema";

import type {
  AppError,
  AuthResult,
  LogoutParams,
  RefreshTokenParams,
  SendOtpParams,
  SendOtpResult,
  SetLanguageParams,
  SocialAuthParams,
  SupportedLanguage,
  TokensResponse,
  VerifyOtpParams,
  SafeUser,
  User,
} from "../types/index";

export class AuthService {
  static hashOtp(otp: string): string {
    return createHash("sha256").update(otp).digest("hex");
  }

  static hashRefreshToken(refreshToken: string): string {
    return createHash("sha256").update(refreshToken).digest("hex");
  }

  /**
   * Screen 1: Get supported display languages
   */
  static getSupportedLanguages(): SupportedLanguage[] {
    return SUPPORTED_LANGUAGES;
  }

  /**
   * Screen 2: Send 4-digit Mobile OTP
   */
  static async sendOtp({
    phone,
    countryCode = "+91",
  }: SendOtpParams): Promise<SendOtpResult> {
    const now = new Date();

    // Check for existing active OTP with cooldown (30s)
    const condition = and(
      eq(otpVerifications.phone, phone),
      eq(otpVerifications.countryCode, countryCode),
      eq(otpVerifications.purpose, OTP_PURPOSES.LOGIN),
      eq(otpVerifications.isVerified, false),
    );

    const [latestOtpRecord] = await db
      .select()
      .from(otpVerifications)
      .where(condition)
      .orderBy(desc(otpVerifications.createdAt))
      .limit(1);

    if (latestOtpRecord && latestOtpRecord.resendCooldownUntil) {
      const cooldownTime = new Date(
        latestOtpRecord.resendCooldownUntil,
      ).getTime();
      const currentTime = now.getTime();
      if (cooldownTime > currentTime) {
        const remainingSeconds = Math.ceil((cooldownTime - currentTime) / 1000);
        const error = new Error(
          `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
        ) as AppError;
        error.statusCode = 429;
        error.code = "OTP_COOLDOWN_ACTIVE";
        error.remainingSeconds = remainingSeconds;
        throw error;
      }
    }

    // Generate 4-digit OTP
    const otpCode = generateOTP(OTP_CONFIG.LENGTH);

    const expiresAt = new Date(
      now.getTime() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000,
    );
    const resendCooldownUntil = new Date(
      now.getTime() + OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000,
    );

    // Save OTP to database
    await db.insert(otpVerifications).values({
      phone,
      countryCode,
      otp: AuthService.hashOtp(otpCode),
      purpose: OTP_PURPOSES.LOGIN,
      attempts: 0,
      maxAttempts: OTP_CONFIG.MAX_ATTEMPTS,
      isVerified: false,
      expiresAt,
      resendCooldownUntil,
    });

    // Send SMS simulation/gateway
    await sendSmsOTP({ phone, countryCode, otp: otpCode });

    const responseData: SendOtpResult = {
      phone,
      countryCode,
      purpose: OTP_PURPOSES.LOGIN,
      expiresIn: OTP_CONFIG.EXPIRY_MINUTES * 60,
      resendCooldown: OTP_CONFIG.RESEND_COOLDOWN_SECONDS,
    };

    // Return devOtp in non-production for testing convenience
    if (process.env.NODE_ENV !== "production") {
      responseData.devOtp = otpCode;
    }

    return responseData;
  }

  /**
   * Screen 3: Verify 4-digit OTP & Auto-login / Auto-register User
   */
  static async verifyOtp({
    phone,
    countryCode = "+91",
    otp,
    preferredLanguage = "en",
    userAgent = null,
    ipAddress = null,
  }: VerifyOtpParams): Promise<AuthResult> {
    const now = new Date();

    const condition = and(
      eq(otpVerifications.phone, phone),
      eq(otpVerifications.countryCode, countryCode),
      eq(otpVerifications.purpose, OTP_PURPOSES.LOGIN),
      eq(otpVerifications.isVerified, false),
    );

    const [otpRecord] = await db
      .select()
      .from(otpVerifications)
      .where(condition)
      .orderBy(desc(otpVerifications.createdAt))
      .limit(1);

    if (!otpRecord) {
      const error = new Error(
        "No active OTP found. Please request a new OTP.",
      ) as AppError;
      error.statusCode = 400;
      error.code = "OTP_NOT_FOUND";
      throw error;
    }

    if (new Date(otpRecord.expiresAt).getTime() < now.getTime()) {
      const error = new Error(
        "OTP has expired. Please request a new one.",
      ) as AppError;
      error.statusCode = 400;
      error.code = "OTP_EXPIRED";
      throw error;
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      const error = new Error(
        "Maximum OTP attempts exceeded. Please request a new OTP.",
      ) as AppError;
      error.statusCode = 400;
      error.code = "OTP_MAX_ATTEMPTS_EXCEEDED";
      throw error;
    }

    if (otpRecord.otp !== AuthService.hashOtp(otp)) {
      // Increment attempt counter
      const [updatedOtp] = await db
        .update(otpVerifications)
        .set({
          attempts: sql`${otpVerifications.attempts} + 1`,
          updatedAt: now,
        })
        .where(
          and(
            eq(otpVerifications.id, otpRecord.id),
            lt(otpVerifications.attempts, otpVerifications.maxAttempts),
          ),
        )
        .returning({ attempts: otpVerifications.attempts });

      const attemptsUsed = updatedOtp?.attempts ?? otpRecord.maxAttempts;
      const remainingAttempts = otpRecord.maxAttempts - attemptsUsed;
      const error = new Error(
        `Invalid OTP code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : "Please request a new OTP."}`,
      ) as AppError;
      error.statusCode = 400;
      error.code = "INVALID_OTP";
      error.remainingAttempts = Math.max(0, remainingAttempts);
      throw error;
    }

    // Mark OTP as verified
    await db
      .update(otpVerifications)
      .set({
        isVerified: true,
        updatedAt: now,
      })
      .where(eq(otpVerifications.id, otpRecord.id));

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone));

    let user: User;
    let isNewUser = false;

    if (!existingUser) {
      // Auto-register new user
      isNewUser = true;
      const [createdUser] = await db
        .insert(users)
        .values({
          email: null,
          phone,
          phoneVerified: true,
        })
        .returning();

      user = createdUser;
    } else {
      // Update existing user verification and display language
      const updates = {
        phoneVerified: true,
        updatedAt: now,
      };

      const [updatedUser] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, existingUser.id))
        .returning();

      user = updatedUser;
    }

    // Generate JWT access and refresh tokens
    const sessionId = randomUUID();
    const tokens = generateTokens(user, sessionId);

    // Create session in user_sessions
    const sessionExpiry = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000, // 7 days
    );

    await db.insert(userSessions).values({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: AuthService.hashRefreshToken(tokens.refreshToken),
      deviceInfo: userAgent,
      ipAddress,
      expiresAt: sessionExpiry,
    });

    return {
      isNewUser,
      user: {
        id: user.id as unknown as number,
        phone: user.phone,
        countryCode,
        preferredLanguage: preferredLanguage || "en",
        role: user.role,
        isVerified: user.phoneVerified,
        profileCompleted: false,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  /**
   * Screen 2: Social Login (Google, Facebook, Instagram)
   */
  static async socialAuth({
    provider,
    providerUserId,
    providerEmail,
    preferredLanguage = "en",
    userAgent = null,
    ipAddress = null,
  }: SocialAuthParams): Promise<AuthResult> {
    const [existingSocial] = await db
      .select()
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.provider, provider),
          eq(socialAccounts.providerUserId, providerUserId),
        ),
      );

    let user: User | undefined;
    let isNewUser = false;

    if (existingSocial) {
      const [matchedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, existingSocial.userId));
      user = matchedUser;
    }

    if (!user) {
      isNewUser = true;
      const [newUser] = await db
        .insert(users)
        .values({
          email: providerEmail,
          preferredLanguage: preferredLanguage || "en",
          role: "user",
          isVerified: true,
          isActive: true,
          profileCompleted: false,
        })
        .returning();

      user = newUser;

      await db.insert(socialAccounts).values({
        userId: user.id,
        provider,
        providerUserId,
        providerEmail,
      });
    }

    const tokens = generateTokens(user);

    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(userSessions).values({
      userId: user.id,
      refreshToken: tokens.refreshToken,
      userAgent,
      ipAddress,
      isRevoked: false,
      expiresAt: sessionExpiry,
    });

    return {
      isNewUser,
      provider,
      user: {
        id: user.id,
        phone: user.phone,
        countryCode: user.countryCode,
        preferredLanguage: user.preferredLanguage,
        role: user.role,
        isVerified: user.isVerified,
        profileCompleted: user.profileCompleted,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  /**
   * Update Display Language for user
   */
  static async setUserLanguage({
    userId,
    language,
  }: SetLanguageParams): Promise<{ id: number; preferredLanguage: string }> {
    const [updatedUser] = await db
      .update(users)
      .set({
        preferredLanguage: language,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      const error = new Error("User not found") as AppError;
      error.statusCode = 404;
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    return {
      id: updatedUser.id,
      preferredLanguage: updatedUser.preferredLanguage,
    };
  }

  /**
   * Get Current Authenticated User Details
   */
  static async getCurrentUser(userId: number): Promise<SafeUser> {
    const [user] = await db
      .select({
        id: users.id,
        phone: users.phone,
        countryCode: users.countryCode,
        preferredLanguage: users.preferredLanguage,
        role: users.role,
        isVerified: users.isVerified,
        isActive: users.isActive,
        profileCompleted: users.profileCompleted,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      const error = new Error("User not found") as AppError;
      error.statusCode = 404;
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    return user;
  }

  /**
   * Refresh Token
   */
  static async refreshToken({
    refreshToken,
    userAgent = null,
    ipAddress = null,
  }: RefreshTokenParams): Promise<TokensResponse> {
    let decoded: ReturnType<typeof verifyRefreshToken>;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      const error = new Error("Invalid or expired refresh token") as AppError;
      error.statusCode = 401;
      error.code = "INVALID_REFRESH_TOKEN";
      throw error;
    }

    const [session] = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(
            userSessions.refreshTokenHash,
            AuthService.hashRefreshToken(refreshToken),
          ),
          isNull(userSessions.revoked_at),
        ),
      );

    if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
      const error = new Error(
        "Session expired or revoked. Please login again.",
      ) as AppError;
      error.statusCode = 401;
      error.code = "SESSION_EXPIRED";
      throw error;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.id));

    if (!user || user.status !== "active") {
      const error = new Error(
        "User account not found or suspended",
      ) as AppError;
      error.statusCode = 401;
      error.code = "UNAUTHORIZED";
      throw error;
    }

    const tokens = generateTokens(user);

    await db
      .update(userSessions)
      .set({
        refreshTokenHash: AuthService.hashRefreshToken(tokens.refreshToken),
        deviceInfo: userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .where(eq(userSessions.id, session.id));

    return tokens;
  }

  /**
   * Logout User
   */
  static async logout({
    refreshToken,
    userId: _userId,
  }: LogoutParams): Promise<{ success: boolean; message: string }> {
    if (refreshToken) {
      await db
        .update(userSessions)
        .set({ revoked_at: new Date() })
        .where(
          eq(
            userSessions.refreshTokenHash,
            AuthService.hashRefreshToken(refreshToken),
          ),
        );
    }

    return {
      success: true,
      message: "Logged out successfully",
    };
  }

  /**
   * Revoke every active session for a user.
   */
  static async logoutAllSessions(userId: string): Promise<void> {
    await db
      .update(userSessions)
      .set({ revoked_at: new Date() })
      .where(
        and(eq(userSessions.userId, userId), isNull(userSessions.revoked_at)),
      );
  }
}

export default AuthService;
