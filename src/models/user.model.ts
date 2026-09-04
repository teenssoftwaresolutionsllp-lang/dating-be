import { users, type User, type NewUser } from "../db/schema/users";
import { userSessions, type UserSession, type NewUserSession } from "../db/schema/user-sessions";
import { otpVerifications, type OtpVerification, type NewOtpVerification } from "../db/schema/otp-verifications";
import { socialAccounts, type SocialAccount, type NewSocialAccount } from "../db/schema/social-accounts";

export {
  users,
  users as UserModel,
  userSessions,
  userSessions as UserSessionModel,
  otpVerifications,
  otpVerifications as OtpVerificationModel,
  socialAccounts,
  socialAccounts as SocialAccountModel,
  type User,
  type NewUser,
  type UserSession,
  type NewUserSession,
  type OtpVerification,
  type NewOtpVerification,
  type SocialAccount,
  type NewSocialAccount,
};
