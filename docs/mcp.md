$(python - <<'PY'
from pathlib import Path
text = Path("docs/mcp.md").read_text()
old = "- `pnpm mcp:call` — execute a tool using either loose `key=value` pairs or `--args` JSON; append `--tail-log` to follow log files reported by the response.\n- Prefer `createServerProxy(runtime, \"serverName\")` in Node scripts when you want to call tools via `camelCase` methods instead of remembering the exact kebab-case names.\n"
new = "- `pnpm mcp:call` — execute a tool using either loose `key=value` pairs or `--args` JSON; append `--tail-log` to follow log files reported by the response.\n- Prefer `createServerProxy(runtime, \"serverName\")` in Node scripts when you want to call tools via `camelCase` methods instead of remembering the exact kebab-case names. The proxy automatically merges schema defaults and returns a `CallResult` helper so you can call `.text()`, `.markdown()`, or `.json()` without hand-parsing content envelopes.\n"
Path("docs/mcp.md.new").write_text(text.replace(old, new))
PY
)
