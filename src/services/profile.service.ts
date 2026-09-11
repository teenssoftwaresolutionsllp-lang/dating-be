import { createHash } from "node:crypto";
import type { Language, Profile } from "../db/schema";
import ProfileRepository, {
  type ProfileUpdate,
} from "../repositories/profile.repository";
import type { AppError } from "../types/index";
import {
  deleteCloudinaryAsset,
  uploadProfilePhoto,
} from "./cloudinary.service";

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
  async addPhotos(userId: string, files: Express.Multer.File[]) {
    const existingPhotos = await ProfileRepository.findPhotosByUserId(userId);
    const uploadedAssets: Array<{
      publicId: string;
      file: Express.Multer.File;
      url: string;
    }> = [];

    try {
      for (const file of files) {
        const uploadedAsset = await uploadProfilePhoto(
          file.buffer,
          userId,
          file.originalname,
        );
        uploadedAssets.push({
          publicId: uploadedAsset.public_id,
          file,
          url: uploadedAsset.secure_url,
        });
      }

      const photos = [];
      for (const [index, asset] of uploadedAssets.entries()) {
        photos.push(
          await ProfileRepository.createProfilePhoto({
            userId,
            storageKey: asset.publicId,
            url: asset.url,
            displayOrder: existingPhotos.length + index,
            isPrimary: existingPhotos.length === 0 && index === 0,
            verificationStatus: "pending",
            mimeType: asset.file.mimetype,
            fileSizeBytes: asset.file.size,
          }),
        );
      }

      return photos;
    } catch (error) {
      for (const asset of uploadedAssets) {
        try {
          await deleteCloudinaryAsset(asset.publicId);
        } catch (cleanupError) {
          console.error("Failed to clean up Cloudinary photo:", cleanupError);
        }
      }

      throw error;
    }
  }

  async getPhotos(userId: string) {
    return ProfileRepository.findPhotosByUserId(userId);
  }

  async deletePhoto(userId: string, photoId: string): Promise<void> {
    const photo = await ProfileRepository.findProfilePhotoById(userId, photoId);

    if (!photo) {
      const error = new Error("Photo not found") as AppError;
      error.statusCode = 404;
      error.code = "PHOTO_NOT_FOUND";
      throw error;
    }

    try {
      await deleteCloudinaryAsset(photo.storageKey);
    } catch (error) {
      const cleanupError = new Error(
        "Could not delete the photo from Cloudinary",
      ) as AppError;
      cleanupError.statusCode = 502;
      cleanupError.code = "PHOTO_STORAGE_DELETE_FAILED";
      cleanupError.errors =
        process.env.NODE_ENV === "development" ? error : undefined;
      throw cleanupError;
    }

    await ProfileRepository.deleteProfilePhoto(userId, photoId);
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
    documentNumber: string | undefined,
    documentImage?: { buffer: Buffer; originalName: string },
  ): Promise<{ status: string }> {
    const user = await ProfileRepository.findOnboardingStatus(userId);
    if (!user) {
      throw createNotFoundError("User not found");
    }

    if (!documentImage) {
      const error = new Error("KYC document photo is required") as AppError;
      error.statusCode = 400;
      error.code = "KYC_DOCUMENT_PHOTO_REQUIRED";
      throw error;
    }

    const documentNumberHash = createHash("sha256")
      .update(documentNumber ?? `${userId}:${documentType}`)
      .digest("hex");
    const uploadedAsset = await uploadProfilePhoto(
      documentImage.buffer,
      `${userId}-kyc`,
      documentImage.originalName,
    );

    try {
      const kyc = await ProfileRepository.upsertKyc(
        userId,
        documentType,
        documentNumberHash,
        { storageKey: uploadedAsset.public_id, url: uploadedAsset.secure_url },
      );

      return { status: kyc.status };
    } catch (error) {
      try {
        await deleteCloudinaryAsset(uploadedAsset.public_id);
      } catch (cleanupError) {
        console.error("Failed to clean up KYC document:", cleanupError);
      }
      throw error;
    }
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
      !data.profile.heightCm
    ) {
      missingSteps.push("BASIC_DETAILS");
    }

    if (
      !data.profile?.city &&
      !data.profile?.state &&
      !data.profile?.country &&
      (data.profile?.latitude === null || data.profile?.longitude === null)
    ) {
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
      profile.heightCm
    ) {
      nextStep = "LOCATION";
    }

    if (
      profile.name &&
      profile.gender &&
      profile.dateOfBirth &&
      profile.heightCm &&
      (profile.city ||
        profile.state ||
        profile.country ||
        (profile.latitude !== null && profile.longitude !== null))
    ) {
      nextStep = "RELATIONSHIP";
    }

    if (
      profile.name &&
      profile.gender &&
      profile.dateOfBirth &&
      profile.heightCm &&
      (profile.city ||
        profile.state ||
        profile.country ||
        (profile.latitude !== null && profile.longitude !== null)) &&
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
