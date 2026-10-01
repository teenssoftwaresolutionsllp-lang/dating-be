import { z } from "zod";

const dateOfBirthSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid date of birth",
  })
  .refine((value) => new Date(value).getTime() <= Date.now(), {
    message: "Date of birth cannot be in the future",
  })
  .transform((value) => {
    const d = new Date(value);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    dateOfBirth: dateOfBirthSchema.optional(),
    gender: z.string().trim().min(1).max(30).optional(),
    religion: z.string().trim().min(1).max(50).optional(),
    heightCm: z.number().int().min(100).max(250).optional(),
    relationshipStatus: z.string().trim().min(1).max(30).optional(),
    foodPreference: z.string().trim().max(50).optional(),
    drinking: z.string().trim().max(50).optional(),
    smoking: z.string().trim().max(50).optional(),
    vibes: z.array(z.string().trim()).optional(),
    nature: z.array(z.string().trim()).optional(),
    bio: z.string().trim().max(1000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required",
  })
  .transform(({ nature, ...value }) => ({
    ...value,
    ...(value.vibes === undefined && nature !== undefined
      ? { vibes: nature }
      : {}),
  }));
