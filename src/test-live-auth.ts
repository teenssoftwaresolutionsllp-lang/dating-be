import AuthService from "./services/auth.service";

const testLiveAuth = async (): Promise<void> => {
  console.log("🧪 Testing Live Auth Flow on PostgreSQL 'Dating' DB...\n");

  const testPhone = "9876543210";
  const countryCode = "+91";
  const preferredLanguage = "te";

  // 1. Send OTP
  console.log("1. Sending OTP to", countryCode, testPhone);
  const sendRes = await AuthService.sendOtp({
    phone: testPhone,
    countryCode,
    preferredLanguage,
  });
  console.log("   Send OTP Result:", sendRes);

  // 2. Verify OTP
  console.log("\n2. Verifying OTP with code:", sendRes.devOtp);
  const verifyRes = await AuthService.verifyOtp({
    phone: testPhone,
    countryCode,
    otp: sendRes.devOtp as string,
    preferredLanguage,
  });
  console.log("   Verify OTP Result:", {
    isNewUser: verifyRes.isNewUser,
    user: verifyRes.user,
    tokens: {
      accessToken: verifyRes.tokens.accessToken.substring(0, 25) + "...",
      refreshToken: verifyRes.tokens.refreshToken.substring(0, 25) + "...",
    },
  });

  // 3. Get User Profile
  console.log("\n3. Fetching User Profile for user ID:", verifyRes.user.id);
  const me = await AuthService.getCurrentUser(verifyRes.user.id);
  console.log("   User Profile:", me);

  // 4. Update Language
  console.log("\n4. Changing language to 'en':");
  const langRes = await AuthService.setUserLanguage({
    userId: verifyRes.user.id,
    language: "en",
  });
  console.log("   Updated Language:", langRes);

  console.log("\n=================================================");
  console.log("🎉 ALL LIVE POSTGRESQL AUTH OPERATIONS SUCCEEDED!");
  console.log("=================================================\n");
  process.exit(0);
};

testLiveAuth().catch((err: unknown) => {
  console.error("❌ Live auth test failed:", err);
  process.exit(1);
});
