import { createHash } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import type { Profile } from "../db/schema/profiles.schema";
import type { Language } from "../db/schema/languages.schema";
import ProfileRepository, {
  type ProfileUpdate,
} from "../repositories/profile.repository";
import type { AppError } from "../types/index";
import { uploadDirectory } from "../middleware/photo-upload.middleware";

export const ONBOARDING_STEPS = [
  "BASIC_DETAILS",
  "BIRTHDAY",
  "LOCATION",
  "RELATIONSHIP",
  "LANGUAGES",
  "EDUCATION",
  "KYC",
  "PHOTOS",
  "INTERESTS",
  "RELIGION",
  "LOOKING_FOR",
  "PREFERENCES",
  "COMPLETED",
] as const;

const createNotFoundError = (message: string): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = 404;
  error.code = "USER_NOT_FOUND";
  return error;
};

class ProfileService {
  async addPhoto(userId: string, file: Express.Multer.File) {
    const existingPhotos = await ProfileRepository.findPhotosByUserId(userId);
    const storageKey = file.filename;
    const photo = await ProfileRepository.createProfilePhoto({
      userId,
      storageKey,
      url: `/uploads/profile-photos/${file.filename}`,
      displayOrder: existingPhotos.length,
      isPrimary: existingPhotos.length === 0,
      verificationStatus: "pending",
    });

    return photo;
  }

  async getPhotos(userId: string) {
    return ProfileRepository.findPhotosByUserId(userId);
  }

  async deletePhoto(userId: string, photoId: string): Promise<void> {
    const photo = await ProfileRepository.deleteProfilePhoto(userId, photoId);

    if (!photo) {
      const error = new Error("Photo not found") as AppError;
      error.statusCode = 404;
      error.code = "PHOTO_NOT_FOUND";
      throw error;
    }

    const filePath = path.join(uploadDirectory, photo.storageKey);
    try {
      await unlink(filePath);
    } catch (error: unknown) {
      const fileError = error as { code?: string };
      if (fileError.code !== "ENOENT") {
        console.error("Failed to remove profile photo file:", error);
      }
    }
  }

  async getOnboardingStatus(userId: string): Promise<{
    onboardingStep: string;
    completed: boolean;
  }> {
    const status = await ProfileRepository.findOnboardingStatus(userId);

    if (!status) {
      throw createNotFoundError("User not found");
    }

    return {
      onboardingStep: status.onboardingStep,
      completed: status.onboardingCompletedAt !== null,
    };
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const status = await ProfileRepository.findOnboardingStatus(userId);

    if (!status) {
      throw createNotFoundError("User not found");
    }

    return (await ProfileRepository.findByUserId(userId)) ?? null;
  }

  async updateProfile(userId: string, values: ProfileUpdate): Promise<Profile> {
    const status = await ProfileRepository.findOnboardingStatus(userId);

    if (!status) {
      throw createNotFoundError("User not found");
    }

    const existingProfile = await ProfileRepository.findByUserId(userId);

    const mergedProfile = {
      ...existingProfile,
      ...values,
    };

    const nextStep = this.getNextStep(mergedProfile, status.onboardingStep);

    return ProfileRepository.saveProfileAndStep(userId, values, nextStep);
  }

  async getLanguages(): Promise<Language[]> {
    return ProfileRepository.findLanguages();
  }

  async getInterests() {
    return ProfileRepository.findInterests();
  }

  async updateInterests(
    userId: string,
    interestIds: number[],
  ): Promise<number[]> {
    const user = await ProfileRepository.findOnboardingStatus(userId);
    if (!user) {
      throw createNotFoundError("User not found");
    }

    const profile = await ProfileRepository.findByUserId(userId);
    if (!profile) {
      const error = new Error(
        "Complete basic profile details first",
      ) as AppError;
      error.statusCode = 400;
      error.code = "PROFILE_REQUIRED";
      throw error;
    }

    const savedIds = await ProfileRepository.replaceProfileInterests(
      userId,
      interestIds,
    );

    if (savedIds.length !== interestIds.length) {
      const error = new Error(
        "One or more interest IDs do not exist",
      ) as AppError;
      error.statusCode = 400;
      error.code = "INVALID_INTEREST_IDS";
      throw error;
    }

    return savedIds;
  }

  async updateLanguages(
    userId: string,
    languageIds: number[],
  ): Promise<number[]> {
    const user = await ProfileRepository.findOnboardingStatus(userId);
    if (!user) {
      throw createNotFoundError("User not found");
    }

    const profile = await ProfileRepository.findByUserId(userId);
    if (!profile) {
      const error = new Error(
        "Complete basic profile details first",
      ) as AppError;
      error.statusCode = 400;
      error.code = "PROFILE_REQUIRED";
      throw error;
    }

    const savedIds = await ProfileRepository.replaceProfileLanguages(
      userId,
      languageIds,
    );

    if (savedIds.length !== languageIds.length) {
      const error = new Error(
        "One or more language IDs do not exist",
      ) as AppError;
      error.statusCode = 400;
      error.code = "INVALID_LANGUAGE_IDS";
      throw error;
    }

    return savedIds;
  }

