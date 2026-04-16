import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpToolContext } from "./mcp.types";
import { registerMcpPrompts } from "./mcp-prompt-registry";
import { registerMcpTools } from "./mcp-tool-registry";

export async function createMcpServer(
  context: McpToolContext,
): Promise<McpServer> {
  const [{ McpServer }, { CfWorkerJsonSchemaValidator }] = await Promise.all([
    import("@modelcontextprotocol/sdk/server/mcp.js"),
    import("@modelcontextprotocol/sdk/validation/cfworker"),
  ]);

  const server = new McpServer(
    {
      name: "flare-stack-blog",
      version: __APP_VERSION__,
    },
    {
      instructions:
        "Use these tools to manage the blog. Prefer structured tool outputs over guessing state.",
      jsonSchemaValidator: new CfWorkerJsonSchemaValidator(),
    },
  );

  registerMcpTools(server, context);
  registerMcpPrompts(server, context);
  return server;
}
