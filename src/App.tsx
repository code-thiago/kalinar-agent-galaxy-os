import { useEffect } from 'react';
import { KalinarGalaxyCanvas } from './components/galaxy/KalinarGalaxyCanvas.js';
import { LeftAgentCardsColumn } from './components/hud/LeftAgentCardsColumn.js';
import { RightSingularityColumn } from './components/hud/RightSingularityColumn.js';
import { NodeInspectorDrawer } from './components/hud/NodeInspectorDrawer.js';
import { KalinarBottomDock } from './components/dock/KalinarBottomDock.js';
import { KalinarCommandPalette } from './components/hud/KalinarCommandPalette.js';
import { LlmOnboardingModal } from './components/hud/LlmOnboardingModal.js';
import { LlmProvidersPanel } from './components/hud/LlmProvidersPanel.js';
import { SidebarMiniCli } from './components/terminal/SidebarMiniCli.js';
import { kalinarVoiceService } from './services/kalinarVoiceService.js';
import { useKalinarStore, VisionBSidebarTab } from './store/useKalinarStore.js';

const SIDEBAR_TABS: Array<{ id: VisionBSidebarTab; label: string }> = [
  { id: 'AGENTS', label: '01 // ENXAME & AGENTES' },
  { id: 'SECOND_BRAIN', label: '02 // SECOND BRAIN RAG' },
  { id: 'LLM_HUB', label: '03 // MODELOS LLM & CUSTO' },
  { id: 'FIREWALL', label: '04 // FIREWALL & REGRAS' },
];

const ZEN_FIREWALL_RULES = [
  { name: 'daemon-event-router.jdm.json', role: 'Roteamento de Eventos Daemon' },
  { name: 'os-execution-firewall.jdm.json', role: 'Firewall PTY / Shell Commands' },
  { name: 'voice-command-guard.jdm.json', role: 'Guarda de Comandos de Voz' },
  { name: 'execution-gate.jdm.json', role: 'Gate de Aprovacao de Diffs' },
  { name: 'llm-model-router.jdm.json', role: 'Roteador Multi-Modelo LLM' },
] as const;

