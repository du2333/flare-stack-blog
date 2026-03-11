import type { JSONContent } from "@tiptap/react";
import { z } from "zod";

export const SearchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.number().optional().default(10),
  v: z.string(),
});

export const UpsertSearchDocSchema = z.object({
  id: z.number(),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().nullable().optional(),
  contentJson: z.custom<JSONContent>().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export const DeleteSearchDocSchema = z.object({
  id: z.number(),
});

export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
export type UpsertSearchDocInput = z.infer<typeof UpsertSearchDocSchema>;
export type DeleteSearchDocInput = z.infer<typeof DeleteSearchDocSchema>;
