import type { Request, Response, NextFunction } from "express";
import ApiResponse from "../utils/response";
import { SUPPORTED_LANGUAGES } from "../config/constants";

/**
 * Validate phone number format (7 to 15 digits)
 */
const isValidPhone = (phone?: unknown): boolean => {
  if (!phone) return false;
  const digitsOnly = phone.toString().replace(/[^0-9]/g, "");
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
};

/**
 * Validate supported language code
 */
const isValidLanguageCode = (code?: unknown): boolean => {
  if (typeof code !== "string") return false;
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code);
};

/**
 * Screen 2: Send OTP Validator
 */
export const validateSendOtp = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { phone, countryCode = "+91", preferredLanguage } = req.body;

  if (!phone) {
    return ApiResponse.error(res, {
      statusCode: 400,
      message: "Mobile phone number is required",
      code: "VALIDATION_ERROR",
    });
  }

  if (!isValidPhone(phone)) {
    return ApiResponse.error(res, {
      statusCode: 400,
      message: "Invalid phone number. Please enter a valid 10-digit mobile number.",
      code: "INVALID_PHONE",
    });
  }

  if (preferredLanguage && !isValidLanguageCode(preferredLanguage)) {
    return ApiResponse.error(res, {
      statusCode: 400,
      message: `Invalid language code. Supported: ${SUPPORTED_LANGUAGES.map((l) => l.code).join(", ")}`,
      code: "INVALID_LANGUAGE",
    });
  }

  req.body.countryCode = countryCode.toString().startsWith("+")
    ? countryCode
    : `+${countryCode}`;
  req.body.phone = phone.toString().replace(/[^0-9]/g, "");

  return next();
};

/**
 * Screen 3: Verify OTP Validator
 */
export const validateVerifyOtp = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { phone, otp, countryCode = "+91", preferredLanguage } = req.body;

  if (!phone) {
    return ApiResponse.error(res, {
      statusCode: 400,
      message: "Mobile phone number is required",
      code: "VALIDATION_ERROR",
    });
  }

  if (!otp || otp.toString().trim().length === 0) {
    return ApiResponse.error(res, {
      statusCode: 400,
      message: "OTP code is required",
      code: "MISSING_OTP",
    });
  }

  const cleanOtp = otp.toString().trim();
  if (cleanOtp.length < 4 || cleanOtp.length > 6) {
    return ApiResponse.error(res, {
      statusCode: 400,
      message: "Invalid OTP format (4 digits required)",
      code: "INVALID_OTP_FORMAT",
    });
  }

  if (preferredLanguage && !isValidLanguageCode(preferredLanguage)) {
    return ApiResponse.error(res, {
      statusCode: 400,
      message: `Invalid language code. Supported: ${SUPPORTED_LANGUAGES.map((l) => l.code).join(", ")}`,
      code: "INVALID_LANGUAGE",
    });
  }

  req.body.otp = cleanOtp;
  req.body.countryCode = countryCode.toString().startsWith("+")
    ? countryCode
    : `+${countryCode}`;
  req.body.phone = phone.toString().replace(/[^0-9]/g, "");

  return next();
};

/**
 * Screen 1: Language Selection Validator
 */
export const validateSetLanguage = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { language } = req.body;

  if (!language || !isValidLanguageCode(language)) {
    return ApiResponse.error(res, {
      statusCode: 400,
      message: `Invalid language code. Supported: ${SUPPORTED_LANGUAGES.map((l) => l.code).join(", ")}`,
      code: "INVALID_LANGUAGE",
    });
  }

  return next();
};

/**
 * Social Auth Validator (Screen 2 buttons)
 */
export const validateSocialAuth =
  (provider: string) =>
  (req: Request, res: Response, next: NextFunction) => {
    const { providerUserId, preferredLanguage } = req.body;

    if (!providerUserId) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: `Missing ${provider} provider user identifier`,
        code: "MISSING_PROVIDER_USER_ID",
      });
    }

    if (preferredLanguage && !isValidLanguageCode(preferredLanguage)) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: `Invalid language code. Supported: ${SUPPORTED_LANGUAGES.map((l) => l.code).join(", ")}`,
        code: "INVALID_LANGUAGE",
      });
    }

    req.body.provider = provider;
    return next();
  };

/**
 * Refresh Token Validator
 */
export const validateRefreshToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return ApiResponse.error(res, {
      statusCode: 400,
      message: "Refresh token is required",
      code: "MISSING_REFRESH_TOKEN",
    });
  }

  return next();
};
