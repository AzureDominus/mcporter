# CLI Generator Plan

Default behavior: generating `generated/<server>-cli.ts` if no output path is provided. Bundling is opt-in via `--bundle` and produces a single JS file with shebang; otherwise we emit TypeScript targeting Node.js.

## Goal
Create an `mcp-runtime generate-cli` command that produces a standalone CLI for a single MCP server. The generated CLI should feel like a Unix tool: subcommands map to MCP tools, arguments translate to schema fields, and output can be piped/redirected easily.

## High-Level Requirements
- **Input**: Identify the target server either by shorthand name or by providing an explicit MCP server definition.
- **Output**: Emit a TypeScript file (ESM) targeting Node.js by default (`generated/<server>-cli.ts` unless `--output` overrides). Bundling to a standalone JS file happens only when `--bundle` is passed.
- **Runtime Selection**: Node.js by default; allow `--runtime bun` to emit Bun-friendly entry points if requested.
- **Schema-Aware CLI**: Leverage `createServerProxy` to map positional/flag arguments to MCP tool schemas, including defaults and required validation.
- **Unix-Friendly Output**: Provide `--output text|json|markdown|raw` flags so results can be piped; default to human-readable text. Include `--timeout` (default 30s) to cap call duration.
- **Shell Completion (optional)**: Generate completion scripts for bash/zsh/fish if requested.
- **Documentation**: Update README (or similar) to show how to generate and use the CLI.

## Steps
1. **Command Scaffolding**
   - Add `generate-cli` subcommand to the existing CLI.
   - Parse flags: `--server`, `--output`, `--runtime=node|bun`, `--format=ts|js`, `--bundle`, etc.
2. **Server Resolution**
   - If `--server` matches a configured name (via `loadServerDefinitions`), use that server definition.
   - Otherwise, if the value looks like a file path, load a Cursor-style JSON definition from disk.
   - Otherwise, attempt to parse inline JSON/JSON5.
   - Validate that a definition is found; prompt on failure.
3. **Tool Introspection**
   - Use `listTools(server, { includeSchema: true })` to inspect MCP tool schemas.
   - For each tool, extract required/optional arguments, types, and defaults.
4. **Template Generation**
   - Build a template (probably EJS or string interpolation) that:
     - Imports `createRuntime` and `createServerProxy`.
     - Creates a CLI (likely using `commander` or a minimal custom parser) with subcommands per tool.
     - Bakes in server metadata (command/url, headers, etc.) or references config path if preferred.
     - Adds output-format handling.
   - Include `package.json` scaffolding if `--bundle` or `--package` is set.
5. **Optional Bundling**
   - If requested, run a bundler (e.g., `tsup`) to emit a single JS file with shebang.
   - Otherwise, leave as TypeScript/ESM and document how to run (`node path/to/cli.js` or `bun path/to/cli.ts`).
6. **Testing**
   - Add generator unit tests (snapshot the emitted CLI for known schemas).
   - Add integration tests that run the generated script against a mock MCP server.
7. **Docs/Examples**
   - Document usage in README.
   - Provide an example generated CLI under `examples/generated/<server>-cli.ts`. (e.g., `examples/generated/context7-cli.ts`).

## Notes
- Generated CLI depends on the latest `commander` for argument parsing.
- Default timeout for tool calls is 30 seconds, overridable via `--timeout`.
- Runtime flag remains (`--runtime bun`) to tailor shebang/usage instructions, but Node.js is the default.
- Generated CLI embeds the resolved server definition yet honors `--config`/`--server` overrides at execution time.

## Status
- ✅ `generate-cli` subcommand scaffolding implemented (core schema mapping, commander-based output).
- ✅ Inline JSON / file / shorthand server resolution wired up.
- ✅ CLI generator writes TypeScript by default and supports optional bundling via esbuild.
- ✅ New integration test (`tests/generate-cli.test.ts`) spins up a mock MCP server and validates the generated CLI end-to-end.
- ⏳ Current blocker: bundled output still references helper functions outside scope (e.g., `normalizeEmbeddedServer`), causing runtime failures. Need to inline helper or avoid bundling until fixed.

Next steps:
1. Inline or export utility helpers so bundled output can execute without missing references (resolve `normalizeEmbeddedServer` error).
2. Clean up esbuild configuration to produce consistent shebang and module format (node vs bun).
3. Polish README/Docs to highlight `generate-cli` usage once bundling is stable.
