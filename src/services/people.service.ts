import PeopleRepository from "../repositories/people.repository";
import type { AppError } from "../types/index";

const createBadRequestError = (message: string, code: string): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = 400;
  error.code = code;
  return error;
};

const calculateAge = (dateOfBirth: string | null): number | null => {
  if (!dateOfBirth) return null;

  const today = new Date();
  const birthDate = new Date(`${dateOfBirth}T00:00:00Z`);
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayThisYear = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      birthDate.getUTCMonth(),
      birthDate.getUTCDate(),
    ),
  );

  if (today < birthdayThisYear) age -= 1;
  return age;
};

const toPeopleCard = <T extends { dateOfBirth: string | null }>(person: T) => ({
  ...person,
  age: calculateAge(person.dateOfBirth),
  dateOfBirth: undefined,
});

class PeopleService {
  async getNearby(
    userId: string,
    radiusKm: number,
    page: number,
    limit: number,
  ) {
    const location = await PeopleRepository.findLocationByUserId(userId);
    if (
      location?.latitude === null ||
      location?.longitude === null ||
      !location
    ) {
      throw createBadRequestError(
        "Save your location before discovering nearby people",
        "LOCATION_REQUIRED",
      );
    }

    const items = await PeopleRepository.findNearby(
      userId,
      location.latitude,
      location.longitude,
      radiusKm,
      limit,
      (page - 1) * limit,
    );

    return { items: items.map(toPeopleCard), page, limit };
  }

  async getSimilarInterests(userId: string, page: number, limit: number) {
    const items = await PeopleRepository.findSimilarInterests(
      userId,
      limit,
      (page - 1) * limit,
    );

    return { items: items.map(toPeopleCard), page, limit };
  }
}

export default new PeopleService();
