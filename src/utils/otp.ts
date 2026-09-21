import crypto from "crypto";
import { OTP_CONFIG } from "../config/constants";

export interface SendSmsOtpOptions {
  phone: string;
  countryCode: string;
  otp: string;
}

export interface SendSmsOtpResult {
  success: boolean;
  sentTo: string;
}

/**
 * Generate numeric OTP of specified length (default: 4 digits as shown in UI)
 * @param length OTP length
 * @returns 4-digit OTP string
 */
export const generateOTP = (length: number = OTP_CONFIG.LENGTH): string => {
  if (process.env.NODE_ENV === "test" || process.env.OTP_FIXED_CODE) {
    return process.env.OTP_FIXED_CODE || "1234";
  }

  // Generates 4-digit numeric code from 1000 to 9999
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const otpNumber = crypto.randomInt(min, max + 1);
  return otpNumber.toString();
};

/**
 * Simulate or trigger SMS dispatch
 * @param options { phone, countryCode, otp }
 */
export const sendSmsOTP = async ({
  phone,
  countryCode,
  otp,
}: SendSmsOtpOptions): Promise<SendSmsOtpResult> => {
  const fullPhone = `${countryCode}${phone}`;
  console.log(`\n==============================================`);
  console.log(`📲 [SMS GATEWAY SIMULATION]`);
  console.log(`To: ${fullPhone}`);
  console.log(`Your Dating App verification code is: [ ${otp} ]`);
  console.log(`Valid for ${OTP_CONFIG.EXPIRY_MINUTES} minutes.`);
  console.log(`==============================================\n`);

  // SMS Gateway integration hook (Twilio / AWS SNS / MSG91 / Fast2SMS) can be plugged here
  return {
    success: true,
    sentTo: fullPhone,
  };
};

/**
 * Normalize phone number (strip whitespace, dashes, leading zero)
 * @param phone
 * @returns string
 */
export const normalizePhone = (phone: string | number): string => {
  if (!phone) return "";
  return phone.toString().replace(/[^0-9]/g, "");
};
