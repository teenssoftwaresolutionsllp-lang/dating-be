import { generateOTP, normalizePhone } from "./utils/otp";
import { generateTokens, verifyAccessToken, verifyRefreshToken } from "./utils/jwt";
import { hashPassword, comparePassword } from "./utils/password";
import { SUPPORTED_LANGUAGES } from "./config/constants";
import type { SafeUser } from "./types/index";

const runUnitTests = async (): Promise<void> => {
  console.log("🚀 Starting Unit & Logic Tests for Dating App Auth...\n");

  // 1. Phone normalization
  console.log("1. Testing Phone Normalization:");
  const phone = normalizePhone("+91 98765-43210");
  console.log("   Input: '+91 98765-43210' -> Output:", phone);
  if (phone !== "919876543210") throw new Error("Phone normalization mismatch");

  // 2. OTP generation
  console.log("\n2. Testing 4-Digit OTP Generation:");
  const otp1 = generateOTP(4);
  const otp2 = generateOTP(4);
  console.log(`   Generated OTPs: [${otp1}], [${otp2}]`);
  if (otp1.length !== 4 || otp2.length !== 4) throw new Error("OTP length must be 4");

  // 3. Password hashing & comparison
  console.log("\n3. Testing Password Hash & Compare:");
  const plainPass = "DatingAppSecure@2025";
  const hash = await hashPassword(plainPass);
  const isValid = await comparePassword(plainPass, hash);
  const isInvalid = await comparePassword("WrongPassword", hash);
  console.log("   Password match test:", isValid === true ? "PASS" : "FAIL");
  console.log("   Wrong password rejection:", isInvalid === false ? "PASS" : "FAIL");
  if (!isValid || isInvalid) throw new Error("Password hashing test failed");

  // 4. JWT Token Generation and Verification
  console.log("\n4. Testing JWT Tokens (Access & Refresh):");
  const mockUser: SafeUser = {
    id: 42,
    phone: "9876543210",
    countryCode: "+91",
    email: "test@datingapp.com",
    role: "user",
    preferredLanguage: "te",
    isVerified: true,
    profileCompleted: false,
  };
  const tokens = generateTokens(mockUser);
  console.log("   Access Token generated (len):", tokens.accessToken.length);
  console.log("   Refresh Token generated (len):", tokens.refreshToken.length);

  const decodedAccess = verifyAccessToken(tokens.accessToken);
  console.log("   Decoded Access Token:", { id: decodedAccess.id, phone: decodedAccess.phone, role: decodedAccess.role });
  if (decodedAccess.id !== 42 || decodedAccess.phone !== "9876543210") {
    throw new Error("JWT Access Token decode mismatch");
  }

  const decodedRefresh = verifyRefreshToken(tokens.refreshToken);
  console.log("   Decoded Refresh Token:", { id: decodedRefresh.id, type: decodedRefresh.type });
  if (decodedRefresh.id !== 42 || decodedRefresh.type !== "refresh") {
    throw new Error("JWT Refresh Token decode mismatch");
  }

  // 5. Supported Languages
  console.log("\n5. Supported Languages verification:");
  console.log("   Total languages:", SUPPORTED_LANGUAGES.length);
  const telugu = SUPPORTED_LANGUAGES.find((l) => l.code === "te");
  const english = SUPPORTED_LANGUAGES.find((l) => l.code === "en");
  console.log("   English:", english);
  console.log("   Telugu:", telugu);
  if (!telugu || !english) throw new Error("Missing Telugu or English in supported languages");

  console.log("\n=======================================================");
  console.log("🎉 ALL AUTHENTICATION LOGIC & UNIT TESTS PASSED 100%!");
  console.log("=======================================================\n");
};

runUnitTests().catch((err: unknown) => {
  console.error("❌ Unit tests failed:", err);
  process.exit(1);
});
