import { Router } from "express";
import LocationController from "../controllers/location.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { validateBody } from "../middleware/validation.middleware";
import {
  googleLocationSelectionSchema,
  locationAutocompleteSchema,
  popularLocationSelectionSchema,
} from "../validation";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Location
 *     description: Location search, autocomplete, and user location management
 */

/**
 * @swagger
 * /api/v1/locations/popular:
 *   get:
 *     summary: Get list of popular locations for selection
 *     tags: [Location]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Popular locations returned
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/locations/popular",
  authenticate,
  asyncHandler(LocationController.getPopularLocations),
);

/**
 * @swagger
 * /api/v1/users/me/location/selection:
 *   post:
 *     summary: Select a popular location for the authenticated user
 *     tags: [Location]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [locationId]
 *             properties:
 *               locationId:
 *                 type: string
 *                 example: "loc_mumbai"
 *     responses:
 *       200:
 *         description: Location selected
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/users/me/location/selection",
  authenticate,
  validateBody(popularLocationSelectionSchema),
  asyncHandler(LocationController.selectPopularLocation),
);

/**
 * @swagger
 * /api/v1/locations/autocomplete:
 *   post:
 *     summary: Autocomplete location search using Google Places
 *     tags: [Location]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 example: "Mumbai"
 *     responses:
 *       200:
 *         description: Autocomplete suggestions returned
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/locations/autocomplete",
  authenticate,
  validateBody(locationAutocompleteSchema),
  asyncHandler(LocationController.autocomplete),
);

/**
 * @swagger
 * /api/v1/users/me/location:
 *   post:
 *     summary: Save a Google Places location for the authenticated user
 *     tags: [Location]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [placeId]
 *             properties:
 *               placeId:
 *                 type: string
 *                 example: "ChIJwe1EZjDG5zsRaYxkjY_tpF0"
 *               displayName:
 *                 type: string
 *                 example: "Mumbai, Maharashtra, India"
 *     responses:
 *       200:
 *         description: Location saved
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/users/me/location",
  authenticate,
  validateBody(googleLocationSelectionSchema),
  asyncHandler(LocationController.saveGoogleLocation),
);

/**
 * @swagger
 * /api/v1/users/me/location:
 *   get:
 *     summary: Get the authenticated user's saved location
 *     tags: [Location]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User location returned
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/users/me/location",
  authenticate,
  asyncHandler(LocationController.getSelectedLocation),
);

export default router;
