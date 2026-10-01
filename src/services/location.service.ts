import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { locations, profiles } from "../db/schema";
import type { AppError } from "../types/index";

export type PopularLocationRecord = {
  locationId: string;
  name: string;
};

export type LocationSuggestion = {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
};

export type SavedLocation = {
  locationId: string;
  googlePlaceId: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
};

class LocationService {
  static createError(
    statusCode: number,
    message: string,
    code: string,
    errors?: unknown,
  ): AppError {
    const error = new Error(message) as AppError;
    error.statusCode = statusCode;
    error.code = code;
    error.errors = errors;
    return error;
  }

  static mergeSuggestionResults(
    popularLocations: Array<{
      locationId?: string;
      googlePlaceId?: string | null;
      name?: string;
      city?: string | null;
      state?: string | null;
      country?: string | null;
    }> = [],
    googleResults: Array<{
      placeId: string;
      text?: string;
      mainText?: string;
      secondaryText?: string;
    }> = [],
  ): LocationSuggestion[] {
    const seen = new Set<string>();
    const merged: LocationSuggestion[] = [];

    for (const suggestion of googleResults) {
      if (!suggestion.placeId || seen.has(suggestion.placeId)) continue;
      seen.add(suggestion.placeId);
      merged.push({
        placeId: suggestion.placeId,
        text: suggestion.text ?? suggestion.mainText ?? suggestion.placeId,
        mainText: suggestion.mainText ?? suggestion.text ?? suggestion.placeId,
        secondaryText: suggestion.secondaryText ?? "",
      });
    }

    for (const location of popularLocations) {
      const placeId = location.googlePlaceId;
      if (!placeId || seen.has(placeId)) continue;
      seen.add(placeId);
      merged.push({
        placeId,
        text: location.name ?? location.city ?? "Unknown location",
        mainText: location.name ?? location.city ?? "Unknown location",
        secondaryText: [location.state, location.country]
          .filter(Boolean)
          .join(", "),
      });
    }

    return merged;
  }

  static normalizeGooglePlaceDetails(
    raw: Record<string, unknown>,
  ): Omit<SavedLocation, "locationId"> {
    const placeId =
      String(
        raw.placeId ??
          raw.place_id ??
          raw.googlePlaceId ??
          raw.google_place_id ??
          raw.id ??
          "",
      ) || "";

    const displayNameValue =
      typeof raw.displayName === "string"
        ? raw.displayName
        : typeof raw.display_name === "string"
          ? raw.display_name
          : typeof raw.display_name === "object" && raw.display_name !== null
            ? ((raw.display_name as { text?: string }).text ?? "")
            : "";

    const addressComponents = Array.isArray(raw.addressComponents)
      ? raw.addressComponents
      : Array.isArray(raw.address_components)
        ? raw.address_components
        : [];

    const city =
      LocationService.findAddressComponent(addressComponents, [
        "locality",
        "sublocality",
        "administrative_area_level_2",
      ]) ??
      (typeof raw.city === "string" ? raw.city : null) ??
      (typeof raw.locality === "string" ? raw.locality : null) ??
      null;
    const state =
      LocationService.findAddressComponent(addressComponents, [
        "administrative_area_level_1",
      ]) ??
      (typeof raw.state === "string" ? raw.state : null) ??
      (typeof raw.administrativeArea === "string"
        ? raw.administrativeArea
        : null) ??
      null;
    const country =
      LocationService.findAddressComponent(addressComponents, ["country"]) ??
      (typeof raw.country === "string" ? raw.country : null) ??
      null;

    const locationObject =
      typeof raw.location === "object" && raw.location !== null
        ? (raw.location as { latitude?: number; longitude?: number })
        : undefined;

    const latitude = Number(
      typeof raw.latitude === "number"
        ? raw.latitude
        : typeof locationObject?.latitude === "number"
          ? locationObject.latitude
          : NaN,
    );
    const longitude = Number(
      typeof raw.longitude === "number"
        ? raw.longitude
        : typeof locationObject?.longitude === "number"
          ? locationObject.longitude
          : NaN,
    );

    const name =
      city ||
      displayNameValue.split(",")[0]?.trim() ||
      state ||
      country ||
      "Unknown location";

    return {
      googlePlaceId: placeId,
      name,
      city: city ?? null,
      state: state ?? null,
      country: country ?? null,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
    };
  }

