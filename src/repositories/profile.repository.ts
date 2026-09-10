import { count, eq, inArray } from "drizzle-orm";
import { db } from "../db/index";
import {
  education,
  type Education,
  type NewEducation,
} from "../db/schema/education.schema";
import {
  kycVerifications,
  type KycVerification,
} from "../db/schema/kyc.schema";
import {
  datingPreferences,
  type DatingPreference,
  type NewDatingPreference,
} from "../db/schema/dating-preferences.schema";
import { interests } from "../db/schema/interests.schema";
import { profileInterests } from "../db/schema/profile-interests.schema";
import { profilePhotos } from "../db/schema/profile-photos.schema";
import { languages } from "../db/schema/languages.schema";
import { profileLanguages } from "../db/schema/profile-languages.schema";
import {
  profiles,
  type NewProfile,
  type Profile,
} from "../db/schema/profiles.schema";
import { users } from "../db/schema/users.schema";

export type ProfileUpdate = Partial<
  Pick<
    NewProfile,
    | "name"
    | "dateOfBirth"
    | "gender"
    | "height"
    | "location"
    | "relationshipStatus"
    | "bio"
  >
>;

class ProfileRepository {
  async getCompletionData(userId: string) {
    return db.transaction(async (transaction) => {
      const [profile] = await transaction
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId));
      const [educationRecord] = await transaction
        .select({ id: education.id })
        .from(education)
        .where(eq(education.userId, userId));
      const [kyc] = await transaction
        .select({ status: kycVerifications.status })
        .from(kycVerifications)
        .where(eq(kycVerifications.userId, userId));
      const [preferences] = await transaction
        .select({ id: datingPreferences.id })
        .from(datingPreferences)
        .where(eq(datingPreferences.userId, userId));
      const [photoCount] = await transaction
        .select({ count: count() })
        .from(profilePhotos)
        .where(eq(profilePhotos.userId, userId));

      let languageCount = 0;
      let interestCount = 0;

      if (profile) {
        const [languagesResult] = await transaction
          .select({ count: count() })
          .from(profileLanguages)
          .where(eq(profileLanguages.profileId, profile.id));
        const [interestsResult] = await transaction
          .select({ count: count() })
          .from(profileInterests)
          .where(eq(profileInterests.profileId, profile.id));
        languageCount = Number(languagesResult.count);
        interestCount = Number(interestsResult.count);
      }

      return {
        profile,
        languageCount,
        interestCount,
        educationExists: Boolean(educationRecord),
        kycStatus: kyc?.status ?? null,
        photoCount: Number(photoCount.count),
        preferencesExists: Boolean(preferences),
      };
    });
  }

  async markOnboardingCompleted(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        onboardingStep: "COMPLETED",
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.user_id, userId));
  }

  async findInterests(): Promise<(typeof interests.$inferSelect)[]> {
    return db.select().from(interests);
  }

  async replaceProfileInterests(
    userId: string,
    interestIds: number[],
  ): Promise<number[]> {
    return db.transaction(async (transaction) => {
      const [profile] = await transaction
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.userId, userId));

      if (!profile) {
        return [];
      }

      const existingInterests = await transaction
        .select({ id: interests.id })
        .from(interests)
        .where(inArray(interests.id, interestIds));
      const existingIds = existingInterests.map((interest) => interest.id);

      if (existingIds.length !== interestIds.length) {
        return existingIds;
      }

      await transaction
        .delete(profileInterests)
        .where(eq(profileInterests.profileId, profile.id));

      await transaction.insert(profileInterests).values(
        interestIds.map((interestId) => ({
          profileId: profile.id,
          interestId,
        })),
      );

      await transaction
        .update(users)
        .set({ onboardingStep: "PREFERENCES", updatedAt: new Date() })
        .where(eq(users.user_id, userId));

      return existingIds;
    });
  }

  async upsertDatingPreferences(
    userId: string,
    values: Omit<NewDatingPreference, "id" | "userId">,
  ): Promise<DatingPreference> {
    return db.transaction(async (transaction) => {
      const [preferences] = await transaction
        .insert(datingPreferences)
        .values({ userId, ...values })
        .onConflictDoUpdate({
          target: datingPreferences.userId,
          set: values,
        })
        .returning();

      await transaction
        .update(users)
        .set({ onboardingStep: "PREFERENCES", updatedAt: new Date() })
        .where(eq(users.user_id, userId));

      return preferences;
    });
  }

  async findKycByUserId(userId: string): Promise<KycVerification | undefined> {
    const [kyc] = await db
      .select()
      .from(kycVerifications)
      .where(eq(kycVerifications.userId, userId));

    return kyc;
  }

  async upsertKyc(
    userId: string,
    documentType: string,
    documentNumberHash: string,
  ): Promise<KycVerification> {
    return db.transaction(async (transaction) => {
      const now = new Date();
      const [kyc] = await transaction
        .insert(kycVerifications)
        .values({ userId, documentType, documentNumberHash, updatedAt: now })
        .onConflictDoUpdate({
          target: kycVerifications.userId,
          set: {
            documentType,
            documentNumberHash,
            status: "pending",
            verifiedAt: null,
            rejectionReason: null,
            updatedAt: now,
          },
        })
        .returning();

      await transaction
        .update(users)
        .set({ onboardingStep: "PHOTOS", updatedAt: now })
        .where(eq(users.user_id, userId));

      return kyc;
    });
  }

  async findLanguages(): Promise<(typeof languages.$inferSelect)[]> {
    return db.select().from(languages);
  }

  async replaceProfileLanguages(
    userId: string,
    languageIds: number[],
  ): Promise<number[]> {
    return db.transaction(async (transaction) => {
      const [profile] = await transaction
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.userId, userId));

      if (!profile) {
        return [];
      }

      const existingLanguages = await transaction
        .select({ id: languages.id })
        .from(languages)
        .where(inArray(languages.id, languageIds));

      const existingIds = existingLanguages.map((language) => language.id);
      if (existingIds.length !== languageIds.length) {
        return existingIds;
      }

      await transaction
        .delete(profileLanguages)
        .where(eq(profileLanguages.profileId, profile.id));

      await transaction.insert(profileLanguages).values(
        languageIds.map((languageId) => ({
          profileId: profile.id,
          languageId,
        })),
      );

      await transaction
        .update(users)
        .set({ onboardingStep: "EDUCATION", updatedAt: new Date() })
        .where(eq(users.user_id, userId));

      return existingIds;
    });
  }

  async upsertEducation(
    userId: string,
    values: Omit<NewEducation, "id" | "userId" | "createdAt" | "updatedAt">,
  ): Promise<Education> {
    return db.transaction(async (transaction) => {
      const now = new Date();
      const [educationRecord] = await transaction
        .insert(education)
        .values({ userId, ...values, updatedAt: now })
        .onConflictDoUpdate({
          target: education.userId,
          set: { ...values, updatedAt: now },
        })
        .returning();

      await transaction
        .update(users)
        .set({ onboardingStep: "KYC", updatedAt: now })
        .where(eq(users.user_id, userId));

      return educationRecord;
    });
  }

  async findByUserId(userId: string): Promise<Profile | undefined> {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));

    return profile;
  }

  async findOnboardingStatus(userId: string): Promise<
    | {
        onboardingStep: string;
        onboardingCompletedAt: Date | null;
      }
    | undefined
  > {
    const [user] = await db
      .select({
        onboardingStep: users.onboardingStep,
        onboardingCompletedAt: users.onboardingCompletedAt,
      })
      .from(users)
      .where(eq(users.user_id, userId));

    return user;
  }

  async saveProfileAndStep(
    userId: string,
    values: ProfileUpdate,
    onboardingStep: string,
  ): Promise<Profile> {
    return db.transaction(async (transaction) => {
      const [existingProfile] = await transaction
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId));

      const now = new Date();
      let profile: Profile | undefined;

      if (existingProfile) {
        [profile] = await transaction
          .update(profiles)
          .set({ ...values, updatedAt: now })
          .where(eq(profiles.userId, userId))
          .returning();
      } else {
        [profile] = await transaction
          .insert(profiles)
          .values({ userId, ...values })
          .returning();
      }

      await transaction
        .update(users)
        .set({ onboardingStep, updatedAt: now })
        .where(eq(users.user_id, userId));

      return profile;
    });
  }
}

export default new ProfileRepository();
