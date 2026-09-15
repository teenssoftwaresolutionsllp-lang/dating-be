import {
  users,
  type User,
  type NewUser,
  userSessions,
  type UserSession,
  type NewUserSession,
  otpVerifications,
  type OtpVerification,
  type NewOtpVerification,
} from "../db/schema";
import type { SocialAccount, NewSocialAccount } from "../types";

export {
  users,
  users as UserModel,
  userSessions,
  userSessions as UserSessionModel,
  otpVerifications,
  otpVerifications as OtpVerificationModel,
  type User,
  type NewUser,
  type UserSession,
  type NewUserSession,
  type OtpVerification,
  type NewOtpVerification,
  type SocialAccount,
  type NewSocialAccount,
};
