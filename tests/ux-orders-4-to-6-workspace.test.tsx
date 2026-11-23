/**
 * KALINAR v2.2.0-workspace — ORDERS 4 TO 6 TDD & BEHAVIORAL GATE
 * Validates:
 * 1. LlmOnboardingModal auto-open when hasAnyConfiguredEngine === false, skip to STANDBY, and hide when true
 * 2. LlmProvidersPanel rendering Ollama/Gemini tags, [ REESCANEAR ] -> refreshLlmDiscovery(), and $0.00 / 0 TOK idle telemetry
 * 3. Vision B 3-zone grid (vision-b-left-sidebar, vision-b-center-viewport, vision-b-right-inspector), collapse toggles, and >= 40px top clearance
 * 4. SidebarMiniCli hybrid routing (git status -s -> executeShellCommand; @agent-software-engineer ... -> enqueueAgentFifo; firewall block; ArrowUp history)
 * Strictly Zero Emojis
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { useKalinarStore } from '../src/store/useKalinarStore.js';
import { LlmOnboardingModal } from '../src/components/hud/LlmOnboardingModal.js';
import { LlmProvidersPanel } from '../src/components/hud/LlmProvidersPanel.js';
import { SidebarMiniCli } from '../src/components/terminal/SidebarMiniCli.js';
import { RightSingularityColumn } from '../src/components/hud/RightSingularityColumn.js';
import { App } from '../src/App.js';

describe('Kalinar v2.2.0-workspace — Orders 4 to 6 Verification Gate', () => {
  beforeEach(() => {
    vi.spyOn(React, 'useSyncExternalStore').mockImplementation(
      (_subscribe: any, getSnapshot: any) => getSnapshot()
    );
    useKalinarStore.getState().resetToStandby();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).window;
    useKalinarStore.getState().resetToStandby();
  });

  it('1. LlmOnboardingModal opens when hasAnyConfiguredEngine === false, dismisses to STANDBY, and hides when true', () => {
    useKalinarStore.setState({
      hasAnyConfiguredEngine: false,
      isOnboardingDismissed: false,
    });

    const openHtml = renderToStaticMarkup(React.createElement(LlmOnboardingModal));
    expect(openHtml).toContain('data-slot="llm-onboarding-modal"');
    expect(openHtml).toContain('[ CONECTAR MOTOR LLM ]');
    expect(openHtml).toContain('[ PULAR E ENTRAR EM STANDBY ]');

    // Dismissing enters STANDBY and hides modal
    useKalinarStore.getState().dismissOnboarding();
    expect(useKalinarStore.getState().isOnboardingDismissed).toBe(true);
    expect(useKalinarStore.getState().systemState).toBe('STANDBY_READY');
    const dismissedHtml = renderToStaticMarkup(React.createElement(LlmOnboardingModal));
    expect(dismissedHtml).toBe('');

    // Re-reset and set hasAnyConfiguredEngine === true -> hidden
    useKalinarStore.setState({
      hasAnyConfiguredEngine: true,
      isOnboardingDismissed: false,
    });
    const configuredHtml = renderToStaticMarkup(React.createElement(LlmOnboardingModal));
    expect(configuredHtml).toBe('');
  });

  it('2. LlmProvidersPanel renders Ollama/Gemini tags, triggers refreshLlmDiscovery(), and shows $0.00 / 0 TOK when idle', async () => {
    const discoverMock = vi.fn(async () => ({
      providers: [
        {
          providerId: 'ollama:local',
          label: 'Ollama Local Runtime (127.0.0.1:11434)',
          source: 'OLLAMA_LOCAL' as const,
          models: ['argon:latest', 'qwen2.5-coder:14b'],
          available: true,
        },
        {
          providerId: 'env:GEMINI_API_KEY',
          label: 'Google Gemini (GEMINI_API_KEY)',
          source: 'ENV_VAR' as const,
          models: ['gemini-4-pro', 'gemini-4-flash'],
          available: true,
        },
      ],
      discoveredModels: ['argon:latest', 'qwen2.5-coder:14b', 'gemini-4-pro', 'gemini-4-flash'],
      activeLocalModels: ['argon:latest', 'qwen2.5-coder:14b'],
      probedAt: Date.now(),
      latencyMs: 12.4,
    }));

    (globalThis as any).window = {
      kalinarApi: {
        discoverLlmProviders: discoverMock,
      },
    };

    await useKalinarStore.getState().refreshLlmDiscovery();
    expect(discoverMock).toHaveBeenCalledTimes(1);
    expect(useKalinarStore.getState().hasAnyConfiguredEngine).toBe(true);

    const panelHtml = renderToStaticMarkup(React.createElement(LlmProvidersPanel));
    expect(panelHtml).toContain('data-slot="llm-providers-panel"');
    expect(panelHtml).toContain('[ REESCANEAR ]');
    expect(panelHtml).toContain('[LOCAL ZERO-COST]');
    expect(panelHtml).toContain('[BYOK / ENV]');
    expect(panelHtml).toContain('argon:latest');
    expect(panelHtml).toContain('gemini-4-pro');
    expect(panelHtml).toContain('$0.00 / 0 TOK');
    expect(panelHtml).toContain('claude-sonnet-4');
  });

  it('3. Vision B 3-zone grid renders all slots, toggles sidebars, and enforces >= 40px top clearance on Right Inspector', () => {
    useKalinarStore.setState({
      hasAnyConfiguredEngine: true,
      activeSidebarTab: 'SECOND_BRAIN',
      secondBrainNotes: [],
    });

    const appHtml = renderToStaticMarkup(React.createElement(App));
    expect(appHtml).toContain('data-slot="vision-b-left-sidebar"');
    expect(appHtml).toContain('data-slot="vision-b-center-viewport"');
    expect(appHtml).toContain('data-slot="vision-b-right-inspector"');
    expect(appHtml).toContain('[0 NOTAS INDEXADAS NO CACHE SQLITE]');
    expect(appHtml).toContain('[ TELEMETRIA &amp; GRAFICOS SQLITE ]');

    const rightHtml = renderToStaticMarkup(React.createElement(RightSingularityColumn));
    expect(rightHtml).toContain('padding-top:40px');
    expect(rightHtml).toContain('[singularity_core]');
    expect(rightHtml).toContain('[ OUVIR PT-BR ]');
    expect(rightHtml).toContain('[ BRIEFING ]');
    expect(rightHtml).toContain('[ SILENCIAR ]');
    expect(rightHtml).toContain('[STANDBY: SELECIONE UM NO OU AGENTE]');

    // Collapse toggles
    expect(useKalinarStore.getState().isLeftSidebarCollapsed).toBe(false);
    useKalinarStore.getState().toggleLeftSidebar();
    expect(useKalinarStore.getState().isLeftSidebarCollapsed).toBe(true);

    expect(useKalinarStore.getState().isRightInspectorCollapsed).toBe(false);
    useKalinarStore.getState().toggleRightInspector();
    expect(useKalinarStore.getState().isRightInspectorCollapsed).toBe(true);
  });

  it('4. SidebarMiniCli routes git status -s to executeShellCommand, @agent-* to enqueueAgentFifo, handles firewall blocks, and supports ArrowUp history', async () => {
    const execMock = vi.fn(async (cmd: string) => {
      if (cmd.includes('rm -rf')) {
        return {
          allowed: false,
          stdout: '',
          stderr: 'Blocked by os-execution-firewall.jdm.json',
          exitCode: 126,
        };
      }
      return {
        allowed: true,
        stdout: 'M src/App.tsx',
        stderr: '',
        exitCode: 0,
      };
    });
    const fifoMock = vi.fn(async () => ({ success: true, badge: '[FIFO_QUEUED]' }));
    const controlPidMock = vi.fn(async () => ({ success: true, action: 'KILL', pid: 9999, message: 'killed' }));

    (globalThis as any).window = {
      kalinarApi: {
        executeShellCommand: execMock,
        enqueueAgentFifo: fifoMock,
        controlProcessPid: controlPidMock,
      },
    };

    // 1. Shell chip route
    await useKalinarStore.getState().dispatchMiniCliInput('git status -s');
    expect(execMock).toHaveBeenCalledWith('git status -s', undefined, 'UI_CLI');
    expect(useKalinarStore.getState().cliHistory[0].route).toBe('SHELL_IPC');
    expect(useKalinarStore.getState().cliHistory[0].output).toContain('M src/App.tsx');

    // 2. @agent- FIFO route
    await useKalinarStore.getState().dispatchMiniCliInput('@agent-software-engineer revisar Store');
    expect(fifoMock).toHaveBeenCalledWith({
      targetAgentId: '@agent-software-engineer',
      instruction: 'revisar Store',
    });
    expect(useKalinarStore.getState().cliHistory[0].route).toBe('AGENT_FIFO');
    expect(useKalinarStore.getState().cliHistory[0].output).toContain('[FIFO_QUEUED]');

    // 3. Firewall block
    await useKalinarStore.getState().dispatchMiniCliInput('rm -rf /');
    expect(useKalinarStore.getState().cliHistory[0].blockedByFirewall).toBe(true);
    expect(useKalinarStore.getState().cliHistory[0].output).toContain('[FIREWALL BLOCKED]');
    expect(useKalinarStore.getState().activeCliPid).toBeNull();

    // 4. Kill PID action
    useKalinarStore.setState({ activeCliPid: 9999 });
    await useKalinarStore.getState().killActiveCliProcess();
    expect(controlPidMock).toHaveBeenCalledWith({ pid: 9999, action: 'KILL' });
    expect(useKalinarStore.getState().activeCliPid).toBeNull();

    // 5. Render Mini-CLI HTML & ArrowUp contract check
    const cliHtml = renderToStaticMarkup(React.createElement(SidebarMiniCli));
    expect(cliHtml).toContain('data-slot="sidebar-mini-cli"');
    expect(cliHtml).toContain('MINI-CLI // PTY');
    expect(cliHtml).toContain('git status -s');
    expect(cliHtml).toContain('[FIREWALL BLOCKED]');

    const miniCliSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/terminal/SidebarMiniCli.tsx'),
      'utf-8'
    );
    expect(miniCliSrc).toContain("e.key === 'ArrowUp'");
    expect(miniCliSrc).toContain("e.key === 'ArrowDown'");
  });
});
