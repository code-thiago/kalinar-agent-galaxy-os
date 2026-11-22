/**
 * UNIFICATION MILESTONE 4 TDD SUITE (v1.8.0-rc1)
 * Verifies:
 * 1. Active SYNC_MUTE_WINDOW while .antigravity/.sync-in-progress holds alive PID within 30s
 *    plus final-state coalescing without dropping state across KalinarDaemon (chokidar) and kalinar-daemon
 * 2. Automatic stale-lock cleanup when PID is dead (orphaned lock after crash)
 * 3. Automatic stale-lock cleanup when TTL (> 30000ms) expired or JSON/schema is invalid
 * 4. Real second-brain-cli.ps1 sync execution with Robocopy /PURGE and clean try/finally lock removal
 * 5. Strict zero-emoji governance across all M4 deliverables
 * Strictly Zero Emojis
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  SYNC_SENTINEL_DEFAULT_TTL_MS,
  SyncSentinelLockSchema,
  type SyncSentinelEventPayload,
} from '../src/types/kalinar.js';
import { KalinarEventBus } from '../src/core/KalinarEventBus.js';
import { KalinarSqliteStore } from '../electron/db/sqliteStore.js';
import { KalinarDaemon } from '../electron/daemon/KalinarDaemon.js';
import {
  SyncSentinelGuard,
  evaluateSyncSentinelLock,
  isProcessPidAlive,
} from '../electron/daemon/SyncSentinelGuard.js';

interface DaemonSyncSentinelGuardLike {
  getMode(): 'WATCHING' | 'SYNC_MUTE_WINDOW';
  getMetrics(): {
    mode: 'WATCHING' | 'SYNC_MUTE_WINDOW';
    suppressedBurstCount: number;
    deferredCount: number;
    recoveryCount: number;
  };
  checkSentinel(): {
    status: string;
    muted: boolean;
    staleLockRemoved: boolean;
    reason: string;
  };
  dispose(): void;
}

interface SwarmDaemonLike {
  getStateManager(): {
    getDb(): {
      prepare(sql: string): {
        all(...args: unknown[]): Array<{ event: string; payload: string }>;
      };
    };
    close(): void;
  };
  getSyncSentinelGuard(): DaemonSyncSentinelGuardLike;
  evaluateSyncSentinel(): {
    status: string;
    muted: boolean;
    staleLockRemoved: boolean;
    reason: string;
  };
  handleWatchedFileEvent(
    event: 'add' | 'change' | 'unlink',
    filePath: string,
    onProcessed?: (ev: 'add' | 'change' | 'unlink', fp: string) => void
  ): {
    processed: boolean;
    mode: 'WATCHING' | 'SYNC_MUTE_WINDOW';
    evaluation: {
      status: string;
      muted: boolean;
      staleLockRemoved: boolean;
      reason: string;
    };
  };
  stop(): Promise<void>;
  close(): void;
}

const nodeRequire = createRequire(import.meta.url);
const DAEMON_DIST_PATH = 'C:/Dev/kalinar-daemon/dist/daemon.js';
const DAEMON_SENTINEL_DIST_PATH = 'C:/Dev/kalinar-daemon/dist/sync-sentinel.js';
const SECOND_BRAIN_CLI_PATH =
  'C:\\Users\\thiag\\OneDrive\\Documentos\\Developer\\second brain\\scripts\\second-brain-cli.ps1';

function loadDaemonSentinelModules(): {
  SwarmDaemon: new (config?: Record<string, unknown>) => SwarmDaemonLike;
  evaluateSyncSentinelLock: typeof evaluateSyncSentinelLock;
  isProcessPidAlive: typeof isProcessPidAlive;
} {
  const daemonMod = nodeRequire(DAEMON_DIST_PATH) as {
    SwarmDaemon: new (config?: Record<string, unknown>) => SwarmDaemonLike;
  };
  const sentinelMod = nodeRequire(DAEMON_SENTINEL_DIST_PATH) as {
    evaluateSyncSentinelLock: typeof evaluateSyncSentinelLock;
    isProcessPidAlive: typeof isProcessPidAlive;
  };
  return {
    SwarmDaemon: daemonMod.SwarmDaemon,
    evaluateSyncSentinelLock: sentinelMod.evaluateSyncSentinelLock,
    isProcessPidAlive: sentinelMod.isProcessPidAlive,
  };
}

function forceCleanupPid(pid: number): void {
  if (!isProcessPidAlive(pid)) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], {
      stdio: 'ignore',
      windowsHide: true,
    });
  } else {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Ignore
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

function writeLockFile(
  workspaceDir: string,
  payload: Record<string, unknown>,
  withBom = false
): string {
  const antigravityDir = path.join(workspaceDir, '.antigravity');
  fs.mkdirSync(antigravityDir, { recursive: true });
  const lockPath = path.join(antigravityDir, '.sync-in-progress');
  const jsonText = JSON.stringify(payload);
  fs.writeFileSync(lockPath, withBom ? `\uFEFF${jsonText}` : jsonText, 'utf-8');
  return lockPath;
}

describe('Unification M4: PID-Verified Sync Sentinel Lockfile', () => {
  const spawnedPids = new Set<number>();
  const activeKalinarDaemons: KalinarDaemon[] = [];
  const activeSwarmDaemons: SwarmDaemonLike[] = [];
  const activeStores: KalinarSqliteStore[] = [];
  const busUnsubscribers: Array<() => void> = [];
  let tempDir: string;

  function spawnIdleWorker(): number {
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000);'], {
      windowsHide: true,
      stdio: 'ignore',
    });
    if (!child.pid) {
      throw new Error('Failed to spawn idle worker child process');
    }
    spawnedPids.add(child.pid);
    return child.pid;
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kalinar-m4-'));
  });

  afterEach(async () => {
    for (const unsub of busUnsubscribers) {
      unsub();
    }
    busUnsubscribers.length = 0;

    for (const kd of activeKalinarDaemons) {
      await kd.stop();
    }
    activeKalinarDaemons.length = 0;

    for (const sd of activeSwarmDaemons) {
      await sd.stop();
    }
    activeSwarmDaemons.length = 0;

    for (const st of activeStores) {
      try {
        st.close();
      } catch {
        // Ignore
      }
    }
    activeStores.length = 0;

    for (const pid of spawnedPids) {
      forceCleanupPid(pid);
    }
    spawnedPids.clear();

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore Windows directory cleanup race
    }
  });

  it('1. Enters SYNC_MUTE_WINDOW while lockfile holds alive PID within 30s and flushes coalesced final state after sync completes (chokidar + kalinar-daemon)', async () => {
    const wsElectron = path.join(tempDir, 'ws-electron');
    const wsDaemon = path.join(tempDir, 'ws-daemon');
    fs.mkdirSync(wsElectron, { recursive: true });
    fs.mkdirSync(wsDaemon, { recursive: true });

    const alivePid = spawnIdleWorker();
    expect(isProcessPidAlive(alivePid)).toBe(true);

    // Part A: Live chokidar watcher in KalinarDaemon
    const electronDb = path.join(tempDir, 'electron.db');
    const store = new KalinarSqliteStore(electronDb);
    activeStores.push(store);

    const bus = KalinarEventBus.getInstance();
    const watchedEvents: Array<{ path: string; event: string }> = [];
    const sentinelEvents: SyncSentinelEventPayload[] = [];

    busUnsubscribers.push(
      bus.on('watcher:file_event', (ev) => {
        watchedEvents.push({ path: ev.path, event: ev.event });
      })
    );
    busUnsubscribers.push(
      bus.on('daemon:sync_sentinel_lock', (ev) => {
        sentinelEvents.push(ev);
      })
    );

    const kalinarDaemon = new KalinarDaemon(
      {
        workspacePath: wsElectron,
        debounceMs: 40,
        syncSentinelPollMs: 60,
      },
      store,
      bus
    );
    activeKalinarDaemons.push(kalinarDaemon);
    await kalinarDaemon.start();
    await kalinarDaemon.waitForReady();

    // Write valid BOM-prefixed lockfile (also validates PowerShell UTF-8 edge case)
    const lockPath = writeLockFile(
      wsElectron,
      {
        pid: alivePid,
        timestamp: Date.now(),
        ttlMs: SYNC_SENTINEL_DEFAULT_TTL_MS,
        owner: 'second-brain-cli.ps1',
      },
      true
    );

    // Verify lock matches SyncSentinelLockSchema
    const rawLock = fs.readFileSync(lockPath, 'utf-8').replace(/^\uFEFF/, '');
    expect(SyncSentinelLockSchema.parse(JSON.parse(rawLock)).pid).toBe(alivePid);

    const targetNote = path.join(wsElectron, '01_PROJETOS', 'sync-burst.md');
    fs.mkdirSync(path.dirname(targetNote), { recursive: true });
    fs.writeFileSync(targetNote, 'v1', 'utf-8');
    await new Promise((r) => setTimeout(r, 150));
    fs.writeFileSync(targetNote, 'v2', 'utf-8');
    await new Promise((r) => setTimeout(r, 150));
    fs.writeFileSync(targetNote, 'v3-final', 'utf-8');

    // Chokidar bursts must be suppressed during SYNC_MUTE_WINDOW
    await waitForCondition(
      () => kalinarDaemon.getSyncSentinelMetrics().suppressedBurstCount >= 1,
      4000,
      20
    );
    expect(kalinarDaemon.getSyncSentinelMode()).toBe('SYNC_MUTE_WINDOW');
    expect(watchedEvents).toHaveLength(0);
    expect(sentinelEvents.some((e) => e.status === 'SYNC_MUTE_WINDOW')).toBe(true);
    expect(fs.existsSync(lockPath)).toBe(true);

    // Complete sync by removing lockfile -> mute window lifts and final state flushes once
    fs.unlinkSync(lockPath);

    await waitForCondition(
      () =>
        kalinarDaemon.getSyncSentinelMode() === 'WATCHING' &&
        watchedEvents.some((e) => e.path.endsWith('01_PROJETOS/sync-burst.md')),
      4000,
      20
    );

    const burstFlushed = watchedEvents.filter((e) => e.path.endsWith('01_PROJETOS/sync-burst.md'));
    expect(burstFlushed).toHaveLength(1);
    expect(sentinelEvents.some((e) => e.status === 'SYNC_MUTE_RELEASED')).toBe(true);

    // Part B: C:\Dev\kalinar-daemon SwarmDaemon + exact 29999ms vs 30000ms boundary
    const { SwarmDaemon } = loadDaemonSentinelModules();
    let nowMs = 1_760_000_000_000;
    const daemonLockPath = writeLockFile(wsDaemon, {
      pid: alivePid,
      timestamp: nowMs,
      ttlMs: 30000,
      owner: 'second-brain-cli.ps1',
    });

    const swarmDaemon = new SwarmDaemon({
      secondBrainPath: wsDaemon,
      watchPaths: [wsDaemon],
      dbPath: path.join(tempDir, 'swarm-m1.db'),
      enableIpcServer: false,
      syncSentinelPollMs: 5000,
      syncClock: () => nowMs,
    });
    activeSwarmDaemons.push(swarmDaemon);

    const processedFiles: Array<{ event: string; filePath: string }> = [];
    swarmDaemon.onWatchedFileEvent((ev, fp) => {
      processedFiles.push({ event: ev, filePath: fp });
    });

    // At 29999ms (< 30s) with alive PID -> stays muted & suppresses bursts
    nowMs += 29999;
    const noteA = path.join(wsDaemon, '02_PADROES', 'adr.md');
    const r1 = swarmDaemon.handleWatchedFileEvent('add', noteA);
    const r2 = swarmDaemon.handleWatchedFileEvent('change', noteA);
    expect(r1.processed).toBe(false);
    expect(r2.processed).toBe(false);
    expect(r2.mode).toBe('SYNC_MUTE_WINDOW');
    expect(processedFiles).toHaveLength(0);
    expect(fs.existsSync(daemonLockPath)).toBe(true);

    // Clear lock cleanly -> mode transitions to WATCHING and coalesced final event flushes
    fs.unlinkSync(daemonLockPath);
    const afterClear = swarmDaemon.evaluateSyncSentinel();
    expect(afterClear.muted).toBe(false);
    await waitForCondition(() => processedFiles.length === 1, 2000, 10);
    expect(processedFiles[0]).toEqual({ event: 'change', filePath: noteA });
  });

  it('2. Automatically deletes orphaned lockfile when PowerShell PID is dead, logs recovery, and resumes watching', async () => {
    const wsElectron = path.join(tempDir, 'ws-dead-electron');
    const wsDaemon = path.join(tempDir, 'ws-dead-daemon');
    fs.mkdirSync(wsElectron, { recursive: true });
    fs.mkdirSync(wsDaemon, { recursive: true });

    // Spawn and immediately terminate a real OS process so PID is genuinely dead
    const deadPid = spawnIdleWorker();
    expect(isProcessPidAlive(deadPid)).toBe(true);
    forceCleanupPid(deadPid);
    await waitForCondition(() => !isProcessPidAlive(deadPid), 4000, 20);
    spawnedPids.delete(deadPid);

    const electronLock = writeLockFile(wsElectron, {
      pid: deadPid,
      timestamp: Date.now(),
      ttlMs: 30000,
      owner: 'second-brain-cli.ps1',
    });

    const store = new KalinarSqliteStore(path.join(tempDir, 'dead-pid-electron.db'));
    activeStores.push(store);
    const bus = KalinarEventBus.getInstance();
    const sentinelEvents: SyncSentinelEventPayload[] = [];
    const watchedEvents: Array<{ path: string; event: string }> = [];

    busUnsubscribers.push(bus.on('daemon:sync_sentinel_lock', (ev) => sentinelEvents.push(ev)));
    busUnsubscribers.push(
      bus.on('watcher:file_event', (ev) => watchedEvents.push({ path: ev.path, event: ev.event }))
    );

    const kalinarDaemon = new KalinarDaemon(
      { workspacePath: wsElectron, debounceMs: 25 },
      store,
      bus
    );
    activeKalinarDaemons.push(kalinarDaemon);

    const resumeFile = path.join(wsElectron, 'src', 'resumed.ts');
    kalinarDaemon.handleWatchedEvent('change', resumeFile);

    // Dead PID lock must be removed immediately and watching must resume
    expect(fs.existsSync(electronLock)).toBe(false);
    expect(kalinarDaemon.getSyncSentinelMode()).toBe('WATCHING');
    expect(
      sentinelEvents.some(
        (e) => e.status === 'RECOVERED_PID_DEAD' && e.staleLockRemoved === true && e.pid === deadPid
      )
    ).toBe(true);

    await waitForCondition(
      () => watchedEvents.some((e) => e.path.endsWith('src/resumed.ts')),
      3000,
      15
    );

    const telemetry = store.getHistoricalTelemetry(20);
    expect(telemetry.some((row) => row.payload.includes('RECOVERED_PID_DEAD'))).toBe(true);

    // Verify identical dead-PID cleanup in C:\Dev\kalinar-daemon SwarmDaemon
    const { SwarmDaemon } = loadDaemonSentinelModules();
    const daemonLock = writeLockFile(wsDaemon, {
      pid: deadPid,
      timestamp: Date.now(),
      ttlMs: 30000,
      owner: 'second-brain-cli.ps1',
    });

    const swarmDaemon = new SwarmDaemon({
      secondBrainPath: wsDaemon,
      watchPaths: [wsDaemon],
      dbPath: path.join(tempDir, 'dead-pid-swarm.db'),
      enableIpcServer: false,
    });
    activeSwarmDaemons.push(swarmDaemon);

    const res = swarmDaemon.handleWatchedFileEvent('add', path.join(wsDaemon, 'recovered.md'));
    expect(res.processed).toBe(true);
    expect(res.mode).toBe('WATCHING');
    expect(res.evaluation.status).toBe('RECOVERED_PID_DEAD');
    expect(res.evaluation.staleLockRemoved).toBe(true);
    expect(fs.existsSync(daemonLock)).toBe(false);

    const swarmLogs = swarmDaemon
      .getStateManager()
      .getDb()
      .prepare('SELECT event, payload FROM telemetry_logs ORDER BY id DESC')
      .all();
    expect(swarmLogs.some((r) => r.event === 'SYNC_SENTINEL_RECOVERY' && r.payload.includes('RECOVERED_PID_DEAD'))).toBe(true);
  });

  it('3. Automatically deletes stale lockfile when TTL (> 30000ms) expired even if PID is alive, and recovers invalid/corrupted lockfiles', async () => {
    const wsTtl = path.join(tempDir, 'ws-ttl');
    fs.mkdirSync(wsTtl, { recursive: true });

    // Case A: Alive PID (current process) but timestamp > 30s ago AND rogue ttlMs > 30s capped at 30000ms
    const expiredLock = writeLockFile(wsTtl, {
      pid: process.pid,
      timestamp: Date.now() - 31000,
      ttlMs: 999999,
      owner: 'second-brain-cli.ps1',
    });

    const store = new KalinarSqliteStore(path.join(tempDir, 'ttl-electron.db'));
    activeStores.push(store);
    const bus = KalinarEventBus.getInstance();
    const sentinelEvents: SyncSentinelEventPayload[] = [];
    const watchedEvents: Array<{ path: string; event: string }> = [];

    busUnsubscribers.push(bus.on('daemon:sync_sentinel_lock', (ev) => sentinelEvents.push(ev)));
    busUnsubscribers.push(
      bus.on('watcher:file_event', (ev) => watchedEvents.push({ path: ev.path, event: ev.event }))
    );

    const kalinarDaemon = new KalinarDaemon(
      { workspacePath: wsTtl, debounceMs: 25 },
      store,
      bus
    );
    activeKalinarDaemons.push(kalinarDaemon);

    kalinarDaemon.handleWatchedEvent('change', path.join(wsTtl, 'ttl-recovered.md'));

    expect(fs.existsSync(expiredLock)).toBe(false);
    expect(kalinarDaemon.getSyncSentinelMode()).toBe('WATCHING');
    expect(
      sentinelEvents.some(
        (e) => e.status === 'RECOVERED_TTL_EXPIRED' && e.staleLockRemoved === true
      )
    ).toBe(true);
    await waitForCondition(
      () => watchedEvents.some((e) => e.path.endsWith('ttl-recovered.md')),
      3000,
      15
    );

    // Case B: Exact 30000ms TTL boundary check on SyncSentinelGuard
    let clockNow = 1_760_000_000_000;
    const boundaryDir = path.join(tempDir, 'ws-boundary');
    const boundaryLock = writeLockFile(boundaryDir, {
      pid: process.pid,
      timestamp: clockNow,
      ttlMs: 30000,
    });
    const boundaryGuard = new SyncSentinelGuard({
      rootPaths: [boundaryDir],
      clock: () => clockNow,
      isPidAlive: () => true,
    });
    clockNow += 29999;
    expect(boundaryGuard.checkSentinel().status).toBe('SYNC_MUTE_WINDOW');
    expect(fs.existsSync(boundaryLock)).toBe(true);

    clockNow += 1; // ageMs === 30000
    const boundaryExpired = boundaryGuard.checkSentinel();
    expect(boundaryExpired.status).toBe('RECOVERED_TTL_EXPIRED');
    expect(boundaryExpired.staleLockRemoved).toBe(true);
    expect(fs.existsSync(boundaryLock)).toBe(false);
    boundaryGuard.dispose();

    // Case C: Corrupted JSON / invalid schema lockfile recovery
    const { evaluateSyncSentinelLock: daemonEvaluateLock } = loadDaemonSentinelModules();
    const corruptPath = path.join(wsTtl, '.antigravity', '.sync-in-progress');
    fs.mkdirSync(path.dirname(corruptPath), { recursive: true });
    fs.writeFileSync(corruptPath, '{corrupt-json', 'utf-8');

    const corruptEval = daemonEvaluateLock(corruptPath);
    expect(corruptEval.status).toBe('RECOVERED_INVALID_SCHEMA');
    expect(corruptEval.muted).toBe(false);
    expect(corruptEval.staleLockRemoved).toBe(true);
    expect(fs.existsSync(corruptPath)).toBe(false);
  });

  it('4. Executes second-brain-cli.ps1 sync with Robocopy /PURGE and try/finally clean lockfile removal', () => {
    const cliContent = fs.readFileSync(SECOND_BRAIN_CLI_PATH, 'utf-8');
    expect(cliContent).toContain('.sync-in-progress');
    expect(cliContent).toContain('.antigravity');
    expect(cliContent).toContain('ttlMs');
    expect(cliContent).toContain('30000');
    expect(cliContent).toContain('try {');
    expect(cliContent).toContain('finally {');
    expect(cliContent).toContain('/PURGE');
    expect(cliContent).toContain('".sync-in-progress"');

    const tmpCanonical = path.join(tempDir, 'sb-canonical');
    const tmpMirror = path.join(tempDir, 'sb-mirror');
    const tmpKalinar = path.join(tempDir, 'sb-kalinar');

    fs.mkdirSync(path.join(tmpCanonical, '01_PROJETOS'), { recursive: true });
    fs.mkdirSync(tmpMirror, { recursive: true });
    fs.mkdirSync(tmpKalinar, { recursive: true });

    fs.writeFileSync(path.join(tmpCanonical, '00_INDEX.md'), '# Index', 'utf-8');
    fs.writeFileSync(path.join(tmpCanonical, '01_PROJETOS', 'm4.md'), '# M4 Sync Note', 'utf-8');
    fs.writeFileSync(path.join(tmpMirror, 'stale-note.md'), 'must be purged', 'utf-8');

    const psRes = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        SECOND_BRAIN_CLI_PATH,
        'sync',
        '-CanonicalVaultOverride',
        tmpCanonical,
        '-MirrorVaultsOverride',
        tmpMirror,
        '-KalinarRoot',
        tmpKalinar,
      ],
      {
        encoding: 'utf-8',
        windowsHide: true,
        timeout: 20000,
      }
    );

    expect(psRes.status).toBe(0);
    expect(psRes.stdout).toContain('Sincronizacao concluida');
    expect(fs.existsSync(path.join(tmpMirror, '00_INDEX.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpMirror, '01_PROJETOS', 'm4.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpMirror, 'stale-note.md'))).toBe(false);

    // Clean try/finally removal across canonical vault, mirror vault, and Kalinar root
    expect(fs.existsSync(path.join(tmpCanonical, '.antigravity', '.sync-in-progress'))).toBe(false);
    expect(fs.existsSync(path.join(tmpMirror, '.antigravity', '.sync-in-progress'))).toBe(false);
    expect(fs.existsSync(path.join(tmpKalinar, '.antigravity', '.sync-in-progress'))).toBe(false);
  });

  it('5. Enforces strict zero-emoji governance across all M4 deliverables', () => {
    const targetFiles = [
      SECOND_BRAIN_CLI_PATH,
      'C:/Dev/kalinar-daemon/src/sync-sentinel.ts',
      'C:/Dev/kalinar-daemon/src/daemon.ts',
      path.resolve(process.cwd(), 'electron/daemon/SyncSentinelGuard.ts'),
      path.resolve(process.cwd(), 'electron/daemon/KalinarDaemon.ts'),
      path.resolve(process.cwd(), 'src/types/kalinar.ts'),
      path.resolve(process.cwd(), 'tests/unification-m4-sync-sentinel.test.ts'),
    ];

    const emojiPattern =
      /[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    for (const file of targetFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      expect(emojiPattern.test(content), `Unexpected emoji found in ${file}`).toBe(false);
    }
  });
});
