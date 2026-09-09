import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import ApiResponse from "../utils/response";

export const validateBody =
  (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: "Invalid request data",
        code: "VALIDATION_ERROR",
        errors: result.error.flatten(),
      });
    }

    req.body = result.data;
    return next();
  };
