import type { Request, Response } from "express";
import AuthService from "../services/auth.service";
import ApiResponse from "../utils/response";
import { SOCIAL_PROVIDERS } from "../config/constants";

export class AuthController {
  /**
   * GET /api/v1/auth/languages
   * Screen 1: Get supported display- languages
   */
  static async getLanguages(_req: Request, res: Response): Promise<Response> {
    const languages = AuthService.getSupportedLanguages();
    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Supported languages retrieved successfully",
      data: {
        languages,
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
   * POST /api/v1/auth/verify-otp
   * Screen 3: Verify 4-digit OTP and login or auto-register user
   */
  static async verifyOtp(req: Request, res: Response): Promise<Response> {
    const { phone, countryCode, otp, preferredLanguage } = req.body;
    const userAgent = req.headers["user-agent"] as string | undefined;
    const ipAddress = req.ip || (req.socket?.remoteAddress as string | undefined);

    const result = await AuthService.verifyOtp({
      phone,
      countryCode,
      otp,
      preferredLanguage,
      userAgent,
      ipAddress,
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: result.isNewUser
        ? "Account created and verified successfully"
        : "OTP verified and logged in successfully",
      data: result,
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
   * POST /api/v1/auth/google
   * Screen 2 Social Login: Google
   */
  static async googleAuth(req: Request, res: Response): Promise<Response> {
    const { providerUserId, email, preferredLanguage } = req.body;
    const userAgent = req.headers["user-agent"] as string | undefined;
    const ipAddress = req.ip || (req.socket?.remoteAddress as string | undefined);

    const result = await AuthService.socialAuth({
      provider: SOCIAL_PROVIDERS.GOOGLE,
      providerUserId,
      providerEmail: email,
      preferredLanguage,
      userAgent,
      ipAddress,
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Google authentication successful",
      data: result,
    });
  }

  /**
   * POST /api/v1/auth/facebook
   * Screen 2 Social Login: Facebook
   */
  static async facebookAuth(req: Request, res: Response): Promise<Response> {
    const { providerUserId, email, preferredLanguage } = req.body;
    const userAgent = req.headers["user-agent"] as string | undefined;
    const ipAddress = req.ip || (req.socket?.remoteAddress as string | undefined);

    const result = await AuthService.socialAuth({
      provider: SOCIAL_PROVIDERS.FACEBOOK,
      providerUserId,
      providerEmail: email,
      preferredLanguage,
      userAgent,
      ipAddress,
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Facebook authentication successful",
      data: result,
    });
  }

  /**
   * POST /api/v1/auth/instagram
   * Screen 2 Social Login: Instagram
   */
  static async instagramAuth(req: Request, res: Response): Promise<Response> {
    const { providerUserId, email, preferredLanguage } = req.body;
    const userAgent = req.headers["user-agent"] as string | undefined;
    const ipAddress = req.ip || (req.socket?.remoteAddress as string | undefined);

    const result = await AuthService.socialAuth({
      provider: SOCIAL_PROVIDERS.INSTAGRAM,
      providerUserId,
      providerEmail: email,
      preferredLanguage,
      userAgent,
      ipAddress,
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Instagram authentication successful",
      data: result,
    });
  }

  /**
   * POST /api/v1/auth/refresh-token
   * Refresh JWT access token
   */
  static async refreshToken(req: Request, res: Response): Promise<Response> {
    const { refreshToken } = req.body;
    const userAgent = req.headers["user-agent"] as string | undefined;
    const ipAddress = req.ip || (req.socket?.remoteAddress as string | undefined);

    const tokens = await AuthService.refreshToken({
      refreshToken,
      userAgent,
      ipAddress,
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Token refreshed successfully",
      data: { tokens },
    });
  }

  /**
   * POST /api/v1/auth/logout
   * Invalidate session & logout
   */
  static async logout(req: Request, res: Response): Promise<Response> {
    const { refreshToken } = req.body;
    const userId = req.user?.id;

    const result = await AuthService.logout({ refreshToken, userId });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: result.message,
    });
  }
}

export default AuthController;
