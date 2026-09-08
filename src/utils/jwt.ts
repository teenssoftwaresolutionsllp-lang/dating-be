import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type { TokensResponse } from "../types/index";

type AuthUser = {
  id: string | number;
  email?: string | null;
  phone?: string | null;
  role: string;
};

const JWT_SECRET = process.env.JWT_SECRET || "development-only-secret";
const ACCESS_TOKEN_EXPIRES_IN = (process.env.JWT_ACCESS_EXPIRES_IN ||
  "15m") as SignOptions["expiresIn"];
const REFRESH_TOKEN_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN ||
  "7d") as SignOptions["expiresIn"];

export const generateTokens = (
  user: AuthUser,
  sessionId?: string,
): TokensResponse => {
  const payload = {
    id: user.id,
    sessionId,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };

  return {
    accessToken: jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    }),
    refreshToken: jwt.sign(
      { id: user.id, sessionId, type: "refresh" },
      JWT_SECRET,
      {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      },
    ),
    expiresIn: String(ACCESS_TOKEN_EXPIRES_IN),
    refreshExpiresIn: String(REFRESH_TOKEN_EXPIRES_IN),
  };
};

export const verifyAccessToken = (
  token: string,
): JwtPayload & { id: string; sessionId: string } =>
  jwt.verify(token, JWT_SECRET) as JwtPayload & {
    id: string;
    sessionId: string;
  };

export const verifyRefreshToken = (
  token: string,
): JwtPayload & { id: string } => {
  const payload = jwt.verify(token, JWT_SECRET) as JwtPayload & {
    id: string;
    type?: string;
  };

  if (payload.type !== "refresh") {
    throw new Error("Invalid token type");
  }

  return payload;
};
