/**
 * TASK 10 COMPREHENSIVE ACCEPTANCE & AUDIT SUITE (v1.3.0)
 * Obsidian Canvas 1.0 JSON Sync, Live Second Brain Vault RAG,
 * 5-Graph GoRules JDM Evaluator, Tauz Acoustic Telemetry, and Sovereign Voice Directives
 * Strictly Zero Emojis
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { ZenFirewall } from '../src/core/ZenFirewall.js';
import { KalinarSqliteStore } from '../electron/db/sqliteStore.js';
import { kalinarVoiceService } from '../src/services/kalinarVoiceService.js';
import { parseVoiceDirective } from '../src/services/kalinarSingularityBrain.js';
import { ELECTRON_IPC_CHANNELS } from '../electron/preload.js';
import {
  LocalVaultAndMdConnector,
  map3DToCanvasCoordinates,
  mapCanvasTo3DCoordinates,
  sanitizeWorkspaceFilePath,
  serializeWorkspaceToCanvas,
  deserializeCanvasToWorkspace,
} from '../src/connectors/AgentConnectorRegistry.js';
import {
  AgentNode,
  SecondBrainNode,
  ArtifactSatelliteNode,
  WorkspaceScanResult,
  ObsidianCanvasDocument,
} from '../src/types/kalinar.js';

describe('Task 10 (v1.3.0): Obsidian Canvas Sync, Live Second Brain Vault & Cortex Evaluator', () => {
  let tempDir: string;
  let sqliteStore: KalinarSqliteStore;
  let firewall: ZenFirewall;
  let testDbPath: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kalinar-task10-'));
    testDbPath = path.join(tempDir, 'task10-state.db');
    sqliteStore = new KalinarSqliteStore(testDbPath);
    firewall = ZenFirewall.getInstance();
    await firewall.initialize();
  });

  afterEach(() => {
    sqliteStore.close();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore temporary file locks on Windows
    }
  });

  describe('1. Bidirectional Obsidian Canvas 1.0 JSON Sync & Coordinate Projections', () => {
    it('verifies coordinate projection between 3D galaxy [x, y, z] and 2D canvas (x*4, z*4)', () => {
      // Forward projection
      const coords1 = map3DToCanvasCoordinates([10, 0, 20]);
      expect(coords1).toEqual({ x: 40, y: 80 });

      const coords2 = map3DToCanvasCoordinates([-5, 0, 15]);
      expect(coords2).toEqual({ x: -20, y: 60 });

      // Inverse projection
      const pos3D1 = mapCanvasTo3DCoordinates(40, 80);
      expect(pos3D1).toEqual([10, 0, 20]);

      const pos3D2 = mapCanvasTo3DCoordinates(-20, 60);
      expect(pos3D2).toEqual([-5, 0, 15]);

      // Roundtrip property with Y preservation
      const initial3D: [number, number, number] = [25, 4, -18];
      const canvasPos = map3DToCanvasCoordinates(initial3D);
      const recovered3D = mapCanvasTo3DCoordinates(canvasPos.x, canvasPos.y, initial3D[1]);
      expect(recovered3D).toEqual([25, 4, -18]);
    });

    it('serializes 3D workspace topology to Obsidian Canvas 1.0 JSON with color mappings', () => {
      const canvasFile = path.join(tempDir, 'KALINAR_GALAXY.canvas');
      const topology: WorkspaceScanResult = {
        agents: [
          {
            id: 'agent-orchestrator-01',
            filename: '@agent-orchestrator',
            pid: 14201,
            status: '[ACTIVE]',
            executionMode: 'STEP_BY_STEP_GATE',
            currentObjective: 'Lead swarm convergence',
            totalSteps: 6,
            currentStep: 3,
            stepDescription: 'Routing directives',
            tokensPrompt: 4500,
            tokensCompletion: 800,
            tokenVelocity: 85,
            etaSeconds: 15,
            position3D: [12, 0, 16],
            livePreviewStream: '',
            activeModelId: 'argon',
          },
        ],
        secondBrainNodes: [
          {
            id: 'sb-note-midas',
            wikilink: '[[Project-Midas-Simulador-Financeiro]]',
            notePath: '01_PROJETOS/Project-Midas-Simulador-Financeiro.md',
            tagList: ['#fintech', '#midas'],
            domain: '01_PROJETOS',
            connectionCount: 3,
            summary: 'Fintech financial simulator with compound interest engine',
            position3D: [-10, 0, 24],
          },
        ],
        artifactSatellites: [
          {
            id: 'art-zen-firewall',
            associatedAgentId: 'agent-orchestrator-01',
            artifactPath: 'src/core/ZenFirewall.ts',
            fileHash: 'sha256-abc12345',
            title: 'ZenFirewall.ts',
            status: 'VERIFIED',
            byteSize: 24500,
            lastModified: new Date().toISOString(),
            position3D: [30, 0, 40],
          },
        ],
        warRoomPointers: ['[[00_INDEX]]', '[[02_PADROES_E_DECISOES_INDEX]]'],
      };

      const doc = serializeWorkspaceToCanvas(topology, canvasFile);

      expect(fs.existsSync(canvasFile)).toBe(true);
      expect(doc.nodes).toHaveLength(3);
      expect(doc.edges).toHaveLength(1);

      // Node color mappings:
      // AgentNode = "5" (Cyan), type 'text'
      const agentNode = doc.nodes.find((n) => n.id === 'agent-orchestrator-01');
      expect(agentNode).toBeDefined();
      expect(agentNode?.color).toBe('5');
      expect(agentNode?.type).toBe('text');
      expect(agentNode?.width).toBe(360);
      expect(agentNode?.height).toBe(200);
      expect(agentNode?.x).toBe(48); // 12 * 4
      expect(agentNode?.y).toBe(64); // 16 * 4

      // SecondBrainNode = "6" (Purple/Magenta), type 'file'
      const sbNode = doc.nodes.find((n) => n.id === 'sb-note-midas');
      expect(sbNode).toBeDefined();
      expect(sbNode?.color).toBe('6');
      expect(sbNode?.type).toBe('file');
      expect((sbNode as any).file).toBe('01_PROJETOS/Project-Midas-Simulador-Financeiro.md');
      expect(sbNode?.width).toBe(320);
      expect(sbNode?.height).toBe(180);
      expect(sbNode?.x).toBe(-40); // -10 * 4
      expect(sbNode?.y).toBe(96); // 24 * 4

      // ArtifactSatelliteNode = "3" (Amber), type 'file'
      const artNode = doc.nodes.find((n) => n.id === 'art-zen-firewall');
      expect(artNode).toBeDefined();
      expect(artNode?.color).toBe('3');
      expect(artNode?.type).toBe('file');
      expect((artNode as any).file).toBe('src/core/ZenFirewall.ts');
      expect(artNode?.width).toBe(280);
      expect(artNode?.height).toBe(150);
      expect(artNode?.x).toBe(120); // 30 * 4
      expect(artNode?.y).toBe(160); // 40 * 4

      // Edge connecting Agent to Artifact
      const edge = doc.edges[0];
      expect(edge.fromNode).toBe('agent-orchestrator-01');
      expect(edge.toNode).toBe('art-zen-firewall');
      expect(edge.color).toBe('3');
      expect(edge.toEnd).toBe('arrow');
      expect(edge.label).toBe('artifact');
    });

    it('deserializes Obsidian Canvas 1.0 JSON back into 3D workspace topology', () => {
      const canvasDoc: ObsidianCanvasDocument = {
        nodes: [
          {
            id: 'node-agent-1',
            type: 'text',
            text: '## @agent-software-engineer\nObjective: Implement Canvas Sync',
            x: 80,
            y: 120,
            width: 360,
            height: 200,
            color: '5',
          },
          {
            id: 'node-sb-1',
            type: 'file',
            file: '02_PADROES_E_DECISOES/ADR-001.md',
            x: -40,
            y: 80,
            width: 320,
            height: 180,
            color: '6',
          },
          {
            id: 'node-art-1',
            type: 'file',
            file: 'src/types/kalinar.ts',
            x: 160,
            y: 200,
            width: 280,
            height: 150,
            color: '3',
          },
        ],
        edges: [
          {
            id: 'edge-1',
            fromNode: 'node-agent-1',
            toNode: 'node-art-1',
            fromSide: 'right',
            toSide: 'left',
            color: '3',
          },
        ],
      };

      const restored = deserializeCanvasToWorkspace(canvasDoc);

      expect(restored.agents).toHaveLength(1);
      expect(restored.agents[0].id).toBe('node-agent-1');
      expect(restored.agents[0].position3D).toEqual([20, 0, 30]); // 80/4, 120/4

      expect(restored.secondBrainNodes).toHaveLength(1);
      expect(restored.secondBrainNodes[0].id).toBe('node-sb-1');
      expect(restored.secondBrainNodes[0].notePath).toBe('02_PADROES_E_DECISOES/ADR-001.md');
      expect(restored.secondBrainNodes[0].position3D).toEqual([-10, 0, 20]); // -40/4, 80/4

      expect(restored.artifactSatellites).toHaveLength(1);
      expect(restored.artifactSatellites[0].id).toBe('node-art-1');
      expect(restored.artifactSatellites[0].associatedAgentId).toBe('node-agent-1');
      expect(restored.artifactSatellites[0].position3D).toEqual([40, 0, 50]); // 160/4, 200/4
    });

    it('persists bidirectional canvas synchronization via SQLite store syncToCanvas and syncFromCanvas', () => {
      const canvasFile = path.join(tempDir, 'SYNC_TEST.canvas');
      const topology: WorkspaceScanResult = {
        agents: [
          {
            id: 'agent-qa-01',
            filename: '@agent-qa',
            pid: 14207,
            status: '[ACTIVE]',
            executionMode: 'STEP_BY_STEP_GATE',
            currentObjective: 'Execute E2E Verification',
            totalSteps: 5,
            currentStep: 5,
            stepDescription: 'All suites pass',
            tokensPrompt: 5000,
            tokensCompletion: 1200,
            tokenVelocity: 90,
            etaSeconds: 5,
            position3D: [16, 0, 32],
            livePreviewStream: '',
          },
        ],
        secondBrainNodes: [
          {
            id: 'sb-note-test',
            wikilink: '[[Test-Doc]]',
            notePath: '03_PREFERENCIAS/Test-Doc.md',
            tagList: ['#test'],
            domain: '03_PREFERENCIAS',
            connectionCount: 1,
            summary: 'Test Doc',
            position3D: [8, 0, 16],
          },
        ],
        artifactSatellites: [],
        warRoomPointers: [],
      };

      // 1. Export topology to canvas and populate canvas_nodes table
      const doc = sqliteStore.syncToCanvas(canvasFile, topology);
      expect(doc.nodes).toHaveLength(2);

      const dbNodes = sqliteStore.getCanvasNodes(canvasFile);
      expect(dbNodes).toHaveLength(2);
      expect(dbNodes.some((n) => n.id === 'agent-qa-01' && n.x === 64 && n.y === 128)).toBe(true);
      expect(dbNodes.some((n) => n.id === 'sb-note-test' && n.x === 32 && n.y === 64)).toBe(true);

      // 2. Read canvas back into SQLite
      const reimportedDoc = sqliteStore.syncFromCanvas(canvasFile);
      expect(reimportedDoc).not.toBeNull();
      expect(reimportedDoc?.nodes).toHaveLength(2);
    });
  });

  describe('2. Loop Suppression & Daemon Event Routing (.kalinar-lock and WATCH_VISUAL_ONLY)', () => {
    it('suppresses recursive agent loops when .kalinar-lock is present', async () => {
      const evalResult = await firewall.evaluateEventRouter({
        eventType: 'FILE_WATCH',
        filePath: path.join(tempDir, '.kalinar-lock'),
        auditCycle: 1,
      });

      expect(evalResult.result.action).toBe('DROP_LOOP_SUPPRESSED');
      expect(evalResult.result.secondBrainTag).toBe('#lock');
      expect(evalResult.result.auditAllowed).toBe(false);
      expect(evalResult.latencyMs).toBeLessThan(1.0);
    });

    it('routes canvas, execution logs, and war room changes to WATCH_VISUAL_ONLY', async () => {
      // KALINAR_GALAXY.canvas
      const canvasEval = await firewall.evaluateEventRouter({
        eventType: 'FILE_WATCH',
        filePath: 'c:/Kalinar/KALINAR_GALAXY.canvas',
        auditCycle: 1,
      });
      expect(canvasEval.result.action).toBe('WATCH_VISUAL_ONLY');
      expect(canvasEval.result.secondBrainTag).toBe('#visual_sync');
      expect(canvasEval.result.auditAllowed).toBe(true);

      // 05_EXECUCOES log
      const execEval = await firewall.evaluateEventRouter({
        eventType: 'FILE_WATCH',
        filePath: 'c:/Kalinar/05_EXECUCOES/2026-11-06-release-v1-3-0.md',
        auditCycle: 1,
      });
      expect(execEval.result.action).toBe('WATCH_VISUAL_ONLY');

      // WAR_ROOM.md
      const warRoomEval = await firewall.evaluateEventRouter({
        eventType: 'FILE_WATCH',
        filePath: 'c:/Kalinar/.antigravity/comms/WAR_ROOM.md',
        auditCycle: 1,
      });
      expect(warRoomEval.result.action).toBe('WATCH_VISUAL_ONLY');
    });
  });

  describe('3. SQLite Schema Verification & CRUD Operations', () => {
    it('verifies canvas_nodes has no FK constraint to tasks(id) and allows generic entities', () => {
      // Insert non-task nodes into canvas_nodes with foreign keys active
      expect(() => {
        sqliteStore.upsertCanvasNode({
          id: 'sb-note-standalone-node-999',
          task_id: 'sb-note-standalone-node-999',
          x: 120,
          y: 240,
          width: 320,
          height: 180,
          color_token: '6',
          canvas_file: 'KALINAR_GALAXY.canvas',
        });
      }).not.toThrow();

      const nodes = sqliteStore.getCanvasNodes('KALINAR_GALAXY.canvas');
      expect(nodes.some((n) => n.id === 'sb-note-standalone-node-999')).toBe(true);
    });

    it('verifies second_brain_notes table CRUD operations in sqliteStore', () => {
      // 1. Insert note
      sqliteStore.insertSecondBrainNote({
        id: 'sb-note-test-01',
        title: 'ADR-001 Server-Side Auth',
        file_path: '02_PADROES_E_DECISOES/ADR-001.md',
        wikilink: '[[ADR-001-Seguranca-Sessao-Server-Side-Auth]]',
        domain: '02_PADROES_E_DECISOES',
        tags: JSON.stringify(['#adr', '#security', '#auth']),
        frontmatter_json: JSON.stringify({ title: 'ADR-001', domain: '02_PADROES_E_DECISOES' }),
        wikilinks_json: JSON.stringify(['[[00_INDEX]]', '[[Project-Midas]]']),
        excerpt: 'Session security validation strictly on server side.',
        content: '# ADR-001 Server-Side Auth\nContent details here.',
      });

      // 2. Query all & with filters
      const allNotes = sqliteStore.getSecondBrainNotes();
      expect(allNotes).toHaveLength(1);

      const domainFiltered = sqliteStore.getSecondBrainNotes({ domain: '02_PADROES_E_DECISOES' });
      expect(domainFiltered).toHaveLength(1);

      const nonMatchingDomain = sqliteStore.getSecondBrainNotes({ domain: '03_PREFERENCIAS' });
      expect(nonMatchingDomain).toHaveLength(0);

      const queryFiltered = sqliteStore.getSecondBrainNotes({ query: 'Auth' });
      expect(queryFiltered).toHaveLength(1);

      // 3. Query by ID and Path
      const noteById = sqliteStore.getSecondBrainNoteById('sb-note-test-01');
      expect(noteById).not.toBeNull();
      expect(noteById?.title).toBe('ADR-001 Server-Side Auth');

      const noteByPath = sqliteStore.getSecondBrainNoteByPath('02_PADROES_E_DECISOES/ADR-001.md');
      expect(noteByPath).not.toBeNull();
      expect(noteByPath?.id).toBe('sb-note-test-01');

      // 4. Delete note
      sqliteStore.deleteSecondBrainNote('sb-note-test-01');
      expect(sqliteStore.getSecondBrainNoteById('sb-note-test-01')).toBeNull();
    });
  });

  describe('4. Zero-Trust Path Traversal Sanitization & Vault Extraction', () => {
    it('strictly rejects path traversal attacks containing ../ or shell metacharacters', () => {
      const maliciousCandidates = [
        '../../etc/passwd',
        '..\\..\\secret.md',
        'notes/../../outside.md',
        'file;rm -rf /',
        'file|cat /etc/shadow',
        'file`id`',
        'file$(whoami)',
        'file\0nullbyte.md',
      ];

      for (const candidate of maliciousCandidates) {
        const check = sanitizeWorkspaceFilePath(tempDir, candidate);
        expect(check.valid, `Expected path '${candidate}' to be rejected`).toBe(false);
        expect(check.reason).toBeDefined();
      }

      // Valid paths within boundary
      const validCheck = sanitizeWorkspaceFilePath(tempDir, '01_PROJETOS/project-midas.md');
      expect(validCheck.valid).toBe(true);
      expect(validCheck.relativePath).toBe('01_PROJETOS/project-midas.md');
    });

    it('rejects path traversal in connector querySecondBrainVault and injectSecondBrainNote', () => {
      const connector = new LocalVaultAndMdConnector(tempDir);

      // Query with path traversal
      const queryResult = connector.querySecondBrainVault({
        targetPath: '../../etc/shadow',
      });
      expect(queryResult.success).toBe(false);
      expect(queryResult.notes).toHaveLength(0);
      expect(queryResult.error).toContain('Path traversal');

      // Inject with path traversal
      const injectResult = connector.injectSecondBrainNote(
        {
          title: 'Malicious Escape',
          domain: '01_PROJETOS',
          tags: ['#attack'],
          content: 'malicious payload',
          filePath: '../../escape.md',
        },
        sqliteStore
      );
      expect(injectResult.success).toBe(false);
      expect(injectResult.persistedToDisk).toBe(false);
      expect(injectResult.persistedToSqlite).toBe(false);
      expect(injectResult.error).toContain('Path traversal');
    });

    it('extracts Markdown frontmatter, caps wikilinks at maximum 2, and enforces excerpts strictly under 250 characters', () => {
      const connector = new LocalVaultAndMdConnector(tempDir);

      // Create test markdown file with 4 wikilinks and > 300 characters of text
      const notesDir = path.join(tempDir, '01_PROJETOS');
      fs.mkdirSync(notesDir, { recursive: true });
      const testFilePath = path.join(notesDir, 'quantum-cortex.md');

      const markdownContent = [
        '---',
        'title: "Quantum Cortex Architecture"',
        'domain: "01_PROJETOS"',
        'tags: ["#quantum", "#architecture", "#cortex"]',
        'author: "Thiago"',
        '---',
        '',
        '# Quantum Cortex Architecture',
        '',
        'The Quantum Cortex engine orchestrates high-frequency state synchronization across the sovereign desktop OS.',
        'It connects directly to [[00_INDEX]], [[02_PADROES_E_DECISOES]], [[ADR-001]], and [[ADR-002]].',
        'This architectural layer ensures zero token leakage and enforces deterministic GoRules ZEN firewall gates.',
        'Further elaborations demonstrate how the GPGPU particle stream reacts to live acoustic frequencies in real time,',
        'maintaining 60 frames per second without frame drops, memory pressure, or layout thrashing across all viewports.',
      ].join('\n');

      fs.writeFileSync(testFilePath, markdownContent, 'utf-8');

      const queryRes = connector.querySecondBrainVault({ query: 'Quantum' });
      expect(queryRes.success).toBe(true);
      expect(queryRes.notes).toHaveLength(1);

      const note = queryRes.notes[0];
      expect(note.title).toBe('Quantum Cortex Architecture');
      expect(note.domain).toBe('01_PROJETOS');
      expect(note.frontmatter.title).toBe('Quantum Cortex Architecture');
      expect(note.frontmatter.author).toBe('Thiago');

      // Rule: strictly capped at maximum 2 [[Wikilinks]] per Graph Pointer
      expect(note.wikilinks.length).toBeLessThanOrEqual(2);
      expect(note.wikilinks).toEqual(['00_INDEX', '02_PADROES_E_DECISOES']);

      // Rule: excerpt strictly under 250 characters
      expect(note.excerpt.length).toBeLessThan(250);
      expect(note.excerpt.length).toBeGreaterThan(20);
    });
  });

  describe('5. Interactive 5-Graph GoRules ZEN JDM Evaluator Benchmark (< 1ms)', () => {
    it('evaluates all 5 production JDM decision graphs in under 1ms (< 0.45ms benchmark)', async () => {
      // 1. daemon-event-router
      const t1 = await firewall.evaluateEventRouter({
        eventType: 'AGENT_TURN',
        filePath: 'src/core/ZenFirewall.ts',
        auditCycle: 1,
      });
      expect(t1.result).toBeDefined();
      expect(t1.result.action).toBe('DISPATCH_AGENT');
      expect(t1.latencyMs).toBeLessThan(1.0);

      // 2. os-execution-firewall
      const t2 = await firewall.evaluateOsFirewall({
        command: 'git status',
        isSandbox: true,
      });
      expect(t2.result).toBeDefined();
      expect(t2.result.allowed).toBe(true);
      expect(t2.latencyMs).toBeLessThan(1.0);

      // Destructive command blocked
      const t2Blocked = await firewall.evaluateOsFirewall({
        command: 'rm -rf /',
        isSandbox: false,
      });
      expect(t2Blocked.result.allowed).toBe(false);

      // 3. voice-command-guard
      const t3 = await firewall.evaluateVoiceCommand({
        intent: 'GET_SWARM_STATUS',
        action: 'GET_STATUS',
        isDestructive: false,
      });
      expect(t3.result).toBeDefined();
      expect(t3.result.allowed).toBe(true);
      expect(t3.latencyMs).toBeLessThan(1.0);

      // 4. execution-gate
      const t4 = await firewall.evaluateExecutionGate({
        executionMode: 'STEP_BY_STEP_GATE',
        isDestructiveAction: false,
        hasSingleWriterLock: true,
      });
      expect(t4.result).toBeDefined();
      expect(t4.result.requiresHumanApproval).toBe(true);
      expect(t4.latencyMs).toBeLessThan(1.0);

      // 5. llm-model-router
      const t5 = await firewall.evaluateLlmModelRouter({
        taskDomain: 'ARCHITECTURE',
        errorCode: 'NONE',
        retryCount: 0,
      });
      expect(t5.result).toBeDefined();
      expect(t5.result.activeModelId).toBe('argon');
      expect(t5.result.fallbackModelId).toBe('claude-sonnet');
      expect(t5.latencyMs).toBeLessThan(1.0);
    });
  });

  describe('6. Tauz Acoustic Telemetry Readout & Realtime Frequency Bands', () => {
    it('retrieves normalized DSP frequency bands (SUB-110HZ, PRES-2.4KHZ, PULSE) and formats tabular-nums', () => {
      const bands = kalinarVoiceService.getRealtimeFrequencyBands();

      expect(bands.subBass).toBeGreaterThanOrEqual(0.0);
      expect(bands.subBass).toBeLessThanOrEqual(1.0);
      expect(bands.lowMid).toBeGreaterThanOrEqual(0.0);
      expect(bands.lowMid).toBeLessThanOrEqual(1.0);
      expect(bands.highPresence).toBeGreaterThanOrEqual(0.0);
      expect(bands.highPresence).toBeLessThanOrEqual(1.0);
      expect(bands.compositePulse).toBeGreaterThanOrEqual(0.0);
      expect(bands.compositePulse).toBeLessThanOrEqual(1.0);

      // Tabular-nums string readout formatting test
      const subBassFormatted = bands.subBass.toFixed(2);
      const presenceFormatted = bands.highPresence.toFixed(2);
      const pulseFormatted = bands.compositePulse.toFixed(2);

      expect(/^\d+\.\d{2}$/.test(subBassFormatted)).toBe(true);
      expect(/^\d+\.\d{2}$/.test(presenceFormatted)).toBe(true);
      expect(/^\d+\.\d{2}$/.test(pulseFormatted)).toBe(true);

      // Feed PCM frame and assert active frequency band values
      const pcmBins = new Uint8Array(128).fill(192);
      const fedBands = kalinarVoiceService.feedPcmFrequencyFrame(pcmBins);
      expect(fedBands.subBass).toBeGreaterThan(0.0);
      expect(fedBands.compositePulse).toBeGreaterThan(0.0);
    });
  });

  describe('7. Sovereign pt-BR Voice Directives & Tactical Tauz Confirmations', () => {
    it('parses voice directives for Second Brain note queries and Canvas synchronization', () => {
      // 1. Search Second Brain directives
      const v1 = parseVoiceDirective('pesquisar notas sobre arquitetura');
      expect(v1.intent).toBe('SEARCH_SECOND_BRAIN');
      expect(v1.action).toBe('CORTEX_NOTE_INGEST');

      const v2 = parseVoiceDirective('Thiago, buscar no second brain padrões de segurança');
      expect(v2.intent).toBe('SEARCH_SECOND_BRAIN');

      const v3 = parseVoiceDirective('consultar notas financeiras no segundo cerebro');
      expect(v3.intent).toBe('SEARCH_SECOND_BRAIN');

      // 2. Obsidian Canvas sync directives
      const v4 = parseVoiceDirective('sincronizar canvas com a galaxia');
      expect(v4.intent).toBe('SYNC_OBSIDIAN_CANVAS');
      expect(v4.action).toBe('CANVAS_TOPOLOGY_SYNC');

      const v5 = parseVoiceDirective('exportar topologia para obsidian');
      expect(v5.intent).toBe('SYNC_OBSIDIAN_CANVAS');

      const v6 = parseVoiceDirective('atualizar canvas');
      expect(v6.intent).toBe('SYNC_OBSIDIAN_CANVAS');
    });

    it('evaluates voice guard decisions and returns tactical spoken confirmations in Tauz cadence', async () => {
      // Second Brain search confirmation
      const resSearch = await firewall.evaluateVoiceCommand({
        intent: 'SEARCH_SECOND_BRAIN',
        action: 'CORTEX_NOTE_INGEST',
        isDestructive: false,
      });

      expect(resSearch.result.allowed).toBe(true);
      expect(resSearch.result.targetHandler).toBe('cortexNoteIngest');
      expect(resSearch.result.feedbackPhrase).toContain('Thiago');
      expect(resSearch.result.feedbackPhrase).toContain('horizonte gravitacional');
      expect(resSearch.result.arbitrationVerdict).toBe('PREEMPT_ALLOWED');

      // Obsidian Canvas sync confirmation
      const resSync = await firewall.evaluateVoiceCommand({
        intent: 'SYNC_OBSIDIAN_CANVAS',
        action: 'CANVAS_TOPOLOGY_SYNC',
        isDestructive: false,
      });

      expect(resSync.result.allowed).toBe(true);
      expect(resSync.result.targetHandler).toBe('canvasTopologySync');
      expect(resSync.result.feedbackPhrase).toContain('Thiago');
      expect(resSync.result.feedbackPhrase).toContain('Obsidian Canvas');
      expect(resSync.result.arbitrationVerdict).toBe('PREEMPT_ALLOWED');
    });
  });

  describe('8. IPC Whitelist Registration', () => {
    it('verifies all 3 Task 10 IPC channels are registered in ELECTRON_IPC_CHANNELS whitelist', () => {
      expect(ELECTRON_IPC_CHANNELS).toContain('kalinar:sync_obsidian_canvas');
      expect(ELECTRON_IPC_CHANNELS).toContain('kalinar:query_second_brain_vault');
      expect(ELECTRON_IPC_CHANNELS).toContain('kalinar:inject_second_brain_note');
    });
  });

  describe('9. Governance & Persona Invariants', () => {
    it('asserts strictly zero decorative emojis across all code files, blueprints, and configs', () => {
      const emojiPattern = /[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      const scanRecursive = (dir: string): string[] => {
        let files: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (
            entry.name === 'node_modules' ||
            entry.name === '.git' ||
            entry.name === '.agents' ||
            entry.name === '.antigravity' ||
            entry.name === 'dist' ||
            entry.name === 'dist-electron' ||
            entry.name === 'coverage'
          ) {
            continue;
          }
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            files = files.concat(scanRecursive(fullPath));
          } else if (
            entry.isFile() &&
            /\.(ts|tsx|js|mjs|json|css|md)$/.test(entry.name) &&
            !entry.name.endsWith('.lock')
          ) {
            files.push(fullPath);
          }
        }
        return files;
      };

      const allFiles = scanRecursive(process.cwd());
      expect(allFiles.length).toBeGreaterThan(30);

      for (const filePath of allFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(emojiPattern.test(content), `Emoji invariant violated in ${filePath}`).toBe(false);
      }
    });

    it('asserts strictly zero prohibited persona terms (J.A.R.V.I.S., corner orb) in production code', () => {
      const searchDirs = ['src', 'electron'];
      const prohibitedTerms = ['jarvis', 'j.a.r.v.i.s.', 'corner orb'];

      for (const dir of searchDirs) {
        const fullDir = path.resolve(process.cwd(), dir);
        if (!fs.existsSync(fullDir)) continue;

        const scanRecursive = (currentPath: string) => {
          const entries = fs.readdirSync(currentPath, { withFileTypes: true });
          for (const entry of entries) {
            const p = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
              scanRecursive(p);
            } else if (entry.isFile() && /\.(ts|tsx|json|css)$/.test(entry.name)) {
              const content = fs.readFileSync(p, 'utf-8').toLowerCase();
              for (const term of prohibitedTerms) {
                expect(
                  content.includes(term),
                  `Prohibited term '${term}' found in production file ${p}`
                ).toBe(false);
              }
            }
          }
        };

        scanRecursive(fullDir);
      }
    });
  });
});
