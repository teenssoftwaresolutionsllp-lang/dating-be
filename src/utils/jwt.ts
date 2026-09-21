import jwt, { type SignOptions } from "jsonwebtoken";
import { jwtConfig } from "../config/database";
import type {
  SafeUser,
  TokenPayload,
  RefreshTokenPayload,
  TokensResponse,
} from "../types/index";

/**
 * Generate Access and Refresh JWT Tokens
 * @param user User payload (id, phone, email, role)
 * @returns tokens object { accessToken, refreshToken, expiresIn, refreshExpiresIn }
 */
export const generateTokens = (
  user: TokenPayload | SafeUser
): TokensResponse => {
  const payload: TokenPayload = {
    id: user.id,
    phone: user.phone,
    email: user.email,
    role: user.role,
  };

  const accessOptions: SignOptions = {
    expiresIn: jwtConfig.expiresIn as SignOptions["expiresIn"],
  };

  const accessToken = jwt.sign(payload, jwtConfig.secret, accessOptions);

  const refreshOptions: SignOptions = {
    expiresIn: jwtConfig.refreshExpiresIn as SignOptions["expiresIn"],
  };

  const refreshToken = jwt.sign(
    { id: user.id, type: "refresh" },
    jwtConfig.secret,
    refreshOptions
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: jwtConfig.expiresIn,
    refreshExpiresIn: jwtConfig.refreshExpiresIn,
  };
};

/**
 * Verify JWT Access Token
 * @param token JWT token string
 * @returns Decoded payload
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, jwtConfig.secret) as TokenPayload;
};

/**
 * Verify JWT Refresh Token
 * @param token Refresh token string
 * @returns Decoded payload
 */
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, jwtConfig.secret) as RefreshTokenPayload;
};
