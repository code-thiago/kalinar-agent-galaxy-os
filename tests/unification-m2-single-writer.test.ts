/**
 * UNIFICATION MILESTONE 2 TDD SUITE (v1.6.0-alpha)
 * Verifies:
 * 1. Electron strict { readOnly: true } SQLite enforcement (SQLITE_READONLY) & offline snapshot fallback
 * 2. 60 FPS historical telemetry read budget (< 16.67ms/frame) on live WAL DB
 * 3. Mocked & live Named Pipe / WebSocket IPC bridge dispatch in < 0.2ms
 * 4. Transactional daemon writes + read-back verification + server-push forwarding + auto-reconnect
 * Strictly Zero Emojis
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  DAEMON_IPC_EVENTS,
  DAEMON_IPC_TRANSPORT,
  type DaemonIpcEnvelope,
  type ServerPushAlertPayload,
} from '../src/types/kalinar.js';
import { KalinarEventBus } from '../src/core/KalinarEventBus.js';
import {
  DaemonClient,
  type DaemonClientTransportAdapter,
} from '../electron/daemon/DaemonClient.js';
import {
  CANONICAL_DAEMON_DB_PATH,
  KalinarSqliteStore,
} from '../electron/db/sqliteStore.js';

interface DaemonStateManagerLike {
  getDb(): { prepare(sql: string): { get(...args: unknown[]): unknown; all(...args: unknown[]): unknown[] } };
  getDbPath(): string;
  isReadOnly(): boolean;
  insertTelemetryTransaction(record: {
    task_id: string;
    event_type: string;
    agent_name: string;
    payload: string;
    latency_ms: number;
  }): { id: number; created_at: string };
  close(): void;
}

interface DaemonIpcServerLike {
  start(): Promise<void>;
  stop(): Promise<void>;
  getEndpoints(): {
    pipePath: string | null;
    wsUrl: string | null;
    wsPort: number | null;
    connectedClients: number;
  };
  broadcastServerPush(
    payload: Record<string, unknown>,
    taskId?: string,
    event?: string
  ): number;
}

const nodeRequire = createRequire(import.meta.url);
const DAEMON_STATE_DIST_PATH = 'C:/Dev/kalinar-daemon/dist/state.js';
const DAEMON_IPC_DIST_PATH = 'C:/Dev/kalinar-daemon/dist/ipc-server.js';

async function loadDaemonModules(): Promise<{
  StateManager: new (dbPath?: string) => DaemonStateManagerLike;
  DaemonIpcServer: new (opts: {
    stateManager: DaemonStateManagerLike;
    pipePath?: string;
    wsHost?: string;
    wsPort?: number;
    enablePipe?: boolean;
    enableWebSocket?: boolean;
  }) => DaemonIpcServerLike;
}> {
  const stateMod = nodeRequire(DAEMON_STATE_DIST_PATH) as {
    StateManager: new (dbPath?: string) => DaemonStateManagerLike;
  };
  const ipcMod = nodeRequire(DAEMON_IPC_DIST_PATH) as {
    DaemonIpcServer: new (opts: {
      stateManager: DaemonStateManagerLike;
      pipePath?: string;
      wsHost?: string;
      wsPort?: number;
      enablePipe?: boolean;
      enableWebSocket?: boolean;
    }) => DaemonIpcServerLike;
  };
  return {
    StateManager: stateMod.StateManager,
    DaemonIpcServer: ipcMod.DaemonIpcServer,
  };
}

function waitForCondition(predicate: () => boolean, timeoutMs = 3000, stepMs = 15): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        reject(new Error(`Timed out after ${timeoutMs}ms waiting for condition`));
        return;
      }
      setTimeout(check, stepMs);
    };
    check();
  });
}

describe('Unification M2: Daemon Single-Writer & Electron ReadOnly Bridge', () => {
  let tempDir: string;
  let daemonDbPath: string;
  let snapshotDbPath: string;
  let pipePath: string;
  let stateManager: DaemonStateManagerLike | null = null;
  let ipcServer: DaemonIpcServerLike | null = null;
  let electronStore: KalinarSqliteStore | null = null;
  let daemonClient: DaemonClient | null = null;

  beforeEach(() => {
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kalinar-m2-'));
    daemonDbPath = path.join(tempDir, 'daemon-kalinar.db');
    snapshotDbPath = path.join(tempDir, 'electron-readonly-snapshot.db');
    pipePath = `\\\\.\\pipe\\kalinar-daemon-m2-${uid}`;
  });

  afterEach(async () => {
    if (daemonClient) {
      daemonClient.disconnect();
      daemonClient = null;
    }
    if (electronStore) {
      try {
        electronStore.close();
      } catch {
        // Ignore
      }
      electronStore = null;
    }
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
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore Windows temp file lock
    }
  });

  it('1. Enforces strict { readOnly: true } on Electron SQLite store (SQLITE_READONLY) and falls back cleanly when canonical DB is offline', async () => {
    expect(CANONICAL_DAEMON_DB_PATH).toBe('C:\\Dev\\kalinar-daemon\\data\\kalinar.db');
    const { StateManager } = await loadDaemonModules();

    stateManager = new StateManager(daemonDbPath);
    expect(stateManager.isReadOnly()).toBe(false);
    const pragma = stateManager.getDb().prepare('PRAGMA journal_mode').get() as { journal_mode: string };
    expect(pragma.journal_mode).toBe('wal');

    stateManager.insertTelemetryTransaction({
      task_id: 'SYSTEM',
      event_type: 'TURN_START',
      agent_name: 'agent-orchestrator',
      payload: JSON.stringify({ boot: true }),
      latency_ms: 1,
    });

    daemonClient = new DaemonClient({ autoReconnect: false });
    electronStore = new KalinarSqliteStore({
      dbPath: daemonDbPath,
      fallbackSnapshotPath: snapshotDbPath,
      readOnly: true,
      daemonClient,
    });

    expect(electronStore.isReadOnly()).toBe(true);
    expect(electronStore.isUsingFallbackSnapshot()).toBe(false);
    expect(electronStore.getHistoricalTelemetry(10)).toHaveLength(1);

    // Direct SQLite INSERT on Electron handle MUST fail with SQLITE_READONLY
    let caughtError: (Error & { code?: string; errcode?: number }) | null = null;
    try {
      electronStore
        .getDatabase()
        .prepare(
          'INSERT INTO telemetry_logs (taskId, task_id, event, event_type, agent, agent_name, payload, latency_ms, createdAt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          'SYSTEM',
          'SYSTEM',
          'TURN_START',
          'TURN_START',
          'operator',
          'operator',
          '{}',
          1,
          new Date().toISOString(),
          new Date().toISOString()
        );
    } catch (err) {
      caughtError = err as Error & { code?: string; errcode?: number };
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.errcode === 8 || /readonly/i.test(caughtError?.message || '')).toBe(true);
    electronStore.close();
    electronStore = null;

    // Fallback check when primary path is missing (and canonical path check using isolated non-existent path)
    const missingPrimary = path.join(tempDir, 'non-existent-primary.db');
    const fallbackStore = new KalinarSqliteStore({
      dbPath: missingPrimary,
      fallbackSnapshotPath: snapshotDbPath,
      readOnly: true,
      daemonClient,
    });
    expect(fallbackStore.isReadOnly()).toBe(true);
    expect(fallbackStore.isUsingFallbackSnapshot()).toBe(true);
    expect(fallbackStore.getDbPath()).toBe(snapshotDbPath);

    expect(() => {
      fallbackStore
        .getDatabase()
        .prepare(
          'INSERT INTO telemetry_logs (task_id, event_type, agent_name, payload, latency_ms) VALUES (?, ?, ?, ?, ?)'
        )
        .run('SYSTEM', 'TURN_START', 'operator', '{}', 1);
    }).toThrow(/readonly/i);

    fallbackStore.close();
  });

  it('2. Reads historical telemetry in 60 FPS budget (< 16.67ms/frame) over WAL readOnly connection', async () => {
    const { StateManager } = await loadDaemonModules();
    stateManager = new StateManager(daemonDbPath);

    for (let i = 0; i < 500; i++) {
      stateManager.insertTelemetryTransaction({
        task_id: 'CLI_EXEC',
        event_type: i % 2 === 0 ? 'TURN_START' : 'TURN_END',
        agent_name: i % 2 === 0 ? 'agent-orchestrator' : 'agent-software-engineer',
        payload: JSON.stringify({ seq: i }),
        latency_ms: (i % 5) + 1,
      });
    }

    electronStore = new KalinarSqliteStore({
      dbPath: daemonDbPath,
      readOnly: true,
      daemonClient: new DaemonClient({ autoReconnect: false }),
    });

    // Warm up query plan cache
    electronStore.getHistoricalTelemetry(100);
    electronStore.getEvolutionSummary();

    const frameTimes: number[] = [];
    let latestRowsCount = 0;
    let totalEventsCount = 0;

    for (let frame = 0; frame < 60; frame++) {
      const start = performance.now();
      const rows = electronStore.getHistoricalTelemetry(100);
      const summary = electronStore.getEvolutionSummary();
      const elapsed = performance.now() - start;

      frameTimes.push(elapsed);
      latestRowsCount = rows.length;
      totalEventsCount = summary.totalEvents;
    }

    const maxFrameMs = Math.max(...frameTimes);
    const avgFrameMs = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;

    expect(latestRowsCount).toBe(100);
    expect(totalEventsCount).toBe(500);
    expect(maxFrameMs).toBeLessThan(16.67);
    expect(avgFrameMs).toBeLessThan(2.0);
  });

  it('3. Mocked IPC bridge dispatches all 5 sqliteStore mutations in < 0.2ms without local DB writes', async () => {
    const { StateManager } = await loadDaemonModules();
    stateManager = new StateManager(daemonDbPath);

    const capturedEnvelopes: Array<DaemonIpcEnvelope & { id: string }> = [];
    const mockAdapter: DaemonClientTransportAdapter = {
      transport: DAEMON_IPC_TRANSPORT.NAMED_PIPE,
      send: (envelope) => {
        capturedEnvelopes.push(envelope);
        return {
          type: 'RESPONSE',
          id: envelope.id,
          ok: true,
          validationLatencyMs: 0.01,
          writeLatencyMs: 0.02,
        };
      },
    };

    daemonClient = new DaemonClient({
      autoReconnect: false,
      mockTransport: mockAdapter,
    });
    await daemonClient.connect();

    electronStore = new KalinarSqliteStore({
      dbPath: daemonDbPath,
      readOnly: true,
      daemonClient,
    });

    // Warmup JIT
    for (let i = 0; i < 20; i++) {
      electronStore.insertTelemetry({
        task_id: 'CLI_EXEC',
        event_type: 'TURN_START',
        agent_name: 'agent-software-engineer',
        payload: JSON.stringify({ warmup: i }),
        latency_ms: 1,
      });
    }
    capturedEnvelopes.length = 0;

    const dispatchLatencies: number[] = [];
    const ITERATIONS = 200;

    for (let i = 0; i < ITERATIONS; i++) {
      electronStore.insertTelemetry({
        task_id: 'CLI_EXEC',
        event_type: 'TURN_END',
        agent_name: 'agent-software-engineer',
        payload: JSON.stringify({ i }),
        latency_ms: 1,
      });
      dispatchLatencies.push(electronStore.getLastDispatchResult()!.dispatchLatencyMs);

      electronStore.enqueueAgentFifo({
        id: `fifo-mock-${i}`,
        targetAgentId: 'agent-qa',
        instruction: 'Mock FIFO item',
        modelId: 'argon',
      });
      dispatchLatencies.push(electronStore.getLastDispatchResult()!.dispatchLatencyMs);

      electronStore.recordModelCheckpoint({
        id: `chk-mock-${i}`,
        agentId: 'agent-software-engineer',
        taskId: 'TASK-MOCK',
        gitCommitOrStashHash: 'abc1234',
        activeModelId: 'argon',
        fallbackModelId: 'claude-3.7-sonnet',
        retryCount: 0,
        status: 'CHECKPOINTED',
      });
      dispatchLatencies.push(electronStore.getLastDispatchResult()!.dispatchLatencyMs);

      electronStore.upsertCanvasNode({
        id: `node-mock-${i}`,
        task_id: 'TASK-MOCK',
        x: i,
        y: i * 2,
        width: 320,
        height: 160,
        color_token: '5',
        canvas_file: 'KALINAR_GALAXY.canvas',
      });
      dispatchLatencies.push(electronStore.getLastDispatchResult()!.dispatchLatencyMs);

      electronStore.upsertSecondBrainNote({
        id: `sb-mock-${i}`,
        title: `Mock Note ${i}`,
        file_path: `01_PROJETOS/mock-${i}.md`,
        wikilink: `[[Mock-${i}]]`,
        domain: '01_PROJETOS',
        tags: '["#mock"]',
        frontmatter_json: '{}',
        wikilinks_json: '[]',
        excerpt: 'Mock excerpt',
        content: '# Mock',
      });
      dispatchLatencies.push(electronStore.getLastDispatchResult()!.dispatchLatencyMs);
    }

    const avgLatencyMs =
      dispatchLatencies.reduce((sum, val) => sum + val, 0) / dispatchLatencies.length;
    expect(avgLatencyMs).toBeLessThan(0.2);
    expect(capturedEnvelopes).toHaveLength(ITERATIONS * 5);

    for (const env of capturedEnvelopes) {
      expect(DAEMON_IPC_EVENTS).toContain(env.event);
    }

    // Confirm zero direct SQLite writes touched the DB
    expect(electronStore.getHistoricalTelemetry(10)).toHaveLength(0);
    expect(electronStore.getAgentFifoQueue()).toHaveLength(0);
  });

  it('4. Live Windows Named Pipe loop: dispatches mutations < 0.2ms, validates @kalinar/contracts, reads back WAL rows, and forwards server-push alerts', async () => {
    const { StateManager, DaemonIpcServer } = await loadDaemonModules();
    stateManager = new StateManager(daemonDbPath);
    ipcServer = new DaemonIpcServer({
      stateManager,
      pipePath,
      wsHost: '127.0.0.1',
      wsPort: 0,
    });
    await ipcServer.start();

    const bus = KalinarEventBus.getInstance();
    const busAlerts: ServerPushAlertPayload[] = [];
    const unsub = bus.on('daemon:server_push_alert', (alert) => {
      busAlerts.push(alert);
    });

    try {
      daemonClient = new DaemonClient({
        pipePath,
        wsUrl: ipcServer.getEndpoints().wsUrl!,
        autoReconnect: false,
        eventBus: bus,
      });

      const connectedTransport = await daemonClient.connect();
      expect(connectedTransport).toBe(DAEMON_IPC_TRANSPORT.NAMED_PIPE);
      expect(daemonClient.getActiveTransport()).toBe(DAEMON_IPC_TRANSPORT.NAMED_PIPE);

      electronStore = new KalinarSqliteStore({
        dbPath: daemonDbPath,
        readOnly: true,
        daemonClient,
      });

      // Warmup Named Pipe dispatch path and all sqliteStore serializers
      for (let i = 0; i < 10; i++) {
        const warm = daemonClient.dispatchMutation('daemon:heartbeat', { seq: i });
        expect(warm.dispatched).toBe(true);
        await warm.ackPromise;
      }
      electronStore.enqueueAgentFifo({
        id: 'fifo-warm-pipe',
        targetAgentId: 'agent-warmup',
        instruction: 'Warmup JIT path',
        modelId: 'argon',
      });
      await electronStore.getLastDispatchResult()!.ackPromise;
      electronStore.clearAgentFifoQueue('agent-warmup');
      await electronStore.getLastDispatchResult()!.ackPromise;

      // 1. Telemetry mutation
      electronStore.insertTelemetry({
        task_id: 'CLI_EXEC',
        event_type: 'TURN_END',
        agent_name: 'agent-software-engineer',
        payload: JSON.stringify({ livePipe: true }),
        latency_ms: 2,
      });
      const telDispatch = electronStore.getLastDispatchResult()!;
      expect(telDispatch.dispatched).toBe(true);
      expect(telDispatch.dispatchLatencyMs).toBeLessThan(0.2);
      const telAck = await telDispatch.ackPromise;
      expect(telAck.ok).toBe(true);
      expect(telAck.validationLatencyMs).toBeLessThan(0.2);

      // 2. FIFO enqueue mutation
      electronStore.enqueueAgentFifo({
        id: 'fifo-live-pipe-1',
        targetAgentId: 'agent-orchestrator',
        instruction: 'Execute live WAL pipe check',
        modelId: 'argon',
      });
      const fifoDispatch = electronStore.getLastDispatchResult()!;
      expect(fifoDispatch.dispatchLatencyMs).toBeLessThan(0.2);
      const fifoAck = await fifoDispatch.ackPromise;
      expect(fifoAck.ok).toBe(true);
      expect(fifoAck.validationLatencyMs).toBeLessThan(0.2);

      // 3. Model Checkpoint mutation
      electronStore.recordModelCheckpoint({
        id: 'chk-live-pipe-1',
        agentId: 'agent-software-engineer',
        taskId: 'TASK-PIPE-1',
        gitCommitOrStashHash: 'cafebabe',
        activeModelId: 'argon',
        fallbackModelId: 'claude-3.7-sonnet',
        retryCount: 0,
        status: 'CHECKPOINTED',
      });
      const chkDispatch = electronStore.getLastDispatchResult()!;
      expect(chkDispatch.dispatchLatencyMs).toBeLessThan(0.2);
      const chkAck = await chkDispatch.ackPromise;
      expect(chkAck.ok).toBe(true);

      // 4. Canvas Node mutation
      electronStore.upsertCanvasNode({
        id: 'canvas-live-pipe-1',
        task_id: 'TASK-PIPE-1',
        x: 120,
        y: 240,
        width: 360,
        height: 200,
        color_token: '5',
        canvas_file: 'KALINAR_GALAXY.canvas',
      });
      const canvasDispatch = electronStore.getLastDispatchResult()!;
      expect(canvasDispatch.dispatchLatencyMs).toBeLessThan(0.2);
      const canvasAck = await canvasDispatch.ackPromise;
      expect(canvasAck.ok).toBe(true);

      // 5. Second Brain Note mutation
      electronStore.upsertSecondBrainNote({
        id: 'sb-live-pipe-1',
        title: 'Live Pipe Note',
        file_path: '01_PROJETOS/live-pipe.md',
        wikilink: '[[Live-Pipe]]',
        domain: '01_PROJETOS',
        tags: JSON.stringify(['#pipe', '#wal']),
        frontmatter_json: JSON.stringify({ title: 'Live Pipe Note' }),
        wikilinks_json: JSON.stringify(['[[00_INDEX]]']),
        excerpt: 'Written via Daemon Named Pipe single-writer.',
        content: '# Live Pipe Note',
      });
      const sbDispatch = electronStore.getLastDispatchResult()!;
      expect(sbDispatch.dispatchLatencyMs).toBeLessThan(0.2);
      const sbAck = await sbDispatch.ackPromise;
      expect(sbAck.ok).toBe(true);

      // 6. Task & Task Step transactional write via IPC
      const taskUpsertAck = await daemonClient.sendMutation(
        'daemon:task_created',
        {
          op: 'task:upsert',
          task: {
            id: 'TASK-PIPE-1',
            project_path: 'C:/Kalinar',
            title: 'Live Pipe Task',
            status: 'RUNNING',
            current_agent: 'agent-software-engineer',
          },
        },
        'TASK-PIPE-1'
      );
      expect(taskUpsertAck.ok).toBe(true);

      const stepAck = await daemonClient.sendMutation(
        'daemon:task_updated',
        {
          op: 'task:record_step',
          step: {
            task_id: 'TASK-PIPE-1',
            agent_name: 'agent-software-engineer',
            turn_number: 1,
            status: 'COMPLETED',
            summary: 'Live pipe step verified',
          },
        },
        'TASK-PIPE-1'
      );
      expect(stepAck.ok).toBe(true);

      // Verify Electron readOnly handle immediately reads every committed WAL row
      const telemetryRows = electronStore.getHistoricalTelemetry(10);
      expect(telemetryRows.some((r) => r.payload.includes('livePipe'))).toBe(true);
      expect(electronStore.getAgentFifoQueue('agent-orchestrator')).toHaveLength(1);
      expect(electronStore.getModelCheckpoint('chk-live-pipe-1')?.gitCommitOrStashHash).toBe('cafebabe');
      expect(electronStore.getCanvasNodes('KALINAR_GALAXY.canvas')).toHaveLength(1);
      expect(electronStore.getSecondBrainNoteById('sb-live-pipe-1')?.title).toBe('Live Pipe Note');

      // Benchmark 50 consecutive live Named Pipe telemetry mutations (< 0.2ms avg dispatch)
      const liveLatencies: number[] = [];
      const acks: Array<Promise<unknown>> = [];
      for (let i = 0; i < 50; i++) {
        electronStore.insertTelemetry({
          task_id: 'CLI_EXEC',
          event_type: 'TURN_END',
          agent_name: 'agent-qa',
          payload: JSON.stringify({ bench: i }),
          latency_ms: 1,
        });
        const res = electronStore.getLastDispatchResult()!;
        liveLatencies.push(res.dispatchLatencyMs);
        acks.push(res.ackPromise);
      }
      await Promise.all(acks);
      const liveAvgMs = liveLatencies.reduce((a, b) => a + b, 0) / liveLatencies.length;
      expect(liveAvgMs).toBeLessThan(0.2);

      // Verify server-push alert forwarding over Named Pipe into KalinarEventBus
      const sent = ipcServer.broadcastServerPush(
        {
          type: 'STEP_COMPLETED',
          taskId: 'TASK-PIPE-1',
          targetAgentId: '@agent-software-engineer',
          exitCode: 0,
          sqliteVerified: true,
          agentStatus: '[VERIFIED]',
        },
        'TASK-PIPE-1',
        'daemon:server_push_alert'
      );
      expect(sent).toBeGreaterThanOrEqual(1);

      await waitForCondition(() => busAlerts.some((a) => a.taskId === 'TASK-PIPE-1'));
      const forwarded = busAlerts.find((a) => a.taskId === 'TASK-PIPE-1');
      expect(forwarded?.type).toBe('STEP_COMPLETED');
      expect(forwarded?.sqliteVerified).toBe(true);
    } finally {
      unsub();
    }
  });

  it('5. Falls back to Local WebSocket (127.0.0.1), dispatches in < 0.2ms, forwards server-push alerts, and auto-reconnects after daemon restart', async () => {
    const { StateManager, DaemonIpcServer } = await loadDaemonModules();
    stateManager = new StateManager(daemonDbPath);
    ipcServer = new DaemonIpcServer({
      stateManager,
      enablePipe: false,
      wsHost: '127.0.0.1',
      wsPort: 0,
    });
    await ipcServer.start();
    const wsPort = ipcServer.getEndpoints().wsPort!;
    const wsUrl = ipcServer.getEndpoints().wsUrl!;

    const bus = KalinarEventBus.getInstance();
    const receivedAlerts: ServerPushAlertPayload[] = [];
    const unsub = bus.on('daemon:server_push_alert', (alert) => {
      receivedAlerts.push(alert);
    });

    try {
      daemonClient = new DaemonClient({
        pipePath: '\\\\.\\pipe\\non-existent-pipe-m2-test',
        wsUrl,
        autoReconnect: true,
        reconnectIntervalMs: 60,
        maxReconnectIntervalMs: 120,
        eventBus: bus,
      });

      const transport = await daemonClient.connect();
      expect(transport).toBe(DAEMON_IPC_TRANSPORT.WS_URL);
      expect(daemonClient.getActiveTransport()).toBe(DAEMON_IPC_TRANSPORT.WS_URL);

      electronStore = new KalinarSqliteStore({
        dbPath: daemonDbPath,
        readOnly: true,
        daemonClient,
      });

      // Warmup WS path
      for (let i = 0; i < 10; i++) {
        const w = daemonClient.dispatchMutation('daemon:heartbeat', { seq: i });
        await w.ackPromise;
      }

      // Write over WS fallback and assert < 0.2ms dispatch
      const wsLatencies: number[] = [];
      const wsAcks: Array<Promise<unknown>> = [];
      for (let i = 0; i < 30; i++) {
        electronStore.insertTelemetry({
          task_id: 'CLI_EXEC',
          event_type: 'TURN_START',
          agent_name: 'agent-data',
          payload: JSON.stringify({ wsSeq: i }),
          latency_ms: 1,
        });
        const d = electronStore.getLastDispatchResult()!;
        expect(d.transport).toBe(DAEMON_IPC_TRANSPORT.WS_URL);
        wsLatencies.push(d.dispatchLatencyMs);
        wsAcks.push(d.ackPromise);
      }
      await Promise.all(wsAcks);
      const wsAvgMs = wsLatencies.reduce((a, b) => a + b, 0) / wsLatencies.length;
      expect(wsAvgMs).toBeLessThan(0.2);

      expect(electronStore.getHistoricalTelemetry(50).some((r) => r.payload.includes('wsSeq'))).toBe(
        true
      );

      // Server push over WebSocket
      ipcServer.broadcastServerPush(
        {
          type: 'AGENT_HALTED',
          taskId: 'TASK-WS-PUSH',
          targetAgentId: '@agent-cybersecurity',
          exitCode: 1,
          sqliteVerified: true,
          agentStatus: '[HALTED]',
        },
        'TASK-WS-PUSH',
        'daemon:server_push_alert'
      );
      await waitForCondition(() => receivedAlerts.some((a) => a.taskId === 'TASK-WS-PUSH'));

      // Automatic reconnect test: stop WS server, wait for disconnect, restart on same port, verify auto-reconnect
      let sawDisconnect = false;
      let sawReconnect = false;
      daemonClient.onDisconnect(() => {
        sawDisconnect = true;
      });
      daemonClient.onReconnect(() => {
        sawReconnect = true;
      });

      await ipcServer.stop();
      await waitForCondition(() => sawDisconnect && !daemonClient!.isConnected());

      ipcServer = new DaemonIpcServer({
        stateManager,
        enablePipe: false,
        wsHost: '127.0.0.1',
        wsPort,
      });
      await ipcServer.start();

      await waitForCondition(() => sawReconnect && daemonClient!.isConnected(), 4000, 20);
      const afterReconnectAck = await daemonClient.sendMutation('daemon:heartbeat', {
        reconnected: true,
      });
      expect(afterReconnectAck.ok).toBe(true);
    } finally {
      unsub();
    }
  });
});
