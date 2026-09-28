import { Readable } from "node:stream";
import fs from "node:fs";
import path from "node:path";
import { cloudinary, cloudinaryConfigured } from "../config/cloudinary";
import type { UploadApiResponse } from "cloudinary";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export const uploadProfilePhoto = async (
  buffer: Buffer,
  userId: string,
  originalName: string,
): Promise<UploadApiResponse> => {
  const extension = originalName.split(".").pop()?.toLowerCase() || "jpg";
  const publicId = `${userId}-${Date.now()}`;

  // 1. If Cloudinary is configured, upload to Cloudinary CDN
  if (cloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `dating-app/profiles/${userId}`,
          public_id: publicId,
          resource_type: "image",
          format: extension,
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error("Cloudinary upload failed"));
            return;
          }

          resolve(result);
        },
      );

      Readable.from(buffer).pipe(uploadStream);
    });
  }

  // 2. Local Disk Storage Fallback for local development and offline environments
  const userFolder = path.join(UPLOADS_DIR, "profiles", userId);
  if (!fs.existsSync(userFolder)) {
    fs.mkdirSync(userFolder, { recursive: true });
  }

  const filename = `${publicId}.${extension}`;
  const filePath = path.join(userFolder, filename);
  await fs.promises.writeFile(filePath, buffer);

  const relativeUrl = `/uploads/profiles/${userId}/${filename}`;
  return {
    public_id: publicId,
    secure_url: relativeUrl,
    url: relativeUrl,
    bytes: buffer.length,
    format: extension,
    resource_type: "image",
  } as unknown as UploadApiResponse;
};

export const deleteCloudinaryAsset = async (
  publicId: string,
): Promise<void> => {
  if (cloudinaryConfigured) {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    return;
  }

  // Local cleanup if file exists
  try {
    const matchingFiles = fs.readdirSync(UPLOADS_DIR, { recursive: true }) as string[];
    for (const file of matchingFiles) {
      if (typeof file === 'string' && file.includes(publicId)) {
        const fullPath = path.join(UPLOADS_DIR, file);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    }
  } catch {
    // Ignore local cleanup error
  }
};
