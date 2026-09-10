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
   * Screen 2: Send 4-digit Mobile OTP
   */
  static async sendOtp({
    phone,
    countryCode = "+91",
  }: SendOtpParams): Promise<SendOtpResult> {
    const now = new Date();

    // Check for existing active OTP with cooldown (30s)
    const latestOtpRecord = await AuthRepository.findLatestActiveOtp(
      phone,
      countryCode,
      OTP_PURPOSES.LOGIN,
    );

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
    await AuthRepository.createOtp({
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

    const otpRecord = await AuthRepository.findLatestActiveOtp(
      phone,
      countryCode,
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
      const updatedOtp = await AuthRepository.incrementOtpAttempts(
        otpRecord.id,
        otpRecord.maxAttempts,
        now,
      );

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
    await AuthRepository.markOtpVerified(otpRecord.id, now);

    // Check if user already exists
    const existingUser = await AuthRepository.findUserByPhone(phone);

    let user: User;
    let isNewUser = false;

    if (!existingUser) {
      // Auto-register new user
      isNewUser = true;
      user = await AuthRepository.createUser({
        phone,
        phoneVerified: true,
        status: "active",
        onboardingStep: "BASIC_DETAILS",
      });
    } else {
      // Update existing user verification and display language
      const updates = {
        phoneVerified: true,
        updatedAt: now,
      };

      user = await AuthRepository.markUserPhoneVerified(
        existingUser.user_id,
        updates.updatedAt,
      );
    }

    // Generate JWT access and refresh tokens
    const sessionId = randomUUID();
    const tokens = generateTokens(
      {
        id: user.user_id,
        phone: user.phone,
        role: user.role,
      },
      sessionId,
    );

    // Create session in user_sessions
    const sessionExpiry = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000, // 7 days
    );

    await AuthRepository.createSession({
      id: sessionId,
      userId: user.user_id,
      refreshTokenHash: AuthService.hashRefreshToken(tokens.refreshToken),
      deviceInfo: userAgent,
      ipAddress,
      expiresAt: sessionExpiry,
    });

    return {
      isNewUser,
      user: {
        id: user.user_id,
        userId: user.user_id,
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
      id: user.user_id,
      userId: user.user_id,
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
        id: user.user_id,
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
