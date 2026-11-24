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

/**
 * @swagger
 * tags:
 *   - name: Profile
 *     description: User profile, onboarding, KYC, and photos
 */

/**
 * @swagger
 * /api/v1/profile/onboarding/status:
 *   get:
 *     summary: Get onboarding progress status
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding status returned
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/onboarding/status",
  authenticate,
  asyncHandler(ProfileController.getOnboardingStatus),
);

/**
 * @swagger
 * /api/v1/profile/me:
 *   get:
 *     summary: Get the authenticated user's core profile fields
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile returned
 *       401:
 *         description: Unauthorized
 */
router.get("/me", authenticate, asyncHandler(ProfileController.getProfile));

/**
 * @swagger
 * /api/v1/profile/my-profile:
 *   get:
 *     summary: Get all saved onboarding data for the authenticated user
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full profile returned
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/my-profile",
  authenticate,
  asyncHandler(ProfileController.getMyProfile),
);

/**
 * @swagger
 * /api/v1/profile/update-profile:
 *   patch:
 *     summary: Create or update core profile fields (name, birthday, gender, height)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               birthday:
 *                 type: string
 *                 format: date
 *                 example: "1995-06-15"
 *               gender:
 *                 type: string
 *                 example: "male"
 *               height:
 *                 type: number
 *                 example: 175
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 */
router.patch(
  "/update-profile",
  authenticate,
  validateBody(profileUpdateSchema),
  asyncHandler(ProfileController.updateProfile),
);

/**
 * @swagger
 * /api/v1/profile/languages:
 *   get:
 *     summary: Get list of available languages for onboarding selection
 *     tags: [Profile]
 *     responses:
 *       200:
 *         description: Languages list returned
 */
router.get("/languages", asyncHandler(ProfileController.getLanguages));

/**
 * @swagger
 * /api/v1/profile/interests:
 *   get:
 *     summary: Get list of available interests for onboarding selection
 *     tags: [Profile]
 *     responses:
 *       200:
 *         description: Interests list returned
 */
router.get("/interests", asyncHandler(ProfileController.getInterests));

/**
 * @swagger
 * /api/v1/profile/languages:
 *   patch:
 *     summary: Replace the authenticated user's language selection
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [languages]
 *             properties:
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["en", "hi"]
 *     responses:
 *       200:
 *         description: Languages updated
 *       401:
 *         description: Unauthorized
 */
router.patch(
  "/languages",
  authenticate,
  validateBody(languageSelectionSchema),
  asyncHandler(ProfileController.updateLanguages),
);

/**
 * @swagger
 * /api/v1/profile/interests:
 *   put:
 *     summary: Replace the authenticated user's interest selection
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [interests]
 *             properties:
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["travel", "music", "cooking"]
 *     responses:
 *       200:
 *         description: Interests updated
 *       401:
 *         description: Unauthorized
 */
router.put(
  "/interests",
  authenticate,
  validateBody(interestSelectionSchema),
  asyncHandler(ProfileController.updateInterests),
);

/**
 * @swagger
 * /api/v1/profile/education:
 *   patch:
 *     summary: Create or update education, designation, and salary info
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               degree:
 *                 type: string
 *                 example: "B.Tech"
 *               institution:
 *                 type: string
 *                 example: "IIT Delhi"
 *               designation:
 *                 type: string
 *                 example: "Software Engineer"
 *               salary:
 *                 type: number
 *                 example: 1200000
 *     responses:
 *       200:
 *         description: Education updated
 *       401:
 *         description: Unauthorized
 */
router.patch(
  "/education",
  authenticate,
  validateBody(educationSchema),
  asyncHandler(ProfileController.updateEducation),
);

