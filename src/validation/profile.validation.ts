import { z } from "zod";

const dateOfBirthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid date of birth",
  })
  .refine((value) => new Date(value).getTime() <= Date.now(), {
    message: "Date of birth cannot be in the future",
  });

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    dateOfBirth: dateOfBirthSchema.optional(),
    gender: z.string().trim().min(1).max(30).optional(),
    religion: z.string().trim().min(1).max(50).optional(),
    heightCm: z.number().int().min(100).max(250).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    state: z.string().trim().min(1).max(100).optional(),
    country: z.string().trim().min(1).max(100).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    relationshipStatus: z.string().trim().min(1).max(30).optional(),
    bio: z.string().trim().max(1000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required",
  });
