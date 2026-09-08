import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireAdminRole } from "../middleware/admin.middleware";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdminRole);

export default router;
