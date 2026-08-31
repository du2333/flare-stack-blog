import type { JSONContent } from "@tiptap/react";
import { z } from "zod";

const JsonValueSchema: z.ZodType<
  string | number | boolean | null | Array<unknown> | Record<string, unknown>
> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

const JsonAttrsSchema = z.record(z.string(), JsonValueSchema);

const JsonMarkSchema = z
  .object({
    type: z.string(),
    attrs: JsonAttrsSchema.optional(),
  })
  .catchall(JsonValueSchema);

const JsonContentSchema: z.ZodType<JSONContent> = z.lazy(() =>
  z
    .object({
      type: z.string().optional(),
      attrs: JsonAttrsSchema.optional(),
      content: z.array(JsonContentSchema).optional(),
      marks: z.array(JsonMarkSchema).optional(),
      text: z.string().optional(),
    })
    .catchall(JsonValueSchema)
    .superRefine((value, ctx) => {
      if (value.text !== undefined && value.content !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Text nodes cannot contain child content.",
          path: ["content"],
        });
      }
    }),
);

export const NullableJsonContentSchema = JsonContentSchema.nullable();
