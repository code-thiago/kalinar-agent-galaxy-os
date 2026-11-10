/**
 * TASK 4 EMPIRICAL VERIFICATION SUITE:
 * Left Dynamic Agent Preview Cards (160px), Right Ethereal Telemetry Column (plus-lighter),
 * and Slide-Over NodeInspectorDrawer (480px)
 * Strictly Zero Emojis
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { LEFT_COLUMN_FILTER_CHIPS } from '../src/components/hud/LeftAgentCardsColumn.js';
import { DEFAULT_WAR_ROOM_HANDOFFS } from '../src/components/hud/RightSingularityColumn.js';
import {
  TRANSCRIPT_STREAM_INTERVAL_MS,
  resolveAcousticStateBadge,
} from '../src/components/ui/SingularityHudColumn.js';
import { formatModelBadge } from '../src/components/ui/AgentLivePreviewCard.js';

describe('Task 4: 160px Left Agent Preview Cards, Right Plus-Lighter HUD & 480px Inspector Drawer', () => {
  describe('1. Left Dynamic Agent Column & 160px AgentLivePreviewCard Contracts', () => {
    it('enforces exact 8 domain filter chips and left column spatial positioning', () => {
      expect(LEFT_COLUMN_FILTER_CHIPS).toEqual([
        'ALL',
        'AGENTS',
        'SECOND BRAIN',
        'GRAVITY',
        'ZEN JDM',
        'SANDBOX',
        'PTY',
        'METRICS',
      ]);

      const leftColPath = path.resolve(process.cwd(), 'src/components/hud/LeftAgentCardsColumn.tsx');
      const content = fs.readFileSync(leftColPath, 'utf-8');

      expect(content).toContain("left: '24px'");
      expect(content).toContain("top: '24px'");
      expect(content).toContain("bottom: '52px'");
      expect(content).toContain("width: '320px'");
      expect(content).toContain('zIndex: 15');
      expect(content).toContain('KALINAR // SINGULARITY OS');
      expect(content).toContain('stroke="#AA88FF"');
      expect(content).toContain("backgroundColor: '#E6E6E6'");
      expect(content).toContain("color: '#000000'");
      expect(content).toContain('setInspectorDrawerOpen(true)');
    });

    it('enforces 160px opaque #07080A AgentLivePreviewCard viewport with #1A1D26 border and 2-line tabular meta', () => {
      expect(formatModelBadge('argon')).toBe('[ARGON]');
      expect(formatModelBadge('claude-3.7-sonnet')).toBe('[CLAUDE]');
      expect(formatModelBadge('gemini-2.5-pro')).toBe('[GEMINI]');

      const cardPath = path.resolve(process.cwd(), 'src/components/ui/AgentLivePreviewCard.tsx');
      const content = fs.readFileSync(cardPath, 'utf-8');

      expect(content).toContain('data-slot="agent-card-root"');
      expect(content).toContain('data-slot="agent-card-viewport"');
      expect(content).toContain('data-slot="agent-card-meta"');
      expect(content).toContain('min-h-[160px]');
      expect(content).toContain('var(--ds-agent-card-thumb-h,160px)');
      expect(content).toContain('#07080A');
      expect(content).toContain('#1A1D26');
      expect(content).toContain("mixBlendMode: 'normal'");
      expect(content).toContain('#34D399');
      expect(content).toContain('#F87171');
      expect(content).toContain('[FIFO:');
      expect(content).toContain('tabular-nums');
      expect(content).not.toContain('forwardRef');
    });
  });

  describe('2. Right Ethereal Telemetry Column (plus-lighter) & 4 Canonical Blocks', () => {
    it('verifies 18ms/char transcript cadence and acoustic state badge mapping', () => {
      expect(TRANSCRIPT_STREAM_INTERVAL_MS).toBe(18);
      expect(resolveAcousticStateBadge('[STANDBY]')).toBe('[SINGULARITY: STANDBY]');
      expect(resolveAcousticStateBadge('[LISTENING PT-BR]')).toBe('[LISTENING PT-BR]');
      expect(resolveAcousticStateBadge('[KALINAR_SPEAKING]')).toBe('[KALINAR_SPEAKING]');
      expect(resolveAcousticStateBadge('[SPEAKING]')).toBe('[KALINAR_SPEAKING]');
    });

    it('enforces right: 48px, width: 360px, plus-lighter, pointer-events: none and 4 canonical blocks', () => {
      const rightColPath = path.resolve(process.cwd(), 'src/components/hud/RightSingularityColumn.tsx');
      const rightContent = fs.readFileSync(rightColPath, 'utf-8');

      expect(rightContent).toContain("right: '48px'");
      expect(rightContent).toContain("width: '360px'");
      expect(rightContent).toContain("mixBlendMode: 'plus-lighter'");
      expect(rightContent).toContain("pointerEvents: 'none'");
      expect(rightContent).toContain('zIndex: 15');
      expect(rightContent).toContain('tag="active_directive"');
      expect(rightContent).toContain('tag="gravitational_rag"');
      expect(rightContent).toContain('tag="synaptic_feed"');
      expect(rightContent).toContain('&lt; 0.45MS');
      expect(rightContent).toContain("pointerEvents: 'auto'");
      expect(rightContent).toContain('__triggerGravitationalRAG');

      expect(DEFAULT_WAR_ROOM_HANDOFFS).toHaveLength(4);

      const hudColPath = path.resolve(process.cwd(), 'src/components/ui/SingularityHudColumn.tsx');
      const hudContent = fs.readFileSync(hudColPath, 'utf-8');
      expect(hudContent).toContain('data-slot="singularity-hud-root"');
      expect(hudContent).toContain('data-slot="singularity-hud-block"');
      expect(hudContent).toContain('data-slot="singularity-voice-transcript"');
      expect(hudContent).toContain('[singularity_core]');
      expect(hudContent).toContain('SUB-110HZ');
      expect(hudContent).toContain('PRES-2.4KHZ');
      expect(hudContent).toContain('PULSE');
      expect(hudContent).not.toContain('forwardRef');
    });
  });

  describe('3. Slide-Over NodeInspectorDrawer (480px) & Strict Zero-Emoji Compliance', () => {
    it('verifies 480px drawer controls for LLM Hot-Swap, FIFO Queue, and Execution Gate', () => {
      const drawerPath = path.resolve(process.cwd(), 'src/components/hud/NodeInspectorDrawer.tsx');
      const content = fs.readFileSync(drawerPath, 'utf-8');

      expect(content).toContain('w-[480px]');
      expect(content).toContain('[ ARGON ]');
      expect(content).toContain('[ CLAUDE-3.7-SONNET ]');
      expect(content).toContain('[ GEMINI-2.5-PRO ]');
      expect(content).toContain('[ GEMINI-2.5-FLASH ]');
      expect(content).toContain('[ PROMOTE ]');
      expect(content).toContain('[ CLEAR ]');
      expect(content).toContain('[ APPROVE DIFF ]');
      expect(content).toContain('[ REVERT FILE (GIT ROLLBACK) ]');
      expect(content).toContain("e.key === 'Escape'");
    });

    it('verifies strictly zero emojis across all Task 4 modified files', () => {
      const files = [
        'src/components/hud/LeftAgentCardsColumn.tsx',
        'src/components/ui/AgentLivePreviewCard.tsx',
        'src/components/hud/RightSingularityColumn.tsx',
        'src/components/ui/SingularityHudColumn.tsx',
        'src/components/hud/NodeInspectorDrawer.tsx',
        'src/styles/design-tokens.css',
        'src/index.css',
      ];
      const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      for (const rel of files) {
        const content = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf-8');
        expect(emojiRegex.test(content), `Forbidden emoji in ${rel}`).toBe(false);
      }
    });
  });
});
