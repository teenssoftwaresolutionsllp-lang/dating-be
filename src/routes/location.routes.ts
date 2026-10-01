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

router.get(
  "/locations/popular",
  authenticate,
  asyncHandler(LocationController.getPopularLocations),
);

router.post(
  "/users/me/location/selection",
  authenticate,
  validateBody(popularLocationSelectionSchema),
  asyncHandler(LocationController.selectPopularLocation),
);

router.post(
  "/locations/autocomplete",
  authenticate,
  validateBody(locationAutocompleteSchema),
  asyncHandler(LocationController.autocomplete),
);

router.post(
  "/users/me/location",
  authenticate,
  validateBody(googleLocationSelectionSchema),
  asyncHandler(LocationController.saveGoogleLocation),
);

router.get(
  "/users/me/location",
  authenticate,
  asyncHandler(LocationController.getSelectedLocation),
);

export default router;
