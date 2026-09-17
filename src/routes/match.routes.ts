import { Router } from "express";
import MatchController from "../controllers/match.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

router.use(authenticate);
router.post("/swipe", asyncHandler(MatchController.swipe));
router.get("/", asyncHandler(MatchController.getMatches));
router.get("/history", asyncHandler(MatchController.getSwipeHistory));
router.delete("/:matchedUserId", asyncHandler(MatchController.unmatch));

export default router;
