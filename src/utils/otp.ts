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
 * Normalize phone number (strip whitespace, dashes, leading zero)
 * @param phone
 * @returns string
 */
export const normalizePhone = (phone: string | number): string => {
  if (!phone) return "";
  return phone.toString().replace(/[^0-9]/g, "");
};

/**
 * Dispatch SMS OTP via MSG91 (or simulation fallback if keys missing)
 * @param options { phone, countryCode, otp }
 */
export const sendSmsOTP = async ({
  phone,
  countryCode,
  otp,
}: SendSmsOtpOptions): Promise<SendSmsOtpResult> => {
  const cleanPhone = normalizePhone(phone);
  const cleanCc = normalizePhone(countryCode) || "91";
  const fullPhone = `${cleanCc}${cleanPhone}`;

  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  const templateId = process.env.MSG91_TEMPLATE_ID?.trim();
  const isMsg91Active = Boolean(authKey && templateId);

  // If MSG91 is live, do NOT print the OTP code to terminal
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n==============================================`);
    console.log(`📲 [SMS OTP DISPATCH]`);
    console.log(`To: +${fullPhone}`);
    if (isMsg91Active) {
      console.log(`Provider: MSG91 Live SMS Gateway (Code sent to phone via SMS)`);
    } else {
      console.log(`Verification Code: [ ${otp} ] (Mock Simulation - MSG91 keys missing)`);
    }
    console.log(`Valid for: ${OTP_CONFIG.EXPIRY_MINUTES} minutes`);
    console.log(`==============================================\n`);
  }

  // If MSG91 credentials are provided, invoke MSG91 OTP API
  if (isMsg91Active && authKey && templateId) {
    try {
      const url = new URL("https://control.msg91.com/api/v5/otp");
      url.searchParams.append("template_id", templateId);
      url.searchParams.append("mobile", fullPhone);
      url.searchParams.append("authkey", authKey);
      url.searchParams.append("otp", otp);
      if (OTP_CONFIG.EXPIRY_MINUTES) {
        url.searchParams.append("otp_expiry", String(OTP_CONFIG.EXPIRY_MINUTES));
      }

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: authKey,
        },
      });

      const responseData = (await response.json()) as { type?: string; message?: string };

      if (!response.ok || responseData.type === "error") {
        console.error("❌ MSG91 API Error:", responseData);
        if (process.env.NODE_ENV === "production") {
          throw new Error(responseData.message || "Failed to send SMS OTP via MSG91");
        }
      } else {
        console.log("✅ MSG91 SMS dispatched successfully:", responseData.message || "Delivered to gateway");
      }

      return {
        success: response.ok && responseData.type !== "error",
        sentTo: `+${fullPhone}`,
      };
    } catch (err: any) {
      console.error("❌ Failed to call MSG91 API:", err?.message || err);
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
    }
  }

  return {
    success: true,
    sentTo: `+${fullPhone}`,
  };
};
