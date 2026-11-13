import { Router } from "express";
import CallController from "../controllers/call.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

// Protect all call routes with JWT authentication
router.use(authenticate);

router.post("/initiate", asyncHandler(CallController.initiateCall));
router.get("/incoming", asyncHandler(CallController.getIncomingCall));
router.get("/history", asyncHandler(CallController.getCallHistory));
router.get("/rtm-token", asyncHandler(CallController.getRtmToken));
router.post("/:callId/accept", asyncHandler(CallController.acceptCall));
router.post("/:callId/reject", asyncHandler(CallController.rejectCall));
router.post("/:callId/end", asyncHandler(CallController.endCall));
router.get("/:callId/status", asyncHandler(CallController.getCallStatus));

export default router;
