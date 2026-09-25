import type { Request, Response } from "express";
import GooglePlacesService from "../services/google-places.service";
import LocationService, {
  normalizePlaceDetails,
} from "../services/location.service";
import ApiResponse from "../utils/response";

const getUserId = (req: Request): string | undefined => req.user?.userId;

class LocationController {
  async getPopularLocations(_req: Request, res: Response): Promise<Response> {
    const locations = await LocationService.getPopularLocations();

    return ApiResponse.success(res, {
      data: locations,
    });
  }

  async autocomplete(req: Request, res: Response): Promise<Response> {
    const [seededSuggestions, googleSuggestions] = await Promise.all([
      LocationService.searchLocations(req.body.input),
      GooglePlacesService.getPlaceSuggestions(
        req.body.input,
        req.body.sessionToken,
      ),
    ]);

    const seenPlaceIds = new Set<string>();
    const suggestions = [...seededSuggestions, ...googleSuggestions].filter(
      (suggestion) => {
        if (seenPlaceIds.has(suggestion.placeId)) return false;
        seenPlaceIds.add(suggestion.placeId);
        return true;
      },
    );

    return ApiResponse.success(res, {
      data: suggestions,
    });
  }

  async saveLocation(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);
    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const existingLocation = await LocationService.findByGooglePlaceId(
      req.body.placeId,
    );
    const normalizedLocation = existingLocation
      ? {
          googlePlaceId: existingLocation.googlePlaceId,
          name: existingLocation.name,
          city: existingLocation.city,
          state: existingLocation.state,
          country: existingLocation.country,
          latitude: existingLocation.latitude,
          longitude: existingLocation.longitude,
        }
      : normalizePlaceDetails(
          await GooglePlacesService.getPlaceDetails(
            req.body.placeId,
            req.body.sessionToken,
          ),
        );
    const location = await LocationService.saveLocation(
      userId,
      normalizedLocation,
    );

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Location saved successfully",
      data: location,
    });
  }

  async selectLocation(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);
    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const location = await LocationService.selectLocation(
      userId,
      req.body.locationId,
    );

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Location selected successfully",
      data: location,
    });
  }

  async getLocation(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);
    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Unauthorized: User not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const location = await LocationService.getUserLocation(userId);
    if (!location) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: "No location has been saved for this user",
        code: "LOCATION_NOT_SET",
      });
    }

    return ApiResponse.success(res, { data: location });
  }
}

export default new LocationController();
