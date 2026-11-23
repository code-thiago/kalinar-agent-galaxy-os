/**
 * KALINAR v2.2.0 — ORDERS 7 TO 8 SOVEREIGN RELEASE VERIFICATION GATE
 * Validates:
 * 1. Sovereign 1-click controls ([ TROCAR MODELO ], [ INJETAR NOTA RAG ], [ REVISAR DIFF ], [ APROVAR ] / [ REVERTER ])
 * 2. Real Markdown note reader (kalinar:read_second_brain_note) & path traversal blocking (../secrets.md)
 * 3. Vision B 3-zone non-overlapping geometry & presence of all 6 Blueprint docs + DESIGN.md + package.json v2.2.0
 * Strictly Zero Emojis
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { useKalinarStore } from '../src/store/useKalinarStore.js';
import { SovereignAgentControlsBar } from '../src/components/ui/AgentLivePreviewCard.js';
import { RightSingularityColumn } from '../src/components/hud/RightSingularityColumn.js';
import { handleReadSecondBrainNote } from '../electron/daemon/VaultIpcRouter.js';
import { App } from '../src/App.js';

describe('Kalinar v2.2.0 — Orders 7 to 8 Sovereign Release Gate', () => {
  let tempVaultDir: string;

  beforeEach(() => {
    vi.spyOn(React, 'useSyncExternalStore').mockImplementation(
      (_subscribe: any, getSnapshot: any) => getSnapshot()
    );
    useKalinarStore.getState().resetToStandby();
    tempVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kalinar-orders-7-8-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).window;
    useKalinarStore.getState().resetToStandby();
    try {
      fs.rmSync(tempVaultDir, { recursive: true, force: true });
    } catch {
      // Ignore Windows temp lock
    }
  });

  it('1. Sovereign 1-click controls invoke switchLlmModel, injectSecondBrainNote, getLiveGitDiff, and approveOrRevertDiff', async () => {
    const switchMock = vi.fn(async () => ({ success: true }));
    const injectMock = vi.fn(async () => ({ success: true, persistedToDisk: true, persistedToSqlite: true }));
    const diffMock = vi.fn(async () => ({
      filePath: 'src/core/ZenFirewall.ts',
      lines: [
        { type: '+', content: '+ const safe = true;' },
        { type: '-', content: '- const safe = false;' },
      ],
      latencyMs: 1.2,
    }));
    const approveMock = vi.fn(async () => ({ success: true, status: 'APPROVED_AND_COMMITTED' }));

    (globalThis as any).window = {
      kalinarApi: {
        switchLlmModel: switchMock,
        injectSecondBrainNote: injectMock,
        getLiveGitDiff: diffMock,
        approveOrRevertDiff: approveMock,
      },
    };

    useKalinarStore.setState({
      agents: [
        {
          id: 'agent-sw-01',
          filename: '@agent-software-engineer',
          pid: 14202,
          status: '[ACTIVE]',
          executionMode: 'STEP_BY_STEP_GATE',
          currentObjective: 'Audit sovereign controls',
          totalSteps: 5,
          currentStep: 2,
          stepDescription: 'Reviewing diff',
          tokensPrompt: 100,
          tokensCompletion: 50,
          tokenVelocity: 25,
          etaSeconds: 30,
          position3D: [120, 40, 0],
          livePreviewStream: '@@ -1,1 +1,1 @@ src/core/ZenFirewall.ts\n+ const safe = true;',
          activeModelId: 'argon',
        },
      ],
      selectedAgentId: 'agent-sw-01',
      secondBrainNotes: [
        {
          id: 'note-adr-001',
          title: 'ADR-001 Server-Side Auth',
          filePath: '02_PADROES/ADR-001.md',
          wikilink: '[[ADR-001]]',
          domain: '02_PADROES',
          tags: ['auth'],
          frontmatter: {},
          wikilinks: [],
          excerpt: 'Server-side session verification.',
        },
      ],
      discoveredProviders: [
        {
          providerId: 'env:GEMINI_API_KEY',
          label: 'Google Gemini',
          source: 'ENV_VAR',
          models: ['gemini-4-pro', 'claude-sonnet-4'],
          available: true,
        },
      ],
    });

    const controlsHtml = renderToStaticMarkup(
      React.createElement(SovereignAgentControlsBar, { agentId: 'agent-sw-01' })
    );
    expect(controlsHtml).toContain('[ TROCAR MODELO ]');
    expect(controlsHtml).toContain('[ INJETAR NOTA RAG ]');
    expect(controlsHtml).toContain('[ REVISAR DIFF ]');

    // 1. Hot-swap model
    await useKalinarStore.getState().hotSwapAgentModel('agent-sw-01', 'gemini-4-pro');
    expect(switchMock).toHaveBeenCalledWith({
      agentId: 'agent-sw-01',
      targetModel: 'gemini-4-pro',
      taskId: 'SOVEREIGN_1CLICK_HOTSWAP',
    });
    expect(useKalinarStore.getState().agents[0].activeModelId).toBe('gemini-4-pro');
    expect(useKalinarStore.getState().agents[0].lastAckBadge).toBe('[MODEL_HOTSWAP]');

    // 2. Inject RAG note
    await useKalinarStore.getState().injectNoteIntoAgentContext('agent-sw-01', '02_PADROES/ADR-001.md');
    expect(injectMock).toHaveBeenCalledTimes(1);

    // 3. Open Diff Inspector & Approve
    await useKalinarStore.getState().openAgentDiffInspector('agent-sw-01');
    expect(diffMock).toHaveBeenCalledWith({
      filePath: 'src/core/ZenFirewall.ts',
      agentId: 'agent-sw-01',
    });
    const diffInspectorHtml = renderToStaticMarkup(React.createElement(RightSingularityColumn));
    expect(diffInspectorHtml).toContain('data-slot="sovereign-diff-inspector"');
    expect(diffInspectorHtml).toContain('[ APROVAR ]');
    expect(diffInspectorHtml).toContain('[ REVERTER ]');
    expect(diffInspectorHtml).toContain('#34D399');
    expect(diffInspectorHtml).toContain('#F87171');

    await useKalinarStore.getState().executeDiffGateDecision('agent-sw-01', 'APPROVE');
    expect(approveMock).toHaveBeenCalledWith({
      filePath: 'src/core/ZenFirewall.ts',
      action: 'APPROVE',
      agentId: 'agent-sw-01',
    });
    expect(useKalinarStore.getState().activeDiffInspector?.decisionStatus).toBe('APPROVED');
    expect(useKalinarStore.getState().agents[0].status).toBe('[VERIFIED]');
  });

  it('2. Real Markdown note reader loads vault notes and blocks path traversal (../secrets.md)', async () => {
    const noteDir = path.join(tempVaultDir, '02_PADROES');
    fs.mkdirSync(noteDir, { recursive: true });
    fs.writeFileSync(
      path.join(noteDir, 'ADR-001.md'),
      '# ADR-001\nUse [[00_INDEX]] and server-side session checks.',
      'utf-8'
    );

    const validRes = handleReadSecondBrainNote(
      { relativePath: '02_PADROES/ADR-001.md' },
      { sqliteStore: null, vaultRoot: tempVaultDir }
    );
    expect(validRes.ok).toBe(true);
    expect(validRes.content).toContain('[[00_INDEX]]');

    const traversalRes = handleReadSecondBrainNote(
      { relativePath: '../secrets.md' },
      { sqliteStore: null, vaultRoot: tempVaultDir }
    );
    expect(traversalRes.ok).toBe(false);
    expect(traversalRes.error).toBe('PATH_TRAVERSAL_BLOCKED');

    const winTraversalRes = handleReadSecondBrainNote(
      { relativePath: '../../Windows/win.ini' },
      { sqliteStore: null, vaultRoot: tempVaultDir }
    );
    expect(winTraversalRes.ok).toBe(false);
    expect(winTraversalRes.error).toBe('PATH_TRAVERSAL_BLOCKED');

    // UI store openSecondBrainNoteReader renders data-slot="second-brain-note-reader"
    (globalThis as any).window = {
      kalinarApi: {
        readSecondBrainNote: vi.fn(async (p: { relativePath: string }) =>
          handleReadSecondBrainNote(p, { sqliteStore: null, vaultRoot: tempVaultDir })
        ),
      },
    };
    await useKalinarStore.getState().openSecondBrainNoteReader('02_PADROES/ADR-001.md', 'ADR-001');
    const readerHtml = renderToStaticMarkup(React.createElement(RightSingularityColumn));
    expect(readerHtml).toContain('data-slot="second-brain-note-reader"');
    expect(readerHtml).toContain('[ INJETAR NO ENXAME ]');
    expect(readerHtml).toContain('[ FECHAR ]');
    expect(readerHtml).toContain('[[00_INDEX]]');
  });

  it('3. Verifies Vision B 3-zone geometry, 6 Blueprint documents, DESIGN.md, and package.json v2.2.0', () => {
    useKalinarStore.setState({ hasAnyConfiguredEngine: true });
    const appHtml = renderToStaticMarkup(React.createElement(App));
    expect(appHtml).toContain('data-slot="vision-b-left-sidebar"');
    expect(appHtml).toContain('data-slot="vision-b-center-viewport"');
    expect(appHtml).toContain('data-slot="vision-b-right-inspector"');
    expect(appHtml).toContain('padding-top:40px');

    const blueprintFiles = [
      '.antigravity/blueprint/01_PRD.md',
      '.antigravity/blueprint/02_TRD.md',
      '.antigravity/blueprint/03_APP_FLOW.md',
      '.antigravity/blueprint/04_BRIEFING_AND_DESIGN_SYSTEM.md',
      '.antigravity/blueprint/05_BACKEND_SCHEMA.md',
      '.antigravity/blueprint/06_IMPLEMENTATION_PLAN.md',
      'DESIGN.md',
    ];
    for (const rel of blueprintFiles) {
      const fullPath = path.resolve(process.cwd(), rel);
      expect(fs.existsSync(fullPath), `Missing ${rel}`).toBe(true);
      const content = fs.readFileSync(fullPath, 'utf-8');
      expect(content).toContain('v2.2.0');
    }

    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'));
    expect(pkg.version).toBe('2.2.0');
  });
});
