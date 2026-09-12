import { SavedSecretInputSchema } from "@/features/config/config.admin.schema";
import { z } from "zod";

export const TestEmailConnectionSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  username: z.string().min(1),
  password: z.string().min(1),
  senderAddress: z.email(),
  senderName: z.string().optional(),
});

export type TestEmailConnectionInput = z.infer<
  typeof TestEmailConnectionSchema
>;

export const AdminTestEmailConnectionSchema = TestEmailConnectionSchema.omit({
  password: true,
})
  .extend({ password: SavedSecretInputSchema })
  .strict();
export type AdminTestEmailConnectionInput = z.infer<
  typeof AdminTestEmailConnectionSchema
>;