export function App() {
  const {
    systemState,
    agents,
    secondBrainNotes,
    singularity,
    activeSidebarTab,
    isLeftSidebarCollapsed,
    setActiveSidebarTab,
    toggleLeftSidebar,
    setCommandPaletteOpen,
    toggleCommandPalette,
    toggleInspectorDrawer,
    selectNote,
    updateSingularityTranscript,
  } = useKalinarStore();

  useEffect(() => {
    void useKalinarStore.getState().hydrateFromGroundTruth();

    if (typeof window !== 'undefined' && (window as any).kalinarApi) {
      const api = (window as any).kalinarApi;
      const cleanupVoice = api.onVoiceStateChange((state: any) => {
        if (state?.transcript) {
          updateSingularityTranscript(state.transcript);
        }
      });
      const cleanupTelemetry =
        typeof api.onTelemetryStream === 'function'
          ? api.onTelemetryStream((payload: any) => {
              if (payload) {
                useKalinarStore.getState().applyDaemonEvent(payload);
              }
              if (
                payload &&
                (payload.type === 'STEP_COMPLETED' ||
                  payload.type === 'AGENT_HALTED' ||
                  payload.type === 'HARD_BLOCK')
              ) {
                void kalinarVoiceService.handleServerPushAlert(payload);
              }
            })
          : () => {};
      const cleanupAgent =
        typeof api.onAgentUpdate === 'function'
          ? api.onAgentUpdate((agent: any) => {
              if (agent?.id) {
                const state = useKalinarStore.getState();
                const exists = state.agents.some((a) => a.id === agent.id);
                if (exists) {
                  state.setAgents(state.agents.map((a) => (a.id === agent.id ? agent : a)));
                } else {
                  state.addAgent(agent);
                }
              }
            })
          : () => {};
      return () => {
        cleanupVoice();
        cleanupTelemetry();
        cleanupAgent();
      };
    }
  }, [updateSingularityTranscript]);

  const handleNoteSelect = (noteId: string) => {
    selectNote(noteId);
    if (typeof window !== 'undefined' && typeof (window as any).__triggerGravitationalRAG === 'function') {
      (window as any).__triggerGravitationalRAG([120, 80, 0]);
    }
  };

  return (
    <main
      className="vision-b-workspace font-mono"
      style={{
        display: 'flex',
        width: '100vw',
        minWidth: '1024px',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#000000',
        fontSize: '13px',
      }}
    >
      {/* ZONA 1: SIDEBAR ESQUERDA SOBERANA */}
      <aside
        data-slot="vision-b-left-sidebar"
        data-collapsed={isLeftSidebarCollapsed}
        style={{
          width: isLeftSidebarCollapsed ? '56px' : 'clamp(270px, 22vw, 340px)',
          height: '100vh',
          backgroundColor: '#07080A',
          borderRight: '1px solid #1F232E',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        {/* Header (height: 48px) */}
        <div
          style={{
            height: '48px',
            minHeight: '48px',
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isLeftSidebarCollapsed ? 'center' : 'space-between',
            gap: '6px',
            borderBottom: '1px solid #1F232E',
          }}
        >
          {!isLeftSidebarCollapsed && (
            <span
              style={{
                color: '#AA88FF',
                fontWeight: 700,
                fontSize: '12px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              KALINAR // OS v2.2
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {!isLeftSidebarCollapsed && (
              <button
                type="button"
                data-slot="new-mission-btn"
                onClick={() => setCommandPaletteOpen(true)}
                style={{
                  backgroundColor: '#AA88FF',
                  color: '#000000',
                  border: '1px solid #AA88FF',
                  padding: '4px 6px',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                [ + NOVA MISSAO ]
              </button>
            )}
            <button
              type="button"
              data-slot="left-sidebar-collapse-btn"
              onClick={toggleLeftSidebar}
              style={{
                backgroundColor: '#0D0F14',
                color: '#DDDDDD',
                border: '1px solid #1F232E',
                padding: '4px 6px',
                fontSize: '10.5px',
                cursor: 'pointer',
              }}
            >
              {isLeftSidebarCollapsed ? '[ > ]' : '[ < ]'}
            </button>
          </div>
        </div>

        {!isLeftSidebarCollapsed && (
          <>
            {/* 4 Spaced Tabs */}
            <nav
              aria-label="Sidebar navigation tabs"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '8px',
                borderBottom: '1px solid #1F232E',
                flexShrink: 0,
              }}
            >
              {SIDEBAR_TABS.map((tab) => {
                const isActive = activeSidebarTab === tab.id;
                const badgeCount =
                  tab.id === 'AGENTS'
                    ? `(${agents.length})`
                    : tab.id === 'SECOND_BRAIN'
                    ? `(${secondBrainNotes.length})`
                    : '';
                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-slot={`sidebar-tab-${tab.id}`}
                    onClick={() => setActiveSidebarTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      fontSize: '11px',
                      fontWeight: isActive ? 700 : 500,
                      backgroundColor: isActive ? 'rgba(170, 136, 255, 0.14)' : '#000000',
                      color: isActive ? '#AA88FF' : '#9A9A9A',
                      border: isActive ? '1px solid #AA88FF' : '1px solid #1F232E',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tab.label}
                    </span>
                    {badgeCount && <span>{badgeCount}</span>}
                  </button>
                );
              })}
            </nav>

            {/* Scrollable Body */}
            <div
              data-slot="sidebar-scroll-body"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: '8px',
                fontSize: '13px',
                overflowWrap: 'break-word',
              }}
            >
              {activeSidebarTab === 'AGENTS' && <LeftAgentCardsColumn />}

              {activeSidebarTab === 'SECOND_BRAIN' && (
                <div
                  data-slot="second-brain-notes-list"
                  style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: '#9A9A9A',
                      paddingBottom: '4px',
                      borderBottom: '1px solid #1F232E',
                    }}
                  >
                    <span>NOTAS NO CACHE SQLITE</span>
                    <span style={{ color: '#AA88FF', fontWeight: 700 }}>
                      {secondBrainNotes.length}
                    </span>
                  </div>
                  {secondBrainNotes.length === 0 ? (
                    <div
                      style={{
                        padding: '10px',
                        border: '1px solid #1F232E',
                        backgroundColor: '#000000',
                        color: '#9A9A9A',
                        fontSize: '11px',
                      }}
                    >
                      [0 NOTAS INDEXADAS NO CACHE SQLITE]
                    </div>
                  ) : (
                    secondBrainNotes.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => handleNoteSelect(note.id)}
                        style={{
                          textAlign: 'left',
                          padding: '8px',
                          backgroundColor: '#000000',
                          border: '1px solid #1F232E',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          style={{
                            color: '#AA88FF',
                            fontSize: '11px',
                            fontWeight: 700,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {note.title}
                        </span>
                        <span style={{ color: '#9A9A9A', fontSize: '10px' }}>
                          {note.wikilink} · {note.domain}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {activeSidebarTab === 'LLM_HUB' && <LlmProvidersPanel />}

              {activeSidebarTab === 'FIREWALL' && (
                <div
                  data-slot="firewall-rules-panel"
                  style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      backgroundColor: '#000000',
                      border: '1px solid #1F232E',
                    }}
                  >
                    <span style={{ color: '#9A9A9A' }}>GORULES ZEN ENGINE</span>
                    <span style={{ color: '#34D399', fontWeight: 700 }}>
                      {singularity.zenLatencyMs.toFixed(2)}ms (&lt; 0.45ms)
                    </span>
                  </div>
                  {ZEN_FIREWALL_RULES.map((rule) => (
                    <div
                      key={rule.name}
                      style={{
                        padding: '8px',
                        backgroundColor: '#000000',
                        border: '1px solid #1F232E',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                        <span style={{ color: '#DDDDDD', textTransform: 'none' }}>{rule.name}</span>
                        <span style={{ color: '#34D399', fontWeight: 700 }}>[ONLINE]</span>
                      </div>
                      <span style={{ color: '#9A9A9A', fontSize: '10px', textTransform: 'none' }}>
                        {rule.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Anchored Bottom Mini-CLI */}
            <SidebarMiniCli />
          </>
        )}
      </aside>

      {/* ZONA 2: VIEWPORT CENTRAL 3D */}
      <section
        data-slot="vision-b-center-viewport"
        style={{
          flex: 1,
          minWidth: '400px',
          height: '100vh',
          position: 'relative',
          backgroundColor: '#000000',
          overflow: 'hidden',
        }}
      >
        <KalinarGalaxyCanvas />

        {/* Compact Top Pill (below 32px Windows titleBarOverlay) */}
        <div
          data-slot="center-top-pill"
          style={{
            position: 'absolute',
            top: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            backgroundColor: 'rgba(7, 8, 10, 0.88)',
            border: '1px solid #1F232E',
            WebkitAppRegion: 'no-drag',
            whiteSpace: 'nowrap',
          } as React.CSSProperties}
        >
          <span style={{ color: '#34D399', fontSize: '11px', fontWeight: 700 }}>
            [SINGULARITY: {systemState}]
          </span>
          <button
            type="button"
            data-slot="command-palette-trigger"
            onClick={toggleCommandPalette}
            style={{
              backgroundColor: '#0D0F14',
              color: '#DDDDDD',
              border: '1px solid #1F232E',
              padding: '3px 8px',
              fontSize: '10.5px',
              cursor: 'pointer',
            }}
          >
            [CTRL+K]
          </button>
          <button
            type="button"
            data-slot="second-brain-pill-trigger"
            onClick={toggleInspectorDrawer}
            style={{
              backgroundColor: '#0D0F14',
              color: '#AA88FF',
              border: '1px solid #1F232E',
              padding: '3px 8px',
              fontSize: '10.5px',
              cursor: 'pointer',
            }}
          >
            [ACIONAR SECOND BRAIN]
          </button>
        </div>

        {/* Retractable Bottom Dock inside Center Zone */}
        <KalinarBottomDock />
      </section>

      {/* ZONA 3: INSPETOR CONTEXTUAL DIREITO */}
      <RightSingularityColumn />

      {/* OVERLAYS */}
      <NodeInspectorDrawer />
      <KalinarCommandPalette />
      <LlmOnboardingModal />
    </main>
  );
}

export default App;
