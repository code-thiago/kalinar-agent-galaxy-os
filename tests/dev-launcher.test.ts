import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPortFree, resolveElectronBin } from '../scripts/dev.mjs';

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

  it('verifies package.json specifies version 2.2.0', () => {
    const pkgPath = path.resolve(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    expect(pkg.version).toBe('2.2.0');
  });

  it('verifies electron/main.ts enforces app.requestSingleInstanceLock and isolates dev userData cache', () => {
    const mainPath = path.resolve(__dirname, '../electron/main.ts');
    const content = fs.readFileSync(mainPath, 'utf-8');

    expect(content).toContain('app.requestSingleInstanceLock()');
    expect(content).toContain("app.on('second-instance'");
    expect(content).toContain("app.setPath('userData', devUserData)");
    expect(content).toContain('kalinar-agent-galaxy-os-dev');
  });

  it('ensures scripts/dev.mjs contains deterministic port clearance, teardown, and zero shell: true', async () => {
    const devScriptPath = path.resolve(__dirname, '../scripts/dev.mjs');
    const content = fs.readFileSync(devScriptPath, 'utf-8');

    expect(content).not.toMatch(/shell:\s*true/);
    expect(content).not.toMatch(/shell:\s*isWin/);
    expect(content).toContain('shell: false');
    expect(content).toContain('ensurePortReleased');
    expect(content).toContain('cleanupOrphanElectronProcesses');
    expect(content).toContain('netstat');
    expect(content).toContain('taskkill');
    expect(content).toContain("process.once('SIGINT'");
    expect(content).toContain("process.once('SIGTERM'");
    expect(content).toContain("process.once('exit'");

    // Probe an ephemeral bound port vs free port using isPortFree
    const occupiedServer = net.createServer();
    await new Promise<void>((resolve) => {
      occupiedServer.listen({ port: 0, host: '127.0.0.1' }, () => resolve());
    });
    const addr = occupiedServer.address();
    const ephemeralPort = typeof addr === 'object' && addr ? addr.port : 0;

    expect(await isPortFree(ephemeralPort)).toBe(false);
    await new Promise<void>((resolve) => {
      occupiedServer.close(() => resolve());
    });
    expect(await isPortFree(ephemeralPort)).toBe(true);
  });
});
