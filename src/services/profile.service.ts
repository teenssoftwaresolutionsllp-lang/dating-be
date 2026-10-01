import fs from "node:fs";
import path from "node:path";
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
import {
  validateKycDocument,
  validateSelfiePhoto,
  validateProfilePhoto,
} from "../utils/image-validator";

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
  /**
   * Retrieves the user's verified KYC selfie image buffer from either remote Cloudinary CDN
   * or local disk fallback storage.
   */
  private async getKycSelfieBuffer(
    userId: string,
  ): Promise<Buffer | undefined> {
    const kyc = await ProfileRepository.findKycByUserId(userId);
    if (!kyc?.providerReference) {
      console.warn(
        `[ProfileService] No KYC providerReference found for user: ${userId}`,
      );
      return undefined;
    }

    const ref = kyc.providerReference.trim();
    console.log(
      `[ProfileService] Retrieving KYC selfie for user ${userId} from: ${ref}`,
    );

    // Case 1: Remote HTTP/HTTPS URL
    if (ref.startsWith("http://") || ref.startsWith("https://")) {
      try {
        const response = await fetch(ref);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          console.log(
            `[ProfileService] Successfully fetched remote KYC selfie (${buffer.length} bytes)`,
          );
          return buffer;
        }
      } catch (fetchErr) {
        console.warn(
          `[ProfileService] Failed to fetch remote KYC selfie from ${ref}:`,
          fetchErr,
        );
      }
    }

    // Case 2: Local disk file path (e.g. /uploads/profiles/... or relative/absolute path)
    try {
      const cleanPath = ref.startsWith("/") ? ref.slice(1) : ref;
      const candidates = [
        ref,
        path.join(process.cwd(), cleanPath),
        path.join(process.cwd(), ref),
        path.join(
          process.cwd(),
          "uploads",
          cleanPath.replace(/^uploads[\\\/]/, ""),
        ),
      ];

      for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          const buffer = await fs.promises.readFile(candidate);
          console.log(
            `[ProfileService] Successfully loaded local KYC selfie from ${candidate} (${buffer.length} bytes)`,
          );
          return buffer;
        }
      }
    } catch (fsErr) {
      console.warn(
        `[ProfileService] Failed to read local KYC selfie file ${ref}:`,
        fsErr,
      );
    }

    console.warn(
      `[ProfileService] Could not resolve KYC selfie image buffer from ref: ${ref}`,
    );
    return undefined;
  }

  async addPhotos(userId: string, files: Express.Multer.File[]) {
    // 1. Retrieve user's verified KYC selfie if available for face matching
    const selfieBuffer = await this.getKycSelfieBuffer(userId);
    const existingPhotos = await ProfileRepository.findPhotosByUserId(userId);

    // 2. Strict pre-upload validation: selfie matching strictly for primary photo (Slot 0)
    for (const [index, file] of files.entries()) {
      const isPrimary = existingPhotos.length === 0 && index === 0;
      const validation = validateProfilePhoto(
        file.buffer,
        file.originalname,
        selfieBuffer,
        isPrimary,
      );
      if (!validation.isValid) {
        const error = new Error(
          validation.error || "Invalid profile photo",
        ) as AppError;
        error.statusCode = 400;
        error.code = validation.code || "INVALID_PROFILE_PHOTO";
        throw error;
      }
    }

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

  async getMyProfile(userId: string) {
    const status = await ProfileRepository.findOnboardingStatus(userId);

    if (!status) {
      throw createNotFoundError("User not found");
    }

    return ProfileRepository.findCompleteByUserId(userId);
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

    const existingEducation =
      await ProfileRepository.findEducationByUserId(userId);
    if (!existingEducation && !values.educationLevel) {
      const error = new Error(
        "educationLevel is required for the first education update",
      ) as AppError;
      error.statusCode = 400;
      error.code = "EDUCATION_LEVEL_REQUIRED";
      throw error;
    }

    return ProfileRepository.upsertEducation(userId, values);
  }

  async submitKyc(
    userId: string,
    documentType: string,
    documentNumber: string | undefined,
    documentImage?: { buffer: Buffer; originalName: string },
    selfieImage?: { buffer: Buffer; originalName: string },
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

    // Validate Government ID document photo
    const docValidation = await validateKycDocument(
      documentImage.buffer,
      documentImage.originalName,
      documentType,
    );
    if (!docValidation.isValid) {
      const error = new Error(
        docValidation.error || "Invalid government ID photo",
      ) as AppError;
      error.statusCode = 400;
      error.code = docValidation.code || "INVALID_KYC_DOCUMENT";
      throw error;
    }

    // Validate Selfie photo if provided
    if (selfieImage) {
      const selfieValidation = validateSelfiePhoto(
        selfieImage.buffer,
        selfieImage.originalName,
      );
      if (!selfieValidation.isValid) {
        const error = new Error(
          selfieValidation.error || "Invalid selfie photo",
        ) as AppError;
        error.statusCode = 400;
        error.code = selfieValidation.code || "INVALID_SELFIE";
        throw error;
      }
    }

    let selfieUrl: string | undefined;
    let selfiePublicId: string | undefined;

    if (selfieImage) {
      try {
        const selfieAsset = await uploadProfilePhoto(
          selfieImage.buffer,
          `${userId}-kyc-selfie`,
          selfieImage.originalName,
        );
        selfieUrl = selfieAsset.secure_url;
        selfiePublicId = selfieAsset.public_id;
      } catch (selfieUploadError) {
        console.warn("Failed to upload KYC selfie asset:", selfieUploadError);
      }
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
        selfieUrl,
        selfiePublicId,
      );

      return { status: kyc.status };
    } catch (error) {
      try {
        await deleteCloudinaryAsset(uploadedAsset.public_id);
        if (selfiePublicId) {
          await deleteCloudinaryAsset(selfiePublicId);
        }
      } catch (cleanupError) {
        console.error("Failed to clean up KYC document:", cleanupError);
      }
      throw error;
    }
  }

  async validateKycDoc(
    documentType: string,
    file?: { buffer: Buffer; originalName: string },
  ): Promise<{ valid: boolean; message: string; metadata?: any }> {
    if (!file) {
      const error = new Error(
        "Document photo is required for verification",
      ) as AppError;
      error.statusCode = 400;
      error.code = "DOCUMENT_PHOTO_REQUIRED";
      throw error;
    }

    const validation = await validateKycDocument(
      file.buffer,
      file.originalName,
      documentType,
    );

    if (!validation.isValid) {
      const error = new Error(
        validation.error || "Invalid government ID photo",
      ) as AppError;
      error.statusCode = 400;
      error.code = validation.code || "INVALID_KYC_DOCUMENT";
      throw error;
    }

    return {
      valid: true,
      message: "Government ID document photo verified successfully.",
      metadata: validation.metadata,
    };
  }

  async validateSelfieDoc(file?: {
    buffer: Buffer;
    originalName: string;
  }): Promise<{ valid: boolean; message: string; metadata?: any }> {
    if (!file) {
      const error = new Error(
        "Selfie photo is required for verification",
      ) as AppError;
      error.statusCode = 400;
      error.code = "SELFIE_PHOTO_REQUIRED";
      throw error;
    }

    const validation = validateSelfiePhoto(file.buffer, file.originalName);

    if (!validation.isValid) {
      const error = new Error(
        validation.error || "Invalid selfie photo",
      ) as AppError;
      error.statusCode = 400;
      error.code = validation.code || "INVALID_SELFIE";
      throw error;
    }

    return {
      valid: true,
      message: "Selfie verified successfully.",
      metadata: validation.metadata,
    };
  }

  async validateSinglePhoto(
    userId: string,
    file?: { buffer: Buffer; originalName: string },
    isPrimary: boolean = false,
  ): Promise<{ valid: boolean; message: string; metadata?: any }> {
    if (!file) {
      const error = new Error("Photo file is required") as AppError;
      error.statusCode = 400;
      error.code = "PHOTO_REQUIRED";
      throw error;
    }

    let selfieBuffer: Buffer | undefined;
    if (isPrimary) {
      selfieBuffer = await this.getKycSelfieBuffer(userId);
      console.log(
        `[validateSinglePhoto] User ${userId}, isPrimary=${isPrimary}, selfieBuffer available: ${Boolean(selfieBuffer)}`,
      );
    }

    const validation = validateProfilePhoto(
      file.buffer,
      file.originalName,
      selfieBuffer,
      isPrimary,
    );

    if (!validation.isValid) {
      const error = new Error(validation.error || "Invalid photo") as AppError;
      error.statusCode = 400;
      error.code = validation.code || "INVALID_PHOTO";
      throw error;
    }

    return {
      valid: true,
      message: isPrimary
        ? "Main profile photo matches your verified selfie!"
        : "Photo verified successfully!",
      metadata: validation.metadata,
    };
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

    if (!data.profile?.locationId) {
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
    const hasLocation = Boolean(profile.locationId);

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
      hasLocation
    ) {
      nextStep = "RELATIONSHIP";
    }

    if (
      profile.name &&
      profile.gender &&
      profile.dateOfBirth &&
      profile.heightCm &&
      hasLocation &&
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
