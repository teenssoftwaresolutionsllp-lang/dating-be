import { Router } from "express";
import ProfileController from "../controllers/profile.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";

import {
  handlePhotoUploadError,
  uploadProfilePhoto,
} from "../middleware/photo-upload.middleware";
import { validateBody } from "../middleware/validation.middleware";
import {
  profileUpdateSchema,
  educationSchema,
  datingPreferencesSchema,
  interestSelectionSchema,
  kycSchema,
  languageSelectionSchema,
} from "../validation";

const router = Router();

// Return the saved onboarding step so the client can resume onboarding.
router.get(
  "/onboarding/status",
  authenticate,
  asyncHandler(ProfileController.getOnboardingStatus),
);

// Return the authenticated user's core profile fields.
router.get("/me", authenticate, asyncHandler(ProfileController.getProfile));

// Return all saved onboarding data for the authenticated user's profile.
router.get(
  "/my-profile",
  authenticate,
  asyncHandler(ProfileController.getMyProfile),
);

// Create or update core profile fields such as name, birthday, gender, and height.
router.patch(
  "/update-profile",
  authenticate,
  validateBody(profileUpdateSchema),
  asyncHandler(ProfileController.updateProfile),
);

// Return predefined reference data for onboarding selection controls.
router.get("/languages", asyncHandler(ProfileController.getLanguages));
router.get("/interests", asyncHandler(ProfileController.getInterests));

// Replace the authenticated user's complete language selection.
router.patch(
  "/languages",
  authenticate,
  validateBody(languageSelectionSchema),
  asyncHandler(ProfileController.updateLanguages),
);

// Replace the authenticated user's complete interest selection.
router.put(
  "/interests",
  authenticate,
  validateBody(interestSelectionSchema),
  asyncHandler(ProfileController.updateInterests),
);

// Create or update the authenticated user's education record.and designation.salary
router.patch(
  "/education",
  authenticate,
  validateBody(educationSchema),
  asyncHandler(ProfileController.updateEducation),
);

// Pre-validate Government ID document photo in real-time
router.post(
  "/kyc/verify-document",
  authenticate,
  uploadProfilePhoto.single("documentPhoto"),
  handlePhotoUploadError,
  asyncHandler(ProfileController.verifyKycDocument),
);

// Pre-validate live selfie photo in real-time
router.post(
  "/kyc/verify-selfie",
  authenticate,
  uploadProfilePhoto.single("selfiePhoto"),
  handlePhotoUploadError,
  asyncHandler(ProfileController.verifySelfie),
);

// Submit KYC data; the service validates both document and selfie, stores hash of document.
router.post(
  "/kyc",
  authenticate,
  uploadProfilePhoto.fields([
    { name: "documentPhoto", maxCount: 1 },
    { name: "selfiePhoto", maxCount: 1 },
  ]),
  handlePhotoUploadError,
  validateBody(kycSchema),
  asyncHandler(ProfileController.submitKyc),
);

// Return the authenticated user's safe KYC status without sensitive data.
router.get("/kyc", authenticate, asyncHandler(ProfileController.getKyc));

// Pre-validate a single profile photo (checks face + KYC selfie match if isPrimary=true, allows lifestyle if isPrimary=false)
router.post(
  "/photos/validate-photo",
  authenticate,
  uploadProfilePhoto.single("photo"),
  handlePhotoUploadError,
  asyncHandler(ProfileController.validateSinglePhoto),
);

// Upload a profile image to Cloudinary and save its metadata in PostgreSQL.
router.post(
  "/photos",
  authenticate,
  uploadProfilePhoto.array("photo", 10),
  handlePhotoUploadError,
  asyncHandler(ProfileController.uploadPhoto),
);

// Return the authenticated user's uploaded photo metadata and URLs.
router.get("/photos", authenticate, asyncHandler(ProfileController.getPhotos));

// Delete a photo only when it belongs to the authenticated user.
router.delete(
  "/photos/:photoId",
  authenticate,
  asyncHandler(ProfileController.deletePhoto),
);

// Create or update the authenticated user's dating preferences.
router.patch(
  "/dating-preferences",
  authenticate,
  validateBody(datingPreferencesSchema),
  asyncHandler(ProfileController.updateDatingPreferences),
);

// Validate all required database records before marking onboarding complete.
router.post(
  "/onboarding/complete",
  authenticate,
  asyncHandler(ProfileController.completeOnboarding),
);

export default router;
