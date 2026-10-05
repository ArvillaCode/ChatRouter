# Coolify Read-Only MCP

Read-only MCP facade for Coolify intended for ChatGPT Pro.

## Security model

- Exposes only GET-backed tools.
- Every MCP tool is annotated with `readOnlyHint: true`.
- Use a Coolify API token with **read-only** permission.
- `/mcp` requires a separate shared Bearer secret.
- `/healthz` is public for Coolify health checks.

## Environment variables

```env
COOLIFY_BASE_URL=https://xcoolifyx.upfunnel.click
COOLIFY_API_TOKEN=<READ-ONLY Coolify API token>
MCP_SHARED_SECRET=<random long secret>
PORT=8081
```

## MCP tools

- coolify_health
- list_projects
- list_applications
- get_application
- list_deployments
- list_servers
- list_services
- get_service
- list_service_databases
- list_service_tags

No deploy, restart, update, create, delete, environment mutation, database mutation, or shell tool is exposed.

## Recommended topology

ChatGPT -> mcp-auth-proxy (OAuth) -> this service (Bearer MCP_SHARED_SECRET) -> Coolify REST API (read-only token)

Configure mcp-auth-proxy:
- upstream: https://coolify-readonly.upfunnel.click/mcp
- PROXY_BEARER_TOKEN: same value as MCP_SHARED_SECRET
