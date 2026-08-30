# Admin API Keys impersonate Admin on the HTTP API

Machine callers, including AI clients, authenticate with an **API Key** on the existing oRPC HTTP URLs rather than a browser session or a revived MCP/OAuth stack. An API Key belongs to an **Admin** and has that Admin's content-management permissions; it cannot create or revoke API Keys. Keys are named, shown in full once, never expire, and are removed by deletion. Plugin rate limits and remaining quotas stay off.

**Considered Options**

- MCP with OAuth, rejected by ADR 0005.
- Per-key permission matrices. Admin is already a single role; a second ACL would not match cookie sessions.
- Better Auth's per-key rate limit and remaining count. The plugin defaults are too tight for AI tool calls, and Admin HTTP routes are not quota-limited today.
