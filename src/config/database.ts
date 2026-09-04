import "dotenv/config";

export const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

export const jwtConfig = {
  secret: process.env.JWT_SECRET || "dating_app_super_secret_jwt_key_2025_secure_token",
  expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
};
