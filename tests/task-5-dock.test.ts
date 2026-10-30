import { describe, it, expect } from 'vitest';
import { StepDivisionCell, TelemetryMatrixTable } from '../src/components/terminal/TelemetryMatrixTable';
import { EvolutionChartsView } from '../src/components/terminal/EvolutionChartsView';
import { CortexSecondBrainView } from '../src/components/terminal/CortexSecondBrainView';
import { WarRoomTerminalView } from '../src/components/terminal/WarRoomTerminalView';
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
    });
  });

  describe('Cycle 2: Design System, Tabular Nums & Zero-Emoji Audit', () => {
    it('verifies strictly zero decorative emojis in all terminal and dock components', () => {
      const terminalDir = path.resolve(process.cwd(), 'src/components/terminal');
      const files = fs.readdirSync(terminalDir);

      // Extended emoji pattern detecting Unicode emojis
      const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      for (const file of files) {
        if (!/\.(ts|tsx)$/.test(file)) continue;
        const filePath = path.join(terminalDir, file);
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
});
