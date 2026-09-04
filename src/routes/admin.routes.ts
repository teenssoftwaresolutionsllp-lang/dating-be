import { Router } from "express";
import AdminController from "../controllers/admin.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireAdminRole } from "../middleware/admin.middleware";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdminRole);

// =================================================================
// Dashboard
// =================================================================
// GET /api/v1/admin/dashboard — Aggregate stats
router.get("/dashboard", asyncHandler(AdminController.getDashboardStats));

// =================================================================
// User Management
// =================================================================
// GET /api/v1/admin/users — List all users (paginated, filterable)
router.get("/users", asyncHandler(AdminController.getAllUsers));

// GET /api/v1/admin/users/:id — Get single user details
router.get("/users/:id", asyncHandler(AdminController.getUserById));

// PATCH /api/v1/admin/users/:id/ban — Suspend a user
router.patch("/users/:id/ban", asyncHandler(AdminController.banUser));

// PATCH /api/v1/admin/users/:id/unban — Reactivate a user
router.patch("/users/:id/unban", asyncHandler(AdminController.unbanUser));

export default router;
