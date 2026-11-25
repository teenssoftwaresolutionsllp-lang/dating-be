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
  detectedType:
  | "AADHAAR"
  | "PAN"
  | "PASSPORT"
  | "DRIVING_LICENSE"
  | "VOTER_ID"
  | "RATION_CARD"
  | "STUDENT_ID"
  | "UNSUPPORTED"
  | "UNKNOWN";
  error?: string;
}

export interface GenderVerificationResult {
  isMatch: boolean;
  detectedGender?: "Male" | "Female";
  confidence?: number;
  source?: "selfie" | "document_text" | "document_face";
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
   * if the uploaded document is one of the 4 supported Government IDs:
   * (Aadhaar Card, PAN Card, Passport, Driving License) and matches the selection.
   * Rejects any document outside the 4 IDs (Voter ID, Ration card, College ID, etc.)
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
        `📄 [AWS Rekognition DetectText] Scanned text snippet (${textLines.length} chars): ${textLines.slice(0, 160)}...`,
      );

      // 1. Aadhaar Card markers
      const isAadhaar =
        textLines.includes("aadhaar") ||
        textLines.includes("aadhar") ||
        textLines.includes("unique identification") ||
        textLines.includes("uidai") ||
        textLines.includes("मेरा आधार") ||
        textLines.includes("enrolment no") ||
        textLines.includes("enrollment no") ||
        (/\b\d{4}\s\d{4}\s\d{4}\b/.test(textLines) &&
          (textLines.includes("government") ||
            textLines.includes("govt") ||
            textLines.includes("india") ||
            textLines.includes("dob") ||
            textLines.includes("male") ||
            textLines.includes("female")));

      // 2. PAN Card markers
      const isPan =
        textLines.includes("income tax") ||
        textLines.includes("permanent account") ||
        textLines.includes("pan number") ||
        /\b[a-z]{5}\d{4}[a-z]\b/i.test(textLines) ||
        (textLines.includes("govt. of india") &&
          textLines.includes("father's name"));

      // 3. Passport markers
      const isPassport =
        textLines.includes("passport") ||
        textLines.includes("passeport") ||
        textLines.includes("republic of india") ||
        (textLines.includes("country code") &&
          textLines.includes("nationality")) ||
        /p<ind/i.test(textLines) ||
        /p<[a-z]{3}/i.test(textLines) ||
        textLines.includes("<<<<<");

      // 4. Driving License markers
      const isDrivingLicense =
        textLines.includes("driving licence") ||
        textLines.includes("driving license") ||
        textLines.includes("motor vehicles act") ||
        textLines.includes("transport department") ||
        textLines.includes("licencing authority") ||
        textLines.includes("licensing authority") ||
        textLines.includes("authorisation to drive") ||
        textLines.includes("driving permit") ||
        /\bdl\s*no\b/i.test(textLines) ||
        /\bd\.l\.\s*no\b/i.test(textLines);

      // 5. Unsupported Government ID markers (Voter ID, Ration Card, Student ID, RC, etc.)
      const isVoterId =
        textLines.includes("election commission") ||
        textLines.includes("elector photo identity") ||
        textLines.includes("voter") ||
        textLines.includes("निर्वाचन आयोग") ||
        /\bepic\s*no\b/i.test(textLines) ||
        /\bepic\b/i.test(textLines);

      const isRationCard =
        textLines.includes("ration card") ||
        textLines.includes("खाद्य एवं रसद") ||
        textLines.includes("food & civil supplies") ||
        textLines.includes("consumer affairs, food");

      const isStudentOrWorkId =
        textLines.includes("student id") ||
        textLines.includes("student identity") ||
        textLines.includes("hall ticket") ||
        textLines.includes("college id") ||
        textLines.includes("employee id") ||
        textLines.includes("staff id");

      const isVehicleRc =
        textLines.includes("registration certificate") ||
        textLines.includes("chassis no") ||
        textLines.includes("engine no");

      // Resolve the expected document category
      const normExpected = expectedType.toLowerCase().trim();
      let expectedCategory:
        | "AADHAAR"
        | "PAN"
        | "PASSPORT"
        | "DRIVING_LICENSE"
        | "UNKNOWN" = "UNKNOWN";
      let expectedLabel = expectedType;

      if (normExpected.includes("aadhaar") || normExpected.includes("aadhar")) {
        expectedCategory = "AADHAAR";
        expectedLabel = "Aadhaar Card";
      } else if (normExpected.includes("pan")) {
        expectedCategory = "PAN";
        expectedLabel = "PAN Card";
      } else if (normExpected.includes("passport")) {
        expectedCategory = "PASSPORT";
        expectedLabel = "Passport";
      } else if (
        normExpected.includes("driving") ||
        normExpected.includes("licen") ||
        normExpected === "dl"
      ) {
        expectedCategory = "DRIVING_LICENSE";
        expectedLabel = "Driving License";
      }

      // Check if uploaded document is an explicitly detected UNSUPPORTED ID
      if (isVoterId) {
        return {
          isValidDocument: false,
          detectedType: "VOTER_ID",
          error: `Unsupported Document: Voter ID is not supported. Please upload your selected Government ID (${expectedLabel}). Only Aadhaar Card, PAN Card, Passport, or Driving License are accepted.`,
        };
      }

      if (isRationCard) {
        return {
          isValidDocument: false,
          detectedType: "RATION_CARD",
          error: `Unsupported Document: Ration Card is not supported. Please upload your selected Government ID (${expectedLabel}). Only Aadhaar Card, PAN Card, Passport, or Driving License are accepted.`,
        };
      }

      if (isStudentOrWorkId) {
        return {
          isValidDocument: false,
          detectedType: "STUDENT_ID",
          error: `Unsupported Document: Student/Employee ID is not supported. Please upload your selected Government ID (${expectedLabel}). Only Aadhaar Card, PAN Card, Passport, or Driving License are accepted.`,
        };
      }

      if (isVehicleRc) {
        return {
          isValidDocument: false,
          detectedType: "UNSUPPORTED",
          error: `Unsupported Document: Vehicle Registration Certificate (RC) is not supported. Please upload your selected Government ID (${expectedLabel}). Only Aadhaar Card, PAN Card, Passport, or Driving License are accepted.`,
        };
      }

      // Determine which of the 4 supported IDs was detected
      let detectedCategory:
        | "AADHAAR"
        | "PAN"
        | "PASSPORT"
        | "DRIVING_LICENSE"
        | null = null;
      let detectedLabel = "";

      if (isAadhaar) {
        detectedCategory = "AADHAAR";
        detectedLabel = "Aadhaar Card";
      } else if (isPan) {
        detectedCategory = "PAN";
        detectedLabel = "PAN Card";
      } else if (isPassport) {
        detectedCategory = "PASSPORT";
        detectedLabel = "Passport";
      } else if (isDrivingLicense) {
        detectedCategory = "DRIVING_LICENSE";
        detectedLabel = "Driving License";
      }

      // Check for mismatch among the 4 supported IDs
      if (
        detectedCategory &&
        expectedCategory !== "UNKNOWN" &&
        detectedCategory !== expectedCategory
      ) {
        console.warn(
          `⚠️ [AWS Rekognition] Document Mismatch: User selected ${expectedLabel}, but uploaded ${detectedLabel}!`,
        );
        return {
          isValidDocument: false,
          detectedType: detectedCategory,
          error: `Document Mismatch: You selected ${expectedLabel}, but uploaded a ${detectedLabel} photo. Please upload your selected Government ID (${expectedLabel}).`,
        };
      }

      // Check if uploaded document matches expected type
      if (expectedCategory === "AADHAAR" && !isAadhaar) {
        return {
          isValidDocument: false,
          detectedType: "UNKNOWN",
          error: `Please upload your selected Government ID (Aadhaar Card). Only Aadhaar Card, PAN Card, Passport, or Driving License are supported.`,
        };
      }

      if (expectedCategory === "PAN" && !isPan) {
        return {
          isValidDocument: false,
          detectedType: "UNKNOWN",
          error: `Please upload your selected Government ID (PAN Card). Only Aadhaar Card, PAN Card, Passport, or Driving License are supported.`,
        };
      }

      if (expectedCategory === "PASSPORT" && !isPassport) {
        return {
          isValidDocument: false,
          detectedType: "UNKNOWN",
          error: `Please upload your selected Government ID (Passport). Only Aadhaar Card, PAN Card, Passport, or Driving License are supported.`,
        };
      }

      if (expectedCategory === "DRIVING_LICENSE" && !isDrivingLicense) {
        return {
          isValidDocument: false,
          detectedType: "UNKNOWN",
          error: `Please upload your selected Government ID (Driving License). Only Aadhaar Card, PAN Card, Passport, or Driving License are supported.`,
        };
      }

      // If text detections were completely empty / unreadable
      if (!detectedCategory && textLines.length < 10) {
        return {
          isValidDocument: false,
          detectedType: "UNKNOWN",
          error: `Unable to read document details. Please upload a clear, legible photo of your selected Government ID (${expectedLabel}).`,
        };
      }

      return {
        isValidDocument: true,
        detectedType: detectedCategory || "UNKNOWN",
      };
    } catch (err: any) {
      console.warn(
        "⚠️ [AWS Rekognition] Text detection error:",
        err?.message || err,
      );
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

  /**
   * 4. GENDER VERIFICATION
   * Validates that the uploaded live selfie and Government ID match the user's selected profile gender.
   * Uses both AWS Rekognition facial gender analysis (DetectFaces with Attributes: ALL)
   * and Government ID document text analysis (DetectText).
   */
  public static async verifyGender(
    selfieBuffer: Buffer,
    documentBuffer?: Buffer,
    expectedGender?: string, // e.g. "female" | "male"
  ): Promise<GenderVerificationResult> {
    if (!this.isConfigured() || !expectedGender) {
      return { isMatch: true };
    }

    const normExpected = expectedGender.toLowerCase().trim();
    if (normExpected !== "female" && normExpected !== "male") {
      // Non-binary or other: bypass binary check
      return { isMatch: true };
    }

    const expectedLabel = normExpected === "female" ? "Female" : "Male";

    try {
      // 1. Analyze Live Selfie face for gender
      const selfieCommand = new DetectFacesCommand({
        Image: { Bytes: selfieBuffer },
        Attributes: ["ALL"],
      });
      const selfieRes = await this.client.send(selfieCommand);
      const face = selfieRes.FaceDetails?.[0];

      if (
        face &&
        face.Gender &&
        face.Gender.Value &&
        (face.Gender.Confidence || 0) >= 85
      ) {
        const detectedGender = face.Gender.Value as "Male" | "Female";
        const confidence = Math.round(face.Gender.Confidence || 0);
        console.log(
          `👤 [AWS Rekognition Gender] Live Selfie detected as: ${detectedGender} (${confidence}% confidence). Expected: ${expectedLabel}`,
        );

        if (detectedGender.toLowerCase() !== normExpected) {
          console.warn(
            `⚠️ [Gender Mismatch] User selected ${expectedLabel}, but live selfie detected as ${detectedGender} (${confidence}%)`,
          );
          return {
            isMatch: false,
            detectedGender,
            confidence,
            source: "selfie",
            error: `Gender Mismatch: You selected ${expectedLabel} in your profile, but uploaded a ${detectedGender} selfie. Please ensure your documents and selfie match your profile details.`,
          };
        }
      }

      // 2. If documentBuffer provided, check Government ID text for gender
      if (documentBuffer) {
        const textCommand = new DetectTextCommand({
          Image: { Bytes: documentBuffer },
        });
        const textRes = await this.client.send(textCommand);
        const textLines = (textRes.TextDetections || [])
          .map((t) => (t.DetectedText || "").toLowerCase())
          .join(" ");

        let docGender: "Male" | "Female" | null = null;

        // Check for female markers first (since 'female' contains 'male')
        if (
          textLines.includes("female") ||
          textLines.includes("महिला") ||
          textLines.includes("sex: f") ||
          textLines.includes("sex : f") ||
          textLines.includes("gender: f") ||
          /\bsex\s+f\b/i.test(textLines)
        ) {
          docGender = "Female";
        } else if (
          textLines.includes("male") ||
          textLines.includes("पुरुष") ||
          textLines.includes("sex: m") ||
          textLines.includes("sex : m") ||
          textLines.includes("gender: m") ||
          /\bsex\s+m\b/i.test(textLines)
        ) {
          docGender = "Male";
        }

        if (docGender && docGender.toLowerCase() !== normExpected) {
          console.warn(
            `⚠️ [Gender Mismatch] User selected ${expectedLabel}, but Government ID text indicates ${docGender}`,
          );
          return {
            isMatch: false,
            detectedGender: docGender,
            source: "document_text",
            error: `Gender Mismatch: You selected ${expectedLabel} in your profile, but uploaded a ${docGender} Government ID. Please ensure your documents match your profile details.`,
          };
        }
      }

      return { isMatch: true };
    } catch (err: any) {
      console.warn(
        "⚠️ [AWS Rekognition] Gender verification warning:",
        err?.message || err,
      );
      return { isMatch: true };
    }
  }
}

export default RekognitionService;
