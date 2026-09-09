import { z } from "zod";
import { SUPPORTED_LANGUAGES } from "../config/constants";

const supportedLanguageCodes = SUPPORTED_LANGUAGES.map(
  (language) => language.code,
);

const phoneSchema = z
  .string()
  .trim()
  .transform((phone) => phone.replace(/[^0-9]/g, ""))
  .refine((phone) => phone.length >= 7 && phone.length <= 15, {
    message: "Invalid phone number. Please enter 7 to 15 digits.",
  });

const countryCodeSchema = z
  .string()
  .trim()
  .transform((countryCode) =>
    countryCode.startsWith("+") ? countryCode : `+${countryCode}`,
  );

const preferredLanguageSchema = z
  .string()
  .refine((language) => supportedLanguageCodes.includes(language), {
    message: `Invalid language code. Supported: ${supportedLanguageCodes.join(", ")}`,
  })
  .optional();

export const sendOtpSchema = z.object({
  phone: phoneSchema,
  countryCode: countryCodeSchema.default("+91"),
  preferredLanguage: preferredLanguageSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  countryCode: countryCodeSchema.default("+91"),
  otp: z
    .string()
    .trim()
    .regex(/^\d{4}$/, {
      message: "Invalid OTP format (4 digits required)",
    }),
  preferredLanguage: preferredLanguageSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, "Refresh token is required"),
});
