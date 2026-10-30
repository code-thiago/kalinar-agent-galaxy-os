import { describe, it, expect } from 'vitest';
import { SecondBrainCortexTab } from '../src/components/terminal/SecondBrainCortexTab';
import { AntigravityCliTab } from '../src/components/terminal/AntigravityCliTab';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 6: Second Brain Cortex, Antigravity CLI & Singularity v1.0.0 E2E Audit', () => {
  describe('Cycle 1: Component Integrity & Memoization', () => {
    it('verifies SecondBrainCortexTab and AntigravityCliTab are isolated with React.memo', () => {
      expect((SecondBrainCortexTab as any).$$typeof?.toString()).toContain('react.memo');
      expect((AntigravityCliTab as any).$$typeof?.toString()).toContain('react.memo');
    });

    it('verifies electron-builder.yml configuration exists with valid Windows targets', () => {
      const builderPath = path.resolve(process.cwd(), 'electron-builder.yml');
      expect(fs.existsSync(builderPath)).toBe(true);

      const content = fs.readFileSync(builderPath, 'utf-8');
      expect(content).toContain('appId: com.galarphia.kalinar');
      expect(content).toContain('productName: Kalinar Agent Galaxy OS');
      expect(content).toContain('target: nsis');
      expect(content).toContain('target: portable');
    });
  });

  describe('Cycle 2: Global Security, Persona & Zero-Emoji Audit', () => {
    it('verifies strictly zero prohibited persona terms (J.A.R.V.I.S.) anywhere in src/ or electron/', () => {
      const searchDirs = ['src', 'electron'];
      const prohibited = ['jarvis', 'j.a.r.v.i.s.'];

      for (const dir of searchDirs) {
        const fullDir = path.resolve(process.cwd(), dir);
        if (!fs.existsSync(fullDir)) continue;

        const scanRecursive = (currentPath: string) => {
          const entries = fs.readdirSync(currentPath, { withFileTypes: true });
          for (const entry of entries) {
            const p = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
              scanRecursive(p);
            } else if (entry.isFile() && /\.(ts|tsx|json)$/.test(entry.name)) {
              const content = fs.readFileSync(p, 'utf-8').toLowerCase();
              for (const term of prohibited) {
                expect(content.includes(term)).toBe(false);
              }
            }
          }
        };

        scanRecursive(fullDir);
      }
    });

    it('verifies strictly zero decorative emojis across all code files', () => {
      const searchDirs = ['src', 'electron'];
      const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      for (const dir of searchDirs) {
        const fullDir = path.resolve(process.cwd(), dir);
        if (!fs.existsSync(fullDir)) continue;

        const scanRecursive = (currentPath: string) => {
          const entries = fs.readdirSync(currentPath, { withFileTypes: true });
          for (const entry of entries) {
            const p = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
              scanRecursive(p);
            } else if (entry.isFile() && /\.(ts|tsx|json)$/.test(entry.name)) {
              const content = fs.readFileSync(p, 'utf-8');
              expect(emojiPattern.test(content)).toBe(false);
            }
          }
        };

        scanRecursive(fullDir);
      }
    });

    it('verifies presence of sovereign singularity design tokens in design-tokens.css', () => {
      const cssPath = path.resolve(process.cwd(), 'src/styles/design-tokens.css');
      expect(fs.existsSync(cssPath)).toBe(true);

      const content = fs.readFileSync(cssPath, 'utf-8').toLowerCase();
      expect(content).toContain('--ds-surface-singularity-void: #000000');
      expect(content).toContain('--ds-accent-singularity: #aa88ff');
      expect(content).toContain('--ds-accent-agent: #00f0ff');
      expect(content).toContain('--ds-status-active-fg: #34d399');
      expect(content).toContain('--ds-text-secondary: #9a9a9a');
    });
  });
});
