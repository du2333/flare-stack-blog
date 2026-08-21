# Drop the MCP Server and its OAuth provider

Flare Stack Blog will not expose an **MCP Server**. The Workers OAuth provider, consent flow, **OAuth Client** / **OAuth Scope** model, and `OAUTH_KV` exist only to protect `/mcp`, so they go with it. GitHub login stays as Better Auth social sign-in for **Users**. Machine access, if added later, will use API keys on the same HTTP URLs rather than reviving this OAuth client stack.
