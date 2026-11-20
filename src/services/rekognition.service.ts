import {
  RekognitionClient,
  CompareFacesCommand,
  DetectTextCommand,
} from "@aws-sdk/client-rekognition";

export interface FaceComparisonResult {
  isMatch: boolean;
  similarity: number;
  provider: "aws_rekognition";
  error?: string;
}

export interface DocumentTextCheckResult {
  isValidDocument: boolean;
  detectedType: "AADHAAR" | "PAN" | "UNKNOWN";
  error?: string;
}

export class RekognitionService {
  private static get client(): RekognitionClient {
    return new RekognitionClient({
      region: process.env.AWS_REGION?.trim() || "ap-south-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim() || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim() || "",
      },
    });
  }

  private static get threshold(): number {
    const raw = process.env.AWS_REKOGNITION_MIN_CONFIDENCE;
    return raw ? Number.parseFloat(raw) || 80 : 80;
  }

  public static isConfigured(): boolean {
    return Boolean(
      process.env.AWS_ACCESS_KEY_ID?.trim() &&
        process.env.AWS_SECRET_ACCESS_KEY?.trim(),
    );
  }

  /**
   * 1. CLOUD OCR DOCUMENT VERIFICATION
   * Uses AWS Rekognition Text Detection in the cloud to accurately identify
   * if the uploaded document is an Aadhaar Card, PAN Card, or a mismatched card.
   * Runs in AWS Cloud (0MB RAM on Render, executes in ~250ms).
   */
  public static async verifyDocumentType(
    documentBuffer: Buffer,
    expectedType: string,
  ): Promise<DocumentTextCheckResult> {
    if (!this.isConfigured()) {
      return { isValidDocument: true, detectedType: "UNKNOWN" };
    }

    try {
      const command = new DetectTextCommand({
        Image: { Bytes: documentBuffer },
      });

      const response = await this.client.send(command);
      const textLines = (response.TextDetections || [])
        .map((t) => (t.DetectedText || "").toLowerCase())
        .join(" ");

      console.log(
        `📄 [AWS Rekognition DetectText] Scanned text snippet (${textLines.length} chars): ${textLines.slice(0, 120)}...`,
      );

      // Check for PAN Card markers
      const isPan =
        textLines.includes("income tax") ||
        textLines.includes("permanent account") ||
        textLines.includes("pan number") ||
        (textLines.includes("govt. of india") &&
          textLines.includes("father's name"));

      // Check for Aadhaar Card markers
      const isAadhaar =
        textLines.includes("aadhaar") ||
        textLines.includes("aadhar") ||
        textLines.includes("unique identification") ||
        textLines.includes("मेरा आधार") ||
        /\b\d{4}\s\d{4}\s\d{4}\b/.test(textLines);

      const normExpected = expectedType.toLowerCase().trim();

      // Case A: User selected Aadhaar, but uploaded a PAN card
      if (normExpected.includes("aadhaar") || normExpected.includes("aadhar")) {
        if (isPan && !isAadhaar) {
          console.warn("⚠️ [AWS Rekognition] User selected Aadhaar, but uploaded PAN Card!");
          return {
            isValidDocument: false,
            detectedType: "PAN",
            error:
              "Document Mismatch: You selected Aadhaar Card, but uploaded a PAN Card photo. Please upload your physical Aadhaar Card.",
          };
        }
      }

      // Case B: User selected PAN, but uploaded an Aadhaar card
      if (normExpected.includes("pan")) {
        if (isAadhaar && !isPan) {
          console.warn("⚠️ [AWS Rekognition] User selected PAN, but uploaded Aadhaar Card!");
          return {
            isValidDocument: false,
            detectedType: "AADHAAR",
            error:
              "Document Mismatch: You selected PAN Card, but uploaded an Aadhaar Card photo. Please upload your PAN Card.",
          };
        }
      }

      return {
        isValidDocument: true,
        detectedType: isAadhaar ? "AADHAAR" : isPan ? "PAN" : "UNKNOWN",
      };
    } catch (err: any) {
      console.warn("⚠️ [AWS Rekognition] Text detection error:", err?.message || err);
      // Soft-fallback if document text is slightly blurry but face can still be matched
      return { isValidDocument: true, detectedType: "UNKNOWN" };
    }
  }

  /**
   * 2. BIOMETRIC FACE MATCH
   * Compares the small printed face on the Aadhaar/Government ID card with the Live Selfie.
   * AWS Rekognition automatically detects, crops, and compares the facial geometry.
   */
  public static async compareFaces(
    sourceImage: Buffer, // Government ID or Verified Selfie
    targetImage: Buffer, // Live Camera Selfie or Profile Photo
    customThreshold?: number,
  ): Promise<FaceComparisonResult> {
    if (!this.isConfigured()) {
      return {
        isMatch: false,
        similarity: 0,
        provider: "aws_rekognition",
        error:
          "AWS Rekognition credentials missing. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in Render Environment.",
      };
    }

    const minSimilarity = customThreshold ?? this.threshold;

    try {
      const command = new CompareFacesCommand({
        SourceImage: { Bytes: sourceImage },
        TargetImage: { Bytes: targetImage },
        SimilarityThreshold: minSimilarity,
      });

      const response = await this.client.send(command);

      // 1. Check if AWS found matching faces
      const match = response.FaceMatches?.[0];
      if (match && match.Similarity && match.Similarity >= minSimilarity) {
        const score = Math.round(match.Similarity * 10) / 10;
        console.log(
          `✅ [AWS Rekognition] Biometric Face Match Verified! Similarity: ${score}% (Threshold: ${minSimilarity}%)`,
        );
        return {
          isMatch: true,
          similarity: score,
          provider: "aws_rekognition",
        };
      }

      // 2. Different faces detected
      console.warn(
        `⚠️ [AWS Rekognition] Faces do not match! Matches count: ${response.FaceMatches?.length || 0}, Unmatched: ${response.UnmatchedFaces?.length || 0}`,
      );
      return {
        isMatch: false,
        similarity: 0,
        provider: "aws_rekognition",
        error:
          "Biometric Mismatch: The live selfie does not match the photo on your Government ID. Please upload your own documents.",
      };
    } catch (err: any) {
      console.error("❌ [AWS Rekognition] Face Match Error:", err);
      if (err.name === "InvalidParameterException") {
        return {
          isMatch: false,
          similarity: 0,
          provider: "aws_rekognition",
          error:
            "Face Detection Failed: Unable to detect a clear human face in one or both of the uploaded photos. Please take a clear, well-lit photo.",
        };
      }
      return {
        isMatch: false,
        similarity: 0,
        provider: "aws_rekognition",
        error: `AWS Rekognition error: ${err.message || "Face comparison failed"}`,
      };
    }
  }
}

export default RekognitionService;
