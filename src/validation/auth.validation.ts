import { z } from "zod";
import { SUPPORTED_LANGUAGES } from "../config/constants";

const supportedLanguageCodes = SUPPORTED_LANGUAGES.map(
  (language) => language.code,
);

const phoneSchema = z
  .string()
  .trim()
  .transform((phone) => phone.replace(/[^0-9]/g, ""))
  .refine((phone) => phone.length === 10, {
    message: "Invalid phone number. Please enter exactly 10 digits.",
  });

const countryCodeSchema = z
  .string()
  .trim()
  .transform((countryCode) =>
    countryCode.startsWith("+") ? countryCode : `+${countryCode}`,
  )
  .refine((countryCode) => /^\+[1-9]\d{0,3}$/.test(countryCode), {
    message: "Invalid country code.",
  });

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

export const deleteAccountOtpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{4}$/, {
      message: "Invalid OTP format (4 digits required)",
    }),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, "Refresh token is required"),
});
