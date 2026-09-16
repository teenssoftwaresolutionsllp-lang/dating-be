import { createHash, randomUUID } from "node:crypto";

import {
  SUPPORTED_LANGUAGES,
  OTP_CONFIG,
  OTP_PURPOSES,
} from "../config/constants";
import { generateOTP, sendSmsOTP } from "../utils/otp";
import { generateTokens, verifyRefreshToken } from "../utils/jwt";
import AuthRepository from "../repositories/auth.repository";

import type {
  AppError,
  AuthResult,
  LogoutParams,
  RefreshTokenParams,
  ResendOtpParams,
  ResendOtpResult,
  SendOtpParams,
  SendOtpResult,
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
   * Normalise a phone number to its 10-digit local form.
   * Strips non-digit characters, then removes a leading country code
   * (handles +91 / 91 prefix for Indian numbers).
   */
  private static normalisePhone(phone: string, countryCode: string = "+91"): string {
    let digits = phone.replace(/[^0-9]/g, "");
    // Strip country code prefix (e.g. 91 from +91)
    const ccDigits = countryCode.replace(/[^0-9]/g, "");
    if (ccDigits && digits.startsWith(ccDigits) && digits.length > 10) {
      digits = digits.slice(ccDigits.length);
    }
    return digits;
  }

  /**
   * Screen 2: Send 4-digit Mobile OTP
   */
  static async sendOtp({
    phone,
    countryCode = "+91",
  }: SendOtpParams): Promise<SendOtpResult> {
    const localPhone = AuthService.normalisePhone(phone, countryCode);
    const fullPhone = `${countryCode}${localPhone}`;
    const now = new Date();

    // Check for existing active OTP with cooldown (30s)
    const latestOtpRecord = await AuthRepository.findLatestActiveOtp(
      phone,
      OTP_PURPOSES.LOGIN,
    );

    if (latestOtpRecord) {
      const cooldownTime =
        new Date(latestOtpRecord.createdAt).getTime() +
        OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000;
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
      now.getTime() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 10000
    );

    // Save OTP to database
    await AuthRepository.createOtp({
      identifier: phone,
      codeHash: AuthService.hashOtp(otpCode),
      purpose: OTP_PURPOSES.LOGIN,
      attempts: 0,
      expiresAt,
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
    const localPhone = AuthService.normalisePhone(phone, countryCode);
    const fullPhone = `${countryCode}${localPhone}`;
    const now = new Date();

    const otpRecord = await AuthRepository.findLatestActiveOtp(
      phone,
      OTP_PURPOSES.LOGIN,
    );

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

    if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      const error = new Error(
        "Maximum OTP attempts exceeded. Please request a new OTP.",
      ) as AppError;
      error.statusCode = 400;
      error.code = "OTP_MAX_ATTEMPTS_EXCEEDED";
      throw error;
    }

    if (otpRecord.codeHash !== AuthService.hashOtp(otp)) {
      // Increment attempt counter
      const updatedOtp = await AuthRepository.incrementOtpAttempts(
        otpRecord.id,
        OTP_CONFIG.MAX_ATTEMPTS,
        now,
      );

      const attemptsUsed = updatedOtp?.attempts ?? OTP_CONFIG.MAX_ATTEMPTS;
      const remainingAttempts = OTP_CONFIG.MAX_ATTEMPTS - attemptsUsed;
      const error = new Error(
        `Invalid OTP code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : "Please request a new OTP."}`,
      ) as AppError;
      error.statusCode = 400;
      error.code = "INVALID_OTP";
      error.remainingAttempts = Math.max(0, remainingAttempts);
      throw error;
    }

    // Mark OTP as verified
    await AuthRepository.markOtpVerified(otpRecord.id, now);

    // Check if user already exists
    const existingUser = await AuthRepository.findUserByPhone(phone);

    let user: User;
    let isNewUser = false;

    if (!existingUser) {
      // Auto-register new user
      isNewUser = true;
      user = await AuthRepository.createUser({
        email: `${phone}@phone.local`,
        phone,
        phoneVerified: true,
        status: "active",
        authProvider: "phone",
      });
    } else {
      // Update existing user verification and display language
      const updates = {
        phoneVerified: true,
        updatedAt: now,
      };

      user = await AuthRepository.markUserPhoneVerified(
        existingUser.id,
        updates.updatedAt,
      );
    }

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
   * POST /api/v1/auth/resend-otp
   * Resend a fresh 4-digit OTP respecting the 30-second cooldown window.
   *
   * Rules:
   *  - If the most recent un-verified OTP was sent less than 30 s ago, reject with 429.
   *  - Otherwise (expired window or cooldown elapsed), generate a new OTP,
   *    persist it, and dispatch via SMS.
   */
  static async resendOtp({
    phone,
    countryCode = "+91",
  }: ResendOtpParams): Promise<ResendOtpResult> {
    const localPhone = AuthService.normalisePhone(phone, countryCode);
    const fullPhone = `${countryCode}${localPhone}`;
    const now = new Date();

    // Fetch the most recent un-verified OTP for this number
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
      const createdAtTime = new Date(latestOtpRecord.createdAt).getTime();
      const elapsed = now.getTime() - createdAtTime;
      const cooldownMs = OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000;

      // Enforce 30-second cooldown
      if (elapsed < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
        const error = new Error(
          `Please wait ${remainingSeconds} second(s) before requesting a new OTP.`
        ) as AppError;
        error.statusCode = 429;
        error.code = "OTP_COOLDOWN_ACTIVE";
        error.remainingSeconds = remainingSeconds;
        throw error;
      }
    }

    // Generate a fresh 4-digit OTP
    const otpCode = generateOTP(OTP_CONFIG.LENGTH);
    const codeHash = hashToken(otpCode);
    const expiresAt = new Date(
      now.getTime() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000
    );

    // Persist new OTP record
    await db.insert(otpVerifications).values({
      identifier: fullPhone,
      purpose: OTP_PURPOSES.LOGIN,
      codeHash,
      attempts: 0,
      expiresAt,
    });

    // Dispatch SMS
    await sendSmsOTP({ phone: fullPhone, countryCode, otp: otpCode });

    const responseData: ResendOtpResult = {
      phone: fullPhone,
      countryCode,
      purpose: OTP_PURPOSES.LOGIN,
      expiresIn: OTP_CONFIG.EXPIRY_MINUTES * 60,
      resendCooldown: OTP_CONFIG.RESEND_COOLDOWN_SECONDS,
    };

    // Expose the OTP in non-production environments for easy testing
    if (process.env.NODE_ENV !== "production") {
      responseData.devOtp = otpCode;
    }

    return responseData;
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

    // Create session in user_sessions
    const sessionExpiry = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000, // 7 days
    );

    await AuthRepository.createSession({
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
        id: user.id,
        userId: user.id,
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
   * Get Current Authenticated User Details
   */
  static async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await AuthRepository.findUserById(userId);

    if (!user) {
      const error = new Error("User not found") as AppError;
      error.statusCode = 404;
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    return {
      id: user.id,
      userId: user.id,
      phone: user.phone,
      countryCode: "+1",
      preferredLanguage: "en",
      role: user.role,
      isVerified: user.phoneVerified,
      isActive: user.status === "active",
      profileCompleted: false,
      createdAt: user.createdAt,
    };
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

    const session = await AuthRepository.findActiveSessionByRefreshTokenHash(
      AuthService.hashRefreshToken(refreshToken),
    );

    if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
      const error = new Error(
        "Session expired or revoked. Please login again.",
      ) as AppError;
      error.statusCode = 401;
      error.code = "SESSION_EXPIRED";
      throw error;
    }

    const user = await AuthRepository.findUserById(decoded.id);

    if (!user || user.status !== "active") {
      const error = new Error(
        "User account not found or suspended",
      ) as AppError;
      error.statusCode = 401;
      error.code = "UNAUTHORIZED";
      throw error;
    }

    const tokens = generateTokens(
      {
        id: user.id,
        phone: user.phone,
        role: user.role,
      },
      session.id,
    );

    await AuthRepository.updateSession(session.id, {
      refreshTokenHash: AuthService.hashRefreshToken(tokens.refreshToken),
      deviceInfo: userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

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
      await AuthRepository.revokeSessionByRefreshTokenHash(
        AuthService.hashRefreshToken(refreshToken),
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
    await AuthRepository.revokeAllSessions(userId);
  }
}

export default AuthService;