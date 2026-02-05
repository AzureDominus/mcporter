import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const CLI_ENTRY = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const PNPM_COMMAND = process.platform === 'win32' ? 'cmd.exe' : 'pnpm';
const PNPM_ARGS_PREFIX = process.platform === 'win32' ? ['/d', '/s', '/c', 'pnpm'] : [];

function pnpmArgs(args: string[]): string[] {
  return [...PNPM_ARGS_PREFIX, ...args];
}

async function ensureDistBuilt(): Promise<void> {
  try {
    await fs.access(CLI_ENTRY);
  } catch {
    await new Promise<void>((resolve, reject) => {
      execFile(PNPM_COMMAND, pnpmArgs(['build']), { cwd: process.cwd(), env: process.env }, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

async function runCliRaw(
  args: string[],
  configPath: string,
  envOverrides: Record<string, string> = {}
): Promise<{ code: number; stdout: string; stderr: string }> {
  return await new Promise((resolve) => {
    execFile(
      process.execPath,
      [CLI_ENTRY, '--config', configPath, ...args],
      {
        env: { ...process.env, ...envOverrides },
      },
      (error, stdout, stderr) => {
        let code = 0;
        if (error) {
          code = typeof (error as NodeJS.ErrnoException).code === 'number' ? (error as any).code : 1;
        }
        resolve({ code, stdout, stderr });
      }
    );
  });
}

describe('mcporter call --output json on tool error envelopes', () => {
  let tempDir: string;
  let configPath: string;

  const memoryServerScript = fileURLToPath(new URL('./fixtures/stdio-memory-server.mjs', import.meta.url));

  beforeAll(async () => {
    await ensureDistBuilt();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcporter-cli-json-error-'));
    configPath = path.join(tempDir, 'stdio.config.json');
    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          mcpServers: {
            'memory-test': {
              description: 'Knowledge graph MCP for json error envelope tests',
              command: process.execPath,
              args: [memoryServerScript],
            },
          },
        },
        null,
        2
      ),
      'utf8'
    );
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  const memoryTest = process.platform === 'win32' ? it.skip : it;

  memoryTest(
    'prints strict JSON and exits non-zero when the tool responds with an error envelope',
    async () => {
      const result = await runCliRaw(['call', 'memory-test.create_entities', '--output', 'json'], configPath);

      expect(result.code).toBe(1);

      const parsed = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
      expect(parsed.isError).toBe(true);
      expect(Array.isArray(parsed.content)).toBe(true);
    },
    20000
  );
});
