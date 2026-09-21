import { eq, and, desc, isNull } from "drizzle-orm";
import crypto from "crypto";
import { db } from "../db/index";
import { users, otpVerifications, userSessions } from "../db/schema";
import {
  SUPPORTED_LANGUAGES,
  OTP_CONFIG,
  OTP_PURPOSES,
} from "../config/constants";
import { generateOTP, sendSmsOTP } from "../utils/otp";
import { generateTokens, verifyRefreshToken } from "../utils/jwt";
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

// Helper to hash refresh tokens and OTPs for secure storage
const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

export class AuthService {
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
    const fullPhone = `${countryCode}${phone.replace(/^\+?[0-9]{1,3}/, "")}`;
    const now = new Date();

    // Check for existing active OTP
    const [latestOtpRecord] = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.identifier, fullPhone),
          eq(otpVerifications.purpose, OTP_PURPOSES.LOGIN),
          isNull(otpVerifications.verifiedAt)
        )
      )
      .orderBy(desc(otpVerifications.createdAt))
      .limit(1);

    if (latestOtpRecord) {
      const expiryTime = new Date(latestOtpRecord.expiresAt).getTime();
      const currentTime = now.getTime();
      // Enforce 30s cooldown if OTP was created within 30 seconds
      const createdAtTime = new Date(latestOtpRecord.createdAt).getTime();
      if (currentTime - createdAtTime < OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000) {
        const remainingSeconds = Math.ceil(
          (OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000 - (currentTime - createdAtTime)) / 1000
        );
        const error = new Error(
          `Please wait ${remainingSeconds} seconds before requesting a new OTP.`
        ) as AppError;
        error.statusCode = 429;
        error.code = "OTP_COOLDOWN_ACTIVE";
        error.remainingSeconds = remainingSeconds;
        throw error;
      }
    }

    // Generate 4-digit OTP
    const otpCode = generateOTP(OTP_CONFIG.LENGTH);
    const codeHash = hashToken(otpCode);
    const expiresAt = new Date(
      now.getTime() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000
    );

    // Save OTP to database
    await db.insert(otpVerifications).values({
      identifier: fullPhone,
      purpose: OTP_PURPOSES.LOGIN,
      codeHash,
      attempts: 0,
      expiresAt,
    });

    // Send SMS simulation/gateway
    await sendSmsOTP({ phone: fullPhone, countryCode, otp: otpCode });

    const responseData: SendOtpResult = {
      phone: fullPhone,
      countryCode,
      purpose: OTP_PURPOSES.LOGIN,
      expiresIn: OTP_CONFIG.EXPIRY_MINUTES * 60,
      resendCooldown: OTP_CONFIG.RESEND_COOLDOWN_SECONDS,
    };

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
    const fullPhone = `${countryCode}${phone.replace(/^\+?[0-9]{1,3}/, "")}`;
    const now = new Date();

    const [otpRecord] = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.identifier, fullPhone),
          eq(otpVerifications.purpose, OTP_PURPOSES.LOGIN),
          isNull(otpVerifications.verifiedAt)
        )
      )
      .orderBy(desc(otpVerifications.createdAt))
      .limit(1);

    if (!otpRecord) {
      const error = new Error(
        "No active OTP found. Please request a new OTP."
      ) as AppError;
      error.statusCode = 400;
      error.code = "OTP_NOT_FOUND";
      throw error;
    }

    if (new Date(otpRecord.expiresAt).getTime() < now.getTime()) {
      const error = new Error("OTP has expired. Please request a new one.") as AppError;
      error.statusCode = 400;
      error.code = "OTP_EXPIRED";
      throw error;
    }

    if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      const error = new Error(
        "Maximum OTP attempts exceeded. Please request a new OTP."
      ) as AppError;
      error.statusCode = 400;
      error.code = "OTP_MAX_ATTEMPTS_EXCEEDED";
      throw error;
    }

    const providedHash = hashToken(otp);
    if (otpRecord.codeHash !== providedHash) {
      await db
        .update(otpVerifications)
        .set({
          attempts: otpRecord.attempts + 1,
        })
        .where(eq(otpVerifications.id, otpRecord.id));

      const remainingAttempts = OTP_CONFIG.MAX_ATTEMPTS - (otpRecord.attempts + 1);
      const error = new Error(
        `Invalid OTP code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : "Please request a new OTP."}`
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
        verifiedAt: now,
      })
      .where(eq(otpVerifications.id, otpRecord.id));

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.phone, fullPhone));

    let user: User;
    let isNewUser = false;

    if (!existingUser) {
      isNewUser = true;
      const [createdUser] = await db
        .insert(users)
        .values({
          email: `${fullPhone.replace(/[^0-9]/g, "")}@phone.auth`,
          phone: fullPhone,
          authProvider: "phone_otp",
          role: "user",
          status: "active",
          emailVerified: false,
          phoneVerified: true,
          lastLoginAt: now,
          lastActiveAt: now,
        })
        .returning();

      user = createdUser;
    } else {
      const [updatedUser] = await db
        .update(users)
        .set({
          phoneVerified: true,
          lastLoginAt: now,
          lastActiveAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, existingUser.id))
        .returning();

      user = updatedUser;
    }

    const safeUser: SafeUser = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      authProvider: user.authProvider,
      lastLoginAt: user.lastLoginAt,
      lastActiveAt: user.lastActiveAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Generate JWT access and refresh tokens
    const tokens = generateTokens(safeUser);
    const refreshTokenHash = hashToken(tokens.refreshToken);
    const sessionExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(userSessions).values({
      userId: user.id,
      refreshTokenHash,
      userAgent,
      ipAddress,
      expiresAt: sessionExpiry,
    });

    return {
      isNewUser,
      user: safeUser,
      tokens,
    };
  }

  /**
   * Screen 2: Social Login (Google, Apple)
   */
  static async socialAuth({
    provider,
    providerUserId,
    providerEmail,
    userAgent = null,
    ipAddress = null,
  }: SocialAuthParams): Promise<AuthResult> {
    const email = providerEmail || `${provider}_${providerUserId}@oauth.auth`;
    const now = new Date();

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    let user: User;
    let isNewUser = false;

    if (!existingUser) {
      isNewUser = true;
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          authProvider: provider,
          role: "user",
          status: "active",
          emailVerified: true,
          phoneVerified: false,
          lastLoginAt: now,
          lastActiveAt: now,
        })
        .returning();

      user = newUser;
    } else {
      const [updatedUser] = await db
        .update(users)
        .set({
          lastLoginAt: now,
          lastActiveAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, existingUser.id))
        .returning();

      user = updatedUser;
    }

    const safeUser: SafeUser = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      authProvider: user.authProvider,
      lastLoginAt: user.lastLoginAt,
      lastActiveAt: user.lastActiveAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const tokens = generateTokens(safeUser);
    const refreshTokenHash = hashToken(tokens.refreshToken);
    const sessionExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(userSessions).values({
      userId: user.id,
      refreshTokenHash,
      userAgent,
      ipAddress,
      expiresAt: sessionExpiry,
    });

    return {
      isNewUser,
      provider,
      user: safeUser,
      tokens,
    };
  }

  /**
   * Update Display Language for user
   */
  static async setUserLanguage({
    userId,
    language,
  }: SetLanguageParams): Promise<{ id: string; preferredLanguage: string }> {
    const [updatedUser] = await db
      .update(users)
      .set({
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
      preferredLanguage: language,
    };
  }

  /**
   * Get Current Authenticated User Details
   */
  static async getCurrentUser(userId: string): Promise<SafeUser> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        emailVerified: users.emailVerified,
        phoneVerified: users.phoneVerified,
        authProvider: users.authProvider,
        lastLoginAt: users.lastLoginAt,
        lastActiveAt: users.lastActiveAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
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
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      const error = new Error("Invalid or expired refresh token") as AppError;
      error.statusCode = 401;
      error.code = "INVALID_REFRESH_TOKEN";
      throw error;
    }

    const tokenHash = hashToken(refreshToken);

    const [session] = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.refreshTokenHash, tokenHash),
          isNull(userSessions.revokedAt)
        )
      );

    if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
      const error = new Error(
        "Session expired or revoked. Please login again."
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
      const error = new Error("User account not found or suspended") as AppError;
      error.statusCode = 401;
      error.code = "UNAUTHORIZED";
      throw error;
    }

    const safeUser: SafeUser = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      authProvider: user.authProvider,
      lastLoginAt: user.lastLoginAt,
      lastActiveAt: user.lastActiveAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const tokens = generateTokens(safeUser);
    const newRefreshHash = hashToken(tokens.refreshToken);

    await db
      .update(userSessions)
      .set({
        refreshTokenHash: newRefreshHash,
        userAgent,
        ipAddress,
        lastUsedAt: new Date(),
      })
      .where(eq(userSessions.id, session.id));

    return tokens;
  }

  /**
   * Logout User
   */
  static async logout({
    refreshToken,
    userId,
  }: LogoutParams): Promise<{ success: boolean; message: string }> {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(eq(userSessions.refreshTokenHash, tokenHash));
    } else if (userId) {
      await db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(eq(userSessions.userId, userId));
    }

    return {
      success: true,
      message: "Logged out successfully",
    };
  }
}

export default AuthService;
