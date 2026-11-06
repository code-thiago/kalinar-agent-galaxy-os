/**
 * CHALLENGER 2 EMPIRICAL SECURITY & PERFORMANCE HARNESS (v1.3.0)
 * Empirical stress testing: Path Traversal, Wikilinks Cap, Excerpt Truncation,
 * GoRules ZEN JDM Latency Benchmark (< 1ms), DSP Normalization [0.0, 1.0],
 * and Sovereign pt-BR Voice Directive Parsing.
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
import {
  LocalVaultAndMdConnector,
  sanitizeWorkspaceFilePath,
} from '../src/connectors/AgentConnectorRegistry.js';

describe('Challenger 2: Empirical Security & Performance Verification Suite', () => {
  let tempDir: string;
  let sqliteStore: KalinarSqliteStore;
  let firewall: ZenFirewall;
  let testDbPath: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kalinar-c2-stress-'));
    testDbPath = path.join(tempDir, 'c2-state.db');
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

  /* =========================================================================
     1. EMPIRICAL CHALLENGE: PATH TRAVERSAL SANITIZATION
     ========================================================================= */
  describe('1. Empirical Path Traversal Stress Tests', () => {
    const maliciousPaths = [
      // Basic traversal
      '../outside.md',
      '..\\outside.md',
      '../../etc/passwd',
      '..\\..\\secret.md',
      'foo/bar/../../../outside.md',
      '01_PROJETOS/../../windows/system32/cmd.exe',
      // Encoded variants
      '%2e%2e/outside.md',
      '%2e%2e%2foutside.md',
      '..%2foutside.md',
      '%252e%252e/outside.md',
      // Null byte injections
      'valid.md\0.exe',
      '01_PROJETOS/note.md\0/../../shadow',
      '\0',
      '   \0   ',
      // Shell metacharacters
      'test;cat /etc/passwd',
      'test&whoami',
      'test|id',
      'test`id`',
      'test$(whoami)',
      'test<input',
      'test>output',
      // Absolute paths escaping boundary
      'C:\\Windows\\System32\\calc.exe',
      'C:/Windows/System32/cmd.exe',
      '/etc/shadow',
      '/var/log/syslog',
      '\\\\server\\share\\malicious.md',
      'D:\\other-drive\\file.md',
      // Root escapes
      '/',
      '\\',
      'C:\\',
      'C:/',
    ];

    it('empirically verifies sanitizeWorkspaceFilePath blocks all malicious traversal vectors', () => {
      const results: { path: string; valid: boolean; reason?: string }[] = [];

      for (const p of maliciousPaths) {
        const check = sanitizeWorkspaceFilePath(tempDir, p);
        results.push({ path: p, valid: check.valid, reason: check.reason });
      }

      const escaped = results.filter((r) => r.valid);
      expect(
        escaped,
        `Malicious paths bypassed sanitizeWorkspaceFilePath: ${JSON.stringify(escaped)}`
      ).toHaveLength(0);
    });

    it('empirically verifies querySecondBrainVault rejects malicious targetPath', () => {
      const connector = new LocalVaultAndMdConnector(tempDir);

      for (const p of maliciousPaths) {
        const res = connector.querySecondBrainVault({ targetPath: p });
        expect(res.success, `Expected query to fail for path: ${p}`).toBe(false);
        expect(res.notes).toHaveLength(0);
        expect(res.error).toBeDefined();
      }
    });

    it('empirically verifies injectSecondBrainNote rejects malicious filePath, notePath, and domain traversal', () => {
      const connector = new LocalVaultAndMdConnector(tempDir);

      // 1. Direct malicious filePath
      for (const p of maliciousPaths) {
        const res = connector.injectSecondBrainNote(
          {
            title: 'Malicious Path Note',
            domain: '01_PROJETOS',
            tags: ['#security'],
            content: 'payload',
            filePath: p,
          },
          sqliteStore
        );
        expect(res.success, `Expected injection to fail for filePath: ${p}`).toBe(false);
        expect(res.persistedToDisk).toBe(false);
        expect(res.persistedToSqlite).toBe(false);
      }

      // 2. Traversal via domain field when filePath is omitted
      const domainTraversals = [
        '../../etc',
        '..\\..\\windows',
        '../01_PROJETOS/../../outside',
        '/etc',
        'C:\\Windows',
      ];
      for (const dom of domainTraversals) {
        const res = connector.injectSecondBrainNote(
          {
            title: 'Domain Traversal Note',
            domain: dom,
            tags: ['#security'],
            content: 'payload',
          },
          sqliteStore
        );
        expect(res.success, `Expected injection to fail for domain traversal: ${dom}`).toBe(false);
        expect(res.persistedToDisk).toBe(false);
        expect(res.persistedToSqlite).toBe(false);
      }
    });
  });

  /* =========================================================================
     2. EMPIRICAL CHALLENGE: FRONTMATTER, WIKILINKS CAP & EXCERPT TRUNCATION
     ========================================================================= */
  describe('2. Empirical Frontmatter, Wikilinks & Excerpt Guarantees', () => {
    it('empirically validates wikilinks capping strictly at <= 2 across adversarial densities', () => {
      const connector = new LocalVaultAndMdConnector(tempDir);
      const testDir = path.join(tempDir, '01_PROJETOS');
      fs.mkdirSync(testDir, { recursive: true });

      // Test with 0, 1, 2, 5, 20, 50 wikilinks, with duplicates and aliases
      const linkCounts = [0, 1, 2, 5, 20, 50];

      for (const count of linkCounts) {
        const links = Array.from({ length: count }, (_, i) => `[[Note-${i + 1}|Alias-${i + 1}]]`);
        // Add duplicates
        if (count > 2) {
          links.push('[[Note-1]]');
          links.push('[[Note-2]]');
        }

        const noteFile = path.join(testDir, `density-${count}.md`);
        const content = [
          '---',
          `title: "Density Test ${count}"`,
          'domain: "01_PROJETOS"',
          'tags: ["#test"]',
          '---',
          '',
          `# Density Test ${count}`,
          '',
          `Links: ${links.join(' ')}`,
          'Body description text with sufficient length for testing.',
        ].join('\n');

        fs.writeFileSync(noteFile, content, 'utf-8');

        const queryRes = connector.querySecondBrainVault({ query: `Density Test ${count}` });
        expect(queryRes.success).toBe(true);
        expect(queryRes.notes).toHaveLength(1);

        const note = queryRes.notes[0];
        expect(
          note.wikilinks.length,
          `Wikilinks length exceeded cap of 2 on file density-${count}.md: ${JSON.stringify(note.wikilinks)}`
        ).toBeLessThanOrEqual(2);

        if (count >= 2) {
          expect(note.wikilinks).toHaveLength(2);
          expect(note.wikilinks[0]).toBe('Note-1');
          expect(note.wikilinks[1]).toBe('Note-2');
        } else if (count === 1) {
          expect(note.wikilinks).toHaveLength(1);
          expect(note.wikilinks[0]).toBe('Note-1');
        } else {
          expect(note.wikilinks).toHaveLength(0);
        }
      }
    });

    it('empirically validates excerpt truncation strictly under 250 characters across extreme payloads', () => {
      const connector = new LocalVaultAndMdConnector(tempDir);
      const testDir = path.join(tempDir, '02_PADROES');
      fs.mkdirSync(testDir, { recursive: true });

      // Scenario A: Massive continuous text without whitespace (500 chars)
      const massiveContinuous = 'A'.repeat(500);
      const noteA = path.join(testDir, 'massive-continuous.md');
      fs.writeFileSync(
        noteA,
        `---\ntitle: "Continuous"\n---\n# Title\n\n${massiveContinuous}`,
        'utf-8'
      );

      // Scenario B: Markdown with code blocks, html tags, headings, formatting
      const formattedText = [
        '---',
        'title: "Formatted"',
        '---',
        '# Header 1',
        '## Header 2',
        '```typescript',
        'const a = 1; console.log(a);',
        'const b = 2; console.log(b);',
        '```',
        '<div><span>HTML element</span></div>',
        '**Bold text** and *italic text* and `inline code` and [Markdown Link](https://kalinar.os).',
        'Long paragraph: ' + 'Word '.repeat(80),
      ].join('\n');
      const noteB = path.join(testDir, 'formatted.md');
      fs.writeFileSync(noteB, formattedText, 'utf-8');

      // Query both and assert excerpt length < 250
      const resA = connector.querySecondBrainVault({ query: 'Continuous' });
      expect(resA.success).toBe(true);
      expect(resA.notes[0].excerpt.length).toBeLessThan(250);

      const resB = connector.querySecondBrainVault({ query: 'Formatted' });
      expect(resB.success).toBe(true);
      expect(resB.notes[0].excerpt.length).toBeLessThan(250);

      // Scenario C: Empty body with very long title (Challenge the fallback: `Second Brain note ${title}`)
      const longTitle = 'TitleExceedingLimit'.repeat(20); // 380 chars
      const noteC = path.join(testDir, 'long-title.md');
      fs.writeFileSync(
        noteC,
        `---\ntitle: "${longTitle}"\n---\n# ${longTitle}\n\n`,
        'utf-8'
      );
      const resC = connector.querySecondBrainVault({ query: 'TitleExceedingLimit' });
      expect(resC.success).toBe(true);

      // Check whether long title causes excerpt to breach 250 characters
      const noteCExcerpt = resC.notes[0].excerpt;
      console.log(`[CHALLENGE_2] Empty body long title excerpt length: ${noteCExcerpt.length}`);
      expect(noteCExcerpt.length, `Excerpt length ${noteCExcerpt.length} exceeds 250 character cap on empty body note with long title`).toBeLessThan(250);
    });
  });

  /* =========================================================================
     3. EMPIRICAL CHALLENGE: 5 GORULES ZEN JDM EVALUATOR BENCHMARK (< 1ms)
     ========================================================================= */
  describe('3. Empirical GoRules ZEN JDM Evaluator Latency & Robustness Benchmark', () => {
    it('empirically benchmarks 1,000 evaluations of each 5 JDM graphs ensuring < 1ms (< 0.45ms typical)', async () => {
      const iterations = 1000;

      // 1. daemon-event-router
      const routerLatencies: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const t = await firewall.evaluateEventRouter({
          eventType: i % 2 === 0 ? 'AGENT_TURN' : 'FILE_WATCH',
          filePath: i % 2 === 0 ? 'src/core/ZenFirewall.ts' : 'KALINAR_GALAXY.canvas',
          auditCycle: i % 4,
        });
        routerLatencies.push(t.latencyMs);
      }

      // 2. os-execution-firewall
      const osLatencies: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const t = await firewall.evaluateOsFirewall({
          command: i % 3 === 0 ? 'git status' : i % 3 === 1 ? 'rm -rf /' : 'tsc --noEmit',
          isSandbox: i % 2 === 0,
        });
        osLatencies.push(t.latencyMs);
      }

      // 3. voice-command-guard
      const voiceLatencies: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const t = await firewall.evaluateVoiceCommand({
          intent: i % 2 === 0 ? 'SEARCH_SECOND_BRAIN' : 'SYNC_OBSIDIAN_CANVAS',
          action: i % 2 === 0 ? 'CORTEX_NOTE_INGEST' : 'CANVAS_TOPOLOGY_SYNC',
          isDestructive: false,
        });
        voiceLatencies.push(t.latencyMs);
      }

      // 4. execution-gate
      const gateLatencies: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const t = await firewall.evaluateExecutionGate({
          executionMode: i % 2 === 0 ? 'AUTO_PILOT' : 'STEP_BY_STEP_GATE',
          isDestructiveAction: false,
          hasSingleWriterLock: true,
        });
        gateLatencies.push(t.latencyMs);
      }

      // 5. llm-model-router
      const llmLatencies: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const t = await firewall.evaluateLlmModelRouter({
          taskDomain: i % 3 === 0 ? 'ARCHITECTURE' : i % 3 === 1 ? 'UI' : 'RAG',
          errorCode: 'NONE',
          retryCount: 0,
        });
        llmLatencies.push(t.latencyMs);
      }

      const calcStats = (arr: number[]) => {
        const sorted = [...arr].sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        return {
          min: sorted[0],
          max: sorted[sorted.length - 1],
          avg: Number((sum / sorted.length).toFixed(3)),
          p95: sorted[Math.floor(sorted.length * 0.95)],
          p99: sorted[Math.floor(sorted.length * 0.99)],
        };
      };

      const s1 = calcStats(routerLatencies);
      const s2 = calcStats(osLatencies);
      const s3 = calcStats(voiceLatencies);
      const s4 = calcStats(gateLatencies);
      const s5 = calcStats(llmLatencies);

      console.log(`[CHALLENGE_2_BENCHMARK] daemon-event-router: min=${s1.min}ms avg=${s1.avg}ms p95=${s1.p95}ms max=${s1.max}ms`);
      console.log(`[CHALLENGE_2_BENCHMARK] os-execution-firewall: min=${s2.min}ms avg=${s2.avg}ms p95=${s2.p95}ms max=${s2.max}ms`);
      console.log(`[CHALLENGE_2_BENCHMARK] voice-command-guard: min=${s3.min}ms avg=${s3.avg}ms p95=${s3.p95}ms max=${s3.max}ms`);
      console.log(`[CHALLENGE_2_BENCHMARK] execution-gate: min=${s4.min}ms avg=${s4.avg}ms p95=${s4.p95}ms max=${s4.max}ms`);
      console.log(`[CHALLENGE_2_BENCHMARK] llm-model-router: min=${s5.min}ms avg=${s5.avg}ms p95=${s5.p95}ms max=${s5.max}ms`);

      // Guarantees: every graph max latency < 1.0ms, average < 0.45ms
      expect(s1.max).toBeLessThan(1.0);
      expect(s1.avg).toBeLessThan(0.45);

      expect(s2.max).toBeLessThan(1.0);
      expect(s2.avg).toBeLessThan(0.45);

      expect(s3.max).toBeLessThan(1.0);
      expect(s3.avg).toBeLessThan(0.45);

      expect(s4.max).toBeLessThan(1.0);
      expect(s4.avg).toBeLessThan(0.45);

      expect(s5.max).toBeLessThan(1.0);
      expect(s5.avg).toBeLessThan(0.45);
    });

    it('empirically verifies JDM evaluator resilience against malformed and empty payloads', async () => {
      // Empty input
      const r1 = await firewall.evaluateEventRouter({} as any);
      expect(r1.result).toBeDefined();
      expect(r1.latencyMs).toBeLessThan(1.0);

      const r2 = await firewall.evaluateOsFirewall({} as any);
      expect(r2.result).toBeDefined();
      expect(r2.latencyMs).toBeLessThan(1.0);

      const r3 = await firewall.evaluateVoiceCommand({} as any);
      expect(r3.result).toBeDefined();
      expect(r3.latencyMs).toBeLessThan(1.0);

      const r4 = await firewall.evaluateExecutionGate({} as any);
      expect(r4.result).toBeDefined();
      expect(r4.latencyMs).toBeLessThan(1.0);

      const r5 = await firewall.evaluateLlmModelRouter({} as any);
      expect(r5.result).toBeDefined();
      expect(r5.latencyMs).toBeLessThan(1.0);
    });
  });

  /* =========================================================================
     4. EMPIRICAL CHALLENGE: DSP FREQUENCY NORMALIZATION & VOICE DIRECTIVES
     ========================================================================= */
  describe('4. Empirical DSP Normalization & Voice Directive Stress Tests', () => {
    it('empirically verifies DSP frequency bands strictly clamped within [0.0, 1.0] under extreme audio frames', () => {
      const extremeFrames: Array<Uint8Array | number[]> = [
        // All zeros (complete silence)
        new Uint8Array(128).fill(0),
        // All max 255 (maximum audio saturation / clipping)
        new Uint8Array(128).fill(255),
        // Out of bound numbers (overflows > 255 and negatives)
        new Array(128).fill(1000),
        new Array(128).fill(-500),
        // Extreme alternating spikes
        new Uint8Array(128).map((_, i) => (i % 2 === 0 ? 255 : 0)),
        // Empty frame
        [],
        // Oversized frame (512 bins)
        new Uint8Array(512).fill(200),
      ];

      for (const frame of extremeFrames) {
        const bands = kalinarVoiceService.feedPcmFrequencyFrame(frame);

        expect(bands.subBass).toBeGreaterThanOrEqual(0.0);
        expect(bands.subBass).toBeLessThanOrEqual(1.0);

        expect(bands.lowMid).toBeGreaterThanOrEqual(0.0);
        expect(bands.lowMid).toBeLessThanOrEqual(1.0);

        expect(bands.highPresence).toBeGreaterThanOrEqual(0.0);
        expect(bands.highPresence).toBeLessThanOrEqual(1.0);

        expect(bands.compositePulse).toBeGreaterThanOrEqual(0.0);
        expect(bands.compositePulse).toBeLessThanOrEqual(1.0);
      }
    });

    it('empirically tests pt-BR voice directive parsing across variations, casing and edge inputs', () => {
      const testCases: Array<{
        transcript: string;
        expectedIntent: string;
        expectedAction?: string;
      }> = [
        // Pull Second Brain
        { transcript: 'PUXAR NOTAS SOBRE ARQUITETURA', expectedIntent: 'PULL_SECOND_BRAIN', expectedAction: 'CORTEX_NOTE_INGEST' },
        { transcript: 'puxar para a singularidade', expectedIntent: 'PULL_SECOND_BRAIN', expectedAction: 'CORTEX_NOTE_INGEST' },
        { transcript: 'puxar segundo cérebro', expectedIntent: 'PULL_SECOND_BRAIN', expectedAction: 'CORTEX_NOTE_INGEST' },
        { transcript: 'puxar segundo cerebro', expectedIntent: 'PULL_SECOND_BRAIN', expectedAction: 'CORTEX_NOTE_INGEST' },

        // Search Second Brain
        { transcript: 'PESQUISAR NOTAS DE SEGURANÇA', expectedIntent: 'SEARCH_SECOND_BRAIN', expectedAction: 'CORTEX_NOTE_INGEST' },
        { transcript: 'buscar no second brain diretrizes', expectedIntent: 'SEARCH_SECOND_BRAIN', expectedAction: 'CORTEX_NOTE_INGEST' },
        { transcript: 'varrer cofre', expectedIntent: 'SEARCH_SECOND_BRAIN', expectedAction: 'CORTEX_NOTE_INGEST' },
        { transcript: 'consultar notas financeiras', expectedIntent: 'SEARCH_SECOND_BRAIN', expectedAction: 'CORTEX_NOTE_INGEST' },

        // Canvas Sync
        { transcript: 'SINCRONIZAR CANVAS', expectedIntent: 'SYNC_OBSIDIAN_CANVAS', expectedAction: 'CANVAS_TOPOLOGY_SYNC' },
        { transcript: 'exportar topologia para obsidian', expectedIntent: 'SYNC_OBSIDIAN_CANVAS', expectedAction: 'CANVAS_TOPOLOGY_SYNC' },
        { transcript: 'atualizar canvas', expectedIntent: 'SYNC_OBSIDIAN_CANVAS', expectedAction: 'CANVAS_TOPOLOGY_SYNC' },
        { transcript: 'sincronizar galáxia com o canvas', expectedIntent: 'SYNC_OBSIDIAN_CANVAS', expectedAction: 'CANVAS_TOPOLOGY_SYNC' },
        { transcript: 'sync obsidian canvas', expectedIntent: 'SYNC_OBSIDIAN_CANVAS', expectedAction: 'CANVAS_TOPOLOGY_SYNC' },

        // Status & Telemetry
        { transcript: 'relatório tático do enxame', expectedIntent: 'GET_SWARM_STATUS', expectedAction: 'GET_STATUS' },
        { transcript: 'como estão os agentes', expectedIntent: 'GET_SWARM_STATUS', expectedAction: 'GET_STATUS' },

        // Non-command random voice
        { transcript: 'olá mundo isso é apenas conversa fiada', expectedIntent: 'UNKNOWN' },
        { transcript: '', expectedIntent: 'UNKNOWN' },
      ];

      for (const tc of testCases) {
        const parsed = parseVoiceDirective(tc.transcript);
        expect(
          parsed.intent,
          `Failed parsing transcript '${tc.transcript}': expected ${tc.expectedIntent}, got ${parsed.intent}`
        ).toBe(tc.expectedIntent);

        if (tc.expectedAction) {
          expect(parsed.action).toBe(tc.expectedAction);
        }
      }
    });
  });
});
