import { describe, expect, it, vi } from 'vitest';
import type { Runtime } from '../src/runtime.js';
import { prepareEphemeralServerTarget } from '../src/cli/ephemeral-target.js';

function createRuntimeStub(): Runtime {
  return {
    getDefinitions: vi.fn(() => []),
    registerDefinition: vi.fn(),
  } as unknown as Runtime;
}

describe('prepareEphemeralServerTarget', () => {
  it('auto-detects inline npx commands as ad-hoc STDIO servers', async () => {
    const runtime = createRuntimeStub();
    const { target, resolution } = await prepareEphemeralServerTarget({
      runtime,
      target: 'npx -y xcodebuildmcp',
    });
    expect(target).toBe('xcodebuildmcp');
    expect(resolution?.definition.command.kind).toBe('stdio');
    expect(resolution?.definition.command.command).toBe('npx');
  });
});
