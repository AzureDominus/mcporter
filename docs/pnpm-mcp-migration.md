# Migrating from `pnpm mcp:*`

The legacy `pnpm mcp:*` helpers map directly onto the `mcp-runtime` CLI.

- `pnpm mcp:list` → `npx mcp-runtime list`
- `pnpm mcp:call server.tool key=value` → `npx mcp-runtime call server.tool key=value`
- New flags: `--schema` surfaces full tool schemas, and `--tail-log` follows log output referenced by responses.

For a step-by-step checklist (including config updates and environment variables) see [`docs/migration.md`](./migration.md).
