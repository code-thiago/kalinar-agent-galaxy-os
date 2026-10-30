import { describe, it, expect, beforeAll } from 'vitest';
import { ZenFirewall } from '../src/core/ZenFirewall';
import { KalinarSingularityBrain } from '../src/services/kalinarSingularityBrain';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 4: Kalinar Sovereign Voice Core & Acoustic Singular Guardrails', () => {
  let firewall: ZenFirewall;
  let brain: KalinarSingularityBrain;

  beforeAll(async () => {
    firewall = new ZenFirewall();
    await firewall.initialize();
    brain = KalinarSingularityBrain.getInstance();
  });

  describe('Cycle 1: GoRules ZEN Voice Guardrail Evaluation (< 1ms)', () => {
    it('evaluates Second Brain activation intent in under 1ms', async () => {
      const { result, latencyMs } = await firewall.evaluateVoiceCommand({
        intent: 'ACTIVATE_SECOND_BRAIN',
        action: 'INGEST_DOCS',
        isDestructive: false,
      });

      expect(latencyMs).toBeLessThan(1.0);
      expect(result.allowed).toBe(true);
      expect(result.targetHandler).toBe('activateSecondBrain');
      expect(result.auditRisk).toBe('LOW');
    });

    it('evaluates swarm telemetry status request in under 1ms', async () => {
      const { result, latencyMs } = await firewall.evaluateVoiceCommand({
        intent: 'GET_SWARM_STATUS',
        action: 'GET_STATUS',
        isDestructive: false,
      });

      expect(latencyMs).toBeLessThan(1.0);
      expect(result.allowed).toBe(true);
      expect(result.targetHandler).toBe('getSwarmDevelopmentStatus');
    });

    it('flags destructive agent termination with HIGH audit risk', async () => {
      const { result } = await firewall.evaluateVoiceCommand({
        intent: 'CONTROL_AGENT',
        action: 'KILL',
        isDestructive: true,
      });

      expect(result.allowed).toBe(true);
      expect(result.targetHandler).toBe('controlAgentExecution');
      expect(result.auditRisk).toBe('HIGH');
    });

    it('rejects unknown voice command intents with safe fallback', async () => {
      const { result } = await firewall.evaluateVoiceCommand({
        intent: 'UNKNOWN',
        isDestructive: false,
      });

      expect(result.allowed).toBe(false);
      expect(result.targetHandler).toBe('rejectVoiceCommand');
    });
  });

  describe('Cycle 1: Sovereign Brain Semantic Intent Parser', () => {
    it('correctly maps spoken phrases to tactical intents', () => {
      const res1 = brain.parseVoiceDirective('Kalinar, acionar Second Brain agora');
      expect(res1.intent).toBe('ACTIVATE_SECOND_BRAIN');

      const res2 = brain.parseVoiceDirective('Qual é a situação do enxame e relatório de telemetria?');
      expect(res2.intent).toBe('GET_SWARM_STATUS');

      const res3 = brain.parseVoiceDirective('Encerrar o processo do @agent-software-engineer');
      expect(res3.intent).toBe('CONTROL_AGENT');
      expect(res3.action).toBe('KILL');
      expect(res3.targetAgent).toBe('@agent-software-engineer');

      const res4 = brain.parseVoiceDirective('Kalinar, aprovar diff do dev');
      expect(res4.intent).toBe('CONTROL_AGENT');
      expect(res4.action).toBe('APPROVE_DIFF');

      const res5 = brain.parseVoiceDirective('Executar no Antigravity tarefa de teste para o software engineer');
      expect(res5.intent).toBe('DISPATCH_ANTIGRAVITY');
    });

    it('generates commanding tactical briefing addressing Thiago without servility', () => {
      const briefing = brain.generateTacticalBriefing({
        userName: 'Thiago',
        agents: [
          {
            id: 'agent-software-engineer',
            filename: '@agent-software-engineer',
            pid: 12044,
            status: '[ACTIVE]',
            executionMode: 'AUTO_PILOT',
            currentObjective: 'Engine de voz',
            totalSteps: 6,
            currentStep: 4,
            stepDescription: 'Acoplamento acústico do buraco negro',
            tokensPrompt: 24000,
            tokensCompletion: 4400,
            tokenVelocity: 85,
            etaSeconds: 42,
            position3D: [0, 0, 0],
            livePreviewStream: '',
          },
        ],
        secondBrainDirectivesCount: 3,
        activeDirective: 'SOVEREIGN_GRAVITY',
      });

      expect(briefing).toContain('Thiago');
      expect(briefing).toContain('singularidade estabilizada');
      expect(briefing).toContain('@agent-software-engineer');
      expect(briefing).toContain('etapa 4 de 6');
      expect(briefing).toContain('28.400');
      expect(briefing).toContain('42 segundos');
      expect(briefing).toContain('Qual é a próxima ordem para o enxame?');
    });
  });

  describe('Cycle 2: Persona Audit & Zero-J.A.R.V.I.S. Grounding', () => {
    it('verifies zero occurrences of prohibited persona terms across repository', () => {
      const searchDirs = ['src', 'electron'];
      const prohibitedTerms = ['jarvis', 'j.a.r.v.i.s.'];

      for (const dir of searchDirs) {
        const fullDir = path.resolve(process.cwd(), dir);
        if (!fs.existsSync(fullDir)) continue;

        const scanRecursive = (currentPath: string) => {
          const entries = fs.readdirSync(currentPath, { withFileTypes: true });
          for (const entry of entries) {
            const p = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
              scanRecursive(p);
            } else if (entry.isFile() && /\.(ts|tsx|json|md)$/.test(entry.name)) {
              const content = fs.readFileSync(p, 'utf-8').toLowerCase();
              for (const term of prohibitedTerms) {
                expect(content.includes(term)).toBe(false);
              }
            }
          }
        };

        scanRecursive(fullDir);
      }
    });

    it('validates WCAG 2.2 AAA color contrast for Singularity Lavender (#AA88FF) on Void (#000000)', () => {
      // Relative luminance calculation according to W3C WCAG 2.2 specs
      const sRGBtoLin = (colorChannel: number) => {
        const c = colorChannel / 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };

      // #AA88FF -> R=170, G=136, B=255
      const r = sRGBtoLin(170);
      const g = sRGBtoLin(136);
      const b = sRGBtoLin(255);
      const lLavender = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      // #000000 -> L = 0.0
      const lVoid = 0.0;

      const contrastRatio = (lLavender + 0.05) / (lVoid + 0.05);

      // AAA requirement for standard text is >= 7.0:1
      expect(contrastRatio).toBeGreaterThanOrEqual(7.0);
      expect(contrastRatio).toBeGreaterThan(7.5);
    });
  });
});
