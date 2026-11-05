import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveElectronBin } from '../scripts/dev.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Dev Launcher & Windows CRLF Sanitization', () => {
  it('resolves Electron binary without CRLF characters and exists on disk', () => {
    const electronBin = resolveElectronBin();

    expect(electronBin).toBeDefined();
    expect(typeof electronBin).toBe('string');
    expect(electronBin).not.toMatch(/[\r\n]/);

    if (process.platform === 'win32') {
      expect(electronBin.toLowerCase().endsWith('.exe')).toBe(true);
    }

    expect(fs.existsSync(electronBin)).toBe(true);
  });

  it('ensures scripts/dev.mjs contains zero shell: true occurrences paired with arguments to prevent DEP0190', () => {
    const devScriptPath = path.resolve(__dirname, '../scripts/dev.mjs');
    const content = fs.readFileSync(devScriptPath, 'utf-8');

    expect(content).not.toMatch(/shell:\s*true/);
    expect(content).not.toMatch(/shell:\s*isWin/);
    expect(content).toContain('shell: false');
  });
});

