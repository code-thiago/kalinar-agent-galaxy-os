/**
 * KALINAR RETRACTABLE BOTTOM IDE DOCK (v1.4.0)
 * Fixed 36px collapsed tactical bar -> 350px / 75vh 4-tab expanded IDE drawer.
 * Strictly Zero Emojis, isolated with React.memo for 60 FPS WebGL protection.
 */

import { memo, useEffect, useState } from 'react';
import { useKalinarStore } from '../../store/useKalinarStore.js';
import { TelemetryMatrixTable } from '../terminal/TelemetryMatrixTable.js';
import { EvolutionChartsView } from '../terminal/EvolutionChartsView.js';
import { SecondBrainCortexTab } from '../terminal/SecondBrainCortexTab.js';
import { AntigravityCliTab } from '../terminal/AntigravityCliTab.js';
import { eventBus } from '../../core/KalinarEventBus.js';
import { extractFilePathFromDiff } from '../../core/telemetryFormatters.js';
import { AgentNode } from '../../types/kalinar.js';

export type DockTabId = 'telemetry' | 'charts' | 'cortex' | 'warroom';

const DOCK_TABS: Array<{ id: DockTabId; label: string; accent: string; activeBg: string }> = [
  {
    id: 'telemetry',
    label: '[ 01 // STEP MATRIX ]',
    accent: '#AA88FF',
    activeBg: 'rgba(170, 136, 255, 0.12)',
  },
  {
    id: 'charts',
    label: '[ 02 // EVOLUTION CHARTS ]',
    accent: '#00F0FF',
    activeBg: 'rgba(0, 240, 255, 0.12)',
  },
  {
    id: 'cortex',
    label: '[ 03 // SECOND BRAIN & ZEN CORTEX ]',
    accent: '#E879F9',
    activeBg: 'rgba(232, 121, 249, 0.12)',
  },
  {
    id: 'warroom',
    label: '[ 04 // ANTIGRAVITY PTY CLI ]',
    accent: '#34D399',
    activeBg: 'rgba(52, 211, 153, 0.12)',
  },
];

