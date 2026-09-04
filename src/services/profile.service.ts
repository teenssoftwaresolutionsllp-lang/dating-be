import { db } from "../db/index";
import { users } from "../db/schema/users";
import { eq } from "drizzle-orm";
import type {
  AppError,
  ProfileData,
  UpdateProfileParams,
  AddPhotoParams,
  DeletePhotoParams,
} from "../types/index";

/**
 * In-memory profile store (replace with DB table once schema is migrated)
 * Maps userId -> ProfileData
 */
const profileStore = new Map<number, ProfileData>();

export class ProfileService {
  /**
   * Get a user's profile by userId
   */
  static async getProfile(userId: number): Promise<ProfileData> {
    // Verify user exists in DB
    const [user] = await db
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, userId));

    if (!user || !user.isActive) {
      const error = new Error("User not found") as AppError;
      error.statusCode = 404;
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    // Return existing profile or a default empty profile
    const existing = profileStore.get(userId);
    if (existing) {
      return existing;
    }

    const defaultProfile: ProfileData = {
      userId,
      displayName: null,
      bio: null,
      birthDate: null,
      gender: null,
      interestedIn: null,
      photos: [],
      location: null,
      latitude: null,
      longitude: null,
      maxDistance: 50,
      ageMin: 18,
      ageMax: 40,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    profileStore.set(userId, defaultProfile);
    return defaultProfile;
  }

  /**
   * Update a user's profile
   */
  static async updateProfile({
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
  }: UpdateProfileParams): Promise<ProfileData> {
    const existing = await ProfileService.getProfile(userId);

    // Validate age preferences
    if (ageMin !== undefined && ageMax !== undefined && ageMin > ageMax) {
      const error = new Error(
        "Minimum age cannot be greater than maximum age"
      ) as AppError;
      error.statusCode = 400;
      error.code = "INVALID_AGE_RANGE";
      throw error;
    }

    if (ageMin !== undefined && ageMin < 18) {
      const error = new Error(
        "Minimum age preference must be at least 18"
      ) as AppError;
      error.statusCode = 400;
      error.code = "INVALID_AGE_MIN";
      throw error;
    }

    if (maxDistance !== undefined && (maxDistance < 1 || maxDistance > 500)) {
      const error = new Error(
        "Max distance must be between 1 and 500 km"
      ) as AppError;
      error.statusCode = 400;
      error.code = "INVALID_DISTANCE";
      throw error;
    }

    const updated: ProfileData = {
      ...existing,
      displayName: displayName ?? existing.displayName,
      bio: bio ?? existing.bio,
      birthDate: birthDate ?? existing.birthDate,
      gender: gender ?? existing.gender,
      interestedIn: interestedIn ?? existing.interestedIn,
      location: location ?? existing.location,
      latitude: latitude ?? existing.latitude,
      longitude: longitude ?? existing.longitude,
      maxDistance: maxDistance ?? existing.maxDistance,
      ageMin: ageMin ?? existing.ageMin,
      ageMax: ageMax ?? existing.ageMax,
      updatedAt: new Date(),
    };

    profileStore.set(userId, updated);

    // Mark profile as completed in users table if essential fields are present
    if (updated.displayName && updated.birthDate && updated.gender) {
      await db
        .update(users)
        .set({ profileCompleted: true, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    return updated;
  }

  /**
   * Add a photo to a user's profile
   */
  static async addPhoto({ userId, photoUrl }: AddPhotoParams): Promise<ProfileData> {
    if (!photoUrl || !photoUrl.trim()) {
      const error = new Error("Photo URL is required") as AppError;
      error.statusCode = 400;
      error.code = "MISSING_PHOTO_URL";
      throw error;
    }

    const profile = await ProfileService.getProfile(userId);
    const photos = profile.photos ?? [];

    if (photos.length >= 6) {
      const error = new Error(
        "Maximum of 6 photos allowed per profile"
      ) as AppError;
      error.statusCode = 400;
      error.code = "MAX_PHOTOS_REACHED";
      throw error;
    }

    if (photos.includes(photoUrl)) {
      const error = new Error("This photo already exists in your profile") as AppError;
      error.statusCode = 409;
      error.code = "PHOTO_ALREADY_EXISTS";
      throw error;
    }

    const updated: ProfileData = {
      ...profile,
      photos: [...photos, photoUrl.trim()],
      updatedAt: new Date(),
    };

    profileStore.set(userId, updated);
    return updated;
  }

  /**
   * Delete a photo from a user's profile
   */
  static async deletePhoto({
    userId,
    photoUrl,
  }: DeletePhotoParams): Promise<ProfileData> {
    const profile = await ProfileService.getProfile(userId);
    const photos = profile.photos ?? [];

    if (!photos.includes(photoUrl)) {
      const error = new Error("Photo not found in your profile") as AppError;
      error.statusCode = 404;
      error.code = "PHOTO_NOT_FOUND";
      throw error;
    }

    const updated: ProfileData = {
      ...profile,
      photos: photos.filter((p) => p !== photoUrl),
      updatedAt: new Date(),
    };

    profileStore.set(userId, updated);
    return updated;
  }
}

export default ProfileService;
