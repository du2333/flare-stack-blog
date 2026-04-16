import { z } from "zod";
import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import { defineMcpPrompt } from "../service/mcp-prompt";
import {
  createLanguageInstruction,
  PromptLanguageSchema,
} from "./prompt-language";

const WRITE_POST_FROM_BRIEF_SCOPES: OAuthScopeRequest = {
  posts: ["read", "write"],
};

export const writePostFromBriefPrompt = defineMcpPrompt({
  name: "write_post_from_brief",
  title: "根据描述写文章 / Write Post From Brief",
  description:
    "根据描述完成调研、起草与结构化写作 / Research, draft, and structure a post from a brief.",
  requiredScopes: WRITE_POST_FROM_BRIEF_SCOPES,
  argsSchema: {
    brief: z
      .string()
      .min(1)
      .describe(
        "文章描述或写作需求 / Post brief or writing request. 支持中英文 / Chinese and English are supported.",
      ),
    language: PromptLanguageSchema,
  },
  handler(args) {
    return {
      description:
        "Use the available blog tools to turn a brief into a solid draft.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Write a blog post based on this brief: ${args.brief}`,
              "",
              createLanguageInstruction(args.language),
              "",
              "Workflow:",
              "1. Use search_posts to inspect related published posts and avoid overlap.",
              "2. Use posts_create_draft to create a draft.",
              "3. Use posts_update to write title, summary, slug, read time, and markdown body.",
              "4. If tags are helpful, inspect tags_list and then use posts_set_tags.",
              "5. Finish by summarizing what was created and what still needs review before publishing.",
            ].join("\n"),
          },
        },
      ],
    };
  },
});
