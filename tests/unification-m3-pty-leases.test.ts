/**
 * UNIFICATION MILESTONE 3 TDD SUITE (v1.7.0-beta)
 * Verifies:
 * 1. GoRules ZEN Engine os-execution-firewall.jdm.json deterministic leaseScope classification
 * 2. Survival of EPHEMERAL_UI_BOUND across < 5000ms HMR reconnect (unit fake timers + live Named Pipe & OS PID)
 * 3. Clean process tree termination after > 5000ms disconnect (Windows taskkill /F /T & POSIX -pid SIGTERM/SIGKILL)
 * 4. Uninterrupted survival of DETACHED_DAEMON_SERVICE across UI disconnect & grace expiry
 * 5. Electron main / DaemonClient wiring & strict zero-emoji governance
 * Strictly Zero Emojis
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ZenEngine } from '@gorules/zen-engine';
import {
  CANONICAL_JDM_RULES,
  PROCESS_LEASE_GRACE_WINDOW_MS,
  ProcessLeaseScopeSchema,
  resolveJdmRulePath,
  type ProcessLeaseScope,
} from '@kalinar/contracts';
import { ZenFirewall } from '../src/core/ZenFirewall.js';
import { DaemonClient } from '../electron/daemon/DaemonClient.js';

interface PtyLeaseEntryLike {
  pid: number;
  leaseScope: ProcessLeaseScope;
  uiClientId: string | null;
  graceDeadlineMs: number | null;
  command?: string;
  origin?: string;
  registeredAt: number;
  status: 'ACTIVE' | 'GRACE_PERIOD' | 'TERMINATED';
}

interface ProcessTreeTerminationResultLike {
  pid: number;
  terminated: boolean;
  method: string;
  command: string;
  exitCode: number | null;
  reason: string;
}

interface ProcessLeaseManagerLike {
  classifyCommand(input: { command: string; isSandbox?: boolean; origin?: string }): Promise<{
    allowed: boolean;
    verdictReason: string;
    riskLevel: string;
    leaseScope: ProcessLeaseScope;
  }>;
  registerLease(params: {
    pid: number;
    leaseScope: ProcessLeaseScope;
    uiClientId?: string | null;
    command?: string;
    origin?: string;
  }): PtyLeaseEntryLike;
  releaseLease(pid: number): boolean;
  getLease(pid: number): PtyLeaseEntryLike | undefined;
  getActiveLeases(): PtyLeaseEntryLike[];
  getGraceWindowMs(): number;
  handleUiClientDisconnect(uiClientId?: string): PtyLeaseEntryLike[];
  handleUiClientReconnect(uiClientId?: string): number[];
  dispose(): void;
}

interface DaemonStateManagerLike {
  close(): void;
}

interface DaemonIpcServerLike {
  start(): Promise<void>;
  stop(): Promise<void>;
  getLeaseManager(): ProcessLeaseManagerLike;
  getEndpoints(): {
    pipePath: string | null;
    wsUrl: string | null;
    wsPort: number | null;
    connectedClients: number;
  };
}

const nodeRequire = createRequire(import.meta.url);
const DAEMON_STATE_DIST = 'C:/Dev/kalinar-daemon/dist/state.js';
const DAEMON_IPC_DIST = 'C:/Dev/kalinar-daemon/dist/ipc-server.js';
const DAEMON_LEASE_DIST = 'C:/Dev/kalinar-daemon/dist/process-lease-manager.js';

function loadDaemonLeaseModules(): {
  StateManager: new (dbPath?: string) => DaemonStateManagerLike;
  DaemonIpcServer: new (opts: {
    stateManager: DaemonStateManagerLike;
    leaseManager?: ProcessLeaseManagerLike;
    pipePath?: string;
    wsHost?: string;
    wsPort?: number;
    enablePipe?: boolean;
    enableWebSocket?: boolean;
  }) => DaemonIpcServerLike;
  ProcessLeaseManager: new (opts?: {
    graceWindowMs?: number;
    clock?: () => number;
    platform?: NodeJS.Platform;
    firewallJdmPath?: string;
    terminateProcessTree?: (
      pid: number
    ) => Promise<ProcessTreeTerminationResultLike> | ProcessTreeTerminationResultLike;
    onLeaseTerminated?: (entry: PtyLeaseEntryLike, result: ProcessTreeTerminationResultLike) => void;
  }) => ProcessLeaseManagerLike;
  terminateOsProcessTree: (
    pid: number,
    options?: {
      platform?: NodeJS.Platform;
      sigkillDelayMs?: number;
      execFileFn?: (
        file: string,
        args: string[],
        options: { windowsHide?: boolean; timeout?: number }
      ) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
      killFn?: (pid: number, signal?: NodeJS.Signals | number) => boolean;
    }
  ) => Promise<ProcessTreeTerminationResultLike>;
  DEFAULT_GRACE_WINDOW_MS: number;
} {
  const stateMod = nodeRequire(DAEMON_STATE_DIST);
  const ipcMod = nodeRequire(DAEMON_IPC_DIST);
  const leaseMod = nodeRequire(DAEMON_LEASE_DIST);
  return {
    StateManager: stateMod.StateManager,
    DaemonIpcServer: ipcMod.DaemonIpcServer,
    ProcessLeaseManager: leaseMod.ProcessLeaseManager,
    terminateOsProcessTree: leaseMod.terminateOsProcessTree,
    DEFAULT_GRACE_WINDOW_MS: leaseMod.DEFAULT_GRACE_WINDOW_MS,
  };
}

function isPidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    return code === 'EPERM';
  }
}

function forceCleanupPid(pid: number): void {
  if (!isPidAlive(pid)) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], {
      stdio: 'ignore',
      windowsHide: true,
    });
  } else {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // Ignore
      }
    }
  }
}

function waitForCondition(predicate: () => boolean, timeoutMs = 6000, stepMs = 20): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        reject(new Error(`Timed out after ${timeoutMs}ms waiting for condition`));
        return;
      }
      setTimeout(tick, stepMs);
    };
    tick();
  });
}

describe('Unification M3: Deterministic node-pty Process Lease Scopes', () => {
  const spawnedPids = new Set<number>();
  const clientsToDisconnect: DaemonClient[] = [];
  let tempDir: string;
  let daemonDbPath: string;
  let pipePath: string;
  let stateManager: DaemonStateManagerLike | null = null;
  let ipcServer: DaemonIpcServerLike | null = null;

  function spawnIdleWorker(): number {
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000);'], {
      windowsHide: true,
      stdio: 'ignore',
      detached: process.platform !== 'win32',
    });
    if (!child.pid) {
      throw new Error('Failed to spawn test child process');
    }
    spawnedPids.add(child.pid);
    return child.pid;
  }

  async function spawnParentWithChildWorker(): Promise<{ parentPid: number; childPid: number }> {
    const script = [
      "const { spawn } = require('node:child_process');",
      "const gc = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000);'], { windowsHide: true, stdio: 'ignore' });",
      "console.log('CHILD_PID=' + gc.pid);",
      'setInterval(() => {}, 1000);',
    ].join(' ');

    const parent = spawn(process.execPath, ['-e', script], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    });

    if (!parent.pid) {
      throw new Error('Failed to spawn parent worker process');
    }
    spawnedPids.add(parent.pid);

    const childPid = await new Promise<number>((resolve, reject) => {
      let stdout = '';
      const timer = setTimeout(() => {
        reject(new Error(`Timed out reading child PID. stdout=${stdout}`));
      }, 4000);

      parent.stdout?.on('data', (chunk) => {
        stdout += chunk.toString('utf-8');
        const match = stdout.match(/CHILD_PID=(\d+)/);
        if (match) {
          clearTimeout(timer);
          resolve(Number.parseInt(match[1], 10));
        }
      });

      parent.once('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    spawnedPids.add(childPid);
    return { parentPid: parent.pid, childPid };
  }

  beforeEach(() => {
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kalinar-m3-'));
    daemonDbPath = path.join(tempDir, 'daemon-kalinar.db');
    pipePath = `\\\\.\\pipe\\kalinar-daemon-m3-${uid}`;
  });

  afterEach(async () => {
    vi.useRealTimers();
    for (const c of clientsToDisconnect) {
      c.disconnect();
    }
    clientsToDisconnect.length = 0;

    if (ipcServer) {
      await ipcServer.stop();
      ipcServer = null;
    }
    if (stateManager) {
      try {
        stateManager.close();
      } catch {
        // Ignore
      }
      stateManager = null;
    }

    for (const pid of spawnedPids) {
      forceCleanupPid(pid);
    }
    spawnedPids.clear();

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup race
    }
  });

  it('1. GoRules ZEN Engine os-execution-firewall.jdm.json classifies DETACHED_DAEMON_SERVICE vs EPHEMERAL_UI_BOUND deterministically in < 0.45ms', async () => {
    const jdmPath = resolveJdmRulePath(CANONICAL_JDM_RULES.OS_EXECUTION_FIREWALL);
    const engine = new ZenEngine();
    const decision = engine.createDecision(await fs.promises.readFile(jdmPath));

    const detachedCases: Array<{ command: string; isSandbox: boolean; origin: string }> = [
      { command: 'npm run build', isSandbox: false, origin: 'UI_CLI' },
      { command: 'npm run desktop:build', isSandbox: true, origin: 'ELECTRON_UI' },
      { command: 'vite build', isSandbox: false, origin: '' },
      { command: 'npx hyperframes render src/index.html', isSandbox: false, origin: 'ELECTRON_UI' },
      { command: 'npx hyperframes preview --background', isSandbox: false, origin: 'UI_CLI' },
      { command: 'git status', isSandbox: false, origin: 'TELEGRAM' },
      { command: 'pytest -q', isSandbox: false, origin: 'TELEGRAM_TASK' },
      { command: 'node dist/daemon.js', isSandbox: false, origin: '' },
      { command: 'echo worker', isSandbox: false, origin: 'DAEMON_WORKER' },
    ];

    for (const tc of detachedCases) {
      const res = await decision.evaluate(tc);
      const out = res.result as Record<string, unknown>;
      expect(out.allowed, `Expected allowed=true for ${JSON.stringify(tc)}`).toBe(true);
      expect(
        ProcessLeaseScopeSchema.parse(out.leaseScope),
        `Expected DETACHED_DAEMON_SERVICE for ${JSON.stringify(tc)}`
      ).toBe('DETACHED_DAEMON_SERVICE');
    }

    const ephemeralCases: Array<{ command: string; isSandbox: boolean; origin: string }> = [
      { command: 'powershell.exe -NoProfile', isSandbox: true, origin: 'ANTIGRAVITY_CLI_TAB' },
      { command: 'git status', isSandbox: true, origin: 'ANTIGRAVITY_CLI_TAB' },
      { command: 'tsc --noEmit', isSandbox: true, origin: 'UI_CLI' },
      { command: 'dir', isSandbox: true, origin: 'INTERACTIVE_SHELL' },
      { command: 'git diff --stat', isSandbox: true, origin: '' },
    ];

    for (const tc of ephemeralCases) {
      const res = await decision.evaluate(tc);
      const out = res.result as Record<string, unknown>;
      expect(out.allowed, `Expected allowed=true for ${JSON.stringify(tc)}`).toBe(true);
      expect(
        ProcessLeaseScopeSchema.parse(out.leaseScope),
        `Expected EPHEMERAL_UI_BOUND for ${JSON.stringify(tc)}`
      ).toBe('EPHEMERAL_UI_BOUND');
    }

    // Destructive commands remain blocked even under TELEGRAM or DAEMON_WORKER origin
    for (const cmd of [
      'rm -rf /',
      'format c:',
      'DROP DATABASE kalinar',
      'kill -9 1',
      'taskkill /f /pid 4',
    ]) {
      const res = await decision.evaluate({ command: cmd, isSandbox: false, origin: 'TELEGRAM' });
      const out = res.result as Record<string, unknown>;
      expect(out.allowed).toBe(false);
    }

    // Verify ZenFirewall wrapper returns identical classification and < 0.45ms average latency
    const firewall = ZenFirewall.getInstance();
    await firewall.initialize();

    const uiFw = await firewall.evaluateOsFirewall({
      command: 'git status',
      isSandbox: true,
      origin: 'ANTIGRAVITY_CLI_TAB',
    });
    expect(uiFw.result.allowed).toBe(true);
    expect(uiFw.result.leaseScope).toBe('EPHEMERAL_UI_BOUND');

    const detachedFw = await firewall.evaluateOsFirewall({
      command: 'npx hyperframes render composition.html',
      isSandbox: false,
      origin: 'ANTIGRAVITY_CLI_TAB',
    });
    expect(detachedFw.result.allowed).toBe(true);
    expect(detachedFw.result.leaseScope).toBe('DETACHED_DAEMON_SERVICE');

    const WARMUP_RUNS = 15;
    for (let i = 0; i < WARMUP_RUNS; i++) {
      await decision.evaluate(
        i % 2 === 0
          ? { command: 'npx hyperframes render reel.html', isSandbox: false, origin: 'TELEGRAM' }
          : { command: 'git status', isSandbox: true, origin: 'ANTIGRAVITY_CLI_TAB' }
      );
    }

    const start = performance.now();
    const RUNS = 500;
    for (let i = 0; i < RUNS; i++) {
      await decision.evaluate(
        i % 2 === 0
          ? { command: 'npx hyperframes render reel.html', isSandbox: false, origin: 'TELEGRAM' }
          : { command: 'git status', isSandbox: true, origin: 'ANTIGRAVITY_CLI_TAB' }
      );
    }
    const avgMs = (performance.now() - start) / RUNS;
    expect(avgMs).toBeLessThan(0.45);
  });

  it('2. Survives EPHEMERAL_UI_BOUND across < 5000ms HMR reconnect (5000ms deterministic timer + live Named Pipe & real PID)', async () => {
    const {
      StateManager,
      DaemonIpcServer,
      ProcessLeaseManager,
      DEFAULT_GRACE_WINDOW_MS,
    } = loadDaemonLeaseModules();

    expect(DEFAULT_GRACE_WINDOW_MS).toBe(5000);
    expect(PROCESS_LEASE_GRACE_WINDOW_MS).toBe(5000);

    // Part A: Exact 5000ms fake-timer boundary check (reconnect at 4999ms rescues PID)
    vi.useFakeTimers();
    const terminatedPids: number[] = [];
    const timerMgr = new ProcessLeaseManager({
      terminateProcessTree: (pid) => {
        terminatedPids.push(pid);
        return {
          pid,
          terminated: true,
          method: 'taskkill_tree',
          command: `taskkill /F /T /PID ${pid}`,
          exitCode: 0,
          reason: 'MOCK_TERMINATED',
        };
      },
    });
    expect(timerMgr.getGraceWindowMs()).toBe(5000);

    timerMgr.registerLease({
      pid: 22101,
      leaseScope: 'EPHEMERAL_UI_BOUND',
      uiClientId: 'ui-hmr-timer',
      command: 'powershell.exe -NoProfile',
      origin: 'ANTIGRAVITY_CLI_TAB',
    });

    timerMgr.handleUiClientDisconnect('ui-hmr-timer');
    const graceEntry = timerMgr.getLease(22101);
    expect(graceEntry?.status).toBe('GRACE_PERIOD');
    expect(graceEntry?.graceDeadlineMs).toBe((graceEntry?.registeredAt ?? 0) + 5000);

    vi.advanceTimersByTime(4999);
    const rescued = timerMgr.handleUiClientReconnect('ui-hmr-timer');
    expect(rescued).toEqual([22101]);
    expect(timerMgr.getLease(22101)?.status).toBe('ACTIVE');
    expect(timerMgr.getLease(22101)?.graceDeadlineMs).toBeNull();

    // Advancing well past 5000ms does not trigger termination after rescue
    vi.advanceTimersByTime(10000);
    expect(terminatedPids).toHaveLength(0);
    timerMgr.dispose();
    vi.useRealTimers();

    // Part B: Live Named Pipe + real OS child PID surviving HMR disconnect/reconnect < 5000ms
    stateManager = new StateManager(daemonDbPath);
    const liveLeaseMgr = new ProcessLeaseManager();
    ipcServer = new DaemonIpcServer({
      stateManager,
      leaseManager: liveLeaseMgr,
      pipePath,
      enableWebSocket: false,
    });
    await ipcServer.start();

    const realPid = spawnIdleWorker();
    expect(isPidAlive(realPid)).toBe(true);

    const uiClient1 = new DaemonClient({
      pipePath,
      uiClientId: 'ui-hmr-session',
      autoReconnect: false,
    });
    clientsToDisconnect.push(uiClient1);
    await uiClient1.connect();

    const regAck = await uiClient1.registerPtyLease({
      pid: realPid,
      leaseScope: 'EPHEMERAL_UI_BOUND',
      command: 'node -e "interactive"',
      origin: 'ANTIGRAVITY_CLI_TAB',
    }).ackPromise;
    expect(regAck.ok).toBe(true);
    expect(liveLeaseMgr.getLease(realPid)?.status).toBe('ACTIVE');

    // Simulate Vite HMR reload drop (< 5000ms)
    uiClient1.disconnect();
    await waitForCondition(() => liveLeaseMgr.getLease(realPid)?.status === 'GRACE_PERIOD');

    await new Promise((r) => setTimeout(r, 120));
    expect(isPidAlive(realPid)).toBe(true);

    const uiClient2 = new DaemonClient({
      pipePath,
      uiClientId: 'ui-hmr-session',
      autoReconnect: false,
    });
    clientsToDisconnect.push(uiClient2);
    await uiClient2.connect();

    await waitForCondition(() => liveLeaseMgr.getLease(realPid)?.status === 'ACTIVE');
    expect(liveLeaseMgr.getLease(realPid)?.graceDeadlineMs).toBeNull();
    expect(isPidAlive(realPid)).toBe(true);

    await uiClient2.releasePtyLease(realPid).ackPromise;
  });

  it('3. Terminates EPHEMERAL_UI_BOUND process tree cleanly after > 5000ms disconnect (zero zombies)', async () => {
    const {
      StateManager,
      DaemonIpcServer,
      ProcessLeaseManager,
      terminateOsProcessTree,
    } = loadDaemonLeaseModules();

    // Part A: Exact 5000ms fake-timer expiration + Windows/POSIX tree killer assertions
    vi.useFakeTimers();
    const killedOrder: number[] = [];
    const timerMgr = new ProcessLeaseManager({
      terminateProcessTree: async (pid) => {
        killedOrder.push(pid);
        return {
          pid,
          terminated: true,
          method: 'taskkill_tree',
          command: `taskkill /F /T /PID ${pid}`,
          exitCode: 0,
          reason: 'WINDOWS_PROCESS_TREE_TERMINATED',
        };
      },
    });

    timerMgr.registerLease({
      pid: 33201,
      leaseScope: 'EPHEMERAL_UI_BOUND',
      uiClientId: 'ui-expired',
      command: 'powershell.exe -NoProfile',
      origin: 'ANTIGRAVITY_CLI_TAB',
    });

    timerMgr.handleUiClientDisconnect('ui-expired');
    vi.advanceTimersByTime(4999);
    expect(timerMgr.getLease(33201)?.status).toBe('GRACE_PERIOD');
    expect(killedOrder).toEqual([]);

    vi.advanceTimersByTime(2);
    await Promise.resolve();
    await Promise.resolve();

    expect(killedOrder).toEqual([33201]);
    expect(timerMgr.getLease(33201)?.status).toBe('TERMINATED');
    timerMgr.dispose();
    vi.useRealTimers();

    // Verify Windows taskkill /F /T /PID invocation and POSIX -pid SIGTERM -> SIGKILL invocation
    const winExecCalls: Array<{ file: string; args: string[] }> = [];
    const winKillRes = await terminateOsProcessTree(44110, {
      platform: 'win32',
      execFileFn: async (file, args) => {
        winExecCalls.push({ file, args });
        return { stdout: 'SUCCESS: process terminated', stderr: '', exitCode: 0 };
      },
    });
    expect(winKillRes.terminated).toBe(true);
    expect(winKillRes.method).toBe('taskkill_tree');
    expect(winExecCalls).toEqual([{ file: 'taskkill', args: ['/F', '/T', '/PID', '44110'] }]);

    const posixSignals: Array<{ pid: number; signal?: NodeJS.Signals | number }> = [];
    const posixKillRes = await terminateOsProcessTree(44112, {
      platform: 'linux',
      sigkillDelayMs: 5,
      killFn: (pid, signal) => {
        posixSignals.push({ pid, signal });
        return true;
      },
    });
    expect(posixKillRes.terminated).toBe(true);
    expect(posixKillRes.method).toBe('posix_pgid_sigterm_sigkill');
    expect(posixSignals).toEqual([
      { pid: -44112, signal: 'SIGTERM' },
      { pid: 44112, signal: 0 },
      { pid: -44112, signal: 'SIGKILL' },
    ]);

    // Unsafe PIDs rejected strictly
    const unsafeRes = await terminateOsProcessTree(4);
    expect(unsafeRes.terminated).toBe(false);
    expect(unsafeRes.method).toBe('rejected_unsafe_pid');

    // Part B: Real OS 2-level process tree (parent + child) terminated over live Named Pipe
    stateManager = new StateManager(daemonDbPath);
    const fastGraceMgr = new ProcessLeaseManager({ graceWindowMs: 250 });
    ipcServer = new DaemonIpcServer({
      stateManager,
      leaseManager: fastGraceMgr,
      pipePath,
      enableWebSocket: false,
    });
    await ipcServer.start();

    const { parentPid, childPid } = await spawnParentWithChildWorker();
    expect(isPidAlive(parentPid)).toBe(true);
    expect(isPidAlive(childPid)).toBe(true);

    const uiClient = new DaemonClient({
      pipePath,
      uiClientId: 'ui-crash-tree',
      autoReconnect: false,
    });
    clientsToDisconnect.push(uiClient);
    await uiClient.connect();

    const regAck = await uiClient.registerPtyLease({
      pid: parentPid,
      leaseScope: 'EPHEMERAL_UI_BOUND',
      command: 'powershell.exe -NoProfile',
      origin: 'ANTIGRAVITY_CLI_TAB',
    }).ackPromise;
    expect(regAck.ok).toBe(true);

    await uiClient.notifyUiClientDisconnect('window-all-closed').ackPromise;
    uiClient.disconnect();

    await waitForCondition(() => fastGraceMgr.getLease(parentPid)?.status === 'TERMINATED', 5000, 20);
    await waitForCondition(() => !isPidAlive(parentPid) && !isPidAlive(childPid), 5000, 25);

    expect(isPidAlive(parentPid)).toBe(false);
    expect(isPidAlive(childPid)).toBe(false);
  });

  it('4. Preserves DETACHED_DAEMON_SERVICE uninterrupted while EPHEMERAL_UI_BOUND is reaped after disconnect', async () => {
    const {
      StateManager,
      DaemonIpcServer,
      ProcessLeaseManager,
    } = loadDaemonLeaseModules();

    stateManager = new StateManager(daemonDbPath);
    const leaseMgr = new ProcessLeaseManager({ graceWindowMs: 250 });
    ipcServer = new DaemonIpcServer({
      stateManager,
      leaseManager: leaseMgr,
      pipePath,
      enableWebSocket: false,
    });
    await ipcServer.start();

    const detachedPid = spawnIdleWorker();
    const ephemeralPid = spawnIdleWorker();
    expect(isPidAlive(detachedPid)).toBe(true);
    expect(isPidAlive(ephemeralPid)).toBe(true);

    const uiClient = new DaemonClient({
      pipePath,
      uiClientId: 'ui-mixed-scopes',
      autoReconnect: false,
    });
    clientsToDisconnect.push(uiClient);
    await uiClient.connect();

    const detAck = await uiClient.registerPtyLease({
      pid: detachedPid,
      leaseScope: 'DETACHED_DAEMON_SERVICE',
      command: 'npx hyperframes render video.html',
      origin: 'HYPERFRAMES',
    }).ackPromise;
    expect(detAck.ok).toBe(true);

    const ephAck = await uiClient.registerPtyLease({
      pid: ephemeralPid,
      leaseScope: 'EPHEMERAL_UI_BOUND',
      command: 'git status',
      origin: 'ANTIGRAVITY_CLI_TAB',
    }).ackPromise;
    expect(ephAck.ok).toBe(true);

    await uiClient.notifyUiClientDisconnect('window-all-closed').ackPromise;
    uiClient.disconnect();

    await waitForCondition(() => leaseMgr.getLease(ephemeralPid)?.status === 'TERMINATED', 5000, 20);
    await waitForCondition(() => !isPidAlive(ephemeralPid), 5000, 25);

    // Give extra margin past grace deadline to prove detached process stays untouched
    await new Promise((r) => setTimeout(r, 200));

    const detLease = leaseMgr.getLease(detachedPid);
    expect(detLease?.status).toBe('ACTIVE');
    expect(detLease?.graceDeadlineMs).toBeNull();
    expect(isPidAlive(detachedPid)).toBe(true);
    expect(isPidAlive(ephemeralPid)).toBe(false);

    leaseMgr.releaseLease(detachedPid);
  });

  it('5. Verifies Electron main/preload lease wiring and strict zero-emoji governance', () => {
    const mainTs = fs.readFileSync(path.resolve(process.cwd(), 'electron/main.ts'), 'utf-8');
    const preloadTs = fs.readFileSync(path.resolve(process.cwd(), 'electron/preload.ts'), 'utf-8');
    const cliTabTsx = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/terminal/AntigravityCliTab.tsx'),
      'utf-8'
    );
    const leaseMgrTs = fs.readFileSync(
      'C:/Dev/kalinar-daemon/src/process-lease-manager.ts',
      'utf-8'
    );

    expect(mainTs).toContain('registerPtyLease');
    expect(mainTs).toContain('releasePtyLease');
    expect(mainTs).toContain('notifyUiClientHello');
    expect(mainTs).toContain('notifyUiClientDisconnect');
    expect(mainTs).toContain('killProcessTree');
    expect(mainTs).toContain('leaseScope');
    expect(preloadTs).toContain('leaseScope?: ProcessLeaseScope');
    expect(cliTabTsx).toContain("origin: 'ANTIGRAVITY_CLI_TAB'");

    const emojiPattern =
      /[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    for (const content of [mainTs, preloadTs, cliTabTsx, leaseMgrTs]) {
      expect(emojiPattern.test(content)).toBe(false);
    }
  });
});
