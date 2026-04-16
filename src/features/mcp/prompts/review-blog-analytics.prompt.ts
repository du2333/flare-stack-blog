import { z } from "zod";
import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import { defineMcpPrompt } from "../service/mcp-prompt";
import {
  createLanguageInstruction,
  PromptLanguageSchema,
} from "./prompt-language";

const REVIEW_BLOG_ANALYTICS_SCOPES: OAuthScopeRequest = {
  analytics: ["read"],
};

export const reviewBlogAnalyticsPrompt = defineMcpPrompt({
  name: "review_blog_analytics",
  title: "分析博客数据 / Review Blog Analytics",
  description: "总结近期博客表现 / Summarize recent blog performance.",
  requiredScopes: REVIEW_BLOG_ANALYTICS_SCOPES,
  argsSchema: {
    range: z
      .enum(["24h", "7d", "30d", "90d"])
      .optional()
      .describe(
        "统计范围 / Analytics range: 24h | 7d | 30d | 90d。默认 / Default: 24h.",
      ),
    language: PromptLanguageSchema,
  },
  handler(args) {
    const range = args.range ?? "24h";

    return {
      description:
        "Read the current blog overview and produce an operator-friendly summary.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Review blog analytics for the ${range} range.`,
              "",
              createLanguageInstruction(args.language),
              "",
              "Workflow:",
              "1. Use analytics_overview with the requested range.",
              "2. Summarize core site stats, traffic metrics, and top pages.",
              "3. If analytics are unavailable, say so clearly and still summarize the available site stats.",
              "4. End with a few practical content or operations recommendations.",
            ].join("\n"),
          },
        },
      ],
    };
  },
});
