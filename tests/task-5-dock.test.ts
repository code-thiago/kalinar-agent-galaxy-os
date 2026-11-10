import { describe, it, expect } from 'vitest';
import { StepDivisionCell, TelemetryMatrixTable } from '../src/components/terminal/TelemetryMatrixTable';
import { EvolutionChartsView } from '../src/components/terminal/EvolutionChartsView';
import { CortexSecondBrainView } from '../src/components/terminal/CortexSecondBrainView';
import { WarRoomTerminalView } from '../src/components/terminal/WarRoomTerminalView';
import { KalinarBottomDock } from '../src/components/dock/KalinarBottomDock';
import { SecondBrainCortexTab } from '../src/components/terminal/SecondBrainCortexTab';
import { AntigravityCliTab } from '../src/components/terminal/AntigravityCliTab';
import { ELECTRON_IPC_CHANNELS } from '../electron/preload.js';
import { validatePidSafety } from '../electron/daemon/ProcessController';
import {
  extractFilePathFromDiff,
  findAgentByIdentifier,
  formatEtaCountdown,
  resolveAgentStatusPalette,
} from '../src/core/telemetryFormatters';
import { useKalinarStore } from '../src/store/useKalinarStore';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 5: Retractable IDE Bottom Dock, Step Matrix & Evolution Charts', () => {
  describe('Cycle 1: React.memo Component Isolation & 60 FPS Protection', () => {
    it('verifies StepDivisionCell, TelemetryMatrixTable, and EvolutionChartsView are memoized', () => {
      // React.memo components have a $$typeof of Symbol(react.memo) or type object
      expect((StepDivisionCell as any).$$typeof?.toString()).toContain('react.memo');
      expect((TelemetryMatrixTable as any).$$typeof?.toString()).toContain('react.memo');
      expect((EvolutionChartsView as any).$$typeof?.toString()).toContain('react.memo');
      expect((CortexSecondBrainView as any).$$typeof?.toString()).toContain('react.memo');
      expect((WarRoomTerminalView as any).$$typeof?.toString()).toContain('react.memo');
      expect((KalinarBottomDock as any).$$typeof?.toString()).toContain('react.memo');
      expect((SecondBrainCortexTab as any).$$typeof?.toString()).toContain('react.memo');
      expect((AntigravityCliTab as any).$$typeof?.toString()).toContain('react.memo');
    });
  });

  describe('Cycle 2: Design System, Tabular Nums & Zero-Emoji Audit', () => {
    it('verifies strictly zero decorative emojis in all terminal and dock components', () => {
      const terminalDir = path.resolve(process.cwd(), 'src/components/terminal');
      const dockDir = path.resolve(process.cwd(), 'src/components/dock');
      const files = [
        ...fs.readdirSync(terminalDir).map((f) => path.join(terminalDir, f)),
        ...fs.readdirSync(dockDir).map((f) => path.join(dockDir, f)),
      ];

      // Extended emoji pattern detecting Unicode emojis
      const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      for (const filePath of files) {
        if (!/\.(ts|tsx)$/.test(filePath)) continue;
        const content = fs.readFileSync(filePath, 'utf-8');

        expect(emojiRegex.test(content)).toBe(false);
      }
    });

    it('validates 36px tactical collapsed bar and 350px / 75vh expanded height contracts', () => {
      const dockFilePath = path.resolve(process.cwd(), 'src/components/terminal/KalinarBottomDock.tsx');
      const content = fs.readFileSync(dockFilePath, 'utf-8');

      expect(content).toContain('h-[36px]');
      expect(content).toContain('h-[350px]');
      expect(content).toContain('h-[75vh]');
      expect(content).toContain('data-slot="dock-root"');
      expect(content).toContain('data-slot="dock-status-bar"');
      expect(content).toContain('data-slot="dock-viewport"');
    });

    it('validates step cell data-slots in TelemetryMatrixTable', () => {
      const tableFilePath = path.resolve(process.cwd(), 'src/components/terminal/TelemetryMatrixTable.tsx');
      const content = fs.readFileSync(tableFilePath, 'utf-8');

      expect(content).toContain('data-slot="step-fraction"');
      expect(content).toContain('data-slot="step-bar-track"');
      expect(content).toContain('data-slot="step-label"');
      expect(content).toContain('tabular-nums');
    });
  });

  describe('Cycle 3: Retractable Bottom Dock, SQLite Charts, Canvas Cortex & Real IPC Shell', () => {
    it('enforces src/components/dock/KalinarBottomDock.tsx positioning, counters, and 4 quick tabs', () => {
      const appContent = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');
      expect(appContent).toContain('./components/dock/KalinarBottomDock.js');

      const dockContent = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/dock/KalinarBottomDock.tsx'),
        'utf-8'
      );
      expect(dockContent).toContain('zIndex: 20');
      expect(dockContent).toContain('rgba(7, 8, 10, 0.94)');
      expect(dockContent).toContain('1px solid #1A1D26');
      expect(dockContent).toContain("pointerEvents: 'auto'");
      expect(dockContent).toContain("height: '36px'");
      expect(dockContent).toContain("'350px'");
      expect(dockContent).toContain("'75vh'");
      expect(dockContent).toContain('ACTIVE SWARM:');
      expect(dockContent).toContain('TOTAL TOKENS:');
      expect(dockContent).toContain('ZEN ENGINE:');
      expect(dockContent).toContain('SQLITE WAL:');
      expect(dockContent).toContain('[ 01 // STEP MATRIX ]');
      expect(dockContent).toContain('[ 02 // EVOLUTION CHARTS ]');
      expect(dockContent).toContain('[ 03 // SECOND BRAIN & ZEN CORTEX ]');
      expect(dockContent).toContain('[ 04 // ANTIGRAVITY PTY CLI ]');
      expect(dockContent).toContain('[ EXPAND DOCK ^ ]');
    });

    it('verifies Tab 1 TelemetryMatrixTable columns, formatter utilities, and PID > 100 IPC gate', () => {
      const content = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/terminal/TelemetryMatrixTable.tsx'),
        'utf-8'
      );
      expect(content).toContain('VELOCITY');
      expect(content).toContain('TOK/S');
      expect(content).toContain('formatModelBadge');
      expect(content).toContain('formatEtaCountdown');
      expect(content).toContain('[ PAUSE ]');
      expect(content).toContain('[ INSPECT DIFF ]');
      expect(content).toContain('[ KILL PID ]');

      expect(formatEtaCountdown(0)).toBe('00m 00s');
      expect(formatEtaCountdown(74)).toBe('01m 14s');
      expect(
        extractFilePathFromDiff('@@ -42,2 +42,4 @@ src/services/kalinarVoiceService.ts\n+gain')
      ).toBe('src/services/kalinarVoiceService.ts');
      const agents = useKalinarStore.getState().agents;
      expect(findAgentByIdentifier(agents, '@agent-orchestrator')?.id).toBe(
        'agent-orchestrator-01'
      );
      expect(resolveAgentStatusPalette('[ACTIVE]').fg).toBe('#34D399');
      expect(resolveAgentStatusPalette('[PAUSED]').fg).toBe('#FBBF24');
      expect(resolveAgentStatusPalette('[HALTED]').fg).toBe('#F87171');

      expect(ELECTRON_IPC_CHANNELS).toContain('kalinar:control_process_pid');
      expect(validatePidSafety(4).safe).toBe(false);
      expect(validatePidSafety(100).safe).toBe(false);
      expect(validatePidSafety(14201).safe).toBe(true);
    });

    it('verifies Tab 2 EvolutionChartsView SQLite WAL hydration & 3 Vector SVG charts', () => {
      const content = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/terminal/EvolutionChartsView.tsx'),
        'utf-8'
      );
      expect(content).toContain('getHistoricalTelemetry');
      expect(content).toContain('getEvolutionSummary');
      expect(content).toContain('[01 // TOKEN BURN RATE]');
      expect(content).toContain('[02 // STEP COMPLETION VELOCITY]');
      expect(content).toContain('[03 // ZEN ENGINE LATENCY]');
      expect(content).toContain('repeat(3, minmax(0, 1fr))');
      expect(content).toContain('<svg');
    });

    it('verifies Tab 3 SecondBrainCortexTab Canvas sync, Vault RAG, Note Injector & 5 JDM Graphs', () => {
      const content = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/terminal/SecondBrainCortexTab.tsx'),
        'utf-8'
      );
      expect(content).toContain('syncObsidianCanvas');
      expect(content).toContain('KALINAR_GALAXY.canvas');
      expect(content).toContain('querySecondBrainVault');
      expect(content).toContain('injectSecondBrainNote');
      expect(content).toContain('[ PULL INTO SINGULARITY ]');
      expect(content).toContain('daemon-event-router.jdm.json');
      expect(content).toContain('os-execution-firewall.jdm.json');
      expect(content).toContain('voice-command-guard.jdm.json');
      expect(content).toContain('execution-gate.jdm.json');
      expect(content).toContain('llm-model-router.jdm.json');
    });

    it('verifies Tab 4 AntigravityCliTab real IPC shell & built-in shortcuts', () => {
      const content = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/terminal/AntigravityCliTab.tsx'),
        'utf-8'
      );
      expect(content).toContain('executeShellCommand');
      expect(content).toContain('evaluateOsFirewall');
      expect(content).toContain("case 'status':");
      expect(content).toContain("case 'model':");
      expect(content).toContain("case 'diff':");
      expect(content).toContain("case 'fifo':");
      expect(content).toContain("case 'rag':");
    });
  });
});
