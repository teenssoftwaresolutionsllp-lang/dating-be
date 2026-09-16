import type { Request, Response } from "express";
import ProfileService from "../services/profile.service";
import ApiResponse from "../utils/response";

const getUserId = (req: Request): string | undefined => req.user?.userId;

export class ProfileController {
  static async getOnboardingStatus(
    req: Request,
    res: Response,
  ): Promise<Response> {
    const userId = getUserId(req);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const status = await ProfileService.getOnboardingStatus(userId);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Onboarding status retrieved successfully",
      data: status,
    });
  }

  static async getProfile(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
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

  static async updateProfile(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const profile = await ProfileService.updateProfile(userId, req.body);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Profile saved successfully",
      data: { profile },
    });
  }

  static async uploadPhoto(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    if (!req.file) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "Profile photo is required",
        code: "PHOTO_REQUIRED",
      });
    }

    const photo = await ProfileService.addPhoto(userId, req.file);

    return ApiResponse.success(res, {
      statusCode: 201,
      message: "Profile photo uploaded successfully",
      data: { photo },
    });
  }

  static async getPhotos(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const photos = await ProfileService.getPhotos(userId);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Profile photos retrieved successfully",
      data: { photos },
    });
  }

  static async deletePhoto(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);
    const photoId = req.params.photoId;

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    if (typeof photoId !== "string") {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "Photo ID is required",
        code: "PHOTO_ID_REQUIRED",
      });
    }

    await ProfileService.deletePhoto(userId, photoId);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Profile photo deleted successfully",
    });
  }

  static async getLanguages(_req: Request, res: Response): Promise<Response> {
    const languages = await ProfileService.getLanguages();

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Languages retrieved successfully",
      data: { languages },
    });
  }

  static async getInterests(_req: Request, res: Response): Promise<Response> {
    const interests = await ProfileService.getInterests();

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Interests retrieved successfully",
      data: { interests },
    });
  }

  static async updateInterests(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const interestIds = await ProfileService.updateInterests(
      userId,
      req.body.interestIds,
    );

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Profile interests saved successfully",
      data: { interestIds },
    });
  }

  static async updateLanguages(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const languageIds = await ProfileService.updateLanguages(
      userId,
      req.body.languageIds,
    );

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Profile languages saved successfully",
      data: { languageIds },
    });
  }

  static async updateEducation(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const education = await ProfileService.updateEducation(userId, req.body);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Education saved successfully",
      data: { education },
    });
  }

  static async submitKyc(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const kyc = await ProfileService.submitKyc(
      userId,
      req.body.documentType,
      req.body.documentNumber,
    );

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "KYC submitted successfully",
      data: kyc,
    });
  }

  static async getKyc(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const kyc = await ProfileService.getKyc(userId);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "KYC status retrieved successfully",
      data: kyc,
    });
  }

  static async updateDatingPreferences(
    req: Request,
    res: Response,
  ): Promise<Response> {
    const userId = getUserId(req);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const preferences = await ProfileService.updateDatingPreferences(
      userId,
      req.body,
    );

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Dating preferences saved successfully",
      data: { preferences },
    });
  }

  static async completeOnboarding(
    req: Request,
    res: Response,
  ): Promise<Response> {
    const userId = getUserId(req);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const result = await ProfileService.completeOnboarding(userId);

    if (!result.completed) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "Profile onboarding is incomplete",
        code: "ONBOARDING_INCOMPLETE",
        errors: { missingSteps: result.missingSteps },
      });
    }

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Profile onboarding completed successfully",
      data: result,
    });
  }
}

export default ProfileController;
