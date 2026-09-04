import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { users } from "../db/schema/users";
import type { SafeUser, User } from "../types/index";

export class UserService {
  /**
   * Find user by ID
   */
  static async findById(id: number): Promise<User | undefined> {
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
  static async getProfile(id: number): Promise<SafeUser | undefined> {
    const [user] = await db
      .select({
        id: users.id,
        phone: users.phone,
        countryCode: users.countryCode,
        preferredLanguage: users.preferredLanguage,
        role: users.role,
        isVerified: users.isVerified,
        isActive: users.isActive,
        profileCompleted: users.profileCompleted,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id));

    return user;
  }
}

export default UserService;
