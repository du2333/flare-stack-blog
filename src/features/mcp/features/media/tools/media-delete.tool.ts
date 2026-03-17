import * as MediaService from "@/features/media/service/media.service";
import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpMediaByKeyInputSchema,
  McpMediaDeleteOutputSchema,
} from "../schema/mcp-media.schema";

const MEDIA_DELETE_REQUIRED_SCOPES: OAuthScopeRequest = {
  media: ["write"],
};

export const mediaDeleteTool = defineMcpTool({
  name: "media_delete",
  description: "Delete a media item if it is not in use.",
  requiredScopes: MEDIA_DELETE_REQUIRED_SCOPES,
  inputSchema: McpMediaByKeyInputSchema,
  outputSchema: McpMediaDeleteOutputSchema,
  async handler(args, context) {
    const result = await MediaService.deleteImage(context, args.key);

    if (result.error) {
      return {
        content: [
          {
            type: "text",
            text:
              result.error.reason === "MEDIA_IN_USE"
                ? `Media ${args.key} is still referenced by posts`
                : `Media ${args.key} could not be deleted`,
          },
        ],
        isError: true,
      };
    }

    const output = {
      deleted: true as const,
      key: args.key,
    };

    return {
      content: [{ type: "text", text: `Deleted media ${args.key}` }],
      structuredContent: output,
    };
  },
});
