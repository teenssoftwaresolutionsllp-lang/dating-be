import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password
 * @param password Plain text password
 * @returns Hashed password or null
 */
export const hashPassword = async (
  password?: string | null
): Promise<string | null> => {
  if (!password) return null;
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare plain password against hash
 * @param password Plain text password
 * @param hash Stored password hash
 * @returns True if match
 */
export const comparePassword = async (
  password?: string | null,
  hash?: string | null
): Promise<boolean> => {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
};
