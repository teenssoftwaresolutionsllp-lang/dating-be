import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import ApiResponse from "../utils/response";

/**
 * Validate phone number is exactly 10 digits (after stripping country code if present).
 * Accepts: 9876543210, +919876543210, 919876543210
 */
const isValidPhone = (phone?: unknown): boolean => {
  if (!phone) return false;
  // Strip all non-digit characters
  let digits = phone.toString().replace(/[^0-9]/g, "");
  // If the number starts with the country code (91 for India) and is 12 digits, strip it
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  // Must be exactly 10 digits
  return digits.length === 10;
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
  // Strictly require exactly 4 numeric digits as shown in the UI (4 input boxes)
  if (!/^\d{4}$/.test(cleanOtp)) {
    return ApiResponse.error(res, {
      statusCode: 400,
      message: "Invalid OTP format. OTP must be exactly 4 digits.",
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
        message: "Invalid request data",
        code: "VALIDATION_ERROR",
        errors: result.error.flatten(),
      });
    }

    req.body = result.data;
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

/**
 * Resend OTP Validator — same rules as Send OTP
 * Validates phone number format (10 digits) before allowing a resend request.
 */
export const validateResendOtp = validateSendOtp;
