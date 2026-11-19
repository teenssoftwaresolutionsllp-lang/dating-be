import { compareFaces } from "../utils/image-validator";

export interface FaceMatchResult {
  isMatch: boolean;
  score: number;
  provider: "cashfree" | "local_fallback";
  status: "SUCCESS" | "FAILED";
  message?: string;
  error?: string;
}

export class CashfreeService {
  private static get clientId(): string {
    return process.env.CASHFREE_CLIENT_ID?.trim() || "";
  }

  private static get clientSecret(): string {
    return process.env.CASHFREE_CLIENT_SECRET?.trim() || "";
  }

  private static get baseUrl(): string {
    return (
      process.env.CASHFREE_BASE_URL?.trim() ||
      "https://sandbox.cashfree.com/verification"
    ).replace(/\/+$/, "");
  }

  private static get threshold(): number {
    const raw = process.env.CASHFREE_MIN_CONFIDENCE;
    return raw ? Number.parseFloat(raw) || 0.7 : 0.7;
  }

  public static isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  /**
   * Compare two face images using Cashfree Secure ID Face Match API.
   * If Cashfree is unavailable, unconfigured, or times out, seamlessly falls back
   * to our local biometric face comparison engine.
   *
   * @param image1 Primary reference photo (e.g. Aadhaar Photo or Verified Selfie)
   * @param image2 Target photo (e.g. Live Camera Selfie or Main Dating Profile Photo)
   */
  public static async matchFaces(
    image1: Buffer,
    image2: Buffer,
    label1: string = "reference_face",
    label2: string = "target_face",
  ): Promise<FaceMatchResult> {
    // 1. If Cashfree credentials are missing, execute local fallback
    if (!this.isConfigured()) {
      console.warn(
        "⚠️ [CashfreeService] Credentials not found; using local biometric engine.",
      );
      return this.executeLocalFallback(image1, image2);
    }

    try {
      const url = `${this.baseUrl}/face-match`;

      // Build multipart/form-data payload with image blobs
      const formData = new FormData();
      const blob1 = new Blob([new Uint8Array(image1)], { type: "image/jpeg" });
      const blob2 = new Blob([new Uint8Array(image2)], { type: "image/jpeg" });

      formData.append("first_image", blob1, `${label1}.jpg`);
      formData.append("second_image", blob2, `${label2}.jpg`);
      formData.append("threshold", String(this.threshold));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "x-client-id": this.clientId,
          "x-client-secret": this.clientSecret,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = (await response.json()) as any;

      if (!response.ok || data.status === "FAILED") {
        console.warn(
          "⚠️ [CashfreeService] API returned non-success response:",
          data,
        );
        // If Cashfree returned an explicit no-face or face-mismatch rejection
        if (data?.message && (data.message.includes("face") || data.message.includes("match"))) {
          return {
            isMatch: false,
            score: 0,
            provider: "cashfree",
            status: "FAILED",
            message: data.message,
            error: data.message,
          };
        }
        // Otherwise, fall back to local comparison
        return this.executeLocalFallback(image1, image2);
      }

      // Normalize score (handles 0.0 - 1.0 or 0 - 100)
      const rawScore = Number(data.score ?? data.similarity ?? 0);
      const normalizedScore = rawScore > 1 ? rawScore / 100 : rawScore;
      const isMatch =
        data.match_result === "MATCH" || normalizedScore >= this.threshold;

      console.log(
        `✅ [CashfreeService] Face Match Successful -> Match: ${isMatch}, Score: ${(
          normalizedScore * 100
        ).toFixed(1)}%`,
      );

      return {
        isMatch,
        score: Math.round(normalizedScore * 100) / 100,
        provider: "cashfree",
        status: "SUCCESS",
        message:
          data.message ||
          (isMatch ? "Face match verified" : "Faces do not match"),
        error: isMatch
          ? undefined
          : "Face mismatch: The photos do not appear to be the same person.",
      };
    } catch (err: any) {
      console.warn(
        "⚠️ [CashfreeService] Request failed or timed out, executing local fallback:",
        err?.message || err,
      );
      return this.executeLocalFallback(image1, image2);
    }
  }

  /**
   * High-accuracy local biometric comparison fallback using lighting-invariant YCbCr metrics.
   */
  private static executeLocalFallback(
    image1: Buffer,
    image2: Buffer,
  ): FaceMatchResult {
    const localResult = compareFaces(image1, image2);
    return {
      isMatch: localResult.isMatch,
      score: localResult.similarity,
      provider: "local_fallback",
      status: localResult.isMatch ? "SUCCESS" : "FAILED",
      message: localResult.isMatch
        ? "Faces matched via local biometric engine"
        : localResult.error || "Faces do not match",
      error: localResult.isMatch ? undefined : localResult.error,
    };
  }
}

export default CashfreeService;
