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

  static async getMyProfile(req: Request, res: Response): Promise<Response> {
    res.setHeader("Cache-Control", "private, no-store");
    delete req.headers["if-none-match"];
    delete req.headers["if-modified-since"];

    const userId = getUserId(req);

    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const profile = await ProfileService.getMyProfile(userId);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Complete profile retrieved successfully",
      data: profile,
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

    const files = Array.isArray(req.files)
      ? (req.files as Express.Multer.File[])
      : [];

    if (files.length === 0) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "At least one profile photo is required",
        code: "PHOTO_REQUIRED",
      });
    }

    const photos = await ProfileService.addPhotos(userId, files);

    return ApiResponse.success(res, {
      statusCode: 201,
      message: `${photos.length} profile photo${photos.length === 1 ? "" : "s"} uploaded successfully`,
      data: { photos },
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

  static async verifyKycDocument(
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

    const result = await ProfileService.validateKycDoc(
      req.body.documentType || "Aadhaar Card",
      req.file
        ? { buffer: req.file.buffer, originalName: req.file.originalname }
        : undefined,
    );

    return ApiResponse.success(res, {
      statusCode: 200,
      message: result.message,
      data: result,
    });
  }

  static async verifySelfie(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);
    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const result = await ProfileService.validateSelfieDoc(
      req.file
        ? { buffer: req.file.buffer, originalName: req.file.originalname }
        : undefined,
    );

    return ApiResponse.success(res, {
      statusCode: 200,
      message: result.message,
      data: result,
    });
  }

  static async validateSinglePhoto(
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

    const isPrimary =
      req.body.isPrimary === "true" ||
      req.body.isPrimary === true ||
      req.body.isPrimary === 1;

    const result = await ProfileService.validateSinglePhoto(
      userId,
      req.file
        ? { buffer: req.file.buffer, originalName: req.file.originalname }
        : undefined,
      isPrimary,
    );

    return ApiResponse.success(res, {
      statusCode: 200,
      message: result.message,
      data: result,
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

    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;
    const documentFile = files?.["documentPhoto"]?.[0] || req.file;
    const selfieFile = files?.["selfiePhoto"]?.[0];

    const kyc = await ProfileService.submitKyc(
      userId,
      req.body.documentType || "Aadhaar Card",
      req.body.documentNumber,
      documentFile
        ? {
            buffer: documentFile.buffer,
            originalName: documentFile.originalname,
          }
        : undefined,
      selfieFile
        ? { buffer: selfieFile.buffer, originalName: selfieFile.originalname }
        : undefined,
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
