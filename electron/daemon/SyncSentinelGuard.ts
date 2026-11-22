/**
 * KALINAR PID-VERIFIED SYNC SENTINEL GUARD (v1.8.0-rc1)
 * Suppresses noisy chokidar bursts during active vault sync without dropping final state,
 * and cleans up orphaned locks when PID is dead or TTL (30000ms) has expired.
 * Strictly Zero Emojis
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  SYNC_SENTINEL_DEFAULT_TTL_MS,
  SyncSentinelLockSchema,
  type SyncSentinelLock,
} from '@kalinar/contracts';

export const SYNC_SENTINEL_RELATIVE_PATH = path.join('.antigravity', '.sync-in-progress');

export type WatcherOperatingMode = 'WATCHING' | 'SYNC_MUTE_WINDOW';

export type SyncSentinelStatus =
  | 'NO_LOCK'
  | 'SYNC_MUTE_WINDOW'
  | 'RECOVERED_PID_DEAD'
  | 'RECOVERED_TTL_EXPIRED'
  | 'RECOVERED_INVALID_SCHEMA';

export interface SyncSentinelEvaluation {
  status: SyncSentinelStatus;
  muted: boolean;
  lockPath: string;
  lock: SyncSentinelLock | null;
  ageMs?: number;
  pidAlive?: boolean;
  staleLockRemoved: boolean;
  reason: string;
}

export interface DeferredWatchEvent {
  event: 'add' | 'change' | 'unlink';
  filePath: string;
  receivedAt: number;
}

export interface SyncSentinelGateDecision {
  proceed: boolean;
  mode: WatcherOperatingMode;
  evaluation: SyncSentinelEvaluation;
  suppressedAsSentinelFile?: boolean;
}

export interface SyncSentinelGuardOptions {
  rootPaths: string[];
  sentinelPaths?: string[];
  pollIntervalMs?: number;
  clock?: () => number;
  isPidAlive?: (pid: number) => boolean;
  onEnterMuteWindow?: (evaluation: SyncSentinelEvaluation) => void;
  onExitMuteWindow?: (summary: {
    suppressedBurstCount: number;
    deferredCount: number;
    reason: string;
  }) => void;
  onStaleLockRecovered?: (evaluation: SyncSentinelEvaluation) => void;
  onFlushDeferredEvent?: (event: DeferredWatchEvent) => void | Promise<void>;
}

export function isProcessPidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    return code === 'EPERM';
  }
}

export function isSyncSentinelFilePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return (
    /(^|\/)\.antigravity\/\.sync-in-progress(\.tmp\.\d+)?$/i.test(normalized) ||
    path.posix.basename(normalized) === '.sync-in-progress'
  );
}

function tryUnlinkLock(lockPath: string): boolean {
  try {
    fs.unlinkSync(lockPath);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    return code === 'ENOENT';
  }
}

export function evaluateSyncSentinelLock(
  lockPath: string,
  options?: {
    clock?: () => number;
    isPidAlive?: (pid: number) => boolean;
    removeStaleLock?: boolean;
  }
): SyncSentinelEvaluation {
  const now = options?.clock ? options.clock() : Date.now();
  const checkPid = options?.isPidAlive ?? isProcessPidAlive;
  const shouldRemove = options?.removeStaleLock !== false;

  if (!fs.existsSync(lockPath)) {
    return {
      status: 'NO_LOCK',
      muted: false,
      lockPath,
      lock: null,
      staleLockRemoved: false,
      reason: 'NO_SENTINEL_LOCK',
    };
  }

  let rawText: string;
  try {
    rawText = fs.readFileSync(lockPath, 'utf-8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      return {
        status: 'NO_LOCK',
        muted: false,
        lockPath,
        lock: null,
        staleLockRemoved: false,
        reason: 'NO_SENTINEL_LOCK',
      };
    }
    if (shouldRemove) {
      tryUnlinkLock(lockPath);
    }
    return {
      status: 'RECOVERED_INVALID_SCHEMA',
      muted: false,
      lockPath,
      lock: null,
      staleLockRemoved: shouldRemove,
      reason: `SENTINEL_READ_FAILED (${code || 'UNKNOWN'})`,
    };
  }

  const cleanText = rawText.replace(/^\uFEFF/, '').trim();
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleanText);
  } catch {
    if (shouldRemove) {
      tryUnlinkLock(lockPath);
    }
    return {
      status: 'RECOVERED_INVALID_SCHEMA',
      muted: false,
      lockPath,
      lock: null,
      staleLockRemoved: shouldRemove,
      reason: 'INVALID_SENTINEL_JSON',
    };
  }

  const schemaResult = SyncSentinelLockSchema.safeParse(parsedJson);
  if (!schemaResult.success) {
    if (shouldRemove) {
      tryUnlinkLock(lockPath);
    }
    return {
      status: 'RECOVERED_INVALID_SCHEMA',
      muted: false,
      lockPath,
      lock: null,
      staleLockRemoved: shouldRemove,
      reason: `INVALID_SENTINEL_SCHEMA: ${schemaResult.error.issues[0]?.message || 'validation failed'}`,
    };
  }

  const lock = schemaResult.data;
  const effectiveTtlMs = Math.min(
    lock.ttlMs ?? SYNC_SENTINEL_DEFAULT_TTL_MS,
    SYNC_SENTINEL_DEFAULT_TTL_MS
  );
  const ageMs = now - lock.timestamp;
  const withinTtl = ageMs < effectiveTtlMs;
  const pidAlive = checkPid(lock.pid);

  if (withinTtl && pidAlive) {
    return {
      status: 'SYNC_MUTE_WINDOW',
      muted: true,
      lockPath,
      lock,
      ageMs,
      pidAlive: true,
      staleLockRemoved: false,
      reason: `SYNC_ACTIVE (pid=${lock.pid}, ageMs=${ageMs}, ttlMs=${effectiveTtlMs})`,
    };
  }

  if (shouldRemove) {
    tryUnlinkLock(lockPath);
  }

  if (!withinTtl) {
    return {
      status: 'RECOVERED_TTL_EXPIRED',
      muted: false,
      lockPath,
      lock,
      ageMs,
      pidAlive,
      staleLockRemoved: shouldRemove,
      reason: `TTL_EXPIRED (ageMs=${ageMs} >= ttlMs=${effectiveTtlMs}, pid=${lock.pid})`,
    };
  }

  return {
    status: 'RECOVERED_PID_DEAD',
    muted: false,
    lockPath,
    lock,
    ageMs,
    pidAlive: false,
    staleLockRemoved: shouldRemove,
    reason: `ORPHANED_DEAD_PID (pid=${lock.pid}, ageMs=${ageMs})`,
  };
}

export class SyncSentinelGuard {
  private readonly sentinelPaths: string[];
  private readonly pollIntervalMs: number;
  private readonly clock: () => number;
  private readonly isPidAliveFn: (pid: number) => boolean;
  private readonly options: SyncSentinelGuardOptions;

  private mode: WatcherOperatingMode = 'WATCHING';
  private deferredEvents: Map<string, DeferredWatchEvent> = new Map();
  private muteRecheckTimer: NodeJS.Timeout | null = null;
  private suppressedBurstCount = 0;
  private recoveryCount = 0;
  private isFlushing = false;
  private disposed = false;
  private lastEvaluation: SyncSentinelEvaluation | null = null;

  constructor(options: SyncSentinelGuardOptions) {
    this.options = options;
    this.pollIntervalMs = options.pollIntervalMs ?? 250;
    this.clock = options.clock ?? (() => Date.now());
    this.isPidAliveFn = options.isPidAlive ?? isProcessPidAlive;

    const resolvedSet = new Set<string>();
    if (options.sentinelPaths && options.sentinelPaths.length > 0) {
      for (const sp of options.sentinelPaths) {
        if (sp && sp.trim().length > 0) {
          resolvedSet.add(path.resolve(sp));
        }
      }
    } else {
      for (const root of options.rootPaths) {
        if (root && root.trim().length > 0) {
          resolvedSet.add(path.resolve(root, SYNC_SENTINEL_RELATIVE_PATH));
        }
      }
    }
    this.sentinelPaths = Array.from(resolvedSet);
  }

  public activate(): void {
    this.disposed = false;
  }

  public getMode(): WatcherOperatingMode {
    return this.mode;
  }

  public getSentinelPaths(): string[] {
    return [...this.sentinelPaths];
  }

  public getDeferredEvents(): DeferredWatchEvent[] {
    return Array.from(this.deferredEvents.values());
  }

  public getMetrics(): {
    mode: WatcherOperatingMode;
    suppressedBurstCount: number;
    deferredCount: number;
    recoveryCount: number;
    lastEvaluation: SyncSentinelEvaluation | null;
  } {
    return {
      mode: this.mode,
      suppressedBurstCount: this.suppressedBurstCount,
      deferredCount: this.deferredEvents.size,
      recoveryCount: this.recoveryCount,
      lastEvaluation: this.lastEvaluation,
    };
  }

  private normalizePathKey(filePath: string): string {
    const resolved = path.resolve(filePath);
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  }

  private hasActiveMuteLock(): boolean {
    for (const lockPath of this.sentinelPaths) {
      const evaluation = evaluateSyncSentinelLock(lockPath, {
        clock: this.clock,
        isPidAlive: this.isPidAliveFn,
        removeStaleLock: false,
      });
      if (evaluation.muted) {
        return true;
      }
    }
    return false;
  }

  private clearRecheckTimer(): void {
    if (this.muteRecheckTimer) {
      clearTimeout(this.muteRecheckTimer);
      this.muteRecheckTimer = null;
    }
  }

  private scheduleRecheck(evaluation: SyncSentinelEvaluation): void {
    if (this.disposed || this.muteRecheckTimer) {
      return;
    }
    const effectiveTtlMs = evaluation.lock
      ? Math.min(
          evaluation.lock.ttlMs ?? SYNC_SENTINEL_DEFAULT_TTL_MS,
          SYNC_SENTINEL_DEFAULT_TTL_MS
        )
      : SYNC_SENTINEL_DEFAULT_TTL_MS;
    const remainingMs = Math.max(25, effectiveTtlMs - (evaluation.ageMs ?? 0));
    const delayMs = Math.max(25, Math.min(this.pollIntervalMs, remainingMs));

    this.muteRecheckTimer = setTimeout(() => {
      this.muteRecheckTimer = null;
      if (!this.disposed) {
        this.checkSentinel();
      }
    }, delayMs);
    this.muteRecheckTimer.unref?.();
  }

  public checkSentinel(): SyncSentinelEvaluation {
    if (this.disposed) {
      return {
        status: 'NO_LOCK',
        muted: false,
        lockPath: this.sentinelPaths[0] ?? '',
        lock: null,
        staleLockRemoved: false,
        reason: 'GUARD_DISPOSED',
      };
    }

    let activeMuteEval: SyncSentinelEvaluation | null = null;
    let lastRecovery: SyncSentinelEvaluation | null = null;

    for (const lockPath of this.sentinelPaths) {
      const evaluation = evaluateSyncSentinelLock(lockPath, {
        clock: this.clock,
        isPidAlive: this.isPidAliveFn,
        removeStaleLock: true,
      });

      if (
        evaluation.status === 'RECOVERED_PID_DEAD' ||
        evaluation.status === 'RECOVERED_TTL_EXPIRED' ||
        evaluation.status === 'RECOVERED_INVALID_SCHEMA'
      ) {
        this.recoveryCount += 1;
        this.lastEvaluation = evaluation;
        lastRecovery = evaluation;
        console.warn(
          `[SYNC_SENTINEL_RECOVERY] Removed stale lock ${lockPath} (${evaluation.status}): ${evaluation.reason}`
        );
        this.options.onStaleLockRecovered?.(evaluation);
      } else if (evaluation.muted && !activeMuteEval) {
        activeMuteEval = evaluation;
      }
    }

    if (activeMuteEval) {
      const wasWatching = this.mode !== 'SYNC_MUTE_WINDOW';
      this.mode = 'SYNC_MUTE_WINDOW';
      this.lastEvaluation = activeMuteEval;
      if (wasWatching) {
        this.options.onEnterMuteWindow?.(activeMuteEval);
      }
      this.scheduleRecheck(activeMuteEval);
      return activeMuteEval;
    }

    this.clearRecheckTimer();
    const wasMuted = this.mode === 'SYNC_MUTE_WINDOW';
    this.mode = 'WATCHING';

    if (wasMuted) {
      const suppressedCount = this.suppressedBurstCount;
      const deferredCount = this.deferredEvents.size;
      const exitReason = lastRecovery ? lastRecovery.reason : 'SYNC_LOCK_CLEARED';
      this.suppressedBurstCount = 0;
      this.options.onExitMuteWindow?.({
        suppressedBurstCount: suppressedCount,
        deferredCount,
        reason: exitReason,
      });
      void this.flushDeferredEvents();
    }

    const finalEval: SyncSentinelEvaluation = lastRecovery ?? {
      status: 'NO_LOCK',
      muted: false,
      lockPath: this.sentinelPaths[0] ?? '',
      lock: null,
      staleLockRemoved: false,
      reason: 'NO_SENTINEL_LOCK',
    };
    this.lastEvaluation = finalEval;
    return finalEval;
  }

  public shouldProcessOrDefer(
    event: 'add' | 'change' | 'unlink',
    filePath: string
  ): SyncSentinelGateDecision {
    const sentinelFile = isSyncSentinelFilePath(filePath);
    const evaluation = this.checkSentinel();

    if (sentinelFile) {
      return {
        proceed: false,
        mode: this.mode,
        evaluation,
        suppressedAsSentinelFile: true,
      };
    }

    if (evaluation.muted) {
      this.suppressedBurstCount += 1;
      const key = this.normalizePathKey(filePath);
      this.deferredEvents.set(key, {
        event,
        filePath,
        receivedAt: this.clock(),
      });
      this.scheduleRecheck(evaluation);
      return {
        proceed: false,
        mode: 'SYNC_MUTE_WINDOW',
        evaluation,
      };
    }

    return {
      proceed: true,
      mode: 'WATCHING',
      evaluation,
    };
  }

  public async flushDeferredEvents(): Promise<DeferredWatchEvent[]> {
    if (this.disposed || this.isFlushing || this.deferredEvents.size === 0) {
      return [];
    }
    if (this.hasActiveMuteLock()) {
      return [];
    }

    this.isFlushing = true;
    const batch = Array.from(this.deferredEvents.values());
    this.deferredEvents.clear();
    const flushed: DeferredWatchEvent[] = [];

    try {
      for (const item of batch) {
        if (this.disposed) {
          break;
        }
        if (this.hasActiveMuteLock()) {
          this.deferredEvents.set(this.normalizePathKey(item.filePath), item);
          continue;
        }
        await this.options.onFlushDeferredEvent?.(item);
        flushed.push(item);
      }
    } finally {
      this.isFlushing = false;
    }

    return flushed;
  }

  public dispose(): void {
    this.disposed = true;
    this.clearRecheckTimer();
    this.deferredEvents.clear();
  }
}
