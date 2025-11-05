import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { expandHome } from "./env.js";

// Raw shape of each MCP server as declared inside mcp-runtime.json.
const RawEntrySchema = z.object({
	description: z.string().optional(),
	baseUrl: z.string().optional(),
	base_url: z.string().optional(),
	url: z.string().optional(),
	serverUrl: z.string().optional(),
	server_url: z.string().optional(),
	command: z.union([z.string(), z.array(z.string())]).optional(),
	executable: z.string().optional(),
	args: z.array(z.string()).optional(),
	headers: z.record(z.string()).optional(),
	env: z.record(z.string()).optional(),
	auth: z.string().optional(),
	tokenCacheDir: z.string().optional(),
	token_cache_dir: z.string().optional(),
	clientName: z.string().optional(),
	client_name: z.string().optional(),
	bearerToken: z.string().optional(),
	bearer_token: z.string().optional(),
	bearerTokenEnv: z.string().optional(),
	bearer_token_env: z.string().optional(),
});

const RawConfigSchema = z.object({
	mcpServers: z.record(RawEntrySchema),
});

export interface HttpCommand {
	readonly kind: "http";
	readonly url: URL;
	readonly headers?: Record<string, string>;
}

export interface StdioCommand {
	readonly kind: "stdio";
	readonly command: string;
	readonly args: string[];
	readonly cwd: string;
}

export type CommandSpec = HttpCommand | StdioCommand;

export interface ServerDefinition {
	readonly name: string;
	readonly description?: string;
	readonly command: CommandSpec;
	readonly env?: Record<string, string>;
	readonly auth?: string;
	readonly tokenCacheDir?: string;
	readonly clientName?: string;
}

export interface LoadConfigOptions {
	readonly configPath?: string;
	readonly rootDir?: string;
}

export async function loadServerDefinitions(
	options: LoadConfigOptions = {},
): Promise<ServerDefinition[]> {
	const rootDir = options.rootDir ?? process.cwd();
	const configPath = resolveConfigPath(options.configPath, rootDir);
	const raw = await readConfigFile(configPath);
	const baseDir = path.dirname(configPath);

	const servers: ServerDefinition[] = [];
	for (const [name, entryRaw] of Object.entries(raw.mcpServers)) {
		const entry = entryRaw ?? {};
		const definition = normalizeServerEntry(name, entry, baseDir);
		servers.push(definition);
	}

	return servers;
}

function resolveConfigPath(
	configPath: string | undefined,
	rootDir: string,
): string {
	if (configPath) {
		return path.resolve(configPath);
	}
	return path.resolve(rootDir, "config", "mcp-runtime.json");
}

async function readConfigFile(
	configPath: string,
): Promise<z.infer<typeof RawConfigSchema>> {
	const buffer = await fs.readFile(configPath, "utf8");
	return RawConfigSchema.parse(JSON.parse(buffer));
}

function normalizeServerEntry(
	name: string,
	raw: z.infer<typeof RawEntrySchema>,
	baseDir: string,
): ServerDefinition {
	const description = raw.description;
	const env = raw.env ? { ...raw.env } : undefined;
	const auth = normalizeAuth(raw.auth);
	const tokenCacheDir = normalizePath(raw.tokenCacheDir ?? raw.token_cache_dir);
	const clientName = raw.clientName ?? raw.client_name;
	const headers = buildHeaders(raw);

	const httpUrl = getUrl(raw);
	const stdio = getCommand(raw);

	let command: CommandSpec;

	if (httpUrl) {
		command = {
			kind: "http",
			url: new URL(httpUrl),
			headers,
		};
	} else if (stdio) {
		command = {
			kind: "stdio",
			command: stdio.command,
			args: stdio.args,
			cwd: baseDir,
		};
	} else {
		throw new Error(
			`Server '${name}' is missing a baseUrl/url or command definition in mcp-runtime.json`,
		);
	}

	const resolvedTokenCacheDir =
		auth === "oauth"
			? path.join(os.homedir(), ".mcp-runtime", name)
			: (tokenCacheDir ?? undefined);

	return {
		name,
		description,
		command,
		env,
		auth,
		tokenCacheDir: resolvedTokenCacheDir,
		clientName,
	};
}

function normalizeAuth(auth: string | undefined): string | undefined {
	if (!auth) {
		return undefined;
	}
	if (auth.toLowerCase() === "oauth") {
		return "oauth";
	}
	return undefined;
}

function normalizePath(input: string | undefined): string | undefined {
	if (!input) {
		return undefined;
	}
	return expandHome(input);
}

function getUrl(raw: z.infer<typeof RawEntrySchema>): string | undefined {
	return (
		raw.baseUrl ??
		raw.base_url ??
		raw.url ??
		raw.serverUrl ??
		raw.server_url ??
		raw.base_url ??
		undefined
	);
}

function getCommand(
	raw: z.infer<typeof RawEntrySchema>,
): { command: string; args: string[] } | undefined {
	const commandValue = raw.command ?? raw.executable;
	if (Array.isArray(commandValue)) {
		if (commandValue.length === 0 || typeof commandValue[0] !== "string") {
			return undefined;
		}
		return { command: commandValue[0], args: commandValue.slice(1) };
	}
	if (typeof commandValue === "string" && commandValue.length > 0) {
		const args = Array.isArray(raw.args) ? raw.args : [];
		return { command: commandValue, args };
	}
	return undefined;
}

function buildHeaders(
	raw: z.infer<typeof RawEntrySchema>,
): Record<string, string> | undefined {
	const headers: Record<string, string> = {};

	if (raw.headers) {
		Object.assign(headers, raw.headers);
	}

	const bearerToken = raw.bearerToken ?? raw.bearer_token;
	if (bearerToken) {
		headers.Authorization = `Bearer ${bearerToken}`;
	}

	const bearerTokenEnv = raw.bearerTokenEnv ?? raw.bearer_token_env;
	if (bearerTokenEnv) {
		headers.Authorization = `$env:${bearerTokenEnv}`;
	}

	return Object.keys(headers).length > 0 ? headers : undefined;
}

export function toFileUrl(filePath: string): URL {
	return pathToFileURL(filePath);
}
