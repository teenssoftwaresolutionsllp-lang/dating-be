export interface FaceMatchResult {
  isMatch: boolean;
  score: number;
  provider: "cashfree";
  status: "SUCCESS" | "FAILED";
  referenceId?: string;
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
   * Compare two face images strictly using Cashfree Secure ID Face Match API.
   * Pure cloud biometric verification — zero local heuristics or fallbacks.
   *
   * @param image1 Primary reference photo (e.g. Aadhaar/PAN Card Photo or Verified Selfie)
   * @param image2 Target photo (e.g. Live Camera Selfie or Main Dating Profile Photo)
   */
  public static async matchFaces(
    image1: Buffer,
    image2: Buffer,
    label1: string = "reference_face",
    label2: string = "target_face",
  ): Promise<FaceMatchResult> {
    if (!this.isConfigured()) {
      return {
        isMatch: false,
        score: 0,
        provider: "cashfree",
        status: "FAILED",
        error:
          "Cashfree credentials missing. Please set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in Render Environment.",
      };
    }

    try {
      const url = `${this.baseUrl}/face-match`;
      const verificationId = `cf_fm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const formData = new FormData();
      formData.append("verification_id", verificationId);

      const blob1 = new Blob([new Uint8Array(image1)], { type: "image/jpeg" });
      const blob2 = new Blob([new Uint8Array(image2)], { type: "image/jpeg" });

      formData.append("first_image", blob1, `${label1}.jpg`);
      formData.append("second_image", blob2, `${label2}.jpg`);
      formData.append("threshold", String(this.threshold));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

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
      console.log("📡 [Cashfree Secure ID] Raw API Response:", JSON.stringify(data));

      // 1. Check for IP Whitelisting / 2FA / Authentication errors from Cashfree
      if (
        data?.code === "ip_validation_failed" ||
        data?.type === "authentication_error" ||
        data?.sub_code === "IP_NOT_WHITELISTED"
      ) {
        const ipMatch = data.message?.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
        const ip = ipMatch ? ipMatch[0] : "74.220.52.132";
        return {
          isMatch: false,
          score: 0,
          provider: "cashfree",
          status: "FAILED",
          message: data.message,
          error: `Cashfree Security Block: Server IP (${ip}) is not whitelisted. Please add ${ip} to Cashfree Dashboard -> Secure ID -> Two-Factor Authentication -> IP Whitelist.`,
        };
      }

      const output = data?.output || data;
      const faceMatchResult =
        output?.face_match_result ??
        data?.face_match_result ??
        (output?.match_result === "MATCH"
          ? "YES"
          : output?.match_result === "MISMATCH"
            ? "NO"
            : undefined);

      const rawScore = Number(
        output?.face_match_score ??
          output?.score ??
          output?.similarity ??
          data?.face_match_score ??
          data?.score ??
          0,
      );
      const normalizedScore = rawScore > 1 ? rawScore / 100 : rawScore;

      // 2. Handle non-success responses or explicit face detection failures
      if (!response.ok || data.status === "FAILED") {
        console.warn("⚠️ [Cashfree Secure ID] API returned failure response:", data);
        const errorMsg =
          data?.message ||
          output?.reason ||
          "Face verification failed: Unable to detect matching human faces in the photos.";
        return {
          isMatch: false,
          score: normalizedScore,
          provider: "cashfree",
          status: "FAILED",
          message: errorMsg,
          error: errorMsg,
        };
      }

      // 3. Handle explicit face mismatch (result === "NO" or score < threshold)
      if (faceMatchResult === "NO" || normalizedScore < this.threshold) {
        return {
          isMatch: false,
          score: Math.round(normalizedScore * 100) / 100,
          provider: "cashfree",
          status: "SUCCESS",
          message: "Faces do not match",
          error:
            "Biometric Mismatch: The live selfie does not match the photo on your Government ID.",
        };
      }

      // 4. Successful match
      const refId = String(data.ref_id || data.reference_id || verificationId);
      console.log(
        `✅ [Cashfree Secure ID] Verified successfully! Score: ${(normalizedScore * 100).toFixed(1)}%, RefID: ${refId}`,
      );

      return {
        isMatch: true,
        score: Math.round(normalizedScore * 100) / 100,
        provider: "cashfree",
        status: "SUCCESS",
        referenceId: refId,
        message: `Verified by Cashfree Secure ID (Ref: ${refId})`,
      };
    } catch (err: any) {
      console.error("❌ [Cashfree Secure ID] Network or execution error:", err);
      return {
        isMatch: false,
        score: 0,
        provider: "cashfree",
        status: "FAILED",
        error:
          err?.name === "AbortError"
            ? "Cashfree Face Match API timed out. Please check server connectivity."
            : `Cashfree service error: ${err?.message || "Failed to contact Cashfree"}`,
      };
    }
  }
}

export default CashfreeService;
