import type { Request, Response } from "express";
import LocationService from "../services/location.service";
import ApiResponse from "../utils/response";

const getUserId = (req: Request): string | undefined => req.user?.userId;

export class LocationController {
  static async getPopularLocations(
    _req: Request,
    res: Response,
  ): Promise<Response> {
    const locations = await LocationService.getPopularLocations();

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Success",
      data: locations,
    });
  }

  static async selectPopularLocation(
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

    const location = await LocationService.selectPopularLocation(
      userId,
      req.body.locationId,
    );

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Location saved successfully",
      data: location,
    });
  }

  static async autocomplete(req: Request, res: Response): Promise<Response> {
    const suggestions = await LocationService.autocompleteLocation(
      req.body.input,
      req.body.sessionToken,
    );

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Success",
      data: suggestions,
    });
  }

  static async saveGoogleLocation(
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

    const location = await LocationService.saveGoogleLocation(
      userId,
      req.body.placeId,
      req.body.sessionToken,
    );

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Location saved successfully",
      data: location,
    });
  }

  static async getSelectedLocation(
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

    const location = await LocationService.getSelectedLocation(userId);

    if (!location) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: "No location selected for this profile",
        code: "LOCATION_NOT_SET",
      });
    }

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Success",
      data: location,
    });
  }
}

export default LocationController;
