import { Readable } from "node:stream";
import { cloudinary, cloudinaryConfigured } from "../config/cloudinary";
import type { UploadApiResponse } from "cloudinary";

const requireCloudinary = (): void => {
  if (!cloudinaryConfigured) {
    throw new Error("Cloudinary is not configured on the server");
  }
};

export const uploadProfilePhoto = async (
  buffer: Buffer,
  userId: string,
  originalName: string,
): Promise<UploadApiResponse> => {
  requireCloudinary();

  const extension = originalName.split(".").pop()?.toLowerCase() || "jpg";
  const publicId = `${userId}-${Date.now()}`;

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
};

export const deleteCloudinaryAsset = async (
  publicId: string,
): Promise<void> => {
  requireCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
};
