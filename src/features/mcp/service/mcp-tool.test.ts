import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { McpToolContext } from "./mcp.types";
import { defineMcpTool, registerMcpTool } from "./mcp-tool";

function createMcpToolContext(
  scopes: McpToolContext["principal"]["scopes"] = ["posts:read"],
): McpToolContext {
  return {
    db: {} as DB,
    env: {} as Env,
    executionCtx: {} as ExecutionContext,
    principal: {
      clientId: "client_123",
      scopes,
      subject: "user_123",
      token: {},
    },
  };
}

function createFakeServer() {
  const registerTool = vi.fn();

  return {
    registerTool,
    server: {} as McpServer["server"],
  } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe("mcp tool registration", () => {
  it("registers input tools and forwards parsed args to the handler", async () => {
    const server = createFakeServer();
    const context = createMcpToolContext(["posts:read"]);
    const handler = vi.fn(async () => ({
      content: [{ type: "text" as const, text: "ok" }],
      structuredContent: { ok: true },
    }));

    const tool = defineMcpTool({
      name: "posts.test",
      description: "Test tool with input",
      requiredScopes: { posts: ["read"] },
      inputSchema: z.object({ id: z.number() }),
      outputSchema: z.object({ ok: z.boolean() }),
      handler,
    });

    registerMcpTool(server, context, tool);

    expect(server.registerTool).toHaveBeenCalledTimes(1);
    const [name, config, callback] = server.registerTool.mock.calls[0];

    expect(name).toBe("posts.test");
    expect(config.description).toBe("Test tool with input");
    expect(config.inputSchema).toBe(tool.inputSchema);
    expect(config.outputSchema).toBe(tool.outputSchema);

    const result = await callback({ id: 42 });

    expect(handler).toHaveBeenCalledWith({ id: 42 }, context);
    expect(result).toEqual({
      content: [{ type: "text", text: "ok" }],
      structuredContent: { ok: true },
    });
  });

  it("blocks tool execution when scopes are missing", async () => {
    const server = createFakeServer();
    const context = createMcpToolContext(["posts:read"]);
    const handler = vi.fn();

    const tool = defineMcpTool({
      name: "posts.writeTest",
      description: "Test tool with missing scope",
      requiredScopes: { posts: ["write"] },
      inputSchema: z.object({ id: z.number() }),
      handler,
    });

    registerMcpTool(server, context, tool);

    const [, , callback] = server.registerTool.mock.calls[0];
    const result = await callback({ id: 42 });

    expect(handler).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      isError: true,
    });
    expect(result.content[0].text).toContain("posts:write");
  });

  it("registers no-input tools and passes only context to the handler", async () => {
    const server = createFakeServer();
    const context = createMcpToolContext(["posts:write"]);
    const handler = vi.fn(async () => ({
      content: [{ type: "text" as const, text: "created" }],
      structuredContent: { id: 1 },
    }));

    const tool = defineMcpTool({
      name: "posts.createTest",
      description: "Test tool without input",
      requiredScopes: { posts: ["write"] },
      outputSchema: z.object({ id: z.number() }),
      handler,
    });

    registerMcpTool(server, context, tool);

    expect(server.registerTool).toHaveBeenCalledTimes(1);
    const [name, config, callback] = server.registerTool.mock.calls[0];

    expect(name).toBe("posts.createTest");
    expect(config.inputSchema).toBeUndefined();
    expect(config.outputSchema).toBe(tool.outputSchema);

    const result = await callback({});

    expect(handler).toHaveBeenCalledWith(context);
    expect(result).toEqual({
      content: [{ type: "text", text: "created" }],
      structuredContent: { id: 1 },
    });
  });
});
