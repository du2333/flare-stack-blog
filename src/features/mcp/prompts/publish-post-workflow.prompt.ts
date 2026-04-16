import { z } from "zod";
import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import { defineMcpPrompt } from "../service/mcp-prompt";
import {
  createLanguageInstruction,
  PromptLanguageSchema,
} from "./prompt-language";

const PUBLISH_POST_WORKFLOW_SCOPES: OAuthScopeRequest = {
  posts: ["read", "write"],
};

export const publishPostWorkflowPrompt = defineMcpPrompt({
  name: "publish_post_workflow",
  title: "发布文章 / Publish Post",
  description:
    "根据描述定位草稿并发布文章 / Find the right draft and publish it safely.",
  requiredScopes: PUBLISH_POST_WORKFLOW_SCOPES,
  argsSchema: {
    target: z
      .string()
      .min(1)
      .describe(
        "要发布的文章描述，可填写标题、slug、主题或关键词 / Describe the post to publish using its title, slug, topic, or keywords.",
      ),
    language: PromptLanguageSchema,
  },
  handler(args) {
    return {
      description: "Find the correct draft and publish it safely.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Find and publish the correct post based on this description: ${args.target}.`,
              "",
              createLanguageInstruction(args.language),
              "",
              "Workflow:",
              "1. Start with posts_list using status='draft', sortBy='updatedAt', and sortDir='DESC'. Use search only when it helps narrow by title text, because posts_list search is not a full-text search and does not reliably find drafts by slug or article body.",
              "2. If the target looks like a slug, or the first filtered list is not enough, list recent drafts without search and compare titles, slugs, and summaries manually.",
              "3. Prefer the strongest matching draft. If multiple drafts still look plausible, explain the ambiguity and ask the user to confirm before publishing anything.",
              "4. Only inspect non-draft posts if no draft matches clearly, and do not publish an already published post unless the user clearly intends that.",
              "5. Once the correct post is identified, use posts_get to verify that it is the intended article and is not already published.",
              "6. Use posts_set_visibility with visibility='published' to publish the post.",
              "7. Summarize which post was published.",
            ].join("\n"),
          },
        },
      ],
    };
  },
});