  async updateEducation(
    userId: string,
    values: Parameters<typeof ProfileRepository.upsertEducation>[1],
  ) {
    const user = await ProfileRepository.findOnboardingStatus(userId);
    if (!user) {
      throw createNotFoundError("User not found");
    }

    const profile = await ProfileRepository.findByUserId(userId);
    if (!profile) {
      const error = new Error(
        "Complete basic profile details first",
      ) as AppError;
      error.statusCode = 400;
      error.code = "PROFILE_REQUIRED";
      throw error;
    }

    return ProfileRepository.upsertEducation(userId, values);
  }

  async submitKyc(
    userId: string,
    documentType: string,
    documentNumber: string,
  ): Promise<{ status: string }> {
    const user = await ProfileRepository.findOnboardingStatus(userId);
    if (!user) {
      throw createNotFoundError("User not found");
    }

    const documentNumberHash = createHash("sha256")
      .update(documentNumber)
      .digest("hex");

    const kyc = await ProfileRepository.upsertKyc(
      userId,
      documentType,
      documentNumberHash,
    );

    return { status: kyc.status };
  }

  async getKyc(userId: string): Promise<{ status: string } | null> {
    const user = await ProfileRepository.findOnboardingStatus(userId);
    if (!user) {
      throw createNotFoundError("User not found");
    }

    const kyc = await ProfileRepository.findKycByUserId(userId);
    return kyc ? { status: kyc.status } : null;
  }

  async updateDatingPreferences(
    userId: string,
    values: Parameters<typeof ProfileRepository.upsertDatingPreferences>[1],
  ) {
    const user = await ProfileRepository.findOnboardingStatus(userId);
    if (!user) {
      throw createNotFoundError("User not found");
    }

    return ProfileRepository.upsertDatingPreferences(userId, values);
  }

  async completeOnboarding(userId: string): Promise<{
    completed: boolean;
    missingSteps: string[];
  }> {
    const user = await ProfileRepository.findOnboardingStatus(userId);
    if (!user) {
      throw createNotFoundError("User not found");
    }

    const data = await ProfileRepository.getCompletionData(userId);
    const missingSteps: string[] = [];

    if (
      !data.profile?.name ||
      !data.profile.dateOfBirth ||
      !data.profile.gender ||
      !data.profile.height
    ) {
      missingSteps.push("BASIC_DETAILS");
    }

    if (!data.profile?.location) {
      missingSteps.push("LOCATION");
    }

    if (!data.profile?.relationshipStatus) {
      missingSteps.push("RELATIONSHIP");
    }

    if (data.languageCount === 0) {
      missingSteps.push("LANGUAGES");
    }

    if (!data.educationExists) {
      missingSteps.push("EDUCATION");
    }

    if (data.kycStatus !== "verified") {
      missingSteps.push("KYC");
    }

    if (data.photoCount === 0) {
      missingSteps.push("PHOTOS");
    }

    if (data.interestCount === 0) {
      missingSteps.push("INTERESTS");
    }

    if (!data.preferencesExists) {
      missingSteps.push("PREFERENCES");
    }

    if (missingSteps.length > 0) {
      return { completed: false, missingSteps };
    }

    await ProfileRepository.markOnboardingCompleted(userId);
    return { completed: true, missingSteps: [] };
  }

  private getNextStep(profile: Partial<Profile>, currentStep: string): string {
    let nextStep = "BASIC_DETAILS";

    if (profile.name && profile.gender) {
      nextStep = "BIRTHDAY";
    }

    if (
      profile.name &&
      profile.gender &&
      profile.dateOfBirth &&
      profile.height
    ) {
      nextStep = "LOCATION";
    }

    if (
      profile.name &&
      profile.gender &&
      profile.dateOfBirth &&
      profile.height &&
      profile.location
    ) {
      nextStep = "RELATIONSHIP";
    }

    if (
      profile.name &&
      profile.gender &&
      profile.dateOfBirth &&
      profile.height &&
      profile.location &&
      profile.relationshipStatus
    ) {
      nextStep = "LANGUAGES";
    }

    const currentIndex = ONBOARDING_STEPS.indexOf(
      currentStep as (typeof ONBOARDING_STEPS)[number],
    );
    const nextIndex = ONBOARDING_STEPS.indexOf(
      nextStep as (typeof ONBOARDING_STEPS)[number],
    );

    if (currentIndex >= 0 && currentIndex > nextIndex) {
      return currentStep;
    }

    return nextStep;
  }
}

export default new ProfileService();
