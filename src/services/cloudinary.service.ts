import { Readable } from "node:stream";
import fs from "node:fs";
import path from "node:path";
import { cloudinary, cloudinaryConfigured } from "../config/cloudinary";
import type { UploadApiResponse } from "cloudinary";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export type StoredMediaProvider = "cloudinary" | "local";

const isInsideUploadsDirectory = (filePath: string): boolean => {
  const relativePath = path.relative(
    path.resolve(UPLOADS_DIR),
    path.resolve(filePath),
  );
  return (
    relativePath !== "" &&
    !relativePath.startsWith("..") &&
    !path.isAbsolute(relativePath)
  );
};

const deleteLocalAsset = async (
  storageKey: string,
  storageUrl?: string | null,
): Promise<void> => {
  const urlPath = storageUrl?.startsWith("http")
    ? new URL(storageUrl).pathname
    : storageUrl;
  const uploadsMarker = "/uploads/";

  if (urlPath?.includes(uploadsMarker)) {
    const relativePath = urlPath.slice(
      urlPath.indexOf(uploadsMarker) + uploadsMarker.length,
    );
    const filePath = path.resolve(UPLOADS_DIR, relativePath);
    if (!isInsideUploadsDirectory(filePath)) {
      throw new Error("Local media path is outside the uploads directory");
    }
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return;
  }

  const targetName = path.basename(storageKey);
  const visit = async (directory: string): Promise<void> => {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (
        entry.isFile() &&
        (entry.name === targetName || entry.name.startsWith(`${targetName}.`))
      ) {
        await fs.promises.unlink(entryPath);
      }
    }
  };

  await visit(UPLOADS_DIR);
};

export const deleteStoredMedia = async (asset: {
  provider: StoredMediaProvider;
  resourceType?: "image" | "video" | "raw";
  storageKey: string;
  storageUrl?: string | null;
}): Promise<void> => {
  if (asset.provider === "cloudinary") {
    if (!cloudinaryConfigured) {
      throw new Error(
        "Cloudinary is not configured; media cleanup remains pending",
      );
    }
    const result = await cloudinary.uploader.destroy(asset.storageKey, {
      resource_type: asset.resourceType ?? "image",
    });
    if (result?.result === "error" || result?.error) {
      throw new Error("Cloudinary rejected the media deletion request");
    }
    return;
  }

  await deleteLocalAsset(asset.storageKey, asset.storageUrl);
};

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
    await deleteStoredMedia({
      provider: "cloudinary",
      storageKey: publicId,
    });
    return;
  }
  await deleteStoredMedia({ provider: "local", storageKey: publicId });
};
