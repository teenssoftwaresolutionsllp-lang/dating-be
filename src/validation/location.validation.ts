import { z } from "zod";

export const locationAutocompleteSchema = z
  .object({
    input: z.string().trim().min(2).max(100),
    sessionToken: z.uuid(),
  })
  .strict();

export const saveLocationSchema = z
  .object({
    placeId: z.string().trim().min(1).max(255),
    sessionToken: z.uuid(),
  })
  .strict();

export const selectLocationSchema = z
  .object({
    locationId: z.uuid(),
  })
  .strict();

export type LocationAutocompleteInput = z.infer<
  typeof locationAutocompleteSchema
>;
export type SaveLocationInput = z.infer<typeof saveLocationSchema>;
export type SelectLocationInput = z.infer<typeof selectLocationSchema>;
