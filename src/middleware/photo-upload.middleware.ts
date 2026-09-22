import path from "node:path";
import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import ApiResponse from "../utils/response";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export const uploadProfilePhoto = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const hasAllowedMimeType = allowedMimeTypes.has(file.mimetype);
    const hasAllowedExtension = allowedExtensions.has(extension);
    const isGenericPostmanMimeType =
      file.mimetype === "application/octet-stream";

    if (
      !hasAllowedMimeType &&
      !(isGenericPostmanMimeType && hasAllowedExtension)
    ) {
      callback(new Error("Only JPEG, PNG, and WebP images are allowed"));
      return;
    }

    callback(null, true);
  },
});

export const handlePhotoUploadError = (
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Profile photo must be 5 MB or smaller"
        : "Invalid profile photo upload";

    return ApiResponse.error(res, {
      statusCode: 400,
      message,
      code: "PHOTO_UPLOAD_ERROR",
    });
  }

  if (error instanceof Error && error.message.includes("images are allowed")) {
    return ApiResponse.error(res, {
      statusCode: 400,
      message: error.message,
      code: "INVALID_PHOTO_TYPE",
    });
  }

  return next(error);
};
