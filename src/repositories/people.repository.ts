import { and, asc, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "../db/index";
import {
  interests,
  locations,
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
      .select({ latitude: locations.latitude, longitude: locations.longitude })
      .from(profiles)
      .leftJoin(locations, eq(profiles.locationId, locations.id))
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
        cos(radians(${latitude})) * cos(radians(${locations.latitude})) *
        cos(radians(${locations.longitude}) - radians(${longitude})) +
        sin(radians(${latitude})) * sin(radians(${locations.latitude}))
      ))
    )`;

    return db
      .select({
        userId: profiles.userId,
        name: profiles.name,
        dateOfBirth: profiles.dateOfBirth,
        gender: profiles.gender,
        bio: profiles.bio,
        city: locations.city,
        state: locations.state,
        country: locations.country,
        photoUrl: profilePhotos.url,
        distanceKm,
      })
      .from(profiles)
      .innerJoin(users, eq(users.id, profiles.userId))
      .innerJoin(locations, eq(profiles.locationId, locations.id))
      .leftJoin(userSettings, eq(userSettings.userId, profiles.userId))
      .leftJoin(profilePhotos, primaryPhotoJoin)
      .where(
        and(
          visibleActiveProfile(userId),
          hasNotBeenSwiped(userId),
          sql`${locations.latitude} IS NOT NULL`,
          sql`${locations.longitude} IS NOT NULL`,
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
        city: locations.city,
        state: locations.state,
        country: locations.country,
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
      .leftJoin(locations, eq(profiles.locationId, locations.id))
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
        locations.city,
        locations.state,
        locations.country,
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
