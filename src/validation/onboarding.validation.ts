import { z } from "zod";

export const languageSelectionSchema = z.object({
  languageIds: z
    .array(z.number().int().positive())
    .min(1, "Select at least one language")
    .max(10, "You can select up to 10 languages")
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Language IDs must not be duplicated",
    }),
});

export const educationSchema = z.object({
  educationLevel: z.string().trim().min(1).max(30),
  qualification: z.string().trim().max(100).optional(),
  profession: z.string().trim().max(100).optional(),
  occupation: z.string().trim().max(100).optional(),
  companyName: z.string().trim().max(150).optional(),
  incomeRange: z.string().trim().max(30).optional(),
});

export const kycSchema = z.object({
  documentType: z.string().trim().min(1).max(30),
  documentNumber: z.string().trim().min(4).max(100).optional(),
});

export const interestSelectionSchema = z.object({
  interestIds: z
    .array(z.number().int().positive())
    .min(1, "Select at least one interest")
    .max(30, "You can select up to 30 interests")
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Interest IDs must not be duplicated",
    }),
});

export const datingPreferencesSchema = z
  .object({
    minAge: z.number().int().min(18).max(100).optional(),
    maxAge: z.number().int().min(18).max(100).optional(),
    maxDistanceKm: z.number().int().min(1).max(1000).optional(),
    preferredGenders: z
      .array(z.string().trim().min(1).max(20))
      .max(10)
      .optional(),
    preferredInterestIds: z
      .array(z.number().int().positive())
      .max(30)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Preferred interest IDs must not be duplicated",
      })
      .optional(),
    relationshipIntentions: z
      .array(z.string().trim().min(1).max(30))
      .max(10)
      .optional(),
    religionPreferences: z
      .array(z.string().trim().min(1).max(50))
      .max(10)
      .optional(),
    communityPreferences: z
      .array(z.string().trim().min(1).max(50))
      .max(10)
      .optional(),
    verifiedOnly: z.boolean().optional(),
  })
  .refine((values) => Object.keys(values).length > 0, {
    message: "At least one preference is required",
  })
  .refine(
    (values) =>
      values.minAge === undefined ||
      values.maxAge === undefined ||
      values.minAge <= values.maxAge,
    {
      message: "Minimum age cannot be greater than maximum age",
      path: ["minAge"],
    },
  );
