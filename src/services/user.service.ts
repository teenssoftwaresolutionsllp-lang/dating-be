import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { users } from "../db/schema";

class UserService {
  static async getProfile(userId: string) {
    const [user] = await db
      .select({
        id: users.id,
        phone: users.phone,
        email: users.email,
        role: users.role,
        status: users.status,
        emailVerified: users.emailVerified,
        phoneVerified: users.phoneVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    return user;
  }
}

export default UserService;
