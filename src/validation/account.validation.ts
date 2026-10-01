import { z } from "zod";

export const confirmAccountDeletionSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "OTP must be exactly 4 digits"),
});