export const KalinarBottomDock = memo(function KalinarBottomDock() {
  const {
    isBottomDockExpanded,
    toggleBottomDock,
    setBottomDockExpanded,
    agents,
    singularity,
    selectedAgentId,
    selectAgent,
    updateAgentStatus,
    setInspectedFilePath,
    setInspectorDrawerOpen,
  } = useKalinarStore();

  const [activeTab, setActiveTab] = useState<DockTabId>('telemetry');
  const [isMaximized, setIsMaximized] = useState(false);
  const [zenLatencyMs, setZenLatencyMs] = useState<number>(singularity.zenLatencyMs || 0.38);
  const [walStatus, setWalStatus] = useState<'SYNCED' | 'SYNCING'>('SYNCED');

  // Track live ZEN Engine latencies & WAL status from EventBus
  useEffect(() => {
    const unsubZen = eventBus.on('zen:rule_evaluated', ({ latencyMs }) => {
      if (typeof latencyMs === 'number' && latencyMs > 0) {
        setZenLatencyMs(Number(latencyMs.toFixed(2)));
      }
    });

    const unsubStep = eventBus.on('agent:step_updated', () => {
      setWalStatus('SYNCED');
    });

    return () => {
      unsubZen();
      unsubStep();
    };
  }, []);

  // Keyboard toggle shortcut: Ctrl+`
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        toggleBottomDock();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleBottomDock]);

  // Global counters
  const operationalSwarmCount = agents.filter(
    (a) => a.status !== '[HALTED]' && a.status !== '[PAUSED]' && a.status !== '[ERROR]'
  ).length;

  const totalTokens = agents.reduce(
    (acc, curr) => acc + (curr.tokensPrompt || 0) + (curr.tokensCompletion || 0),
    0
  );

  const handleTabClick = (tab: DockTabId, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveTab(tab);
    if (!isBottomDockExpanded) {
      setBottomDockExpanded(true);
    }
  };

  const handlePause = async (agentId: string, pid: number) => {
    const prevStatus = agents.find((a) => a.id === agentId)?.status || '[ACTIVE]';
    updateAgentStatus(agentId, '[PAUSED]');
    eventBus.emit('agent:status_changed', {
      agentId,
      previous: prevStatus,
      current: '[PAUSED]',
    });

    const api = typeof window !== 'undefined' ? (window as any).kalinarApi : null;
    if (api?.controlProcessPid) {
      await api.controlProcessPid({ pid, action: 'SUSPEND', agentId });
    }
  };

  const handleResume = async (agentId: string, pid: number) => {
    const prevStatus = agents.find((a) => a.id === agentId)?.status || '[PAUSED]';
    updateAgentStatus(agentId, '[ACTIVE]');
    eventBus.emit('agent:status_changed', {
      agentId,
      previous: prevStatus,
      current: '[ACTIVE]',
    });

    const api = typeof window !== 'undefined' ? (window as any).kalinarApi : null;
    if (api?.controlProcessPid) {
      await api.controlProcessPid({ pid, action: 'RESUME', agentId });
    }
  };

  const handleInspectDiff = (agent: AgentNode) => {
    selectAgent(agent.id);
    const extracted = extractFilePathFromDiff(agent.livePreviewStream);
    setInspectedFilePath(extracted);
    setInspectorDrawerOpen(true);
  };

  const handleKillPid = async (pid: number, agentId: string) => {
    const api = typeof window !== 'undefined' ? (window as any).kalinarApi : null;
    if (api?.controlProcessPid) {
      const res = await api.controlProcessPid({ pid, action: 'KILL', agentId });
      if (res?.success) {
        updateAgentStatus(agentId, '[HALTED]');
      }
      return;
    }
    if (api?.killProcess) {
      await api.killProcess(pid, agentId);
    }
    if (pid > 100) {
      updateAgentStatus(agentId, '[HALTED]');
    }
  };

  const dockHeightClass = !isBottomDockExpanded
    ? 'h-[36px]'
    : isMaximized
    ? 'h-[75vh]'
    : 'h-[350px]';

  const dockHeightValue = !isBottomDockExpanded ? '36px' : isMaximized ? '75vh' : '350px';

  return (
    <div
      data-slot="dock-root"
      data-expanded={isBottomDockExpanded}
      data-active-tab={activeTab}
      className={`fixed bottom-0 inset-x-0 flex flex-col pointer-events-auto select-none tabular-nums ${dockHeightClass}`}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        height: dockHeightValue,
        background: 'rgba(7, 8, 10, 0.94)',
        borderTop: '1px solid #1A1D26',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        transition: 'height 300ms ease-in-out',
        fontFamily: 'var(--ds-primitive-font-mono)',
        fontVariantNumeric: 'tabular-nums',
        userSelect: 'none',
      }}
    >
      {/* -------------------------------------------------------------
          COLLAPSED TACTICAL BAR (36px DEFAULT)
          ------------------------------------------------------------- */}
      <div
        data-slot="dock-status-bar"
        onClick={toggleBottomDock}
        style={{
          height: '36px',
          minHeight: '36px',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontSize: '10.5px',
          textTransform: 'uppercase',
          cursor: 'pointer',
          backgroundColor: 'rgba(7, 8, 10, 0.94)',
          borderBottom: isBottomDockExpanded ? '1px solid #1A1D26' : 'none',
          overflowX: 'auto',
          overflowY: 'hidden',
        }}
      >
        {/* Left: 4 Quick Tab Triggers */}
        <nav
          aria-label="Dock workspace tabs"
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            gap: '2px',
            flexShrink: 0,
          }}
        >
          {DOCK_TABS.map((tab) => {
            const isTabActive = activeTab === tab.id && isBottomDockExpanded;
            return (
              <button
                key={tab.id}
                type="button"
                data-slot={`dock-tab-${tab.id}`}
                onClick={(e) => handleTabClick(tab.id, e)}
                style={{
                  minWidth: '44px',
                  height: '36px',
                  padding: '0 10px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '10px',
                  fontWeight: 600,
                  fontFamily: 'var(--ds-primitive-font-mono)',
                  whiteSpace: 'nowrap',
                  border: 'none',
                  borderBottom: isTabActive
                    ? `2px solid ${tab.accent}`
                    : '2px solid transparent',
                  backgroundColor: isTabActive ? tab.activeBg : 'transparent',
                  color: isTabActive ? tab.accent : '#9A9A9A',
                  cursor: 'pointer',
                  transition: 'color 150ms ease, background-color 150ms ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Global Counters + Height Controls + Expand/Collapse Toggle */}
        <div
          className="tabular-nums"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#34D399', fontWeight: 600 }}>
            ACTIVE SWARM: {operationalSwarmCount}/{agents.length}
          </span>
          <span style={{ color: '#262B38' }}>|</span>
          <span style={{ color: '#DDDDDD' }}>
            TOTAL TOKENS: {totalTokens.toLocaleString('en-US')}
          </span>
          <span style={{ color: '#262B38' }}>|</span>
          <span style={{ color: '#00F0FF' }}>
            ZEN ENGINE: {zenLatencyMs.toFixed(2)}ms
          </span>
          <span style={{ color: '#262B38' }}>|</span>
          <span
            style={{
              color: walStatus === 'SYNCED' ? '#34D399' : '#FBBF24',
              fontWeight: 600,
            }}
          >
            SQLITE WAL: {walStatus}
          </span>

          {isBottomDockExpanded && (
            <button
              type="button"
              data-slot="dock-height-toggle"
              onClick={(e) => {
                e.stopPropagation();
                setIsMaximized((prev) => !prev);
              }}
              style={{
                minHeight: '24px',
                padding: '0 8px',
                border: '1px solid #1A1D26',
                backgroundColor: 'transparent',
                color: '#9A9A9A',
                fontSize: '9.5px',
                fontFamily: 'var(--ds-primitive-font-mono)',
                cursor: 'pointer',
              }}
            >
              {isMaximized ? '[ 350PX ]' : '[ 75VH ]'}
            </button>
          )}

          <button
            type="button"
            data-slot="dock-expand-toggle"
            onClick={(e) => {
              e.stopPropagation();
              toggleBottomDock();
            }}
            style={{
              minHeight: '24px',
              padding: '0 10px',
              border: '1px solid #AA88FF',
              backgroundColor: 'rgba(170, 136, 255, 0.12)',
              color: '#AA88FF',
              fontSize: '9.5px',
              fontWeight: 600,
              fontFamily: 'var(--ds-primitive-font-mono)',
              cursor: 'pointer',
            }}
          >
            {isBottomDockExpanded ? '[ COLLAPSE DOCK v ]' : '[ EXPAND DOCK ^ ]'}
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          EXPANDED DOCK WORKSPACE (350px or 75vh)
          ------------------------------------------------------------- */}
      {isBottomDockExpanded && (
        <div
          data-slot="dock-viewport"
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            backgroundColor: 'rgba(7, 8, 10, 0.94)',
          }}
        >
          {activeTab === 'telemetry' && (
            <TelemetryMatrixTable
              agents={agents}
              selectedAgentId={selectedAgentId}
              onSelectAgent={selectAgent}
              onPauseAgent={handlePause}
              onResumeAgent={handleResume}
              onInspectDiff={handleInspectDiff}
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

