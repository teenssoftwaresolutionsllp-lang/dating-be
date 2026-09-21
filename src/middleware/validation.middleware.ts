import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import { SUPPORTED_LANGUAGES } from "../config/constants";
import ApiResponse from "../utils/response";

export const validateBody =
  (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
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
 * Validate supported language code
 */
const isValidLanguageCode = (code?: unknown): boolean => {
  if (typeof code !== "string") return false;
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code);
};

/**
 * Social Auth Validator (Screen 2 buttons)
 */
export const validateSocialAuth =
  (provider: string) => (req: Request, res: Response, next: NextFunction) => {
    const { providerUserId, providerEmail, preferredLanguage } = req.body;

    if (!providerUserId) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "Invalid request data",
        code: "VALIDATION_ERROR",
      });
    }

    if (preferredLanguage && !isValidLanguageCode(preferredLanguage)) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "Invalid language code",
        code: "INVALID_LANGUAGE",
      });
    }

    if (
      providerEmail !== undefined &&
      (typeof providerEmail !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(providerEmail))
    ) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "Invalid provider email",
        code: "INVALID_EMAIL",
      });
    }

    req.body = {
      ...req.body,
      provider,
      providerUserId: String(providerUserId),
      providerEmail: providerEmail ? String(providerEmail) : undefined,
    };
    return next();
  };

export default {
  validateBody,
  validateSocialAuth,
};
