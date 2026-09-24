import { Router } from "express";
import LocationController from "../controllers/location.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { locationAutocompleteRateLimit } from "../middleware/location-rate-limit.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { locationAutocompleteSchema, saveLocationSchema } from "../validation";

const router = Router();

router.post(
  "/locations/autocomplete",
  authenticate,
  locationAutocompleteRateLimit,
  validateBody(locationAutocompleteSchema),
  asyncHandler(LocationController.autocomplete.bind(LocationController)),
);

router.post(
  "/users/me/location",
  authenticate,
  validateBody(saveLocationSchema),
  asyncHandler(LocationController.saveLocation.bind(LocationController)),
);

router.get(
  "/users/me/location",
  authenticate,
  asyncHandler(LocationController.getLocation.bind(LocationController)),
);

export default router;
