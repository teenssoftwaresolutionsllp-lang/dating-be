/**
 * Profile Trust & Completeness Score Calculator
 * 
 * Computes profile trustworthiness tier:
 * - 25% (Red): Basic Information completed (Name, DOB, Gender, City, Bio)
 * - 50% (Yellow): + Education & Career details (Degree, Profession, Company, Income)
 * - 75% (Blue): + Visual & Cultural details (Photos + Spoken Languages / Interests)
 * - 100% (Green): + Government KYC Identity Verification completed (Aadhaar / Passport / ID)
 */

export interface TrustScoreInput {
  hasBasicInfo: boolean;
  hasEducation: boolean;
  hasPhotosAndLanguages: boolean;
  isKycVerified: boolean;
}

export interface TrustScoreResult {
  score: number; // 25, 50, 75, 100
  badge: "25%" | "50%" | "75%" | "100%";
  color: "red" | "yellow" | "blue" | "green";
  tier: "basic" | "moderate" | "high" | "verified";
  isVerified: boolean;
  breakdown: {
    basicInfo: boolean;
    educationAndCareer: boolean;
    photosAndLanguages: boolean;
    kycVerified: boolean;
  };
}

export function calculateTrustScore(input: TrustScoreInput): TrustScoreResult {
  let score = 0;

  // Basic Info (+25%)
  if (input.hasBasicInfo) {
    score += 25;
  }

  // Education & Career (+25%)
  if (input.hasEducation) {
    score += 25;
  }

  // Photos & Languages (+25%)
  if (input.hasPhotosAndLanguages) {
    score += 25;
  }

  // KYC Verified (+25%)
  if (input.isKycVerified) {
    score += 25;
  }

  // Ensure minimum baseline if profile exists
  if (score === 0) {
    score = 25;
  }

  let badge: "25%" | "50%" | "75%" | "100%" = "25%";
  let color: "red" | "yellow" | "blue" | "green" = "red";
  let tier: "basic" | "moderate" | "high" | "verified" = "basic";

  if (score >= 100) {
    score = 100;
    badge = "100%";
    color = "green";
    tier = "verified";
  } else if (score >= 75) {
    badge = "75%";
    color = "blue";
    tier = "high";
  } else if (score >= 50) {
    badge = "50%";
    color = "yellow";
    tier = "moderate";
  } else {
    badge = "25%";
    color = "red";
    tier = "basic";
  }

  return {
    score,
    badge,
    color,
    tier,
    isVerified: input.isKycVerified,
    breakdown: {
      basicInfo: input.hasBasicInfo,
      educationAndCareer: input.hasEducation,
      photosAndLanguages: input.hasPhotosAndLanguages,
      kycVerified: input.isKycVerified,
    },
  };
}

/**
 * Format height in cm to feet & inches (e.g. 168 cm -> "5.6 fts")
 */
export function formatHeightToFeet(heightCm?: number | null): string | null {
  if (!heightCm || heightCm <= 0) return null;
  const totalInches = heightCm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}.${inches} fts`;
}

/**
 * Calculate age from date of birth string (YYYY-MM-DD)
 */
export function calculateAge(dobString?: string | null): number | null {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}
