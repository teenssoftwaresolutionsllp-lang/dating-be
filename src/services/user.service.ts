import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { users } from "../db/schema";
import type { SafeUser, User } from "../types/index";

export class UserService {
  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  /**
   * Find user by phone number
   */
  static async findByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  /**
   * Get safe user profile by ID
   */
  static async getProfile(id: string): Promise<SafeUser | undefined> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        emailVerified: users.emailVerified,
        phoneVerified: users.phoneVerified,
        authProvider: users.authProvider,
        lastLoginAt: users.lastLoginAt,
        lastActiveAt: users.lastActiveAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id));

    return user;
  }
}

export default UserService;
