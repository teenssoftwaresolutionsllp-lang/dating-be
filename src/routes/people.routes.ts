import { Router } from "express";
import PeopleController from "../controllers/people.controller";
import { asyncHandler } from "../middleware/error.middleware";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);
router.get("/nearby", asyncHandler(PeopleController.getNearby));
router.get(
  "/similar-interests",
  asyncHandler(PeopleController.getSimilarInterests),
);

export default router;
