/**
 * CHALLENGER 1 EMPIRICAL VERIFICATION & STRESS HARNESS (v1.3.0)
 * Adversarial stress testing for:
 * 1. Obsidian Canvas 1.0 JSON format & coordinate math (boundary, float, roundtrip, colors)
 * 2. Loop suppression & safety (.kalinar-lock, WATCH_VISUAL_ONLY, backslashes, cycles)
 * 3. SQLite canvas_nodes & second_brain_notes (FK independence, constraints, SQLi, upsert)
 * 4. Path traversal sanitization boundary stress
 * Strictly Zero Emojis
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { ZenFirewall } from '../src/core/ZenFirewall.js';
import { KalinarSqliteStore } from '../electron/db/sqliteStore.js';
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

describe('Challenger 1: Empirical Verification & Stress Harness', () => {
  let tempDir: string;
  let sqliteStore: KalinarSqliteStore;
  let firewall: ZenFirewall;
  let testDbPath: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kalinar-challenger-'));
    testDbPath = path.join(tempDir, 'challenger-test.db');
    sqliteStore = new KalinarSqliteStore(testDbPath);
    firewall = ZenFirewall.getInstance();
    await firewall.initialize();
  });

  afterEach(() => {
    sqliteStore.close();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Windows file lock suppression
    }
  });

  describe('Focus 1: Obsidian Canvas 1.0 JSON & Coordinate Math Stress', () => {
    it('verifies coordinate projection with extreme values, negative numbers, and zero', () => {
      const testCases: Array<{
        input3D: [number, number, number];
        expectedCanvas: { x: number; y: number };
      }> = [
        { input3D: [0, 0, 0], expectedCanvas: { x: 0, y: 0 } },
        { input3D: [-1000, 50, -2500], expectedCanvas: { x: -4000, y: -10000 } },
        { input3D: [999999, -500, 888888], expectedCanvas: { x: 3999996, y: 3555552 } },
        { input3D: [-0.25, 0, 0.75], expectedCanvas: { x: -1, y: 3 } },
        { input3D: [0.125, 10, -0.125], expectedCanvas: { x: 1, y: 0 } }, // Math.round(-0.5) = -0 or 0
      ];

      for (const tc of testCases) {
        const projected = map3DToCanvasCoordinates(tc.input3D);
        expect(projected.x).toBe(tc.expectedCanvas.x);
        expect(Math.abs(projected.y)).toBe(Math.abs(tc.expectedCanvas.y));
      }
    });

    it('verifies integer roundtrip fidelity between 3D [x, y, z] and 2D (x*4, z*4)', () => {
      const integerGrid = [-200, -50, -1, 0, 1, 42, 128, 500];
      for (const x of integerGrid) {
        for (const z of integerGrid) {
          const original3D: [number, number, number] = [x, 77, z];
          const canvasCoords = map3DToCanvasCoordinates(original3D);
          const recovered3D = mapCanvasTo3DCoordinates(canvasCoords.x, canvasCoords.y, 77);
          expect(recovered3D).toEqual(original3D);
        }
      }
    });

    it('measures maximum drift on fractional coordinate roundtrips', () => {
      // Fractional inputs will be rounded to nearest integer upon roundtrip (step size 1/4 = 0.25)
      const fractionalCoords: [number, number, number] = [12.35, 15, -45.82];
      const canvasPos = map3DToCanvasCoordinates(fractionalCoords);
      const recovered = mapCanvasTo3DCoordinates(canvasPos.x, canvasPos.y, fractionalCoords[1]);

      // Maximum discretization error is 0.5 units in 3D space
      expect(Math.abs(recovered[0] - fractionalCoords[0])).toBeLessThanOrEqual(0.5);
      expect(Math.abs(recovered[2] - fractionalCoords[2])).toBeLessThanOrEqual(0.5);
      expect(recovered[1]).toBe(fractionalCoords[1]);
    });

    it('enforces exact Obsidian Canvas 1.0 color mappings ("5", "6", "3") and node geometry', () => {
      const canvasFile = path.join(tempDir, 'COLOR_TEST.canvas');
      const topology: WorkspaceScanResult = {
        agents: [
          {
            id: 'agent-cybersecurity',
            filename: '@agent-cybersecurity',
            pid: 14205,
            status: '[ACTIVE]',
            executionMode: 'STEP_BY_STEP_GATE',
            currentObjective: 'Audit system state',
            totalSteps: 10,
            currentStep: 8,
            stepDescription: 'Zero trust pass',
            tokensPrompt: 7000,
            tokensCompletion: 1500,
            tokenVelocity: 80,
            etaSeconds: 10,
            position3D: [5, 0, 10],
            livePreviewStream: '',
          },
        ],
        secondBrainNodes: [
          {
            id: 'sb-adr-002',
            wikilink: '[[ADR-002-Rate-Limiting-Granular-Upstash]]',
            notePath: '02_PADROES_E_DECISOES/ADR-002.md',
            tagList: ['#rate-limit', '#redis'],
            domain: '02_PADROES_E_DECISOES',
            connectionCount: 4,
            summary: 'Granular rate limit per route',
            position3D: [-15, 0, 25],
          },
        ],
        artifactSatellites: [
          {
            id: 'art-sqlite-store',
            associatedAgentId: 'agent-cybersecurity',
            artifactPath: 'electron/db/sqliteStore.ts',
            fileHash: 'sha256-xyz',
            title: 'sqliteStore.ts',
            status: 'VERIFIED',
            byteSize: 18200,
            lastModified: new Date().toISOString(),
            position3D: [20, 0, 30],
          },
        ],
        warRoomPointers: [],
      };

      const doc = serializeWorkspaceToCanvas(topology, canvasFile);

      // Verify node types and color tokens
      const agent = doc.nodes.find((n) => n.id === 'agent-cybersecurity')!;
      expect(agent).toBeDefined();
      expect(agent.type).toBe('text');
      expect(agent.color).toBe('5'); // Cyan
      expect(agent.width).toBe(360);
      expect(agent.height).toBe(200);

      const sb = doc.nodes.find((n) => n.id === 'sb-adr-002')!;
      expect(sb).toBeDefined();
      expect(sb.type).toBe('file');
      expect(sb.color).toBe('6'); // Purple/Magenta
      expect(sb.width).toBe(320);
      expect(sb.height).toBe(180);

      const art = doc.nodes.find((n) => n.id === 'art-sqlite-store')!;
      expect(art).toBeDefined();
      expect(art.type).toBe('file');
      expect(art.color).toBe('3'); // Amber
      expect(art.width).toBe(280);
      expect(art.height).toBe(150);

      // Edge validation
      expect(doc.edges).toHaveLength(1);
      const edge = doc.edges[0];
      expect(edge.fromNode).toBe('agent-cybersecurity');
      expect(edge.toNode).toBe('art-sqlite-store');
      expect(edge.color).toBe('3');
      expect(edge.toEnd).toBe('arrow');
      expect(edge.label).toBe('artifact');
    });

    it('robustly handles edge cases in deserialization: missing fields, unknown colors, empty canvas', () => {
      // 1. Completely empty canvas
      const emptyDoc: ObsidianCanvasDocument = { nodes: [], edges: [] };
      const emptyRes = deserializeCanvasToWorkspace(emptyDoc);
      expect(emptyRes.agents).toHaveLength(0);
      expect(emptyRes.secondBrainNodes).toHaveLength(0);
      expect(emptyRes.artifactSatellites).toHaveLength(0);

      // 2. Node with unknown color defaults gracefully to SecondBrainNode
      const unknownColorDoc: ObsidianCanvasDocument = {
        nodes: [
          {
            id: 'custom-node-1',
            type: 'file',
            file: 'custom/note.md',
            x: 40,
            y: 80,
            width: 300,
            height: 150,
            color: '1', // Red in Obsidian, not standard 5/6/3
          },
        ],
        edges: [],
      };
      const resUnknown = deserializeCanvasToWorkspace(unknownColorDoc);
      expect(resUnknown.secondBrainNodes).toHaveLength(1);
      expect(resUnknown.secondBrainNodes[0].id).toBe('custom-node-1');
      expect(resUnknown.secondBrainNodes[0].position3D).toEqual([10, 0, 20]);

      // 3. Artifact node with missing edge defaults associatedAgentId gracefully
      const disconnectedArtDoc: ObsidianCanvasDocument = {
        nodes: [
          {
            id: 'art-unlinked',
            type: 'file',
            file: 'src/orphaned.ts',
            x: 80,
            y: 120,
            width: 280,
            height: 150,
            color: '3',
          },
        ],
        edges: [],
      };
      const resArt = deserializeCanvasToWorkspace(disconnectedArtDoc);
      expect(resArt.artifactSatellites).toHaveLength(1);
      expect(resArt.artifactSatellites[0].associatedAgentId).toBe('agent-software-engineer-01');
    });
  });

  describe('Focus 2: Loop Suppression & Daemon Event Routing Stress', () => {
    it('suppresses loops for .kalinar-lock with Windows backslashes, mixed slashes, and relative paths', async () => {
      const lockVariations = [
        '.kalinar-lock',
        'c:\\Kalinar\\.kalinar-lock',
        'c:/Kalinar/.kalinar-lock',
        './.kalinar-lock',
        'subfolder\\.kalinar-lock',
        'nested/dir/.kalinar-lock',
      ];

      for (const lockPath of lockVariations) {
        const evalRes = await firewall.evaluateEventRouter({
          eventType: 'FILE_WATCH',
          filePath: lockPath,
          auditCycle: 1,
        });

        expect(evalRes.result.action).toBe('DROP_LOOP_SUPPRESSED');
        expect(evalRes.result.secondBrainTag).toBe('#lock');
        expect(evalRes.result.auditAllowed).toBe(false);
        expect(evalRes.latencyMs).toBeLessThan(1.0);
      }
    });

    it('classifies all visual sync targets as WATCH_VISUAL_ONLY under various path formats', async () => {
      const visualTargets = [
        'c:\\Kalinar\\KALINAR_GALAXY.canvas',
        'c:/Kalinar/KALINAR_GALAXY.canvas',
        './KALINAR_GALAXY.canvas',
        'c:\\Kalinar\\05_EXECUCOES\\2026-11-06-log.md',
        '05_EXECUCOES/task-10.md',
        'c:\\Kalinar\\.antigravity\\comms\\WAR_ROOM.md',
        'WAR_ROOM.md',
      ];

      for (const target of visualTargets) {
        const evalRes = await firewall.evaluateEventRouter({
          eventType: 'FILE_WATCH',
          filePath: target,
          auditCycle: 1,
        });

        expect(evalRes.result.action).toBe('WATCH_VISUAL_ONLY');
        expect(evalRes.result.secondBrainTag).toBe('#visual_sync');
        expect(evalRes.result.auditAllowed).toBe(true);
        expect(evalRes.result.baseEtaSeconds).toBe(2);
      }
    });

    it('enforces circuit trip HALT_AUDIT_CYCLE_CAP when cycle exceeds 2', async () => {
      const cycleCases = [
        { cycle: 0, expectedAction: 'RECONCILE_WORKSPACE' },
        { cycle: 1, expectedAction: 'RECONCILE_WORKSPACE' },
        { cycle: 2, expectedAction: 'RECONCILE_WORKSPACE' },
        { cycle: 3, expectedAction: 'HALT_AUDIT_CYCLE_CAP' },
        { cycle: 5, expectedAction: 'HALT_AUDIT_CYCLE_CAP' },
        { cycle: 100, expectedAction: 'HALT_AUDIT_CYCLE_CAP' },
      ];

      for (const tc of cycleCases) {
        const evalRes = await firewall.evaluateEventRouter({
          eventType: 'FILE_CHANGE',
          filePath: 'src/index.ts',
          auditCycle: tc.cycle,
        });

        expect(evalRes.result.action).toBe(tc.expectedAction);
        if (tc.cycle > 2) {
          expect(evalRes.result.auditAllowed).toBe(false);
          expect(evalRes.result.secondBrainTag).toBe('#circuit_trip');
        }
      }
    });
  });

  describe('Focus 3: SQLite canvas_nodes & second_brain_notes Independence & Stress', () => {
    it('proves canvas_nodes is 100% decoupled from tasks table foreign keys', () => {
      // PRAGMA foreign_keys is ON in KalinarSqliteStore.
      // If canvas_nodes still referenced tasks(id), inserting an unlisted ID would throw SQLITE_CONSTRAINT_FOREIGNKEY.
      const arbitraryEntityIds = [
        'sb-arbitrary-note-uuid-1',
        'art-standalone-file-hash',
        'external-obsidian-card-99',
        'galaxy-star-entity-007',
      ];

      for (const entityId of arbitraryEntityIds) {
        expect(() => {
          sqliteStore.upsertCanvasNode({
            id: entityId,
            task_id: entityId,
            x: 100.5,
            y: 200.5,
            width: 320,
            height: 180,
            color_token: '6',
            canvas_file: 'KALINAR_GALAXY.canvas',
          });
        }).not.toThrow();
      }

      const allNodes = sqliteStore.getCanvasNodes('KALINAR_GALAXY.canvas');
      expect(allNodes).toHaveLength(4);
    });

    it('handles rapid updates and upserts on canvas_nodes without constraint errors', () => {
      const nodeId = 'stress-node-test';

      for (let i = 0; i < 50; i++) {
        sqliteStore.upsertCanvasNode({
          id: nodeId,
          task_id: nodeId,
          x: i * 10,
          y: i * 20,
          width: 320,
          height: 180,
          color_token: i % 2 === 0 ? '5' : '6',
          canvas_file: 'STRESS.canvas',
        });
      }

      const nodes = sqliteStore.getCanvasNodes('STRESS.canvas');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].x).toBe(490); // 49 * 10
      expect(nodes[0].y).toBe(980); // 49 * 20
      expect(nodes[0].color_token).toBe('6');
    });

    it('verifies second_brain_notes SQL injection resilience and special characters in content', () => {
      const maliciousSqlPayload = "'; DROP TABLE second_brain_notes; --";

      expect(() => {
        sqliteStore.insertSecondBrainNote({
          id: 'note-sqli-test',
          title: `Note with SQLi ${maliciousSqlPayload}`,
          file_path: '01_PROJETOS/test.md',
          wikilink: '[[Test-SQLi]]',
          domain: '01_PROJETOS',
          tags: JSON.stringify(['#sqli', '#test']),
          frontmatter_json: JSON.stringify({ malicious: maliciousSqlPayload }),
          wikilinks_json: JSON.stringify(['[[00_INDEX]]']),
          excerpt: 'Excerpt containing quotes \' " and backslashes \\',
          content: 'Content with Unicode: áéíóú, ñ, ç, and symbols: <script>alert(1)</script>',
        });
      }).not.toThrow();

      // Ensure table still exists and data was safely stored
      const note = sqliteStore.getSecondBrainNoteById('note-sqli-test');
      expect(note).not.toBeNull();
      expect(note?.title).toContain("DROP TABLE");
      expect(note?.content).toContain('<script>alert(1)</script>');

      // Query with malicious string
      const searchRes = sqliteStore.getSecondBrainNotes({ query: maliciousSqlPayload });
      expect(searchRes).toHaveLength(1);
    });

    it('verifies large markdown note persistence (> 50KB) in second_brain_notes', () => {
      const largeContent = '# Large Architecture Spec\n' + 'Line of code and text documentation.\n'.repeat(1500);
      expect(largeContent.length).toBeGreaterThan(50000);

      sqliteStore.insertSecondBrainNote({
        id: 'large-note-01',
        title: 'Large Architecture Spec',
        file_path: '02_PADROES_E_DECISOES/large-spec.md',
        wikilink: '[[Large-Architecture-Spec]]',
        domain: '02_PADROES_E_DECISOES',
        tags: JSON.stringify(['#large', '#spec']),
        frontmatter_json: JSON.stringify({ size: largeContent.length }),
        wikilinks_json: JSON.stringify(['[[00_INDEX]]', '[[02_PADROES_INDEX]]']),
        excerpt: 'Large architecture specification document.',
        content: largeContent,
      });

      const retrieved = sqliteStore.getSecondBrainNoteById('large-note-01');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.content.length).toBe(largeContent.length);
    });
  });

  describe('Focus 4: Path Traversal & Wikilink Extraction Stress', () => {
    it('verifies path traversal sanitization rejects diverse URL-encoded, relative, and shell injection patterns', () => {
      const traversalAttacks = [
        '../outside.md',
        '..\\outside.md',
        'sub/../../escape.md',
        '....//....//escape.md',
        '01_PROJETOS/../../../Windows/System32/calc.exe',
        'note.md; cat /etc/passwd',
        'note.md | whoami',
        'note.md `id`',
        'note.md$(id)',
        'note.md && touch pwned',
        'note\0.md',
      ];

      for (const attack of traversalAttacks) {
        const check = sanitizeWorkspaceFilePath(tempDir, attack);
        expect(check.valid, `Expected attack '${attack}' to be rejected`).toBe(false);
      }
    });

    it('strictly caps extracted [[Wikilinks]] at 2 even when notes contain 10+ wikilinks', () => {
      const connector = new LocalVaultAndMdConnector(tempDir);
      const notesDir = path.join(tempDir, '01_PROJETOS');
      fs.mkdirSync(notesDir, { recursive: true });

      const multiLinkFile = path.join(notesDir, 'hyper-linked-note.md');
      const links = Array.from({ length: 12 }, (_, i) => `[[Reference-Doc-${i + 1}]]`).join(' ');
      const content = `---\ntitle: Hyper Linked\n---\n# Hyper Linked\nLinks: ${links}\nEnd of note.`;

      fs.writeFileSync(multiLinkFile, content, 'utf-8');

      const result = connector.querySecondBrainVault({ query: 'Hyper Linked' });
      expect(result.success).toBe(true);
      expect(result.notes).toHaveLength(1);

      const note = result.notes[0];
      expect(note.wikilinks.length).toBeLessThanOrEqual(2);
      expect(note.wikilinks).toEqual(['Reference-Doc-1', 'Reference-Doc-2']);
    });
  });
});
