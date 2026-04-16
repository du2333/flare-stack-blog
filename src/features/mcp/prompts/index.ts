import { moderatePendingCommentsPrompt } from "./moderate-pending-comments.prompt";
import { publishPostWorkflowPrompt } from "./publish-post-workflow.prompt";
import { reviewBlogAnalyticsPrompt } from "./review-blog-analytics.prompt";
import { writePostFromBriefPrompt } from "./write-post-from-brief.prompt";

export const mcpPrompts = [
  writePostFromBriefPrompt,
  publishPostWorkflowPrompt,
  moderatePendingCommentsPrompt,
  reviewBlogAnalyticsPrompt,
] as const;

export {
  moderatePendingCommentsPrompt,
  publishPostWorkflowPrompt,
  reviewBlogAnalyticsPrompt,
  writePostFromBriefPrompt,
};
