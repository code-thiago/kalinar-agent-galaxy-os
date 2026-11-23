/**
 * UNIFICATION MILESTONE 5 TDD SUITE (v2.0.0-unified)
 * Verifies:
 * 1. Background Vault Indexing in kalinar-daemon (cortex_note_cache table, incremental SHA-256 hash,
 *    .sync-in-progress mute-window deferral, and exponential backoff on transient OneDrive file locks)
 * 2. Zero direct OneDrive fs.readFileSync / fs.readdirSync calls in Electron during
 *    kalinar:query_second_brain_vault + sub-millisecond reads from cortex_note_cache via READONLY SQLite
 * 3. Write routing of kalinar:inject_second_brain_note and kalinar:sync_obsidian_canvas through
 *    DaemonClient.ts to kalinar-daemon
 * 4. Blueprint Watchdog Sync (.antigravity/blueprint/*) and full end-to-end integration across
 *    all 5 Unification Milestones (M1..M5)
 * Strictly Zero Emojis
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  ALL_JDM_RULE_FILES,
  CortexNoteCacheRecordSchema,
  DAEMON_IPC_EVENTS,
  ELECTRON_IPC_CHANNELS,
  ProcessLeaseScopeSchema,
  SyncSentinelLockSchema,
  resolveJdmRulePath,
} from '../src/types/kalinar.js';
import { KalinarSqliteStore } from '../electron/db/sqliteStore.js';
import { DaemonClient } from '../electron/daemon/DaemonClient.js';
import {
  handleInjectSecondBrainNote,
  handleQuerySecondBrainVault,
  handleSyncObsidianCanvas,
} from '../electron/daemon/VaultIpcRouter.js';
import {
  LocalVaultAndMdConnector,
  isOneDriveVaultPath,
} from '../src/connectors/AgentConnectorRegistry.js';
import { ZenFirewall } from '../src/core/ZenFirewall.js';
import { evaluateSyncSentinelLock } from '../electron/daemon/SyncSentinelGuard.js';

interface CortexNoteCacheRowLike {
  note_id: string;
  relative_path: string;
  title: string;
  domain: string;
  frontmatter_json: string;
  wikilinks_json: string;
  excerpt: string;
  content_hash: string;
  updated_at: number;
}

interface DaemonStateManagerLike {
  getCortexNoteCacheByPath(relativePath: string): CortexNoteCacheRowLike | null;
  queryCortexNoteCache(filter?: {
    query?: string;
    domain?: string;
    relativePath?: string;
    limit?: number;
  }): CortexNoteCacheRowLike[];
  listCortexNoteCachePaths(): string[];
  getDb(): {
    prepare(sql: string): {
      get(...args: unknown[]): Record<string, unknown> | undefined;
      all(...args: unknown[]): Array<Record<string, unknown>>;
    };
  };
  close(): void;
}

interface VaultIndexSummaryLike {
  indexed: number;
  unchanged: number;
  deleted: number;
  retriedLocks: number;
  skippedMuted: boolean;
  errors: Array<{ filePath: string; message: string }>;
  durationMs: number;
}

interface DaemonSyncSentinelGuardLike {
  checkSentinel(): {
    status: string;
    muted: boolean;
    staleLockRemoved: boolean;
    reason: string;
  };
  dispose(): void;
}

interface VaultShadowIndexerLike {
  indexVault(): Promise<VaultIndexSummaryLike>;
  indexFile(fullPath: string): Promise<{
    status: 'indexed' | 'unchanged' | 'deleted' | 'muted' | 'ignored';
    retriedLocks: number;
    record?: CortexNoteCacheRowLike;
  }>;
  flushPendingWork(): Promise<VaultIndexSummaryLike | null>;
  dispose(): void;
}

interface DaemonIpcServerLike {
  start(): Promise<void>;
  stop(): Promise<void>;
  getLeaseManager(): {
    registerLease(params: {
      pid: number;
      leaseScope: 'EPHEMERAL_UI_BOUND' | 'DETACHED_DAEMON_SERVICE';
      uiClientId?: string | null;
      command?: string;
    }): unknown;
    getLease(pid: number): {
      pid: number;
      leaseScope: 'EPHEMERAL_UI_BOUND' | 'DETACHED_DAEMON_SERVICE';
      status: string;
    } | undefined;
    handleUiClientDisconnect(uiClientId?: string): Array<{
      pid: number;
      leaseScope: 'EPHEMERAL_UI_BOUND' | 'DETACHED_DAEMON_SERVICE';
      status: string;
    }>;
  };
}

const requireFromHere = createRequire(import.meta.url);
const daemonStateModulePath = path.resolve('C:/Dev/kalinar-daemon/dist/state.js');
const daemonVaultIndexerModulePath = path.resolve('C:/Dev/kalinar-daemon/dist/vault-indexer.js');
const daemonSyncSentinelModulePath = path.resolve('C:/Dev/kalinar-daemon/dist/sync-sentinel.js');
const daemonIpcServerModulePath = path.resolve('C:/Dev/kalinar-daemon/dist/ipc-server.js');

function loadDaemonModules(): {
  StateManager: new (dbPath?: string) => DaemonStateManagerLike;
  SyncSentinelGuard: new (options: { rootPaths: string[] }) => DaemonSyncSentinelGuardLike;
  VaultShadowIndexer: new (options: {
    vaultRoot: string;
    stateManager: DaemonStateManagerLike;
    syncSentinelGuard?: DaemonSyncSentinelGuardLike;
    baseBackoffMs?: number;
    maxRetries?: number;
    readFileFn?: (filePath: string) => Promise<string>;
    sleepFn?: (ms: number) => Promise<void>;
    onBackoffRetry?: (info: {
      filePath: string;
      attempt: number;
      delayMs: number;
      code: string;
    }) => void;
  }) => VaultShadowIndexerLike;
  DaemonIpcServer: new (options: {
    stateManager: DaemonStateManagerLike;
    pipePath?: string;
    wsPort?: number;
    wsHost?: string;
    vaultIndexer?: VaultShadowIndexerLike;
    secondBrainPath?: string;
    enablePipe?: boolean;
    enableWebSocket?: boolean;
  }) => DaemonIpcServerLike;
} {
  const { StateManager } = requireFromHere(daemonStateModulePath);
  const { SyncSentinelGuard } = requireFromHere(daemonSyncSentinelModulePath);
  const { VaultShadowIndexer } = requireFromHere(daemonVaultIndexerModulePath);
  const { DaemonIpcServer } = requireFromHere(daemonIpcServerModulePath);
  return { StateManager, SyncSentinelGuard, VaultShadowIndexer, DaemonIpcServer };
}

function seedMockVaultFiles(vaultRoot: string): void {
  const notes: Array<{ rel: string; content: string }> = [
    {
      rel: '00_INDEX.md',
      content: [
        '---',
        'title: "00_INDEX - Master Router"',
        'domain: "01_PROJETOS"',
        'tags: ["#index", "#second-brain"]',
        '---',
        '# 00_INDEX - Master Router',
        'Master router connecting [[01_PROJETOS_INDEX]] and [[02_PADROES_E_DECISOES_INDEX]] and [[03_EXTRA_IGNORED]].',
      ].join('\n'),
    },
    {
      rel: '02_PADROES_E_DECISOES/ADR-005-Single-Writer-Shadow-Cache.md',
      content: [
        '---',
        'title: "ADR-005 Single-Writer Shadow Cache"',
        'domain: "02_PADROES_E_DECISOES"',
        'tags: ["#adr", "#sqlite", "#wal"]',
        '---',
        '# ADR-005 Single-Writer Shadow Cache',
        'Decouples Electron UI from OneDrive file locks via [[cortex_note_cache]] and [[kalinar-daemon]].',
      ].join('\n'),
    },
    {
      rel: '05_AGENTS/agent-orchestrator.md',
      content: [
        '---',
        'title: "Agent Orchestrator Hub"',
        'domain: "05_AGENTS"',
        'tags: ["#agent", "#swarm"]',
        '---',
        '# Agent Orchestrator Hub',
        'Coordinates swarm handoffs across [[WAR_ROOM]] and [[UNIFICATION_LOCK]].',
      ].join('\n'),
    },
  ];

  for (const note of notes) {
    const full = path.join(vaultRoot, note.rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, note.content, 'utf-8');
  }
}

describe('UNIFICATION MILESTONE 5: SQLITE SHADOW CACHE & UNIFIED RELEASE (v2.0.0-unified)', () => {
  let tempRoot: string;
  let simulatedOneDriveVault: string;
  let dbPath: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kalinar-m5-unified-'));
    // Path contains OneDrive + second brain segments to exercise OneDrive path detection
    simulatedOneDriveVault = path.join(tempRoot, 'OneDrive', 'Documentos', 'Developer', 'second brain');
    fs.mkdirSync(simulatedOneDriveVault, { recursive: true });
    dbPath = path.join(tempRoot, 'kalinar-m5.db');
    seedMockVaultFiles(simulatedOneDriveVault);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch {
      // Ignore Windows file cleanup delay
    }
  });

  it('1. indexes Second Brain .md files into cortex_note_cache with incremental hash skip and deletion pruning', async () => {
    const { StateManager, VaultShadowIndexer } = loadDaemonModules();
    const stateManager = new StateManager(dbPath);
    const indexer = new VaultShadowIndexer({
      vaultRoot: simulatedOneDriveVault,
      stateManager,
    });

    try {
      // Verify exact 9 columns on cortex_note_cache schema
      const pragmaCols = stateManager
        .getDb()
        .prepare(`PRAGMA table_info(cortex_note_cache)`)
        .all()
        .map((c) => String(c.name));
      expect(pragmaCols).toEqual([
        'note_id',
        'relative_path',
        'title',
        'domain',
        'frontmatter_json',
        'wikilinks_json',
        'excerpt',
        'content_hash',
        'updated_at',
      ]);

      // First indexing pass
      const firstPass = await indexer.indexVault();
      expect(firstPass.skippedMuted).toBe(false);
      expect(firstPass.indexed).toBe(3);
      expect(firstPass.unchanged).toBe(0);

      const adrRow = stateManager.getCortexNoteCacheByPath(
        '02_PADROES_E_DECISOES/ADR-005-Single-Writer-Shadow-Cache.md'
      );
      expect(adrRow).not.toBeNull();
      const parsedRecord = CortexNoteCacheRecordSchema.parse(adrRow);
      expect(parsedRecord.title).toBe('ADR-005 Single-Writer Shadow Cache');
      expect(parsedRecord.domain).toBe('02_PADROES_E_DECISOES');
      expect(parsedRecord.excerpt.length).toBeLessThan(250);
      expect(parsedRecord.content_hash.length).toBe(64);

      const indexRow = stateManager.getCortexNoteCacheByPath('00_INDEX.md');
      expect(indexRow).not.toBeNull();
      const wikilinks = JSON.parse(indexRow!.wikilinks_json) as string[];
      expect(wikilinks.length).toBeLessThanOrEqual(2);
      expect(wikilinks).toEqual(['01_PROJETOS_INDEX', '02_PADROES_E_DECISOES_INDEX']);

      // Second indexing pass with zero file changes -> incremental content_hash skip
      const secondPass = await indexer.indexVault();
      expect(secondPass.indexed).toBe(0);
      expect(secondPass.unchanged).toBe(3);

      // Delete one file and verify stale row pruning
      fs.unlinkSync(path.join(simulatedOneDriveVault, '05_AGENTS/agent-orchestrator.md'));
      const thirdPass = await indexer.indexVault();
      expect(thirdPass.deleted).toBe(1);
      expect(
        stateManager.getCortexNoteCacheByPath('05_AGENTS/agent-orchestrator.md')
      ).toBeNull();
    } finally {
      indexer.dispose();
      stateManager.close();
    }
  });

  it('2. respects .sync-in-progress mute windows and applies exponential backoff on transient OneDrive file locks', async () => {
    const { StateManager, SyncSentinelGuard, VaultShadowIndexer } = loadDaemonModules();
    const stateManager = new StateManager(dbPath);
    const syncSentinelGuard = new SyncSentinelGuard({ rootPaths: [tempRoot] });

    const sentinelFile = path.join(tempRoot, '.antigravity', '.sync-in-progress');
    fs.mkdirSync(path.dirname(sentinelFile), { recursive: true });
    fs.writeFileSync(
      sentinelFile,
      JSON.stringify({
        pid: process.pid,
        timestamp: Date.now(),
        ttlMs: 30000,
        source: 'second-brain-cli.ps1',
      }),
      'utf-8'
    );

    const backoffDelays: number[] = [];
    let transientLockAttempts = 0;

    const indexer = new VaultShadowIndexer({
      vaultRoot: simulatedOneDriveVault,
      stateManager,
      syncSentinelGuard,
      baseBackoffMs: 12,
      maxRetries: 4,
      sleepFn: async (ms: number) => {
        backoffDelays.push(ms);
      },
      readFileFn: async (filePath: string) => {
        if (
          filePath.endsWith('ADR-005-Single-Writer-Shadow-Cache.md') &&
          transientLockAttempts < 2
        ) {
          transientLockAttempts += 1;
          const err = new Error(
            `EBUSY: resource busy or locked, open '${filePath}'`
          ) as NodeJS.ErrnoException;
          err.code = transientLockAttempts === 1 ? 'EBUSY' : 'EPERM';
          throw err;
        }
        return fs.readFileSync(filePath, 'utf-8');
      },
    });

    try {
      // Attempt indexing while .sync-in-progress is active -> deferred without reading files
      const mutedAttempt = await indexer.indexVault();
      expect(mutedAttempt.skippedMuted).toBe(true);
      expect(mutedAttempt.indexed).toBe(0);
      expect(stateManager.listCortexNoteCachePaths().length).toBe(0);

      // Remove .sync-in-progress lock and flush pending work
      fs.unlinkSync(sentinelFile);
      const flushedSummary = await indexer.flushPendingWork();

      // Verify exponential backoff recovered from the 2 transient OneDrive locks (12ms -> 24ms)
      expect(transientLockAttempts).toBe(2);
      expect(backoffDelays).toEqual([12, 24]);
      expect(flushedSummary?.retriedLocks).toBe(2);
      expect(stateManager.listCortexNoteCachePaths().length).toBe(3);
    } finally {
      syncSentinelGuard.dispose();
      indexer.dispose();
      stateManager.close();
    }
  });

  it('3. enforces zero fs reads on OneDrive paths during kalinar:query_second_brain_vault and achieves sub-millisecond reads from cortex_note_cache', async () => {
    const { StateManager, VaultShadowIndexer } = loadDaemonModules();
    const stateManager = new StateManager(dbPath);
    const indexer = new VaultShadowIndexer({
      vaultRoot: simulatedOneDriveVault,
      stateManager,
    });

    await indexer.indexVault();

    // Open Electron's KalinarSqliteStore in strict READONLY mode against the daemon WAL database
    const electronReadOnlyStore = new KalinarSqliteStore({
      dbPath,
      readOnly: true,
    });

    try {
      expect(electronReadOnlyStore.isReadOnly()).toBe(true);
      expect(isOneDriveVaultPath(simulatedOneDriveVault)).toBe(true);

      // Spy on fs.readFileSync and fs.readdirSync to guarantee zero calls against OneDrive path
      const readFileSpy = vi.spyOn(fs, 'readFileSync');
      const readdirSpy = vi.spyOn(fs, 'readdirSync');

      // Warm up prepared statement cache once
      handleQuerySecondBrainVault(
        { query: 'Shadow Cache' },
        {
          sqliteStore: electronReadOnlyStore,
          vaultRoot: simulatedOneDriveVault,
        }
      );

      readFileSpy.mockClear();
      readdirSpy.mockClear();

      // 1. Measure sub-millisecond read via handleQuerySecondBrainVault (used by electron/main.ts)
      const iterations = 25;
      const start = performance.now();
      let lastResult = handleQuerySecondBrainVault(undefined, {
        sqliteStore: electronReadOnlyStore,
        vaultRoot: simulatedOneDriveVault,
      });
      for (let i = 0; i < iterations - 1; i++) {
        lastResult = handleQuerySecondBrainVault(
          { domain: '02_PADROES_E_DECISOES', query: 'Single-Writer' },
          {
            sqliteStore: electronReadOnlyStore,
            vaultRoot: simulatedOneDriveVault,
          }
        );
      }
      const avgLatencyMs = (performance.now() - start) / iterations;

      expect(lastResult.success).toBe(true);
      expect(lastResult.notes.length).toBe(1);
      expect(lastResult.notes[0].title).toBe('ADR-005 Single-Writer Shadow Cache');
      expect(lastResult.notes[0].wikilinks).toEqual(['cortex_note_cache', 'kalinar-daemon']);
      expect(avgLatencyMs).toBeLessThan(1.0);

      // 2. Also verify LocalVaultAndMdConnector on OneDrive vault path performs zero fs reads
      const connector = new LocalVaultAndMdConnector(simulatedOneDriveVault, {
        shadowStore: electronReadOnlyStore,
      });
      const connectorRes = connector.querySecondBrainVault({ query: 'Master Router' });
      expect(connectorRes.success).toBe(true);
      expect(connectorRes.notes.length).toBe(1);
      expect(connectorRes.notes[0].title).toBe('00_INDEX - Master Router');

      // 3. Even if constructed without shadowStore, an OneDrive vaultRoot must never touch fs
      const unattachedOneDriveConnector = new LocalVaultAndMdConnector(simulatedOneDriveVault);
      const unattachedRes = unattachedOneDriveConnector.querySecondBrainVault(
        { query: 'Orchestrator' },
        electronReadOnlyStore
      );
      expect(unattachedRes.success).toBe(true);
      expect(unattachedRes.notes.length).toBe(1);

      // Assert zero fs.readFileSync or fs.readdirSync calls occurred
      expect(readFileSpy).not.toHaveBeenCalled();
      expect(readdirSpy).not.toHaveBeenCalled();

      // 4. Verify zero-trust path traversal is still blocked before SQLite lookup
      const traversalRes = handleQuerySecondBrainVault(
        { targetPath: '../../Windows/System32/drivers/etc/hosts' },
        {
          sqliteStore: electronReadOnlyStore,
          vaultRoot: simulatedOneDriveVault,
        }
      );
      expect(traversalRes.success).toBe(false);
      expect(traversalRes.error).toContain('[SECURITY_VIOLATION]');
    } finally {
      electronReadOnlyStore.close();
      indexer.dispose();
      stateManager.close();
    }
  });

  it('4. routes kalinar:inject_second_brain_note and kalinar:sync_obsidian_canvas writes through DaemonClient to kalinar-daemon', async () => {
    const { StateManager, VaultShadowIndexer, DaemonIpcServer } = loadDaemonModules();
    const stateManager = new StateManager(dbPath);
    const indexer = new VaultShadowIndexer({
      vaultRoot: simulatedOneDriveVault,
      stateManager,
    });
    const pipePath = `\\\\.\\pipe\\kalinar-m5-test-${process.pid}-${Date.now()}`;
    const ipcServer = new DaemonIpcServer({
      stateManager,
      pipePath,
      wsPort: 0,
      enableWebSocket: false,
      vaultIndexer: indexer,
      secondBrainPath: simulatedOneDriveVault,
    });

    await ipcServer.start();

    const daemonClient = new DaemonClient({
      pipePath,
      wsUrl: 'ws://127.0.0.1:1',
      autoReconnect: false,
    });
    await daemonClient.connect();

    const electronReadOnlyStore = new KalinarSqliteStore({
      dbPath,
      readOnly: true,
      daemonClient,
    });

    try {
      expect(daemonClient.isConnected()).toBe(true);

      // 1. Route kalinar:inject_second_brain_note through DaemonClient -> kalinar-daemon
      const injectResult = await handleInjectSecondBrainNote(
        {
          title: 'Milestone 5 Unified Shadow Note',
          domain: '02_PADROES_E_DECISOES',
          tags: ['#m5', '#shadow-cache'],
          content:
            'Shadow cache note linked to [[ADR-005-Single-Writer-Shadow-Cache]] and [[00_INDEX]] and [[IgnoredThirdLink]].',
          filePath: '02_PADROES_E_DECISOES/m5-unified-shadow-note.md',
        },
        {
          sqliteStore: electronReadOnlyStore,
          daemonClient,
          vaultRoot: simulatedOneDriveVault,
        }
      );

      expect(injectResult.success).toBe(true);
      expect(injectResult.persistedToDisk).toBe(true);
      expect(injectResult.persistedToSqlite).toBe(true);
      expect(injectResult.note?.wikilinks).toEqual([
        'ADR-005-Single-Writer-Shadow-Cache',
        '00_INDEX',
      ]);
      expect(injectResult.spawned3DNode?.position3D.length).toBe(3);

      // Verify Electron READONLY store immediately sees the injected note in cortex_note_cache
      const readFileSpy = vi.spyOn(fs, 'readFileSync');
      const queryAfterInject = handleQuerySecondBrainVault(
        { targetPath: '02_PADROES_E_DECISOES/m5-unified-shadow-note.md' },
        {
          sqliteStore: electronReadOnlyStore,
          vaultRoot: simulatedOneDriveVault,
        }
      );
      expect(readFileSpy).not.toHaveBeenCalled();
      expect(queryAfterInject.success).toBe(true);
      expect(queryAfterInject.notes.length).toBe(1);
      expect(queryAfterInject.notes[0].title).toBe('Milestone 5 Unified Shadow Note');

      // 2. Route kalinar:sync_obsidian_canvas through DaemonClient -> kalinar-daemon
      const canvasResult = await handleSyncObsidianCanvas(
        {
          direction: 'EXPORT_TO_CANVAS',
          canvasPath: 'KALINAR_GALAXY.canvas',
          topology: {
            agents: [
              {
                id: 'agent-orchestrator-01',
                filename: '@agent-orchestrator',
                pid: 14201,
                status: '[ACTIVE]',
                executionMode: 'AUTO_PILOT',
                currentObjective: 'Unified Release Verification',
                totalSteps: 5,
                currentStep: 5,
                stepDescription: 'Milestone 5 shadow cache verification',
                tokensPrompt: 2400,
                tokensCompletion: 600,
                tokenVelocity: 85,
                etaSeconds: 2,
                position3D: [25, 0, -40],
                livePreviewStream: '',
              },
            ],
            secondBrainNodes: [injectResult.spawned3DNode!],
            artifactSatellites: [],
            warRoomPointers: [],
          },
        },
        {
          sqliteStore: electronReadOnlyStore,
          daemonClient,
          vaultRoot: simulatedOneDriveVault,
        }
      );

      expect(canvasResult.success).toBe(true);
      expect(canvasResult.document?.nodes.length).toBe(2);

      // Verify canvas file written by kalinar-daemon and persisted in SQLite canvas_nodes
      const canvasOnDisk = path.join(simulatedOneDriveVault, 'KALINAR_GALAXY.canvas');
      expect(fs.existsSync(canvasOnDisk)).toBe(true);
      const canvasRows = electronReadOnlyStore.getCanvasNodes('KALINAR_GALAXY.canvas');
      expect(canvasRows.length).toBe(2);
    } finally {
      electronReadOnlyStore.close();
      daemonClient.disconnect();
      await ipcServer.stop();
      indexer.dispose();
      stateManager.close();
    }
  });

  it('5. verifies full end-to-end integration across all 5 Unification Milestones and Blueprint Watchdog Sync', async () => {
    // M1: @kalinar/contracts schemas, IPC channels, and 5 JDM graphs (< 0.45ms)
    expect(ELECTRON_IPC_CHANNELS).toContain('kalinar:query_second_brain_vault');
    expect(ELECTRON_IPC_CHANNELS).toContain('kalinar:inject_second_brain_note');
    expect(ELECTRON_IPC_CHANNELS).toContain('kalinar:sync_obsidian_canvas');
    expect(DAEMON_IPC_EVENTS).toContain('daemon:second_brain_inject');
    expect(DAEMON_IPC_EVENTS).toContain('daemon:cortex_reindex');

    for (const ruleFile of ALL_JDM_RULE_FILES) {
      expect(fs.existsSync(resolveJdmRulePath(ruleFile))).toBe(true);
    }

    const firewall = ZenFirewall.getInstance();
    const fwEval = await firewall.evaluateOsFirewall({
      command: 'npx vitest run',
      isSandbox: true,
      origin: 'ANTIGRAVITY_CLI_TAB',
    });
    expect(fwEval.result.allowed).toBe(true);
    expect(ProcessLeaseScopeSchema.parse(fwEval.result.leaseScope)).toBe('EPHEMERAL_UI_BOUND');

    // M2 + M3 + M4 + M5 integrated check
    const { StateManager, VaultShadowIndexer, DaemonIpcServer } = loadDaemonModules();
    const stateManager = new StateManager(dbPath);
    const indexer = new VaultShadowIndexer({
      vaultRoot: simulatedOneDriveVault,
      stateManager,
    });
    const ipcServer = new DaemonIpcServer({
      stateManager,
      pipePath: `\\\\.\\pipe\\kalinar-m5-e2e-${process.pid}-${Date.now()}`,
      wsPort: 0,
      enableWebSocket: false,
      vaultIndexer: indexer,
      secondBrainPath: simulatedOneDriveVault,
    });

    try {
      // M3: Process lease scopes (EPHEMERAL_UI_BOUND vs DETACHED_DAEMON_SERVICE)
      ipcServer.getLeaseManager().registerLease({
        pid: 41001,
        leaseScope: 'EPHEMERAL_UI_BOUND',
        uiClientId: 'ui-m5-client',
        command: 'vite',
      });
      ipcServer.getLeaseManager().registerLease({
        pid: 41002,
        leaseScope: 'DETACHED_DAEMON_SERVICE',
        uiClientId: null,
        command: 'swarm-worker',
      });
      const affectedLeases = ipcServer
        .getLeaseManager()
        .handleUiClientDisconnect('ui-m5-client');
      expect(affectedLeases.map((l) => l.pid)).toEqual([41001]);
      expect(affectedLeases[0].status).toBe('GRACE_PERIOD');
      expect(ipcServer.getLeaseManager().getLease(41002)?.status).toBe('ACTIVE');

      // M4: .sync-in-progress PID sentinel lock auto-cleans dead PID
      const sentinelPath = path.join(tempRoot, '.antigravity', '.sync-in-progress');
      fs.mkdirSync(path.dirname(sentinelPath), { recursive: true });
      const deadLock = SyncSentinelLockSchema.parse({
        pid: 99999999,
        timestamp: Date.now(),
        ttlMs: 30000,
        source: 'second-brain-cli.ps1',
      });
      fs.writeFileSync(sentinelPath, JSON.stringify(deadLock), 'utf-8');
      const sentinelEval = evaluateSyncSentinelLock(sentinelPath);
      expect(sentinelEval.status).toBe('RECOVERED_PID_DEAD');
      expect(sentinelEval.muted).toBe(false);
      expect(fs.existsSync(sentinelPath)).toBe(false);

      // M5: Index vault & query via READONLY Electron SQLite store
      const indexSummary = await indexer.indexVault();
      expect(indexSummary.indexed).toBe(3);
      const readOnlyStore = new KalinarSqliteStore({ dbPath, readOnly: true });
      const cachedNotes = readOnlyStore.querySecondBrainShadowCache();
      expect(cachedNotes.length).toBe(3);
      readOnlyStore.close();
    } finally {
      indexer.dispose();
      stateManager.close();
    }

    // Blueprint Watchdog Sync verification across all 5 canonical blueprint documents
    const blueprintDir = path.resolve(process.cwd(), '.antigravity', 'blueprint');
    const requiredBlueprintFiles = [
      '02_TRD.md',
      '03_APP_FLOW.md',
      '05_BACKEND_SCHEMA.md',
      '06_IMPLEMENTATION_PLAN.md',
      'TRACEABILITY_AND_GAP_REPORT.md',
    ];
    const emojiRegex =
      /[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    for (const file of requiredBlueprintFiles) {
      const fullPath = path.join(blueprintDir, file);
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, 'utf-8');
      expect(content).toContain('cortex_note_cache');
      expect(emojiRegex.test(content), `Zero-emoji violation in ${file}`).toBe(false);
    }
  });
});
