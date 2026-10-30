/**
 * KALINAR RETRACTABLE IDE BOTTOM TERMINAL DOCK (v0.5.0-rc1)
 * Single-line 36px tactical bar -> 350px / 75vh expanded drawer
 * Strictly Zero Emojis
 */

import { useState, memo } from 'react';
import { useKalinarStore } from '../../store/useKalinarStore.js';
import { TelemetryMatrixTable } from './TelemetryMatrixTable.js';
import { EvolutionChartsView } from './EvolutionChartsView.js';
import { SecondBrainCortexTab } from './SecondBrainCortexTab.js';
import { AntigravityCliTab } from './AntigravityCliTab.js';
import { eventBus } from '../../core/KalinarEventBus.js';

export type DockTabId = 'telemetry' | 'charts' | 'cortex' | 'warroom';

export const KalinarBottomDock = memo(function KalinarBottomDock() {
  const {
    isBottomDockExpanded,
    toggleBottomDock,
    setBottomDockExpanded,
    agents,
    selectedAgentId,
    selectAgent,
    toggleInspectorDrawer,
  } = useKalinarStore();

  const [activeTab, setActiveTab] = useState<DockTabId>('telemetry');
  const [isMaximized, setIsMaximized] = useState(false);

  // Compute swarm metrics for tactical bar
  const activeAgentsCount = agents.filter(
    (a) => a.status === '[ACTIVE]' || a.status === '[RUNNING]' || a.status === '[STREAM]'
  ).length;

  const totalTokS = agents.reduce((acc, curr) => acc + (curr.tokenVelocity || 0), 0);
  const minEta = Math.min(...agents.map((a) => a.etaSeconds || 999));
  const minEtaFormatted =
    minEta < 999
      ? `${String(Math.floor(minEta / 60)).padStart(2, '0')}m ${String(minEta % 60).padStart(2, '0')}s`
      : '00m 00s';

  const handleTabClick = (tab: DockTabId, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveTab(tab);
    if (!isBottomDockExpanded) {
      setBottomDockExpanded(true);
    }
  };

  const handlePause = (agentId: string) => {
    eventBus.emit('agent:status_changed', {
      agentId,
      previous: '[ACTIVE]',
      current: '[PAUSED]',
    });
  };

  const handleResume = (agentId: string) => {
    eventBus.emit('agent:status_changed', {
      agentId,
      previous: '[PAUSED]',
      current: '[ACTIVE]',
    });
  };

  const handleApproveDiff = (agentId: string) => {
    eventBus.emit('zen:rule_evaluated', {
      ruleKey: 'execution-gate.jdm.json',
      latencyMs: 0.24,
      allowed: true,
      details: { agentId, action: 'APPROVE_DIFF' },
    });
  };

  const handleKillPid = async (pid: number) => {
    if (typeof window !== 'undefined' && (window as any).kalinarApi?.killProcess) {
      await (window as any).kalinarApi.killProcess(pid);
    }
  };

  // Determine dock height: 36px (collapsed), 75vh (maximized), or 350px (expanded)
  const dockHeightClass = !isBottomDockExpanded
    ? 'h-[36px]'
    : isMaximized
    ? 'h-[75vh]'
    : 'h-[350px]';

  return (
    <div
      data-slot="dock-root"
      data-expanded={isBottomDockExpanded}
      className={`fixed bottom-0 inset-x-0 bg-[#07080a] border-t border-[var(--ds-border-subtle)] transition-all duration-300 z-30 flex flex-col pointer-events-auto select-none font-mono ${dockHeightClass}`}
    >
      {/* -------------------------------------------------------------
          DOCK STATUS BAR (36px single-line tactical bar)
          ------------------------------------------------------------- */}
      <div
        data-slot="dock-status-bar"
        onClick={toggleBottomDock}
        className="h-[36px] min-h-[36px] px-3 flex items-center justify-between text-[11px] uppercase cursor-pointer bg-[#07080a] border-b border-[var(--ds-border-subtle)] hover:bg-[rgba(26,29,38,0.4)] transition-colors"
      >
        {/* Left: Brand + 4 Hit-Target Tab Triggers */}
        <div className="flex items-center gap-2 h-full">
          <span className="font-semibold text-[var(--ds-accent-singularity)] tracking-wider shrink-0 pr-2 border-r border-[var(--ds-border-subtle)]">
            [KALINAR_IDE_DOCK]
          </span>

          <nav className="flex items-center h-full">
            <button
              onClick={(e) => handleTabClick('telemetry', e)}
              className={`min-w-[44px] h-[36px] px-2.5 flex items-center text-[10.5px] font-semibold border-b-2 transition-colors ${
                activeTab === 'telemetry' && isBottomDockExpanded
                  ? 'border-[var(--ds-accent-singularity)] text-[var(--ds-accent-singularity)] bg-[rgba(170,136,255,0.1)]'
                  : 'border-transparent text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]'
              }`}
            >
              [ 01 // TELEMETRY &amp; STEP MATRIX ]
            </button>

            <button
              onClick={(e) => handleTabClick('charts', e)}
              className={`min-w-[44px] h-[36px] px-2.5 flex items-center text-[10.5px] font-semibold border-b-2 transition-colors ${
                activeTab === 'charts' && isBottomDockExpanded
                  ? 'border-[var(--ds-accent-agent)] text-[var(--ds-accent-agent)] bg-[rgba(0,240,255,0.1)]'
                  : 'border-transparent text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]'
              }`}
            >
              [ 02 // EVOLUTION &amp; TOKEN CHARTS ]
            </button>

            <button
              onClick={(e) => handleTabClick('cortex', e)}
              className={`min-w-[44px] h-[36px] px-2.5 flex items-center text-[10.5px] font-semibold border-b-2 transition-colors ${
                activeTab === 'cortex' && isBottomDockExpanded
                  ? 'border-[var(--ds-accent-memory)] text-[var(--ds-accent-memory)] bg-[rgba(232,121,249,0.1)]'
                  : 'border-transparent text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]'
              }`}
            >
              [ 03 // SECOND BRAIN &amp; ZEN JDM CORTEX ]
            </button>

            <button
              onClick={(e) => handleTabClick('warroom', e)}
              className={`min-w-[44px] h-[36px] px-2.5 flex items-center text-[10.5px] font-semibold border-b-2 transition-colors ${
                activeTab === 'warroom' && isBottomDockExpanded
                  ? 'border-[var(--ds-status-active-fg)] text-[var(--ds-status-active-fg)] bg-[rgba(52,211,153,0.1)]'
                  : 'border-transparent text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]'
              }`}
            >
              [ 04 // NATIVE PTY CLI &amp; WAR ROOM ]
            </button>
          </nav>
        </div>

        {/* Right: Swarm telemetry indicators + Expand/Maximize controls */}
        <div className="flex items-center gap-3 tabular-nums text-[10.5px]">
          <span className="text-[var(--ds-status-active-fg)]">
            SWARM: {activeAgentsCount} ACTIVE
          </span>
          <span className="text-[var(--ds-text-secondary)]">|</span>
          <span className="text-[var(--ds-accent-agent)]">
            TOK/S: {totalTokS}
          </span>
          <span className="text-[var(--ds-text-secondary)]">|</span>
          <span className="text-[var(--ds-status-warn-fg)]">
            ETA: {minEtaFormatted}
          </span>
          <span className="text-[var(--ds-text-secondary)]">|</span>
          <span className="px-1.5 py-0.2 border border-[var(--ds-status-active-border)] text-[var(--ds-status-active-fg)] text-[9.5px]">
            [CIRCUIT: CLOSED]
          </span>

          {isBottomDockExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMaximized(!isMaximized);
              }}
              className="px-2 py-0.5 border border-[var(--ds-border-subtle)] text-[9.5px] text-[var(--ds-text-secondary)] hover:text-[var(--ds-accent-singularity)] transition-colors"
            >
              {isMaximized ? '[ 350PX ]' : '[ 75VH ]'}
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBottomDock();
            }}
            className="px-2 py-0.5 border border-[var(--ds-accent-singularity)] text-[9.5px] text-[var(--ds-accent-singularity)] hover:bg-[rgba(170,136,255,0.15)] transition-colors"
          >
            {isBottomDockExpanded ? '[ COLLAPSE ]' : '[ EXPAND ]'}
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          DOCK VIEWPORT (Expanded Workspace Body)
          ------------------------------------------------------------- */}
      {isBottomDockExpanded && (
        <div data-slot="dock-viewport" className="flex-1 overflow-hidden bg-[#07080a]">
          {activeTab === 'telemetry' && (
            <TelemetryMatrixTable
              agents={agents}
              selectedAgentId={selectedAgentId}
              onSelectAgent={selectAgent}
              onPauseAgent={handlePause}
              onResumeAgent={handleResume}
              onApproveDiff={handleApproveDiff}
              onInspectAgent={() => toggleInspectorDrawer()}
              onKillPid={handleKillPid}
            />
          )}

          {activeTab === 'charts' && <EvolutionChartsView agents={agents} />}

          {activeTab === 'cortex' && <SecondBrainCortexTab />}

          {activeTab === 'warroom' && <AntigravityCliTab />}
        </div>
      )}
    </div>
  );
});
