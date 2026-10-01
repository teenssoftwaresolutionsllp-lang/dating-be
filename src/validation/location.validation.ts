import { z } from "zod";

export const popularLocationSelectionSchema = z
  .object({
    locationId: z.string().trim().uuid("Invalid locationId"),
  })
  .strict();

export const locationAutocompleteSchema = z
  .object({
    input: z.string().trim().min(2).max(100),
    sessionToken: z.string().trim().uuid().optional(),
  })
  .strict();

export const googleLocationSelectionSchema = z
  .object({
    placeId: z.string().trim().min(1).max(255),
    sessionToken: z.string().trim().uuid().optional(),
  })
  .strict();
