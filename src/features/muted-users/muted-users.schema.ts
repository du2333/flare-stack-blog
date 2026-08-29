import { z } from "zod";

const coercedDate = z.union([z.date(), z.string().pipe(z.coerce.date())]);

export const MutedUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  mutedAt: coercedDate,
});

export const MuteUserInputSchema = z.object({
  userId: z.string().min(1),
});

export const UnmuteUserInputSchema = z.object({
  userId: z.string().min(1),
});

export type MutedUser = z.infer<typeof MutedUserSchema>;
export type MuteUserInput = z.infer<typeof MuteUserInputSchema>;
export type UnmuteUserInput = z.infer<typeof UnmuteUserInputSchema>;
