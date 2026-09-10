import { Router } from "express";
import ProfileController from "../controllers/profile.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import {
  handlePhotoUploadError,
  uploadProfilePhoto,
} from "../middleware/photo-upload.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { profileUpdateSchema } from "../validation/profile.validation";
import {
  educationSchema,
  datingPreferencesSchema,
  interestSelectionSchema,
  kycSchema,
  languageSelectionSchema,
} from "../validation/onboarding.validation";

const router = Router();

// Return the saved onboarding step so the client can resume onboarding.
router.get(
  "/onboarding/status",
  authenticate,
  asyncHandler(ProfileController.getOnboardingStatus),
);

// Return the authenticated user's saved profile for pre-filling forms.
router.get(
  "/profile/me",
  authenticate,
  asyncHandler(ProfileController.getProfile),
);

// Create or update core profile fields such as name, birthday, gender, and height.
router.patch(
  "/profile",
  authenticate,
  validateBody(profileUpdateSchema),
  asyncHandler(ProfileController.updateProfile),
);

// Upload a profile image to Cloudinary and save its metadata in PostgreSQL.
router.post(
  "/profile/photos",
  authenticate,
  uploadProfilePhoto.single("photo"),
  handlePhotoUploadError,
  asyncHandler(ProfileController.uploadPhoto),
);

// Return the authenticated user's uploaded photo metadata and URLs.
router.get(
  "/profile/photos",
  authenticate,
  asyncHandler(ProfileController.getPhotos),
);

// Delete a photo only when it belongs to the authenticated user.
router.delete(
  "/profile/photos/:photoId",
  authenticate,
  asyncHandler(ProfileController.deletePhoto),
);

// Return predefined reference data for onboarding selection controls.
router.get("/languages", asyncHandler(ProfileController.getLanguages));
router.get("/interests", asyncHandler(ProfileController.getInterests));

// Replace the authenticated user's complete language selection.
router.put(
  "/profile/languages",
  authenticate,
  validateBody(languageSelectionSchema),
  asyncHandler(ProfileController.updateLanguages),
);

// Replace the authenticated user's complete interest selection.
router.put(
  "/profile/interests",
  authenticate,
  validateBody(interestSelectionSchema),
  asyncHandler(ProfileController.updateInterests),
);

// Create or update the authenticated user's education record.
router.put(
  "/profile/education",
  authenticate,
  validateBody(educationSchema),
  asyncHandler(ProfileController.updateEducation),
);

// Submit KYC data; the service stores only a hash of the document number.
router.post(
  "/kyc",
  authenticate,
  validateBody(kycSchema),
  asyncHandler(ProfileController.submitKyc),
);

// Return the authenticated user's safe KYC status without sensitive data.
router.get("/kyc", authenticate, asyncHandler(ProfileController.getKyc));

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
