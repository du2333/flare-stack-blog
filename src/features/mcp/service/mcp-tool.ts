import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { output, ZodType } from "zod";
import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import type { McpToolContext } from "./mcp.types";
import { canAccessTool, createScopeErrorResult } from "./mcp-tool-utils";

type McpToolTextContent = {
  type: "text";
  text: string;
};

type McpToolErrorResult = {
  content: McpToolTextContent[];
  isError: true;
};

type McpToolSuccessResult = {
  content: McpToolTextContent[];
  isError?: false;
  structuredContent?: Record<string, unknown>;
};

export type McpToolResult = McpToolErrorResult | McpToolSuccessResult;

interface McpToolBase<TOutputSchema extends ZodType | undefined = ZodType> {
  description: string;
  name: string;
  outputSchema?: TOutputSchema;
  requiredScopes: OAuthScopeRequest;
}

interface McpToolWithInput<
  TInputSchema extends ZodType = ZodType,
  TOutputSchema extends ZodType | undefined = ZodType,
> extends McpToolBase<TOutputSchema> {
  handler: (
    args: output<TInputSchema>,
    context: McpToolContext,
  ) => McpToolResult | Promise<McpToolResult>;
  inputSchema: TInputSchema;
}

interface McpToolWithoutInput<
  TOutputSchema extends ZodType | undefined = ZodType,
> extends McpToolBase<TOutputSchema> {
  handler: (context: McpToolContext) => McpToolResult | Promise<McpToolResult>;
}

export type McpToolDefinition =
  | McpToolWithInput<ZodType, ZodType | undefined>
  | McpToolWithoutInput<ZodType | undefined>;

export function defineMcpTool<
  TInputSchema extends ZodType,
  TOutputSchema extends ZodType | undefined = undefined,
>(
  tool: McpToolWithInput<TInputSchema, TOutputSchema>,
): McpToolWithInput<TInputSchema, TOutputSchema>;
export function defineMcpTool<
  TOutputSchema extends ZodType | undefined = undefined,
>(tool: McpToolWithoutInput<TOutputSchema>): McpToolWithoutInput<TOutputSchema>;
export function defineMcpTool(tool: McpToolDefinition): McpToolDefinition {
  return tool;
}

export function registerMcpTool(
  server: McpServer,
  context: McpToolContext,
  tool: McpToolDefinition,
) {
  if ("inputSchema" in tool) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
      },
      async (args: output<typeof tool.inputSchema>) => {
        if (!canAccessTool(context, tool.requiredScopes)) {
          return createScopeErrorResult(context, tool.requiredScopes);
        }

        return await tool.handler(args, context);
      },
    );

    return;
  }

  server.registerTool(
    tool.name,
    {
      description: tool.description,
      outputSchema: tool.outputSchema,
    },
    async (_extra) => {
      if (!canAccessTool(context, tool.requiredScopes)) {
        return createScopeErrorResult(context, tool.requiredScopes);
      }

      return await tool.handler(context);
    },
  );
}
