/**
 * UX OVERHAUL STEP 2 TDD SUITE (v2.2.0-step2)
 * Purges synthetic telemetry, enforces ground-truth standby, verifies real 05_AGENTS/@agent-*.md
 * discovery as [IDLE] and exact cortex_note_cache count parity via SQLite READONLY queries.
 * Strictly Zero Emojis
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { KalinarSqliteStore } from '../electron/db/sqliteStore.js';
import { KalinarDaemon } from '../electron/daemon/KalinarDaemon.js';
import { handleQuerySecondBrainVault } from '../electron/daemon/VaultIpcRouter.js';
import { useKalinarStore } from '../src/store/useKalinarStore.js';

describe('UX Step 2: Purge Synthetic Telemetry & Enforce Ground-Truth Standby (v2.2.0-step2)', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kalinar-ux-step2-'));
    useKalinarStore.getState().resetToStandby();
  });

  afterEach(() => {
    vi.useRealTimers();
    useKalinarStore.getState().resetToStandby();
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch {
      // Ignore Windows file cleanup delay
    }
  });

  it('1. initializes Zustand store in clean STANDBY_READY with zero fake agents, tokens, beams, or logs', () => {
    const state = useKalinarStore.getState();

    expect(state.systemState).toBe('STANDBY_READY');
    expect(state.activeAgentsCount).toBe(0);
    expect(state.sessionTokens).toBe(0);
    expect(state.cortexNoteCount).toBe(0);
    expect(state.agents).toEqual([]);
    expect(state.secondBrainNotes).toEqual([]);
    expect(state.synapticBeams).toEqual([]);
    expect(state.commandLogs).toEqual([]);
    expect(state.fifoQueueItems).toEqual([]);
    expect(state.singularity.activeAgentCount).toBe(0);
    expect(state.singularity.activeDirective).toBe('STANDBY_READY');
    expect(state.singularity.zenLatencyMs).toBe(0);
  });

  it('2. produces zero fake token ticks when idle over 60 seconds of elapsed timer advancement', async () => {
    vi.useFakeTimers();

    const dbPath = path.join(tempRoot, 'idle-test.db');
    const writeStore = new KalinarSqliteStore(dbPath);
    writeStore.close();

    const agentsDir = path.join(tempRoot, '05_AGENTS');
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, '@agent-orchestrator.md'), '# Orchestrator', 'utf-8');
    fs.writeFileSync(path.join(agentsDir, '@agent-qa.md'), '# QA', 'utf-8');

    const readOnlyStore = new KalinarSqliteStore({ dbPath, readOnly: true });
    const daemon = new KalinarDaemon({ workspacePath: tempRoot }, readOnlyStore);

    try {
      await useKalinarStore.getState().hydrateFromGroundTruth({
        scanWorkspaceNodes: async () => daemon.scanWorkspaceNodes(),
        querySecondBrainVault: async (params) =>
          handleQuerySecondBrainVault(params, {
            sqliteStore: readOnlyStore,
            vaultRoot: tempRoot,
          }),
        getHistoricalTelemetry: async (limit) => readOnlyStore.getHistoricalTelemetry(limit),
        manageFifoQueue: async () => ({ items: readOnlyStore.getAgentFifoQueue() }),
      });

      const beforeAdvance = useKalinarStore.getState();
      expect(beforeAdvance.systemState).toBe('STANDBY_READY');
      expect(beforeAdvance.activeAgentsCount).toBe(0);
      expect(beforeAdvance.sessionTokens).toBe(0);
      expect(beforeAdvance.agents).toHaveLength(2);
      expect(beforeAdvance.agents.every((a) => a.status === '[IDLE]')).toBe(true);
      expect(beforeAdvance.agents.every((a) => a.tokensPrompt === 0 && a.tokensCompletion === 0)).toBe(
        true
      );

      vi.advanceTimersByTime(60_000);

      const afterAdvance = useKalinarStore.getState();
      expect(afterAdvance.systemState).toBe('STANDBY_READY');
      expect(afterAdvance.activeAgentsCount).toBe(0);
      expect(afterAdvance.sessionTokens).toBe(0);
      expect(afterAdvance.synapticBeams).toEqual([]);
      expect(afterAdvance.commandLogs).toEqual([]);
      expect(afterAdvance.agents.every((a) => a.tokensPrompt === 0)).toBe(true);
      expect(afterAdvance.agents.every((a) => a.tokensCompletion === 0)).toBe(true);
      expect(afterAdvance.agents.every((a) => a.tokenVelocity === 0)).toBe(true);
    } finally {
      await daemon.stop();
      readOnlyStore.close();
    }
  });

  it('3. enforces exact cortex_note_cache count parity across SQLite READONLY query and Zustand store', async () => {
    const dbPath = path.join(tempRoot, 'cortex-parity.db');
    const writeStore = new KalinarSqliteStore(dbPath);
    const db = writeStore.getDatabase();

    const insertNote = db.prepare(`
      INSERT INTO cortex_note_cache (
        note_id, relative_path, title, domain, frontmatter_json, wikilinks_json, excerpt, content_hash, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 1; i <= 5; i++) {
      insertNote.run(
        `note-${i}`,
        `01_PROJETOS/note-${i}.md`,
        `Note ${i}`,
        '01_PROJETOS',
        '{"tags":["#project"]}',
        '["00_INDEX"]',
        `Excerpt for note ${i}`,
        `hash-${i}`.padEnd(64, '0'),
        Date.now()
      );
    }
    writeStore.close();

    const readOnlyStore = new KalinarSqliteStore({ dbPath, readOnly: true });
    try {
      expect(readOnlyStore.isReadOnly()).toBe(true);
      expect(readOnlyStore.getCortexNoteCacheCount()).toBe(5);

      const vaultResult = handleQuerySecondBrainVault(
        { maxResults: 2 },
        { sqliteStore: readOnlyStore, vaultRoot: tempRoot }
      );
      expect(vaultResult.success).toBe(true);
      expect(vaultResult.notes).toHaveLength(2);
      expect(vaultResult.cortexCacheCount).toBe(5);

      await useKalinarStore.getState().hydrateFromGroundTruth({
        querySecondBrainVault: async () =>
          handleQuerySecondBrainVault(
            { maxResults: 2 },
            { sqliteStore: readOnlyStore, vaultRoot: tempRoot }
          ),
      });

      const storeState = useKalinarStore.getState();
      expect(storeState.cortexNoteCount).toBe(5);
      expect(storeState.secondBrainNotes).toHaveLength(2);
      expect(storeState.systemState).toBe('STANDBY_READY');
    } finally {
      readOnlyStore.close();
    }
  });

  it('4. discovers 05_AGENTS/@agent-*.md as [IDLE] and promotes only agents with active SQLite tasks or FIFO items', async () => {
    const dbPath = path.join(tempRoot, 'agent-discovery.db');
    const writeStore = new KalinarSqliteStore(dbPath);

    const agentsDir = path.join(tempRoot, '05_AGENTS');
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, '@agent-orchestrator.md'), '# Orchestrator', 'utf-8');
    fs.writeFileSync(
      path.join(agentsDir, '@agent-software-engineer.md'),
      '# Software Engineer',
      'utf-8'
    );
    fs.writeFileSync(path.join(agentsDir, '@agent-qa.md'), '# QA', 'utf-8');

    const daemon = new KalinarDaemon({ workspacePath: tempRoot }, writeStore);

    try {
      // 1. Standby scan: 0 active tasks -> all [IDLE] with 0 tokens, 0 velocity, 0 pid, empty diff stream
      const idleScan = daemon.scanWorkspaceNodes();
      expect(idleScan.agents).toHaveLength(3);
      for (const ag of idleScan.agents) {
        expect(ag.status).toBe('[IDLE]');
        expect(ag.pid).toBe(0);
        expect(ag.tokensPrompt).toBe(0);
        expect(ag.tokensCompletion).toBe(0);
        expect(ag.tokenVelocity).toBe(0);
        expect(ag.etaSeconds).toBe(0);
        expect(ag.livePreviewStream).toBe('');
      }

      // 2. Insert RUNNING task for agent-software-engineer & FIFO item for agent-qa
      writeStore.insertTask({
        id: 'TASK-REAL-01',
        project_path: tempRoot,
        title: 'Compile ground-truth bridge',
        status: 'RUNNING',
        current_agent: 'agent-software-engineer',
        action_instruction: 'Execute tsc --noEmit',
        total_turns: 2,
      });
      writeStore.enqueueAgentTaskFifo({
        targetAgentId: '@agent-qa',
        instruction: 'Run vitest parity gate',
        modelId: 'argon',
        status: 'FIFO_QUEUED',
      });

      const activeScan = daemon.scanWorkspaceNodes();
      const swe = activeScan.agents.find((a) => a.filename === '@agent-software-engineer');
      const qa = activeScan.agents.find((a) => a.filename === '@agent-qa');
      const orch = activeScan.agents.find((a) => a.filename === '@agent-orchestrator');

      expect(swe?.status).toBe('[RUNNING]');
      expect(swe?.currentObjective).toBe('Compile ground-truth bridge');
      expect(qa?.status).toBe('[FIFO_QUEUED]');
      expect(qa?.fifoQueueCount).toBe(1);
      expect(orch?.status).toBe('[IDLE]');

      // 3. Hydrate store from active scan
      await useKalinarStore.getState().hydrateFromGroundTruth({
        scanWorkspaceNodes: async () => activeScan,
        querySecondBrainVault: async () => ({
          success: true,
          notes: [],
          total: 0,
          cortexCacheCount: 0,
          searchLatencyMs: 0.1,
        }),
        getHistoricalTelemetry: async () => [],
        manageFifoQueue: async () => ({ items: writeStore.getAgentFifoQueue() }),
      });

      const hydrated = useKalinarStore.getState();
      expect(hydrated.systemState).toBe('ACTIVE_EXECUTION');
      expect(hydrated.activeAgentsCount).toBe(1);
      expect(hydrated.singularity.activeAgentCount).toBe(1);
      expect(hydrated.synapticBeams).toHaveLength(1);
      expect(hydrated.synapticBeams[0].targetId).toBe('@agent-software-engineer');
    } finally {
      await daemon.stop();
      writeStore.close();
    }
  });

  it('5. purges hardcoded 1,113,033 counters, fake diffs, and emojis across all Step 2 files', () => {
    const filesToAudit = [
      'src/store/useKalinarStore.ts',
      'src/connectors/AgentConnectorRegistry.ts',
      'src/components/hud/RightSingularityColumn.tsx',
      'src/components/hud/KalinarCommandPalette.tsx',
      'src/components/hud/NodeInspectorDrawer.tsx',
      'src/components/dock/KalinarBottomDock.tsx',
      'src/components/terminal/SecondBrainCortexTab.tsx',
      'src/components/terminal/EvolutionChartsView.tsx',
      'src/components/terminal/AntigravityCliTab.tsx',
      'electron/main.ts',
      'electron/db/sqliteStore.ts',
      'electron/daemon/VaultIpcRouter.ts',
      'tests/ux-step2-ground-truth.test.ts',
    ];

    const forbiddenStrings = ['1,113,033', 'legacyBypass', 'fifo-init-01', 'legacy_buffer_state'];
    const emojiRegex = /[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    for (const rel of filesToAudit) {
      const content = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf-8');
      expect(emojiRegex.test(content), `Forbidden emoji in ${rel}`).toBe(false);
      if (rel !== 'tests/ux-step2-ground-truth.test.ts') {
        for (const bad of forbiddenStrings) {
          expect(content.includes(bad), `Forbidden synthetic token "${bad}" found in ${rel}`).toBe(
            false
          );
        }
      }
    }
  });
});
