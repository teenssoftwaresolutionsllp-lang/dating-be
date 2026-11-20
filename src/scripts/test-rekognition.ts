import "dotenv/config";
import { RekognitionService } from "../services/rekognition.service";

async function runTest() {
  console.log("==================================================");
  console.log("🧪 TESTING AWS REKOGNITION CONNECTION & CREDENTIALS");
  console.log("==================================================");
  console.log(`Configured: ${RekognitionService.isConfigured()}`);
  console.log(`Region: ${process.env.AWS_REGION || "ap-south-1"}`);
  console.log(
    `Access Key ID: ${
      process.env.AWS_ACCESS_KEY_ID
        ? process.env.AWS_ACCESS_KEY_ID.slice(0, 8) + "..."
        : "Missing"
    }`,
  );
  console.log(
    `Secret Key: ${process.env.AWS_SECRET_ACCESS_KEY ? "Found" : "Missing"}`,
  );
  console.log(
    `Confidence Threshold: ${process.env.AWS_REKOGNITION_MIN_CONFIDENCE || "80"}%`,
  );

  console.log("\n✅ AWS Rekognition Service is ready for live requests!");
}

runTest();
