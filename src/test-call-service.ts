import "dotenv/config";
import { AgoraService } from "./services/agora.service";
import { db } from "./db/index";
import { calls } from "./db/schema/calls";

async function testCallService() {
  console.log("------------------------------------------");
  console.log("🔍 Verifying Agora Service & Calls Schema");
  console.log("------------------------------------------");

  const appId = process.env.AGORA_APP_ID;
  const appCert = process.env.AGORA_APP_CERTIFICATE;

  console.log("App ID Configured:", !!appId, appId ? `(${appId.slice(0, 6)}...)` : "(missing)");
  console.log("App Certificate Configured:", !!appCert, appCert ? `(${appCert.slice(0, 6)}...)` : "(missing)");

  if (appId && appCert) {
    try {
      const token = AgoraService.generateRtcToken("test_channel_123", 100001);
      console.log("✅ Successfully generated Agora RTC Token:", token.slice(0, 25) + "...");
    } catch (e: any) {
      console.error("❌ Token generation failed:", e.message);
    }
  } else {
    console.log("⚠️ App ID or Certificate not yet detected in .env on disk. Make sure to save the file (Ctrl+S)!");
  }

  try {
    const existingCalls = await db.select().from(calls).limit(1);
    console.log("✅ PostgreSQL 'calls' table is verified and queryable. Current call count in DB:", existingCalls.length);
  } catch (dbErr: any) {
    console.error("❌ Database query error:", dbErr.message);
  }

  console.log("------------------------------------------");
  process.exit(0);
}

testCallService();
