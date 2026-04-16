import { z } from "zod";
import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import { defineMcpPrompt } from "../service/mcp-prompt";
import {
  createLanguageInstruction,
  PromptLanguageSchema,
} from "./prompt-language";

const MODERATE_PENDING_COMMENTS_SCOPES: OAuthScopeRequest = {
  comments: ["read", "write"],
};

export const moderatePendingCommentsPrompt = defineMcpPrompt({
  name: "moderate_pending_comments",
  title: "审核待处理评论 / Moderate Pending Comments",
  description:
    "结合上下文审核待处理评论 / Review pending comments with context.",
  requiredScopes: MODERATE_PENDING_COMMENTS_SCOPES,
  argsSchema: {
    focus: z
      .string()
      .optional()
      .describe(
        "可选审核重点，例如垃圾内容、辱骂或语气 / Optional moderation focus, for example spam, abuse, or tone.",
      ),
    language: PromptLanguageSchema,
  },
  handler(args) {
    const focusText = args.focus
      ? `Pay extra attention to this focus: ${args.focus}.`
      : "Review for spam, abuse, and obvious low-quality content.";

    return {
      description:
        "Inspect pending comments, decide what to approve or reject, and act with moderation tools.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Moderate pending comments.",
              focusText,
              "",
              createLanguageInstruction(args.language),
              "",
              "Workflow:",
              "1. Use comments_list to fetch pending comments with context.",
              "2. Review the post title, reply context, author info, and comment text before deciding.",
              "3. Use comments_set_status to approve or reject comments.",
              "4. Use comments_delete only for obvious trash that should be removed entirely.",
              "5. End with a short moderation summary.",
            ].join("\n"),
          },
        },
      ],
    };
  },
});
