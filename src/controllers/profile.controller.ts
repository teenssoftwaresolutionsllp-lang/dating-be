import type { Request, Response } from "express";
import ProfileService from "../services/profile.service";
import ApiResponse from "../utils/response";

export class ProfileController {
  /**
   * GET /api/v1/profile/me
   * Get the authenticated user's own profile
   */
  static async getMyProfile(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const profile = await ProfileService.getProfile(userId);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Profile retrieved successfully",
      data: { profile },
    });
  }

  /**
   * PATCH /api/v1/profile/me
   * Update the authenticated user's profile
   */
  static async updateProfile(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const {
      displayName,
      bio,
      birthDate,
      gender,
      interestedIn,
      location,
      latitude,
      longitude,
      maxDistance,
      ageMin,
      ageMax,
    } = req.body as {
      displayName?: string;
      bio?: string;
      birthDate?: string;
      gender?: string;
      interestedIn?: string;
      location?: string;
      latitude?: number;
      longitude?: number;
      maxDistance?: number;
      ageMin?: number;
      ageMax?: number;
    };

    const updated = await ProfileService.updateProfile({
      userId,
      displayName,
      bio,
      birthDate,
      gender,
      interestedIn,
      location,
      latitude,
      longitude,
      maxDistance,
      ageMin,
      ageMax,
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Profile updated successfully",
      data: { profile: updated },
    });
  }

  /**
   * GET /api/v1/profile/:userId
   * Get another user's public profile
   */
  static async getUserProfile(req: Request, res: Response): Promise<Response> {
    const targetUserId = parseInt(String(req.params.userId), 10);

    if (isNaN(targetUserId)) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "Invalid user ID",
        code: "VALIDATION_ERROR",
      });
    }

    const profile = await ProfileService.getProfile(targetUserId);

    // Return only public-facing fields
    const publicProfile = {
      userId: profile.userId,
      displayName: profile.displayName,
      bio: profile.bio,
      birthDate: profile.birthDate,
      gender: profile.gender,
      photos: profile.photos,
      location: profile.location,
    };

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "User profile retrieved successfully",
      data: { profile: publicProfile },
    });
  }

  /**
   * POST /api/v1/profile/me/photos
   * Add a photo to the authenticated user's profile
   */
  static async addPhoto(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const { photoUrl } = req.body as { photoUrl: string };

    if (!photoUrl) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "photoUrl is required",
        code: "VALIDATION_ERROR",
      });
    }

    const updated = await ProfileService.addPhoto({ userId, photoUrl });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Photo added successfully",
      data: { photos: updated.photos },
    });
  }

  /**
   * DELETE /api/v1/profile/me/photos
   * Remove a photo from the authenticated user's profile
   */
  static async deletePhoto(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const { photoUrl } = req.body as { photoUrl: string };

    if (!photoUrl) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "photoUrl is required",
        code: "VALIDATION_ERROR",
      });
    }

    const updated = await ProfileService.deletePhoto({ userId, photoUrl });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Photo deleted successfully",
      data: { photos: updated.photos },
    });
  }
}

export default ProfileController;
