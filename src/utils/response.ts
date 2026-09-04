import type { Response } from "express";
import type { ApiResponseOptions, ApiResponsePayload } from "../types/index";

/**
 * Standard API Response Formatter
 */
export class ApiResponse {
  /**
   * Send a success response
   * @param res Express response object
   * @param options Response data and details
   */
  static success<T = unknown>(
    res: Response,
    {
      statusCode = 200,
      message = "Success",
      data,
      meta,
    }: ApiResponseOptions<T> = {}
  ): Response<ApiResponsePayload<T>> {
    const responsePayload: ApiResponsePayload<T> = {
      success: true,
      statusCode,
      message,
    };

    if (data !== undefined) {
      responsePayload.data = data;
    }

    if (meta !== undefined) {
      responsePayload.meta = meta;
    }

    return res.status(statusCode).json(responsePayload);
  }

  /**
   * Send an error response
   * @param res Express response object
   * @param options Error message and details
   */
  static error(
    res: Response,
    {
      statusCode = 500,
      message = "Internal Server Error",
      errors,
      code,
    }: ApiResponseOptions = {}
  ): Response<ApiResponsePayload> {
    const responsePayload: ApiResponsePayload = {
      success: false,
      statusCode,
      message,
    };

    if (code !== undefined) {
      responsePayload.code = code;
    }

    if (errors !== undefined) {
      responsePayload.errors = errors;
    }

    return res.status(statusCode).json(responsePayload);
  }
}

export default ApiResponse;
