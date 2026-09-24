import { eq, ilike, or } from "drizzle-orm";
import { db } from "../db/index";
import { locations, profiles, users, type Location } from "../db/schema";
import type { AppError } from "../types/index";
import type { GooglePlaceDetails } from "./google-places.service";

export interface NormalizedLocation {
  name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  googlePlaceId: string;
}

export interface SavedLocation {
  locationId: string;
  name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

const invalidPlace = (): AppError => {
  const error = new Error("Invalid or unavailable place") as AppError;
  error.statusCode = 422;
  error.code = "INVALID_PLACE";
  return error;
};

const getAddressComponent = (
  components: GooglePlaceDetails["addressComponents"],
  type: string,
): string | null =>
  components?.find((component) => component.types?.includes(type))?.longText ??
  null;

export const normalizePlaceDetails = (
  details: GooglePlaceDetails,
): NormalizedLocation => {
  const latitude = details.location?.latitude;
  const longitude = details.location?.longitude;

  if (
    !details.id ||
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw invalidPlace();
  }

  const components = details.addressComponents;
  return {
    googlePlaceId: details.id,
    name: details.displayName?.text ?? null,
    city:
      getAddressComponent(components, "locality") ??
      getAddressComponent(components, "postal_town") ??
      getAddressComponent(components, "administrative_area_level_2"),
    state: getAddressComponent(components, "administrative_area_level_1"),
    country: getAddressComponent(components, "country"),
    latitude,
    longitude,
  };
};

const toSavedLocation = (location: Location): SavedLocation => ({
  locationId: location.id,
  name: location.name,
  city: location.city,
  state: location.state,
  country: location.country,
  latitude: location.latitude,
  longitude: location.longitude,
});

class LocationService {
  async searchLocations(input: string) {
    const pattern = `%${input}%`;
    const seededLocations = await db
      .select()
      .from(locations)
      .where(
        or(
          ilike(locations.name, pattern),
          ilike(locations.city, pattern),
          ilike(locations.state, pattern),
          ilike(locations.country, pattern),
        ),
      )
      .limit(5);

    return seededLocations.map((location) => ({
      placeId: location.googlePlaceId,
      text: [location.city, location.state, location.country]
        .filter(Boolean)
        .join(", "),
      mainText: location.city ?? location.name ?? "",
      secondaryText: [location.state, location.country]
        .filter(Boolean)
        .join(", "),
    }));
  }

  async saveLocation(
    userId: string,
    normalizedLocation: NormalizedLocation,
  ): Promise<SavedLocation> {
    return db.transaction(async (transaction) => {
      const [user] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        const error = new Error("User not found") as AppError;
        error.statusCode = 404;
        error.code = "USER_NOT_FOUND";
        throw error;
      }

      const [profile] = await transaction
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.userId, userId));

      if (!profile) {
        const error = new Error(
          "Complete basic profile details first",
        ) as AppError;
        error.statusCode = 400;
        error.code = "PROFILE_REQUIRED";
        throw error;
      }

      await transaction
        .insert(locations)
        .values({
          googlePlaceId: normalizedLocation.googlePlaceId,
          name: normalizedLocation.name,
          city: normalizedLocation.city,
          state: normalizedLocation.state,
          country: normalizedLocation.country,
          latitude: normalizedLocation.latitude,
          longitude: normalizedLocation.longitude,
        })
        .onConflictDoNothing({ target: locations.googlePlaceId });

      const [location] = await transaction
        .select()
        .from(locations)
        .where(eq(locations.googlePlaceId, normalizedLocation.googlePlaceId));

      if (!location) {
        throw new Error("Location could not be saved");
      }

      await transaction
        .update(users)
        .set({ updatedAt: new Date() })
        .where(eq(users.id, userId));

      await transaction
        .update(profiles)
        .set({ locationId: location.id, updatedAt: new Date() })
        .where(eq(profiles.id, profile.id));

      return toSavedLocation(location);
    });
  }

  async getUserLocation(userId: string): Promise<SavedLocation | null> {
    const [result] = await db
      .select({ location: locations })
      .from(profiles)
      .innerJoin(locations, eq(profiles.locationId, locations.id))
      .where(eq(profiles.userId, userId));

    return result ? toSavedLocation(result.location) : null;
  }
}

export default new LocationService();