  static findAddressComponent(
    components: unknown[],
    types: string[],
  ): string | null {
    for (const component of components) {
      if (typeof component !== "object" || component === null) continue;
      const item = component as {
        types?: string[];
        longText?: string;
        shortText?: string;
        long_name?: string;
        short_name?: string;
      };
      const matches = item.types ?? [];
      if (!matches.some((type) => types.includes(type))) continue;
      return (
        item.longText ||
        item.long_name ||
        item.shortText ||
        item.short_name ||
        null
      );
    }
    return null;
  }

  static async getPopularLocations(): Promise<PopularLocationRecord[]> {
    const rows = await db
      .select({
        locationId: locations.id,
        name: locations.name,
      })
      .from(locations)
      .where(eq(locations.isSeeded, true))
      .orderBy(locations.name);

    return rows.map((row) => ({
      locationId: row.locationId,
      name: row.name,
    }));
  }

  static async selectPopularLocation(
    userId: string,
    locationId: string,
  ): Promise<SavedLocation> {
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, locationId));

    if (!location) {
      throw LocationService.createError(
        404,
        "Location not found",
        "LOCATION_NOT_FOUND",
      );
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));

    if (!profile) {
      throw LocationService.createError(
        404,
        "Profile not found",
        "PROFILE_REQUIRED",
      );
    }

    const [updatedProfile] = await db
      .update(profiles)
      .set({
        locationId: location.id,
        city: location.city ?? profile.city,
        state: location.state ?? profile.state,
        country: location.country ?? profile.country,
        latitude: location.latitude ?? profile.latitude,
        longitude: location.longitude ?? profile.longitude,
        locationUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId))
      .returning();

    if (!updatedProfile) {
      throw LocationService.createError(
        500,
        "Unable to save location",
        "LOCATION_SAVE_FAILED",
      );
    }

    return {
      locationId: location.id,
      googlePlaceId: location.googlePlaceId,
      name: location.name,
      city: location.city ?? null,
      state: location.state ?? null,
      country: location.country ?? null,
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
    };
  }

  static async autocompleteLocation(
    input: string,
    sessionToken?: string,
  ): Promise<LocationSuggestion[]> {
    const trimmed = input.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      throw LocationService.createError(
        400,
        "Location search input must be between 2 and 100 characters",
        "INVALID_LOCATION_INPUT",
      );
    }

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      throw LocationService.createError(
        500,
        "Google Maps API key is not configured",
        "GOOGLE_MAPS_API_KEY_MISSING",
      );
    }

    const response = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask":
            "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
        },
        body: JSON.stringify({
          input: trimmed,
          includedRegionCodes: ["in"],
          includedPrimaryTypes: ["(cities)"],
          languageCode: "en",
          ...(sessionToken ? { sessionToken } : {}),
        }),
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      if (response.status === 429) {
        throw LocationService.createError(
          429,
          "Google Places request rate limit exceeded",
          "LOCATION_RATE_LIMITED",
        );
      }
      throw LocationService.createError(
        502,
        `Google Places autocomplete failed: ${response.status}`,
        "GOOGLE_PLACES_UPSTREAM_ERROR",
        errorBody,
      );
    }

    return LocationService.normalizeGoogleAutocompleteResponse(
      await response.json(),
    );
  }

  static normalizeGoogleAutocompleteResponse(
    raw: unknown,
  ): LocationSuggestion[] {
    if (typeof raw !== "object" || raw === null || !("suggestions" in raw)) {
      return [];
    }

    const suggestions = (raw as { suggestions?: unknown }).suggestions;
    if (!Array.isArray(suggestions)) return [];

    return suggestions.flatMap((item): LocationSuggestion[] => {
      if (
        typeof item !== "object" ||
        item === null ||
        !("placePrediction" in item)
      ) {
        return [];
      }

      const prediction = (item as { placePrediction?: Record<string, unknown> })
        .placePrediction;
      if (!prediction || typeof prediction !== "object") return [];

      const placeId =
        typeof prediction.placeId === "string" ? prediction.placeId : "";
      const predictionText = prediction.text as { text?: unknown } | undefined;
      const structuredFormat = prediction.structuredFormat as
        | {
            mainText?: { text?: unknown };
            secondaryText?: { text?: unknown };
          }
        | undefined;
      const text =
        typeof predictionText?.text === "string" ? predictionText.text : "";
      const mainText =
        typeof structuredFormat?.mainText?.text === "string"
          ? structuredFormat.mainText.text
          : text.split(",")[0]?.trim() || text;
      const secondaryText =
        typeof structuredFormat?.secondaryText?.text === "string"
          ? structuredFormat.secondaryText.text
          : "";

      if (!placeId || !text) return [];
      return [{ placeId, text, mainText, secondaryText }];
    });
  }

  static async saveGoogleLocation(
    userId: string,
    placeId: string,
    sessionToken?: string,
  ): Promise<SavedLocation> {
    if (!placeId || placeId.trim().length === 0) {
      throw LocationService.createError(
        400,
        "placeId is required",
        "INVALID_PLACE_ID",
      );
    }

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      throw LocationService.createError(
        500,
        "Google Maps API key is not configured",
        "GOOGLE_MAPS_API_KEY_MISSING",
      );
    }

    const url = new URL(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    );
    url.searchParams.set("key", key);
    url.searchParams.set(
      "fields",
      "id,displayName,formattedAddress,addressComponents,location",
    );
    if (sessionToken) {
      url.searchParams.set("sessiontoken", sessionToken);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 429) {
        throw LocationService.createError(
          429,
          "Google Places request rate limit exceeded",
          "LOCATION_RATE_LIMITED",
        );
      }
      throw LocationService.createError(
        502,
        `Google Places lookup failed: ${response.status}`,
        "GOOGLE_PLACES_UPSTREAM_ERROR",
        text,
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    const normalized = LocationService.normalizeGooglePlaceDetails(data);

    if (!normalized.googlePlaceId) {
      throw LocationService.createError(
        422,
        "Google location could not be resolved",
        "INVALID_PLACE_RESULT",
      );
    }

    if (
      normalized.latitude === null ||
      normalized.longitude === null ||
      !Number.isFinite(normalized.latitude) ||
      !Number.isFinite(normalized.longitude)
    ) {
      throw LocationService.createError(
        422,
        "Google location coordinates are missing or invalid",
        "INVALID_LOCATION_COORDINATES",
      );
    }

    if (
      normalized.latitude < -90 ||
      normalized.latitude > 90 ||
      normalized.longitude < -180 ||
      normalized.longitude > 180
    ) {
      throw LocationService.createError(
        422,
        "Google location coordinates are outside valid ranges",
        "INVALID_LOCATION_COORDINATES",
      );
    }

    let [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.googlePlaceId, normalized.googlePlaceId));

    if (!location) {
      [location] = await db
        .insert(locations)
        .values({
          googlePlaceId: normalized.googlePlaceId,
          name: normalized.name,
          city: normalized.city,
          state: normalized.state,
          country: normalized.country,
          latitude: normalized.latitude,
          longitude: normalized.longitude,
        })
        .onConflictDoNothing()
        .returning();
    }

    if (!location) {
      [location] = await db
        .select()
        .from(locations)
        .where(eq(locations.googlePlaceId, normalized.googlePlaceId));
    }

    if (!location) {
      throw LocationService.createError(
        500,
        "Could not save or reuse the Google location",
        "LOCATION_SAVE_FAILED",
      );
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));

    if (!profile) {
      throw LocationService.createError(
        404,
        "Profile not found",
        "PROFILE_REQUIRED",
      );
    }

    const [updatedProfile] = await db
      .update(profiles)
      .set({
        locationId: location.id,
        city: normalized.city ?? location.city ?? profile.city,
        state: normalized.state ?? location.state ?? profile.state,
        country: normalized.country ?? location.country ?? profile.country,
        latitude: normalized.latitude,
        longitude: normalized.longitude,
        locationUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId))
      .returning();

    if (!updatedProfile) {
      throw LocationService.createError(
        500,
        "Unable to save selected Google location",
        "LOCATION_SAVE_FAILED",
      );
    }

    return {
      locationId: location.id,
      googlePlaceId: location.googlePlaceId,
      name: location.name,
      city: location.city ?? normalized.city ?? null,
      state: location.state ?? normalized.state ?? null,
      country: location.country ?? normalized.country ?? null,
      latitude: location.latitude ?? normalized.latitude,
      longitude: location.longitude ?? normalized.longitude,
    };
  }

  static async getSelectedLocation(
    userId: string,
  ): Promise<SavedLocation | null> {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));

    if (!profile?.locationId) {
      return null;
    }

    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, profile.locationId));

    if (!location) {
      return null;
    }

    return {
      locationId: location.id,
      googlePlaceId: location.googlePlaceId,
      name: location.name,
      city: location.city ?? null,
      state: location.state ?? null,
      country: location.country ?? null,
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
    };
  }
}

export default LocationService;