/**
 * @swagger
 * /api/v1/profile/kyc/verify-document:
 *   post:
 *     summary: Pre-validate Government ID document photo in real-time
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [documentPhoto]
 *             properties:
 *               documentPhoto:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Document validated
 *       400:
 *         description: Invalid document
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/kyc/verify-document",
  authenticate,
  uploadProfilePhoto.single("documentPhoto"),
  handlePhotoUploadError,
  asyncHandler(ProfileController.verifyKycDocument),
);

/**
 * @swagger
 * /api/v1/profile/kyc/verify-selfie:
 *   post:
 *     summary: Pre-validate live selfie photo in real-time
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [selfiePhoto]
 *             properties:
 *               selfiePhoto:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Selfie validated
 *       400:
 *         description: Invalid selfie
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/kyc/verify-selfie",
  authenticate,
  uploadProfilePhoto.single("selfiePhoto"),
  handlePhotoUploadError,
  asyncHandler(ProfileController.verifySelfie),
);

/**
 * @swagger
 * /api/v1/profile/kyc:
 *   post:
 *     summary: Submit KYC with document and selfie photos
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [documentPhoto, selfiePhoto]
 *             properties:
 *               documentPhoto:
 *                 type: string
 *                 format: binary
 *               selfiePhoto:
 *                 type: string
 *                 format: binary
 *               documentType:
 *                 type: string
 *                 example: "aadhar"
 *     responses:
 *       200:
 *         description: KYC submitted successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /api/v1/profile/kyc:
 *   get:
 *     summary: Get the authenticated user's KYC status
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC status returned
 *       401:
 *         description: Unauthorized
 */
router.get("/kyc", authenticate, asyncHandler(ProfileController.getKyc));

/**
 * @swagger
 * /api/v1/profile/photos/validate-photo:
 *   post:
 *     summary: Pre-validate a single profile photo
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [photo]
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *               isPrimary:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Photo validated
 *       400:
 *         description: Invalid photo
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/photos/validate-photo",
  authenticate,
  uploadProfilePhoto.single("photo"),
  handlePhotoUploadError,
  asyncHandler(ProfileController.validateSinglePhoto),
);

/**
 * @swagger
 * /api/v1/profile/photos:
 *   post:
 *     summary: Upload profile photos (up to 10)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [photo]
 *             properties:
 *               photo:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Photos uploaded successfully
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/photos",
  authenticate,
  uploadProfilePhoto.array("photo", 10),
  handlePhotoUploadError,
  asyncHandler(ProfileController.uploadPhoto),
);

/**
 * @swagger
 * /api/v1/profile/photos:
 *   get:
 *     summary: Get the authenticated user's uploaded photos
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Photos list returned
 *       401:
 *         description: Unauthorized
 */
router.get("/photos", authenticate, asyncHandler(ProfileController.getPhotos));

/**
 * @swagger
 * /api/v1/profile/photos/{photoId}:
 *   delete:
 *     summary: Delete a profile photo
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Photo ID to delete
 *     responses:
 *       200:
 *         description: Photo deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Photo not found
 */
router.delete(
  "/photos/:photoId",
  authenticate,
  asyncHandler(ProfileController.deletePhoto),
);

/**
 * @swagger
 * /api/v1/profile/dating-preferences:
 *   patch:
 *     summary: Create or update dating preferences
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               interestedIn:
 *                 type: string
 *                 example: "female"
 *               ageMin:
 *                 type: number
 *                 example: 22
 *               ageMax:
 *                 type: number
 *                 example: 35
 *               maxDistance:
 *                 type: number
 *                 example: 50
 *     responses:
 *       200:
 *         description: Dating preferences updated
 *       401:
 *         description: Unauthorized
 */
router.patch(
  "/dating-preferences",
  authenticate,
  validateBody(datingPreferencesSchema),
  asyncHandler(ProfileController.updateDatingPreferences),
);

/**
 * @swagger
 * /api/v1/profile/onboarding/complete:
 *   post:
 *     summary: Mark onboarding as complete (validates all required data)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding completed
 *       400:
 *         description: Missing required onboarding data
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/onboarding/complete",
  authenticate,
  asyncHandler(ProfileController.completeOnboarding),
);

export default router;
