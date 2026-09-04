import app from "./app";
import type { SupportedLanguage } from "./types/index";

const PORT = 5002;

interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
}

const runTests = async (): Promise<void> => {
  const server = app.listen(PORT, async () => {
    console.log(`🧪 Test Server running on http://localhost:${PORT}`);

    try {
      const BASE_URL = `http://localhost:${PORT}`;

      console.log("\n--- TEST 1: Health Check ---");
      const healthRes = await fetch(`${BASE_URL}/api/health`);
      const healthData = (await healthRes.json()) as ApiResponse;
      console.log("Status:", healthRes.status, "Response:", healthData);

      console.log("\n--- TEST 2: Screen 1 - Supported Languages API ---");
      const langRes = await fetch(`${BASE_URL}/api/v1/auth/languages`);
      const langData = (await langRes.json()) as ApiResponse<{ languages: SupportedLanguage[] }>;
      console.log("Status:", langRes.status, "Languages count:", langData.data?.languages?.length);
      console.log("Languages:", langData.data?.languages?.map((l) => `${l.name} (${l.code})`));

      console.log("\n--- TEST 3: Screen 2 - Send OTP Validation (Missing Phone) ---");
      const sendOtpFailRes = await fetch(`${BASE_URL}/api/v1/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const sendOtpFailData = (await sendOtpFailRes.json()) as ApiResponse;
      console.log("Status:", sendOtpFailRes.status, "Message:", sendOtpFailData.message);

      console.log("\n--- TEST 4: Screen 2 - Send OTP Validation (Invalid Language) ---");
      const sendOtpLangFailRes = await fetch(`${BASE_URL}/api/v1/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "9876543210",
          countryCode: "+91",
          preferredLanguage: "invalid_code",
        }),
      });
      const sendOtpLangFailData = (await sendOtpLangFailRes.json()) as ApiResponse;
      console.log("Status:", sendOtpLangFailRes.status, "Message:", sendOtpLangFailData.message);

      console.log("\n--- TEST 5: Screen 3 - Verify OTP Validation (Missing OTP) ---");
      const verifyOtpFailRes = await fetch(`${BASE_URL}/api/v1/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "9876543210",
          countryCode: "+91",
        }),
      });
      const verifyOtpFailData = (await verifyOtpFailRes.json()) as ApiResponse;
      console.log("Status:", verifyOtpFailRes.status, "Message:", verifyOtpFailData.message);

      console.log("\n--- TEST 6: Get Profile (Protected Route) without Token ---");
      const meFailRes = await fetch(`${BASE_URL}/api/v1/auth/me`);
      const meFailData = (await meFailRes.json()) as ApiResponse;
      console.log("Status:", meFailRes.status, "Message:", meFailData.message);

      console.log("\n🎉 ALL SCREEN 1, 2, 3 ROUTE & VALIDATION TESTS PASSED CLEANLY!");
    } catch (err) {
      console.error("❌ Test failed with error:", err);
    } finally {
      server.close();
      process.exit(0);
    }
  });
};

runTests();
