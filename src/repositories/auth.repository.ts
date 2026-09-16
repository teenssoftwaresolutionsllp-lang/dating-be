import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "../db/index";
import {
  otpVerifications,
  type NewOtpVerification,
  type OtpVerification,
  userSessions,
  type NewUserSession,
  type UserSession,
  users,
  type NewUser,
  type User,
} from "../db/schema/index";

class AuthRepository {
  async findLatestActiveOtp(
    phone: string,
    purpose: string,
  ): Promise<OtpVerification | undefined> {
    const [otp] = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.identifier, phone),
          eq(otpVerifications.purpose, purpose),
          isNull(otpVerifications.verifiedAt),
        ),
      )
      .orderBy(desc(otpVerifications.createdAt))
      .limit(1);

    return otp;
  }

  async createOtp(values: NewOtpVerification): Promise<void> {
    await db.insert(otpVerifications).values(values);
  }

  async incrementOtpAttempts(
    otpId: string,
    maxAttempts: number,
    updatedAt: Date,
  ): Promise<{ attempts: number } | undefined> {
    const [otp] = await db
      .update(otpVerifications)
      .set({ attempts: sql`${otpVerifications.attempts} + 1` })
      .where(
        and(
          eq(otpVerifications.id, otpId),
          lt(otpVerifications.attempts, maxAttempts),
        ),
      )
      .returning({ attempts: otpVerifications.attempts });

    return otp;
  }

  async markOtpVerified(otpId: string, updatedAt: Date): Promise<void> {
    await db
      .update(otpVerifications)
      .set({ verifiedAt: updatedAt })
      .where(eq(otpVerifications.id, otpId));
  }

  async findUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));

    return user;
  }

  async createUser(values: NewUser): Promise<User> {
    const [user] = await db.insert(users).values(values).returning();
    return user;
  }

  async markUserPhoneVerified(userId: string, updatedAt: Date): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ phoneVerified: true, updatedAt })
      .where(eq(users.id, userId))
      .returning();

    return user;
  }

  async findUserById(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    return user;
  }

  async createSession(values: NewUserSession): Promise<void> {
    await db.insert(userSessions).values(values);
  }

  async findActiveSessionByRefreshTokenHash(
    refreshTokenHash: string,
  ): Promise<UserSession | undefined> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.refreshTokenHash, refreshTokenHash),
          isNull(userSessions.revokedAt),
        ),
      );

    return session;
  }

  async findActiveSessionById(
    sessionId: string,
  ): Promise<UserSession | undefined> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(
        and(eq(userSessions.id, sessionId), isNull(userSessions.revokedAt)),
      );

    return session;
  }

  async updateSession(
    sessionId: string,
    values: Partial<NewUserSession>,
  ): Promise<void> {
    await db
      .update(userSessions)
      .set(values)
      .where(eq(userSessions.id, sessionId));
  }

  async revokeSessionByRefreshTokenHash(
    refreshTokenHash: string,
  ): Promise<void> {
    await db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(eq(userSessions.refreshTokenHash, refreshTokenHash));
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)),
      );
  }
}

export default new AuthRepository();
