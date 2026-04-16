import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";
import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import type { McpToolContext } from "./mcp.types";
import { canAccessScopes } from "./mcp-tool-utils";

type McpPromptTextContent = {
  type: "text";
  text: string;
};

type McpPromptMessage = {
  content: McpPromptTextContent;
  role: "assistant" | "user";
};

export type McpPromptResult = {
  description?: string;
  messages: McpPromptMessage[];
};

type McpPromptArgsSchema = z.ZodRawShape;

interface McpPromptBase {
  description: string;
  name: string;
  requiredScopes: OAuthScopeRequest;
  title?: string;
}

interface McpPromptWithArgs<TArgsSchema extends McpPromptArgsSchema>
  extends McpPromptBase {
  argsSchema: TArgsSchema;
  handler: (
    args: z.infer<z.ZodObject<TArgsSchema>>,
    context: McpToolContext,
  ) => McpPromptResult | Promise<McpPromptResult>;
}

interface McpPromptWithoutArgs extends McpPromptBase {
  handler: (
    context: McpToolContext,
  ) => McpPromptResult | Promise<McpPromptResult>;
}

export type McpPromptDefinition =
  | McpPromptWithArgs<McpPromptArgsSchema>
  | McpPromptWithoutArgs;

function hasArgsSchema(
  prompt: McpPromptDefinition,
): prompt is McpPromptWithArgs<McpPromptArgsSchema> {
  return "argsSchema" in prompt;
}

export function defineMcpPrompt<TArgsSchema extends McpPromptArgsSchema>(
  prompt: McpPromptWithArgs<TArgsSchema>,
): McpPromptWithArgs<TArgsSchema>;
export function defineMcpPrompt(
  prompt: McpPromptWithoutArgs,
): McpPromptWithoutArgs;
export function defineMcpPrompt(
  prompt: McpPromptDefinition,
): McpPromptDefinition {
  return prompt;
}

export function registerMcpPrompt(
  server: McpServer,
  context: McpToolContext,
  prompt: McpPromptWithoutArgs,
): void;
export function registerMcpPrompt<TArgsSchema extends McpPromptArgsSchema>(
  server: McpServer,
  context: McpToolContext,
  prompt: McpPromptWithArgs<TArgsSchema>,
): void;
export function registerMcpPrompt(
  server: McpServer,
  context: McpToolContext,
  prompt: McpPromptDefinition,
) {
  if (!canAccessScopes(context, prompt.requiredScopes)) {
    return;
  }

  if (hasArgsSchema(prompt)) {
    server.registerPrompt(
      prompt.name,
      {
        argsSchema: prompt.argsSchema,
        description: prompt.description,
        title: prompt.title,
      },
      async (args: Record<string, unknown>) =>
        await prompt.handler(args as never, context),
    );
    return;
  }

  server.registerPrompt(
    prompt.name,
    {
      description: prompt.description,
      title: prompt.title,
    },
    async (_args, _extra) => await prompt.handler(context),
  );
}
