import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ZenFirewall } from '../src/core/ZenFirewall.js';
import { KalinarSqliteStore } from '../electron/db/sqliteStore.js';
import { KalinarEventBus } from '../src/core/KalinarEventBus.js';
import path from 'node:path';
import fs from 'node:fs';

describe('CYCLE 1 SELF-AUDIT: ZEN FIREWALL & SQLITE WAL STORE', () => {
  let store: KalinarSqliteStore;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = path.resolve(process.cwd(), `test-state-${Date.now()}.db`);
    store = new KalinarSqliteStore(testDbPath);
  });

  afterEach(() => {
    try {
      store.close();
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
      if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
    } catch {
      // Cleanup best effort
    }
  });

  it('verifies < 1ms evaluation of Event Router JDM rules', async () => {
    const firewall = ZenFirewall.getInstance();
    await firewall.initialize();

    // Test loop suppression on .kalinar-lock
    const lockEval = await firewall.evaluateEventRouter({
      eventType: 'FILE_CHANGE',
      filePath: 'c:/Kalinar/.kalinar-lock',
      auditCycle: 0,
    });
    expect(lockEval.latencyMs).toBeLessThan(1.0);
    expect(lockEval.result.action).toBe('DROP_LOOP_SUPPRESSED');
    expect(lockEval.result.auditAllowed).toBe(false);

    // Test audit cycle cap at cycle 3 (> 2)
    const capEval = await firewall.evaluateEventRouter({
      eventType: 'FILE_CHANGE',
      filePath: 'c:/Kalinar/src/App.tsx',
      auditCycle: 3,
    });
    expect(capEval.latencyMs).toBeLessThan(1.0);
    expect(capEval.result.action).toBe('HALT_AUDIT_CYCLE_CAP');
    expect(capEval.result.auditAllowed).toBe(false);

    // Test visual only watch for canvas
    const canvasEval = await firewall.evaluateEventRouter({
      eventType: 'FILE_CHANGE',
      filePath: 'c:/Kalinar/KALINAR_GALAXY.canvas',
      auditCycle: 1,
    });
    expect(canvasEval.latencyMs).toBeLessThan(1.0);
    expect(canvasEval.result.action).toBe('WATCH_VISUAL_ONLY');
    expect(canvasEval.result.auditAllowed).toBe(true);
  });

  it('verifies OS Execution Firewall blocks destructive commands in < 1ms', async () => {
    const firewall = ZenFirewall.getInstance();

    const destructiveCmds = [
      'rm -rf /',
      'rm -rf *',
      'del /f /s /q C:\\Windows',
      'format c: /fs:NTFS',
      'DROP DATABASE kalinar_prod',
      'kill -9 1',
    ];

    for (const cmd of destructiveCmds) {
      const evaluation = await firewall.evaluateOsFirewall({ command: cmd, isSandbox: false });
      expect(evaluation.latencyMs).toBeLessThan(1.0);
      expect(evaluation.result.allowed).toBe(false);
      expect(['HIGH', 'CRITICAL']).toContain(evaluation.result.riskLevel);
    }

    // Safe command pass
    const safeEval = await firewall.evaluateOsFirewall({ command: 'tsc --noEmit', isSandbox: false });
    expect(safeEval.latencyMs).toBeLessThan(1.0);
    expect(safeEval.result.allowed).toBe(true);
    expect(safeEval.result.riskLevel).toBe('LOW');
  });

  it('verifies SQLite WAL initialization and append-only triggers on telemetry_logs', () => {
    // 1. Insert task
    store.insertTask({
      id: 'TASK-TEST-001',
      project_path: 'c:/Kalinar',
      title: 'Teste de Invariantes SQLite',
      status: 'RUNNING',
      current_agent: 'agent-orchestrator',
    });

    const active = store.getActiveTasks();
    expect(active.length).toBeGreaterThan(0);
    expect(active[0].id).toBe('TASK-TEST-001');

    // 2. Insert telemetry log
    store.insertTelemetry({
      task_id: 'TASK-TEST-001',
      event_type: 'TURN_START',
      agent_name: 'agent-orchestrator',
      payload: JSON.stringify({ step: 1 }),
      latency_ms: 12,
    });

    const logs = store.getTelemetryLogs('TASK-TEST-001');
    expect(logs.length).toBe(1);
    expect(logs[0].event_type).toBe('TURN_START');

    // 3. Verify append-only trigger prevents UPDATE
    expect(() => {
      (store as any).db.exec("UPDATE telemetry_logs SET event_type = 'MODIFIED' WHERE task_id = 'TASK-TEST-001'");
    }).toThrow(/Updates forbidden on append-only telemetry_logs/);

    // 4. Verify append-only trigger prevents DELETE
    expect(() => {
      (store as any).db.exec("DELETE FROM telemetry_logs WHERE task_id = 'TASK-TEST-001'");
    }).toThrow(/Deletions forbidden on append-only telemetry_logs/);
  });

  it('verifies event bus pub/sub and telemetry history', () => {
    const bus = KalinarEventBus.getInstance();
    let received = false;

    const unsubscribe = bus.on('singularity:state_changed', (state) => {
      if (state.voiceState === '[SPEAKING]') {
        received = true;
      }
    });

    bus.emit('singularity:state_changed', {
      schemaVersion: 1,
      voiceState: '[SPEAKING]',
      liveTranscript: 'Comando executado.',
      accretionTurbulence: 0.2,
      activeDirective: 'EXECUCAO_ATIVA',
      zenLatencyMs: 0.4,
      activeAgentCount: 1,
    });

    expect(received).toBe(true);
    unsubscribe();
  });
});
