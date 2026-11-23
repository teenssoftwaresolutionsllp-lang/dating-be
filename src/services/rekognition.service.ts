import {
  RekognitionClient,
  CompareFacesCommand,
  DetectTextCommand,
  DetectLabelsCommand,
  DetectFacesCommand,
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

export interface AiDetectionResult {
  isAiGenerated: boolean;
  reason?: string;
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
   * 1. DETECT AI-GENERATED OR SYNTHETIC IMAGES
   * Scans both image metadata/generator signatures (Midjourney, DALL-E, Stable Diffusion, etc.)
   * and uses AWS Rekognition scene/concept labels (Digital Art, Illustration, CGI, Anime, Cartoon).
   */
  public static async detectAiOrSyntheticImage(
    imageBuffer: Buffer,
  ): Promise<AiDetectionResult> {
    // A. Check for AI generator fingerprints in raw metadata (Instant, 0MB RAM)
    try {
      const headerLength = Math.min(imageBuffer.length, 64 * 1024);
      const footerLength = Math.min(imageBuffer.length, 64 * 1024);
      const head = imageBuffer.toString("binary", 0, headerLength).toLowerCase();
      const tail = imageBuffer
        .toString("binary", Math.max(0, imageBuffer.length - footerLength))
        .toLowerCase();
      const combined = head + " " + tail;

      const aiKeywords = [
        "midjourney",
        "dall-e",
        "dalle",
        "stable diffusion",
        "stablediffusion",
        "comfyui",
        "automatic1111",
        "novelai",
        "leonardo.ai",
        "leonardo ai",
        "bing image creator",
        "adobe firefly",
        "c2pa.actions.c2pa.created.generative",
        "c2pa",
        "flux.1",
        "black forest labs",
        "civitai",
        "faceapp",
        "negative prompt:",
      ];

      for (const kw of aiKeywords) {
        if (combined.includes(kw)) {
          console.warn(`⚠️ [AI Detection] Found generator keyword in metadata: "${kw}"`);
          return {
            isAiGenerated: true,
            reason:
              "AI-generated or synthetic images are not supported. Please upload a real, genuine photo of yourself.",
          };
        }
      }
    } catch {
      // Continue to cloud inspection
    }

    if (!this.isConfigured()) {
      return { isAiGenerated: false };
    }

    // B. Check with AWS Rekognition DetectLabels (Cloud AI inspection)
    try {
      const command = new DetectLabelsCommand({
        Image: { Bytes: imageBuffer },
        MaxLabels: 20,
        MinConfidence: 75,
      });

      const response = await this.client.send(command);
      const labels = response.Labels || [];

      const syntheticLabels = new Set([
        "digital art",
        "illustration",
        "drawing",
        "cartoon",
        "anime",
        "cgi",
        "animation",
        "animated",
        "graphic novel",
        "artificial intelligence",
        "avatar",
        "sketch",
        "clip art",
        "painting",
      ]);

      for (const label of labels) {
        const name = (label.Name || "").toLowerCase();
        const conf = label.Confidence || 0;
        if (syntheticLabels.has(name) && conf >= 75) {
          console.warn(
            `⚠️ [AI Detection] AWS flagged synthetic/non-photographic label: "${label.Name}" (${conf.toFixed(1)}%)`,
          );
          return {
            isAiGenerated: true,
            reason:
              "AI-generated or synthetic images are not supported. Please upload a real, genuine photo of yourself.",
          };
        }
      }
    } catch (err: any) {
      console.warn("⚠️ [AWS Rekognition] DetectLabels warning:", err?.message || err);
    }

    return { isAiGenerated: false };
  }

  /**
   * 2. CLOUD OCR DOCUMENT VERIFICATION
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
      return { isValidDocument: true, detectedType: "UNKNOWN" };
    }
  }

  /**
   * 3. BIOMETRIC FACE MATCH
   * Compares two human face photos using AWS Rekognition.
   * Can be used for:
   *  - KYC: Aadhaar card photo vs Live Camera Selfie (context = 'kyc')
   *  - Profile Photo: Verified KYC Selfie vs Main Profile Photo (context = 'main_profile')
   */
  public static async compareFaces(
    sourceImage: Buffer, // Government ID or Verified Selfie
    targetImage: Buffer, // Live Camera Selfie or Profile Photo
    customThreshold?: number,
    context: "kyc" | "main_profile" = "kyc",
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
          `✅ [AWS Rekognition] Biometric Face Match Verified! Similarity: ${score}% (Threshold: ${minSimilarity}%, Context: ${context})`,
        );
        return {
          isMatch: true,
          similarity: score,
          provider: "aws_rekognition",
        };
      }

      // 2. Different faces detected
      console.warn(
        `⚠️ [AWS Rekognition] Faces do not match! Matches count: ${response.FaceMatches?.length || 0}, Unmatched: ${response.UnmatchedFaces?.length || 0}, Context: ${context}`,
      );

      const mismatchError =
        context === "main_profile"
          ? "Main profile photo does not match your verified selfie. Please upload a clear photo of yourself."
          : "Biometric Mismatch: The live selfie does not match the photo on your Government ID. Please upload your own documents.";

      return {
        isMatch: false,
        similarity: 0,
        provider: "aws_rekognition",
        error: mismatchError,
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
