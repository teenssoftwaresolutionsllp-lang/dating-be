import type { Request, Response } from "express";
import GooglePlacesService from "../services/google-places.service";
import LocationService, {
  normalizePlaceDetails,
} from "../services/location.service";
import ApiResponse from "../utils/response";

const getUserId = (req: Request): string | undefined => req.user?.userId;

class LocationController {
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

    const details = await GooglePlacesService.getPlaceDetails(
      req.body.placeId,
      req.body.sessionToken,
    );
    const location = await LocationService.saveLocation(
      userId,
      normalizePlaceDetails(details),
    );

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Location saved successfully",
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
