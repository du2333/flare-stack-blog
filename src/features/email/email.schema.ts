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
