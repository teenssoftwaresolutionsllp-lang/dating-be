import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "../db/index";
import {
  datingPreferences,
  education,
  interests,
  kycVerifications,
  languages,
  profileInterests,
  profileLanguages,
  profilePhotos,
  profiles,
  users,
  type DatingPreference,
  type Education,
  type KycVerification,
  type Language,
  type NewDatingPreference,
  type NewEducation,
  type NewProfile,
  type NewProfilePhoto,
  type Profile,
  type ProfilePhoto,
} from "../db/schema";

export type ProfileUpdate = Partial<
  Pick<
    NewProfile,
    | "name"
    | "dateOfBirth"
    | "gender"
    | "religion"
    | "heightCm"
    | "city"
    | "state"
    | "country"
    | "latitude"
    | "longitude"
    | "locationUpdatedAt"
    | "relationshipStatus"
    | "bio"
  >
>;

class ProfileRepository {
  async findPhotosByUserId(userId: string): Promise<ProfilePhoto[]> {
    return db
      .select()
      .from(profilePhotos)
      .where(eq(profilePhotos.userId, userId));
  }

  async findProfilePhotoById(
    userId: string,
    photoId: string,
  ): Promise<ProfilePhoto | undefined> {
    const [photo] = await db
      .select()
      .from(profilePhotos)
      .where(
        and(eq(profilePhotos.id, photoId), eq(profilePhotos.userId, userId)),
      );

    return photo;
  }

  async createProfilePhoto(values: NewProfilePhoto): Promise<ProfilePhoto> {
    return db.transaction(async (transaction) => {
      const [photo] = await transaction
        .insert(profilePhotos)
        .values(values)
        .returning();

      await transaction
        .update(users)
        .set({ updatedAt: new Date() })
        .where(eq(users.id, values.userId));

      return photo;
    });
  }

  async deleteProfilePhoto(
    userId: string,
    photoId: string,
  ): Promise<ProfilePhoto | undefined> {
    const [photo] = await db
      .delete(profilePhotos)
      .where(
        and(eq(profilePhotos.id, photoId), eq(profilePhotos.userId, userId)),
      )
      .returning();

    return photo;
  }

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
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
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
        .set({ updatedAt: new Date() })
        .where(eq(users.id, userId));

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
        .set({ updatedAt: new Date() })
        .where(eq(users.id, userId));

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
    documentImage?: {
      storageKey: string;
      url: string;
    },
  ): Promise<KycVerification> {
    return db.transaction(async (transaction) => {
      const now = new Date();
      const [kyc] = await transaction
        .insert(kycVerifications)
        .values({
          userId,
          documentType,
          documentNumberHash,
          documentImageStorageKey: documentImage?.storageKey,
          documentImageUrl: documentImage?.url,
          status: "verified",
          verifiedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: kycVerifications.userId,
          set: {
            documentType,
            documentNumberHash,
            ...(documentImage
              ? {
                  documentImageStorageKey: documentImage.storageKey,
                  documentImageUrl: documentImage.url,
                }
              : {}),
            status: "verified",
            verifiedAt: now,
            rejectionReason: null,
            updatedAt: now,
          },
        })
        .returning();

      await transaction
        .update(users)
        .set({ updatedAt: now })
        .where(eq(users.id, userId));

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
        .set({ updatedAt: new Date() })
        .where(eq(users.id, userId));

      return existingIds;
    });
  }

  async upsertEducation(
    userId: string,
    values: Omit<NewEducation, "id" | "userId" | "createdAt" | "updatedAt">,
  ): Promise<Education> {
    return db.transaction(async (transaction) => {
      const now = new Date();
      const [existingEducation] = await transaction
        .select({ id: education.id })
        .from(education)
        .where(eq(education.userId, userId))
        .limit(1);

      let educationRecord: Education | undefined;
      if (existingEducation) {
        [educationRecord] = await transaction
          .update(education)
          .set({ ...values, updatedAt: now })
          .where(eq(education.id, existingEducation.id))
          .returning();
      } else {
        [educationRecord] = await transaction
          .insert(education)
          .values({ userId, ...values, updatedAt: now })
          .returning();
      }

      await transaction
        .update(users)
        .set({ updatedAt: now })
        .where(eq(users.id, userId));

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
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return undefined;
    }

    const data = await this.getCompletionData(userId);
    let onboardingStep = "COMPLETED";

    if (!data.profile?.name || !data.profile.gender) {
      onboardingStep = "BASIC_DETAILS";
    } else if (!data.profile.dateOfBirth) {
      onboardingStep = "BIRTHDAY";
    } else if (!data.profile.heightCm) {
      onboardingStep = "LOCATION";
    } else if (
      !data.profile.city &&
      !data.profile.state &&
      !data.profile.country &&
      (data.profile.latitude === null || data.profile.longitude === null)
    ) {
      onboardingStep = "LOCATION";
    } else if (!data.profile.relationshipStatus) {
      onboardingStep = "RELATIONSHIP";
    } else if (data.languageCount === 0) {
      onboardingStep = "LANGUAGES";
    } else if (!data.educationExists) {
      onboardingStep = "EDUCATION";
    } else if (data.kycStatus !== "verified") {
      onboardingStep = "KYC";
    } else if (data.photoCount === 0) {
      onboardingStep = "PHOTOS";
    } else if (data.interestCount === 0) {
      onboardingStep = "INTERESTS";
    } else if (!data.preferencesExists) {
      onboardingStep = "PREFERENCES";
    }

    return {
      onboardingStep,
      onboardingCompletedAt:
        onboardingStep === "COMPLETED" ? user.updatedAt : null,
    };
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
          .values({
            userId,
            name: values.name!,
            gender: values.gender!,
            ...values,
          })
          .returning();
      }

      await transaction
        .update(users)
        .set({ updatedAt: now })
        .where(eq(users.id, userId));

      return profile;
    });
  }
}

export default new ProfileRepository();
