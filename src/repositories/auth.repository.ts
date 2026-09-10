import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "../db/index";
import { users, type NewUser, type User } from "../db/schema/users.schema";

import {
  otpVerifications,
  type NewOtpVerification,
  type OtpVerification,
} from "../db/schema/otp-verifications.schema";
import {
  userSessions,
  type NewUserSession,
  type UserSession,
} from "../db/schema/sessions.schema";

class AuthRepository {
  async findLatestActiveOtp(
    phone: string,
    countryCode: string,
    purpose: string,
  ): Promise<OtpVerification | undefined> {
    const [otp] = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.phone, phone),
          eq(otpVerifications.countryCode, countryCode),
          eq(otpVerifications.purpose, purpose),
          eq(otpVerifications.isVerified, false),
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
      .set({
        attempts: sql`${otpVerifications.attempts} + 1`,
        updatedAt,
      })
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
      .set({ isVerified: true, updatedAt })
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
      .where(eq(users.user_id, userId))
      .returning();

    return user;
  }

  async findUserById(userId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.user_id, userId));

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
          isNull(userSessions.revoked_at),
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
        and(eq(userSessions.id, sessionId), isNull(userSessions.revoked_at)),
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
      .set({ revoked_at: new Date() })
      .where(eq(userSessions.refreshTokenHash, refreshTokenHash));
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await db
      .update(userSessions)
      .set({ revoked_at: new Date() })
      .where(
        and(eq(userSessions.userId, userId), isNull(userSessions.revoked_at)),
      );
  }
}

export default new AuthRepository();
