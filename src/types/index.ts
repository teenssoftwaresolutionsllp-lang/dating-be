import type { Request } from "express";
import type { users } from "../db/schema/users";
import type { otpVerifications } from "../db/schema/otp-verifications";
import type { userSessions } from "../db/schema/user-sessions";
import type { socialAccounts } from "../db/schema/social-accounts";

// Database Inferred Models
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type OtpVerification = typeof otpVerifications.$inferSelect;
export type NewOtpVerification = typeof otpVerifications.$inferInsert;

export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;

export type SocialAccount = typeof socialAccounts.$inferSelect;
export type NewSocialAccount = typeof socialAccounts.$inferInsert;

// Safe User (sanitized payload without password)
export interface SafeUser {
  id: number;
  phone: string | null;
  countryCode: string;
  email?: string | null;
  preferredLanguage: string;
  role: string;
  isVerified: boolean;
  isActive?: boolean;
  profileCompleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Supported Language
export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  isDefault: boolean;
}

// Token Interfaces
export interface TokenPayload {
  id: number;
  phone?: string | null;
  email?: string | null;
  role: string;
  [key: string]: unknown;
}

export interface RefreshTokenPayload {
  id: number;
  type: string;
  [key: string]: unknown;
}

export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

// Service Method Parameters & Return Types
export interface SendOtpParams {
  phone: string;
  countryCode?: string;
  preferredLanguage?: string;
}

export interface SendOtpResult {
  phone: string;
  countryCode: string;
  purpose: string;
  expiresIn: number;
  resendCooldown: number;
  devOtp?: string;
}

export interface VerifyOtpParams {
  phone: string;
  countryCode?: string;
  otp: string;
  preferredLanguage?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface AuthResult {
  isNewUser: boolean;
  provider?: string;
  user: SafeUser;
  tokens: TokensResponse;
}

export interface SocialAuthParams {
  provider: string;
  providerUserId: string;
  providerEmail?: string;
  preferredLanguage?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface RefreshTokenParams {
  refreshToken: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface LogoutParams {
  refreshToken?: string;
  userId?: number;
}

export interface SetLanguageParams {
  userId: number;
  language: string;
}

// API Response Structures
export interface ApiResponseOptions<T = unknown> {
  statusCode?: number;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
  code?: string;
  errors?: unknown;
}

export interface ApiResponsePayload<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
  code?: string;
  errors?: unknown;
}

// Custom App Error
export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  errors?: unknown;
  remainingSeconds?: number;
  remainingAttempts?: number;
}

// Express Request Augmentations
declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: SafeUser;
}

export interface OptionalAuthRequest extends Request {
  user?: SafeUser;
}

// =================================================================
// Profile Domain Types
// =================================================================
export interface ProfileData {
  userId: number;
  displayName?: string | null;
  bio?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  interestedIn?: string | null;
  photos?: string[];
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  maxDistance?: number | null;
  ageMin?: number | null;
  ageMax?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateProfileParams {
  userId: number;
  displayName?: string;
  bio?: string;
  birthDate?: string;
  gender?: string;
  interestedIn?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  maxDistance?: number;
  ageMin?: number;
  ageMax?: number;
}

export interface AddPhotoParams {
  userId: number;
  photoUrl: string;
}

export interface DeletePhotoParams {
  userId: number;
  photoUrl: string;
}

// =================================================================
// Match Domain Types
// =================================================================
export type SwipeDirection = "like" | "dislike" | "superlike";

export interface SwipeParams {
  userId: number;
  targetUserId: number;
  direction: SwipeDirection;
}

export interface SwipeResult {
  direction: SwipeDirection;
  isMatch: boolean;
  matchId?: number;
  targetUser?: Pick<SafeUser, "id" | "phone">;
}

export interface MatchRecord {
  id: number;
  userId: number;
  targetUserId: number;
  direction: SwipeDirection;
  isMatch: boolean;
  createdAt: Date;
}

export interface GetMatchesParams {
  userId: number;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =================================================================
// Message Domain Types
// =================================================================
export interface SendMessageParams {
  senderId: number;
  receiverId: number;
  content: string;
  messageType?: "text" | "image" | "audio";
}

export interface MessageRecord {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  messageType: string;
  isRead: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetConversationParams {
  userId: number;
  otherUserId: number;
  page?: number;
  limit?: number;
}

export interface ConversationSummary {
  userId: number;
  displayName?: string | null;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: number;
}

export interface DeleteMessageParams {
  messageId: number;
  userId: number;
}

// =================================================================
// Admin Domain Types
// =================================================================
export interface AdminUserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}

export interface AdminUserRecord extends SafeUser {
  email?: string | null;
  isActive?: boolean;
  createdAt?: Date;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalMatches: number;
  totalMessages: number;
  bannedUsers: number;
}

export interface BanUserParams {
  adminId: number;
  targetUserId: number;
  reason?: string;
}
