import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db/index";
import {
  datingPreferences,
  education,
  interests,
  kycVerifications,
  languages,
  locations,
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
    | "locationId"
    | "locationUpdatedAt"
    | "relationshipStatus"
    | "foodPreference"
    | "drinking"
    | "smoking"
    | "vibes"
    | "bio"
  >
>;

class ProfileRepository {
  async findPhotosByUserId(userId: string): Promise<ProfilePhoto[]> {
    return db
      .select()
      .from(profilePhotos)
      .where(
        and(eq(profilePhotos.userId, userId), isNull(profilePhotos.deletedAt)),
      )
      .orderBy(
        desc(profilePhotos.isPrimary),
        asc(profilePhotos.displayOrder),
        desc(profilePhotos.createdAt),
      );
  }

  async findProfilePhotoById(
    userId: string,
    photoId: string,
  ): Promise<ProfilePhoto | undefined> {
    const [photo] = await db
      .select()
      .from(profilePhotos)
      .where(
        and(
          eq(profilePhotos.id, photoId),
          eq(profilePhotos.userId, userId),
          isNull(profilePhotos.deletedAt),
        ),
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

  async unsetPrimaryPhotos(userId: string): Promise<void> {
    await db
      .update(profilePhotos)
      .set({ isPrimary: false })
      .where(eq(profilePhotos.userId, userId));
  }

  async normalizeGalleryDisplayOrder(userId: string): Promise<void> {
    const galleryPhotos = await db
      .select({ id: profilePhotos.id, displayOrder: profilePhotos.displayOrder })
      .from(profilePhotos)
      .where(
        and(
          eq(profilePhotos.userId, userId),
          eq(profilePhotos.isPrimary, false),
          isNull(profilePhotos.deletedAt),
        ),
      )
      .orderBy(asc(profilePhotos.displayOrder), asc(profilePhotos.createdAt));

    for (const [idx, photo] of galleryPhotos.entries()) {
      const nextOrder = idx + 1;
      if (photo.displayOrder !== nextOrder) {
        await db
          .update(profilePhotos)
          .set({ displayOrder: nextOrder })
          .where(eq(profilePhotos.id, photo.id));
      }
    }
  }

  async updateProfilePhoto(
    userId: string,
    photoId: string,
    values: Partial<NewProfilePhoto>,
  ): Promise<ProfilePhoto | undefined> {
    const [photo] = await db
      .update(profilePhotos)
      .set(values)
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
        .select({
          id: datingPreferences.id,
          relationshipIntentions: datingPreferences.relationshipIntentions,
          maxDistanceKm: datingPreferences.maxDistanceKm,
          religionPreferences: datingPreferences.religionPreferences,
        })
        .from(datingPreferences)
        .where(eq(datingPreferences.userId, userId));
      const [photoCount] = await transaction
        .select({ count: count() })
        .from(profilePhotos)
        .where(
          and(
            eq(profilePhotos.userId, userId),
            isNull(profilePhotos.deletedAt),
          ),
        );

      let languageCount = 0;
      let interestCount = 0;

      if (profile) {
        const [languagesResult] = await transaction
          .select({
            count: sql<number>`cardinality(${profileLanguages.languageIds})`,
          })
          .from(profileLanguages)
          .where(eq(profileLanguages.profileId, profile.id));
        const [interestsResult] = await transaction
          .select({
            count: sql<number>`cardinality(${profileInterests.interestIds})`,
          })
          .from(profileInterests)
          .where(eq(profileInterests.profileId, profile.id));
        languageCount = Number(languagesResult?.count ?? 0);
        interestCount = Number(interestsResult?.count ?? 0);
      }

      return {
        profile,
        languageCount,
        interestCount,
        educationExists: Boolean(educationRecord),
        kycStatus: kyc?.status ?? null,
        photoCount: Number(photoCount.count),
        preferences: preferences ?? null,
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
        .insert(profileInterests)
        .values({ profileId: profile.id, interestIds })
        .onConflictDoUpdate({
          target: profileInterests.profileId,
          set: { interestIds },
        });

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
    selfieUrl?: string,
    selfieStorageKey?: string,
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
          selfieStorageKey,
          providerReference: selfieUrl,
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
            ...(selfieUrl ? { providerReference: selfieUrl } : {}),
            ...(selfieStorageKey ? { selfieStorageKey } : {}),
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
        .insert(profileLanguages)
        .values({ profileId: profile.id, languageIds })
        .onConflictDoUpdate({
          target: profileLanguages.profileId,
          set: { languageIds },
        });

      await transaction
        .update(users)
        .set({ updatedAt: new Date() })
        .where(eq(users.id, userId));

      return existingIds;
    });
  }

  async upsertEducation(
    userId: string,
    values: Partial<
      Omit<NewEducation, "id" | "userId" | "createdAt" | "updatedAt">
    >,
  ): Promise<Education> {
    return db.transaction(async (transaction) => {
      const now = new Date();
      const [existingEducation] = await transaction
        .select()
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
        const educationLevel = values.educationLevel;
        if (!educationLevel) {
          throw new Error(
            "educationLevel is required for the first education update",
          );
        }

        const insertValues: NewEducation = {
          userId,
          educationLevel,
          ...values,
          updatedAt: now,
        };

        [educationRecord] = await transaction
          .insert(education)
          .values(insertValues)
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

  async findCompleteByUserId(userId: string) {
    const profile = await this.findByUserId(userId);

    if (!profile) {
      return {
        profile: null,
        languages: [],
        interests: [],
        education: null,
        kyc: null,
        photos: [],
        datingPreferences: null,
      };
    }

    const [
      selectedLanguages,
      selectedInterests,
      educationRecord,
      kyc,
      photos,
      preferences,
    ] = await Promise.all([
      db
        .select({ id: languages.id, name: languages.name })
        .from(profileLanguages)
        .innerJoin(
          languages,
          sql`${languages.id} = ANY(${profileLanguages.languageIds})`,
        )
        .where(eq(profileLanguages.profileId, profile.id)),
      db
        .select({
          id: interests.id,
          name: interests.name,
          category: interests.category,
        })
        .from(profileInterests)
        .innerJoin(
          interests,
          sql`${interests.id} = ANY(${profileInterests.interestIds})`,
        )
        .where(eq(profileInterests.profileId, profile.id)),
      this.findEducationByUserId(userId),
      db
        .select({
          documentType: kycVerifications.documentType,
          status: kycVerifications.status,
          submittedAt: kycVerifications.submittedAt,
          verifiedAt: kycVerifications.verifiedAt,
          rejectionReason: kycVerifications.rejectionReason,
        })
        .from(kycVerifications)
        .where(eq(kycVerifications.userId, userId))
        .then(([record]) => record ?? null),
      db
        .select({
          id: profilePhotos.id,
          url: profilePhotos.url,
          displayOrder: profilePhotos.displayOrder,
          isPrimary: profilePhotos.isPrimary,
          verificationStatus: profilePhotos.verificationStatus,
          moderationStatus: profilePhotos.moderationStatus,
          moderationReason: profilePhotos.moderationReason,
          width: profilePhotos.width,
          height: profilePhotos.height,
          createdAt: profilePhotos.createdAt,
        })
        .from(profilePhotos)
        .where(
          and(
            eq(profilePhotos.userId, userId),
            isNull(profilePhotos.deletedAt),
          ),
        )
        .orderBy(
          desc(profilePhotos.isPrimary),
          asc(profilePhotos.displayOrder),
          desc(profilePhotos.createdAt),
        ),
      db
        .select()
        .from(datingPreferences)
        .where(eq(datingPreferences.userId, userId))
        .then(([record]) => record ?? null),
    ]);

    return {
      profile,
      languages: selectedLanguages,
      interests: selectedInterests,
      education: educationRecord ?? null,
      kyc,
      photos,
      datingPreferences: preferences,
    };
  }

  async findEducationByUserId(userId: string): Promise<Education | undefined> {
    const [educationRecord] = await db
      .select()
      .from(education)
      .where(eq(education.userId, userId))
      .limit(1);

    return educationRecord;
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
    let onboardingStep = "completed";

    if (!data.profile?.name || !data.profile.gender) {
      onboardingStep = "set-profile";
    } else if (!data.profile.dateOfBirth || !data.profile.heightCm) {
      onboardingStep = "birthday";
    } else if (!data.profile.locationId) {
      onboardingStep = "location";
    } else if (!data.profile.relationshipStatus) {
      onboardingStep = "relationship";
    } else if (data.languageCount === 0) {
      onboardingStep = "languages";
    } else if (!data.educationExists) {
      onboardingStep = "qualification";
    } else if (data.kycStatus !== "verified") {
      onboardingStep = "verification";
    } else if (data.photoCount === 0) {
      onboardingStep = "photos";
    } else if (data.interestCount === 0) {
      onboardingStep = "interests";
    } else if (!data.profile.foodPreference) {
      onboardingStep = "food-preference";
    } else if (!data.profile.drinking || !data.profile.smoking) {
      onboardingStep = "lifestyle";
    } else if (!data.profile.vibes || data.profile.vibes.length === 0) {
      onboardingStep = "nature";
    } else if (!data.profile.religion) {
      onboardingStep = "religion";
    } else if (!data.preferences?.relationshipIntentions?.length) {
      onboardingStep = "looking-for";
    } else if (!data.preferences?.maxDistanceKm) {
      onboardingStep = "ideal-match";
    }

    return {
      onboardingStep,
      onboardingCompletedAt:
        onboardingStep === "completed" ? user.updatedAt : null,
    };
  }

  async saveProfileAndStep(
    userId: string,
    values: ProfileUpdate,
    _onboardingStep: string,
    locationInput?: { city?: string; state?: string; country?: string },
  ): Promise<Profile> {
    return db.transaction(async (transaction) => {
      const [existingProfile] = await transaction
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId));

      const now = new Date();
      let resolvedValues: ProfileUpdate = { ...values };

      if (locationInput?.city?.trim()) {
        const cleanCity = locationInput.city.trim();
        const cleanState = locationInput.state?.trim() || null;
        const cleanCountry = locationInput.country?.trim() || null;
        const customPlaceId = `custom:${cleanCity.toLowerCase()}:${(cleanState ?? "").toLowerCase()}:${(cleanCountry ?? "").toLowerCase()}`;

        let [loc] = await transaction
          .select()
          .from(locations)
          .where(eq(locations.googlePlaceId, customPlaceId));

        if (!loc) {
          [loc] = await transaction
            .insert(locations)
            .values({
              googlePlaceId: customPlaceId,
              name: cleanCity,
              city: cleanCity,
              state: cleanState,
              country: cleanCountry,
            })
            .onConflictDoNothing()
            .returning();

          if (!loc) {
            [loc] = await transaction
              .select()
              .from(locations)
              .where(eq(locations.googlePlaceId, customPlaceId));
          }
        }

        if (loc) {
          resolvedValues = {
            ...resolvedValues,
            locationId: loc.id,
            locationUpdatedAt: now,
          };
        }
      }

      let profile: Profile | undefined;

      if (existingProfile) {
        [profile] = await transaction
          .update(profiles)
          .set({ ...resolvedValues, updatedAt: now })
          .where(eq(profiles.userId, userId))
          .returning();
      } else {
        [profile] = await transaction
          .insert(profiles)
          .values({
            userId,
            name: resolvedValues.name || "User",
            gender: resolvedValues.gender || "other",
            ...resolvedValues,
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
