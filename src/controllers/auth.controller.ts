import type { Request, Response } from "express";
import type { TokensResponse } from "../types/index";
import AuthService from "../services/auth.service";
import ApiResponse from "../utils/response";

const getRefreshTokenCookie = (cookieHeader?: string): string | undefined =>
  cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("refreshToken="))
    ?.slice("refreshToken=".length);

const setRefreshTokenCookie = (res: Response, refreshToken: string): void => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/v1/auth",
  });
};

const tokenResponse = (
  refreshToken: string,
  publicTokens: Omit<TokensResponse, "refreshToken">,
) => ({ ...publicTokens, refreshToken });

export class AuthController {
  static async refresh(req: Request, res: Response): Promise<Response> {
    const refreshToken =
      getRefreshTokenCookie(req.headers.cookie) ||
      (typeof req.body?.refreshToken === "string"
        ? req.body.refreshToken.trim()
        : undefined);
    if (!refreshToken) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Refresh token cookie is required",
        code: "MISSING_REFRESH_TOKEN",
      });
    }

    const tokens = await AuthService.refreshToken({
      refreshToken,
      userAgent: req.headers["user-agent"] as string | undefined,
      ipAddress: req.ip || req.socket?.remoteAddress,
    });
    const { refreshToken: rotatedRefreshToken, ...publicTokens } = tokens;
    setRefreshTokenCookie(res, rotatedRefreshToken);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Token refreshed successfully",
      data: {
        tokens: tokenResponse(rotatedRefreshToken, publicTokens),
      },
    });
  }

  /**
   * POST /api/v1/auth/send-otp
   * Screen 2: Send 4-digit OTP to mobile number
   */

  static async sendOtp(req: Request, res: Response): Promise<Response> {
    const { phone, countryCode, preferredLanguage } = req.body;

    const result = await AuthService.sendOtp({
      phone,
      countryCode,
      preferredLanguage,
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: `OTP sent successfully to ${result.countryCode} ${result.phone}`,
      data: result,
    });
  }

  /**
   * POST /api/v1/auth/resend-otp
   * Screen 2 (OTP Screen): Resend a fresh 4-digit OTP after the 30-second cooldown has elapsed
   * or when the previous OTP has expired (10-minute window).
   */
  static async resendOtp(req: Request, res: Response): Promise<Response> {
    const { phone, countryCode, preferredLanguage } = req.body;

    const result = await AuthService.resendOtp({
      phone,
      countryCode,
      preferredLanguage,
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: `OTP resent successfully to ${result.countryCode} ${result.phone}`,
      data: result,
    });
  }

  static async socialAuth(req: Request, res: Response): Promise<Response> {
    const result = await AuthService.socialAuth({
      provider: req.body.provider,
      providerUserId: req.body.providerUserId,
      providerEmail: req.body.providerEmail,
      userAgent: req.headers["user-agent"] as string | undefined,
      ipAddress: req.ip || req.socket?.remoteAddress,
    });
    const { refreshToken, ...publicTokens } = result.tokens;
    setRefreshTokenCookie(res, refreshToken);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: result.isNewUser
        ? "Social account created successfully"
        : "Social login successful",
      data: {
        ...result,
        tokens: tokenResponse(refreshToken, publicTokens),
      },
    });
  }

  /**
   * POST /api/v1/auth/language
   * Set preferred display language for authenticated user
   */
  static async setLanguage(req: Request, res: Response): Promise<Response> {
    const { language } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const result = await AuthService.setUserLanguage({ userId, language });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Display language updated successfully",
      data: result,
    });
  }

  /**
   * GET /api/v1/auth/me
   * Get current authenticated user details
   */

  static async getMe(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const user = await AuthService.getCurrentUser(userId);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "User profile retrieved successfully",
      data: { user },
    });
  }

  /**
   * POST /api/v1/auth/verify-otp
   * Screen 3: Verify 4-digit OTP and login or auto-register user
   */
  static async verifyOtp(req: Request, res: Response): Promise<Response> {
    const { phone, countryCode, otp, preferredLanguage } = req.body;
    const userAgent = req.headers["user-agent"] as string | undefined;
    const ipAddress =
      req.ip || (req.socket?.remoteAddress as string | undefined);

    const result = await AuthService.verifyOtp({
      phone,
      countryCode,
      otp,
      preferredLanguage,
      userAgent,
      ipAddress,
    });
    const { refreshToken, ...publicTokens } = result.tokens;
    setRefreshTokenCookie(res, refreshToken);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: result.isNewUser
        ? "Account created and verified successfully"
        : "OTP verified and logged in successfully",
      data: {
        ...result,
        tokens: tokenResponse(refreshToken, publicTokens),
      },
    });
  }

  /**
   * POST /api/v1/auth/logout
   * Invalidate session & logout
   */
  static async logout(req: Request, res: Response): Promise<Response> {
    const refreshToken =
      getRefreshTokenCookie(req.headers.cookie) ||
      (typeof req.body?.refreshToken === "string"
        ? req.body.refreshToken.trim()
        : undefined);

    const result = await AuthService.logout({ refreshToken });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/v1/auth",
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: result.message,
    });
  }

  /**
   * POST /api/v1/auth/logout-all
   * Revoke every active session for the authenticated user.
   */
  static async logoutAll(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    await AuthService.logoutAllSessions(String(userId));
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/v1/auth",
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Logged out from all devices successfully",
    });
  }
}

export default AuthController;
