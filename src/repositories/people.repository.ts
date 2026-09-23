import { and, asc, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "../db/index";
import {
  interests,
  profileInterests,
  profilePhotos,
  profiles,
  swipes,
  userSettings,
  users,
} from "../db/schema";

const visibleActiveProfile = (userId: string) =>
  and(
    ne(profiles.userId, userId),
    eq(users.status, "active"),
    or(
      isNull(userSettings.profileVisibility),
      eq(userSettings.profileVisibility, true),
    ),
  );

const hasNotBeenSwiped = (userId: string) =>
  sql`NOT EXISTS (
    SELECT 1 FROM ${swipes}
    WHERE ${swipes.userId} = ${userId}
      AND ${swipes.targetUserId} = ${profiles.userId}
  )`;

const primaryPhotoJoin = and(
  eq(profilePhotos.userId, profiles.userId),
  eq(profilePhotos.isPrimary, true),
  isNull(profilePhotos.deletedAt),
);

class PeopleRepository {
  async findLocationByUserId(userId: string) {
    const [profile] = await db
      .select({ latitude: profiles.latitude, longitude: profiles.longitude })
      .from(profiles)
      .where(eq(profiles.userId, userId));

    return profile;
  }

  async findNearby(
    userId: string,
    latitude: number,
    longitude: number,
    radiusKm: number,
    limit: number,
    offset: number,
  ) {
    const distanceKm = sql<number>`6371 * acos(
      least(1, greatest(-1,
        cos(radians(${latitude})) * cos(radians(${profiles.latitude})) *
        cos(radians(${profiles.longitude}) - radians(${longitude})) +
        sin(radians(${latitude})) * sin(radians(${profiles.latitude}))
      ))
    )`;

    return db
      .select({
        userId: profiles.userId,
        name: profiles.name,
        dateOfBirth: profiles.dateOfBirth,
        gender: profiles.gender,
        bio: profiles.bio,
        city: profiles.city,
        state: profiles.state,
        country: profiles.country,
        photoUrl: profilePhotos.url,
        distanceKm,
      })
      .from(profiles)
      .innerJoin(users, eq(users.id, profiles.userId))
      .leftJoin(userSettings, eq(userSettings.userId, profiles.userId))
      .leftJoin(profilePhotos, primaryPhotoJoin)
      .where(
        and(
          visibleActiveProfile(userId),
          hasNotBeenSwiped(userId),
          sql`${profiles.latitude} IS NOT NULL`,
          sql`${profiles.longitude} IS NOT NULL`,
          sql`${distanceKm} <= ${radiusKm}`,
        ),
      )
      .orderBy(asc(distanceKm), asc(profiles.name))
      .limit(limit)
      .offset(offset);
  }

  async findSimilarInterests(userId: string, limit: number, offset: number) {
    const currentInterests = db
      .select({ interestId: profileInterests.interestId })
      .from(profileInterests)
      .innerJoin(profiles, eq(profiles.id, profileInterests.profileId))
      .where(eq(profiles.userId, userId));

    return db
      .select({
        userId: profiles.userId,
        name: profiles.name,
        dateOfBirth: profiles.dateOfBirth,
        gender: profiles.gender,
        bio: profiles.bio,
        city: profiles.city,
        state: profiles.state,
        country: profiles.country,
        photoUrl: profilePhotos.url,
        sharedInterestCount: sql<number>`count(distinct ${profileInterests.interestId})`,
        sharedInterests: sql<
          string[]
        >`array_agg(distinct ${interests.name} order by ${interests.name})`,
      })
      .from(profileInterests)
      .innerJoin(profiles, eq(profiles.id, profileInterests.profileId))
      .innerJoin(users, eq(users.id, profiles.userId))
      .innerJoin(interests, eq(interests.id, profileInterests.interestId))
      .leftJoin(userSettings, eq(userSettings.userId, profiles.userId))
      .leftJoin(profilePhotos, primaryPhotoJoin)
      .where(
        and(
          visibleActiveProfile(userId),
          hasNotBeenSwiped(userId),
          sql`${profileInterests.interestId} IN ${currentInterests}`,
        ),
      )
      .groupBy(
        profiles.userId,
        profiles.name,
        profiles.dateOfBirth,
        profiles.gender,
        profiles.bio,
        profiles.city,
        profiles.state,
        profiles.country,
        profilePhotos.url,
      )
      .orderBy(
        desc(sql`count(distinct ${profileInterests.interestId})`),
        asc(profiles.name),
      )
      .limit(limit)
      .offset(offset);
  }
}

export default new PeopleRepository();
