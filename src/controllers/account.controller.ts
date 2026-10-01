import type { Request, Response } from "express";
import AccountService from "../services/account.service";
import ApiResponse from "../utils/response";

const getUserId = (req: Request): string | undefined =>
  req.user?.id ? String(req.user.id) : undefined;

export class AccountController {
  static async deactivate(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);
    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      });
    }

    const result = await AccountService.deactivateAccount(userId);
    return ApiResponse.success(res, {
      statusCode: 200,
      message:
        "Account deactivated. It is scheduled for permanent deletion in 30 days.",
      data: result,
    });
  }

  static async requestDeletionOtp(
    req: Request,
    res: Response,
  ): Promise<Response> {
    const userId = getUserId(req);
    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      });
    }

    const result = await AccountService.requestDeletionOtp(userId);
    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Account deletion code sent to the phone number on your account",
      data: result,
    });
  }

  static async confirmDeletion(req: Request, res: Response): Promise<Response> {
    const userId = getUserId(req);
    if (!userId) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      });
    }

    const result = await AccountService.confirmAccountDeletion(
      userId,
      req.body.otp,
    );
    return ApiResponse.success(res, {
      statusCode: result.mediaCleanupPending ? 202 : 200,
      message: result.mediaCleanupPending
        ? "Account data was deleted. External media cleanup is pending and will be retried."
        : "Account and associated data permanently deleted",
      data: result,
    });
  }
}

export default AccountController;
