import { useState, useEffect } from 'react';
import { useKalinarStore } from '../../store/useKalinarStore.js';
import { SingularityHudColumn } from '../ui/SingularityHudColumn.js';
import { SovereignAgentControlsBar } from '../ui/AgentLivePreviewCard.js';
import { kalinarVoiceService } from '../../services/kalinarVoiceService.js';
import { kalinarSingularityBrain } from '../../services/kalinarSingularityBrain.js';
import { SecondBrainNode, TauzFrequencyBands } from '../../types/kalinar.js';

export interface WarRoomHandoffEntry {
  id: string;
  from: string;
  to: string;
  domain: string;
  wikilinks: string[];
  action: string;
}

export const DEFAULT_WAR_ROOM_HANDOFFS: WarRoomHandoffEntry[] = [
  {
    id: 'wr-handoff-1',
    from: '@agent-orchestrator',
    to: '@agent-software-engineer',
    domain: 'multi-model-router',
    wikilinks: ['[[00_INDEX]]', '[[zen-engine]]'],
    action: 'Lock v1.1.0 7 Laws of Voice & Argon/Claude/Gemini Router',
  },
  {
    id: 'wr-handoff-2',
    from: '@agent-software-engineer',
    to: '@agent-qa',
    domain: 'tauz-dsp-connectors',
    wikilinks: ['[[00_INDEX]]', '[[PADRAO-Qualidade-TDD-Vitest-Playwright-Surgical]]'],
    action: 'Audit Task 9 Tauz DSP, Live Git Diff IPC & Hot-Swap',
  },
  {
    id: 'wr-handoff-3',
    from: '@agent-qa',
    to: '@agent-orchestrator',
    domain: 'release-v1-3-0',
    wikilinks: ['[[00_INDEX]]', '[[02_PADROES_E_DECISOES_INDEX]]'],
    action: 'Sign off Task 10 Acceptance Suite & Release v1.3.0 Cut',
  },
  {
    id: 'wr-handoff-4',
    from: '@agent-software-engineer',
    to: '@agent-orchestrator',
    domain: 'gate-1-remediation',
    wikilinks: ['[[00_INDEX]]', '[[PADRAO-Qualidade-TDD-Vitest-Playwright-Surgical]]'],
    action: 'Remediated path traversal, excerpt bounds & emoji scanner',
  },
];

function parseWarRoomPointerLine(raw: string, index: number): WarRoomHandoffEntry | null {
  const fromToMatch = raw.match(/\[FROM:\s*([^\]]+)\]\s*->\s*\[TO:\s*([^\]]+)\]/i);
  if (!fromToMatch) return null;

  const domainMatch = raw.match(/Required Domain:\s*([^|]+)/i);
  const actionMatch = raw.match(/Action:\s*(.+)$/i);
  const wikilinks = Array.from(raw.matchAll(/\[\[[^\]]+\]\]/g))
    .map((m) => m[0])
    .slice(0, 2);

  return {
    id: `wr-live-${index}`,
    from: fromToMatch[1].trim().split(' ')[0],
    to: fromToMatch[2].trim().split(' ')[0],
    domain: domainMatch ? domainMatch[1].trim() : 'swarm',
    wikilinks,
    action: actionMatch ? actionMatch[1].trim() : raw,
  };
}

function renderMarkdownWithHighlights(content: string): React.ReactNode {
  return content.split(/\r?\n/).map((line, lineIdx) => {
    const isHeading = /^\s*#{1,6}\s+/.test(line);
    const parts = line.split(/(\[\[[^\]]+\]\])/g);
    return (
      <div
        key={lineIdx}
        style={{
          color: isHeading ? '#AA88FF' : '#DDDDDD',
          fontWeight: isHeading ? 700 : 400,
          minHeight: '16px',
        }}
      >
        {parts.map((part, pIdx) =>
          part.startsWith('[[') && part.endsWith(']]') ? (
            <span key={pIdx} style={{ color: '#AA88FF', fontWeight: 600 }}>
              {part}
            </span>
          ) : (
            part
          )
        )}
      </div>
    );
  });
}

export function RightSingularityColumn() {
  const {
    singularity,
    agents,
    selectedAgentId,
    selectedNoteId,
    activeNoteReader,
    activeDiffInspector,
    closeSecondBrainNoteReader,
    executeDiffGateDecision,
    injectNoteIntoAgentContext,
    isInspectorDrawerOpen,
    isRightInspectorCollapsed,
    toggleRightInspector,
    setInspectorDrawerOpen,
    cortexNoteCount,
    secondBrainNotes,
    systemState,
  } = useKalinarStore();
  const [isMicActive, setIsMicActive] = useState(false);
  const [bands, setBands] = useState<TauzFrequencyBands>({
    subBass: 0,
    lowMid: 0,
    highPresence: 0,
    compositePulse: 0,
  });
  const [activeWikilinks, setActiveWikilinks] = useState<
    Array<{ wikilink: string; domain: string; position3D?: [number, number, number] }>
  >([]);
  const [warRoomHandoffs, setWarRoomHandoffs] = useState<WarRoomHandoffEntry[]>([]);

  useEffect(() => {
    let rafId = 0;
    let disposed = false;

    const tick = () => {
      if (disposed) return;
      const next = kalinarVoiceService.getRealtimeFrequencyBands();
      setBands((prev) => {
        if (
          Math.abs(prev.subBass - next.subBass) < 0.002 &&
          Math.abs(prev.lowMid - next.lowMid) < 0.002 &&
          Math.abs(prev.highPresence - next.highPresence) < 0.002 &&
          Math.abs(prev.compositePulse - next.compositePulse) < 0.002
        ) {
          return prev;
        }
        return next;
      });
      rafId = requestAnimationFrame(tick);
    };

    if (typeof requestAnimationFrame === 'function') {
      rafId = requestAnimationFrame(tick);
      return () => {
        disposed = true;
        cancelAnimationFrame(rafId);
      };
    }

    const interval = setInterval(() => {
      setBands(kalinarVoiceService.getRealtimeFrequencyBands());
    }, 16);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Hydrate Wikilinks from active Second Brain galaxy nodes if mounted
    const globalNodes =
      typeof window !== 'undefined'
        ? ((window as any).__kalinarSecondBrainNodes as SecondBrainNode[] | undefined)
        : undefined;
    if (Array.isArray(globalNodes) && globalNodes.length > 0) {
      setActiveWikilinks(
        globalNodes.slice(0, 5).map((n) => ({
          wikilink: n.wikilink,
          domain: n.domain,
          position3D: n.position3D,
        }))
      );
    }

    // Hydrate WAR_ROOM.md Graph Pointers if Electron IPC is available
    const api = typeof window !== 'undefined' ? (window as any).kalinarApi : null;
    if (api?.scanWorkspaceNodes) {
      api
        .scanWorkspaceNodes()
        .then((res: any) => {
          if (res?.secondBrainNodes?.length > 0) {
            setActiveWikilinks(
              res.secondBrainNodes.slice(0, 5).map((n: SecondBrainNode) => ({
                wikilink: n.wikilink,
                domain: n.domain,
                position3D: n.position3D,
              }))
            );
          }
          if (Array.isArray(res?.warRoomPointers) && res.warRoomPointers.length > 0) {
            const parsed: WarRoomHandoffEntry[] = [];
            res.warRoomPointers.forEach((ptr: any, idx: number) => {
              if (typeof ptr === 'string') {
                const entry = parseWarRoomPointerLine(ptr, idx);
                if (entry) parsed.push(entry);
              } else if (ptr && typeof ptr === 'object' && ptr.from && ptr.to) {
                parsed.push({
                  id: ptr.id || `wr-obj-${idx}`,
                  from: ptr.from,
                  to: ptr.to,
                  domain: ptr.domain || 'swarm',
                  wikilinks: Array.isArray(ptr.wikilinks) ? ptr.wikilinks.slice(0, 2) : [],
                  action: ptr.action || '',
                });
              }
            });
            if (parsed.length > 0) {
              setWarRoomHandoffs(parsed.slice(-4));
            }
          }
        })
        .catch(() => {
          // Keep deterministic baseline WAR_ROOM handoffs
        });
    }
  }, []);

  const handleMicToggle = async () => {
    const active = await kalinarVoiceService.toggleVoiceLink();
    setIsMicActive(active);
  };

  const handleBriefingRequest = async () => {
    const briefing = kalinarSingularityBrain.generateTacticalBriefing({
      userName: 'Thiago',
      agents,
      secondBrainDirectivesCount: activeWikilinks.length,
      activeDirective: singularity.activeDirective,
    });
    await kalinarVoiceService.speakDirective(briefing);
  };

  const handleSilenceRequest = async () => {
    setIsMicActive(false);
    await kalinarVoiceService.triggerEmergencyKillSwitch();
  };

  const handleWikilinkPull = (pos?: [number, number, number]) => {
    if (typeof window !== 'undefined' && typeof (window as any).__triggerGravitationalRAG === 'function') {
      const target = pos || agents.find((a) => a.id === selectedAgentId)?.position3D || [120, 80, 0];
      (window as any).__triggerGravitationalRAG(target);
    }
  };

  const activeAgent = agents.find((a) => a.id === selectedAgentId) || null;
  const selectedNote = secondBrainNotes.find((n) => n.id === selectedNoteId) || null;

  return (
    <aside
      data-slot="vision-b-right-inspector"
      data-collapsed={isRightInspectorCollapsed}
      style={{
        width: isRightInspectorCollapsed ? '44px' : 'clamp(300px, 24vw, 360px)',
        height: '100vh',
        paddingTop: '40px',
        background: 'rgba(7, 8, 10, 0.92)',
        backdropFilter: 'blur(12px)',
        borderLeft: '1px solid #1F232E',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        pointerEvents: 'auto',
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
    >
      {/* Top Collapse Bar */}
      <div
        style={{
          height: '36px',
          minHeight: '36px',
          padding: '0 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isRightInspectorCollapsed ? 'center' : 'space-between',
          borderBottom: '1px solid #1F232E',
        }}
      >
        {!isRightInspectorCollapsed && (
          <span style={{ color: '#AA88FF', fontWeight: 700, fontSize: '11px' }}>
            INSPETOR // TAUZ DSP
          </span>
        )}
        <button
          type="button"
          data-slot="right-inspector-collapse-btn"
          onClick={toggleRightInspector}
          style={{
            backgroundColor: '#0D0F14',
            color: '#DDDDDD',
            border: '1px solid #1F232E',
            padding: '2px 6px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          {isRightInspectorCollapsed ? '[ < ]' : '[ > ]'}
        </button>
      </div>

      {!isRightInspectorCollapsed && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Modulo A: Voz Soberana Tauz & DSP ([singularity_core]) */}
          <SingularityHudColumn.Root isDrawerOpen={false}>
            <SingularityHudColumn.CoreBlock
              voiceState={singularity.voiceState}
              transcript={singularity.liveTranscript}
              zenLatencyMs={singularity.zenLatencyMs}
              onMicToggle={handleMicToggle}
              onBriefingRequest={handleBriefingRequest}
              onSilenceRequest={handleSilenceRequest}
              isMicActive={isMicActive}
              frequencyBands={bands}
            />

            {/* Modulo B: Inspetor Contextual */}
            <SingularityHudColumn.Block tag="contextual_inspector">
              <div
                data-slot="contextual-inspector-body"
                style={{
                  padding: '10px',
                  backgroundColor: '#000000',
                  border: '1px solid #1F232E',
                  fontSize: '11.5px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  overflowWrap: 'break-word',
                }}
              >
                {activeNoteReader ? (
                  <div
                    data-slot="second-brain-note-reader"
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{ color: '#AA88FF', fontWeight: 700 }}>
                        {activeNoteReader.title}
                      </span>
                      <button
                        type="button"
                        data-slot="note-reader-close-btn"
                        onClick={closeSecondBrainNoteReader}
                        style={{
                          backgroundColor: '#0D0F14',
                          color: '#9A9A9A',
                          border: '1px solid #1F232E',
                          padding: '2px 6px',
                          fontSize: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        [ FECHAR ]
                      </button>
                    </div>
                    <span style={{ color: '#9A9A9A', fontSize: '10.5px', textTransform: 'none' }}>
                      {activeNoteReader.relativePath}
                    </span>
                    <button
                      type="button"
                      data-slot="note-reader-inject-btn"
                      onClick={() =>
                        void injectNoteIntoAgentContext(
                          activeAgent?.id || '@agent-orchestrator',
                          activeNoteReader.relativePath
                        )
                      }
                      style={{
                        backgroundColor: '#0D0F14',
                        color: '#AA88FF',
                        border: '1px solid #1F232E',
                        padding: '4px 8px',
                        fontSize: '10.5px',
                        cursor: 'pointer',
                        alignSelf: 'flex-start',
                      }}
                    >
                      [ INJETAR NO ENXAME ]
                    </button>
                    {activeNoteReader.error ? (
                      <div
                        data-slot="note-reader-error"
                        style={{ color: '#F87171', fontSize: '11px' }}
                      >
                        [{activeNoteReader.error}]
                      </div>
                    ) : (
                      <div
                        data-slot="note-reader-body"
                        style={{
                          overflowY: 'auto',
                          maxHeight: 'calc(100vh - 280px)',
                          fontSize: '13px',
                          color: '#DDDDDD',
                          backgroundColor: '#07080A',
                          border: '1px solid #1F232E',
                          padding: '8px',
                          textTransform: 'none',
                          overflowWrap: 'break-word',
                        }}
                      >
                        {activeNoteReader.isLoading
                          ? '[CARREGANDO NOTA...]'
                          : renderMarkdownWithHighlights(activeNoteReader.content)}
                      </div>
                    )}
                  </div>
                ) : activeDiffInspector ? (
                  <div
                    data-slot="sovereign-diff-inspector"
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{ color: '#AA88FF', fontWeight: 700 }}>
                        {activeDiffInspector.filePath}
                      </span>
                      <span style={{ color: '#34D399', fontSize: '10px' }}>
                        [{activeDiffInspector.decisionStatus}]
                      </span>
                    </div>

                    {activeDiffInspector.isLoading ? (
                      <span style={{ color: '#9A9A9A' }}>[CARREGANDO DIFF...]</span>
                    ) : activeDiffInspector.diffLines.length === 0 ? (
                      <span data-slot="diff-empty-notice" style={{ color: '#9A9A9A' }}>
                        [NENHUM DIFF PENDENTE PARA ESTE AGENTE]
                      </span>
                    ) : (
                      <>
                        <div
                          style={{
                            maxHeight: '160px',
                            overflowY: 'auto',
                            backgroundColor: '#07080A',
                            border: '1px solid #1F232E',
                            padding: '6px',
                            fontSize: '10.5px',
                            textTransform: 'none',
                          }}
                        >
                          {activeDiffInspector.diffLines.map((line, idx) => {
                            const isAdd = line.startsWith('+') && !line.startsWith('+++');
                            const isDel = line.startsWith('-') && !line.startsWith('---');
                            return (
                              <div
                                key={idx}
                                style={{
                                  color: isAdd ? '#34D399' : isDel ? '#F87171' : '#DDDDDD',
                                  whiteSpace: 'pre-wrap',
                                  overflowWrap: 'break-word',
                                }}
                              >
                                {line}
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            data-slot="sovereign-btn-approve-diff"
                            onClick={() =>
                              void executeDiffGateDecision(
                                activeDiffInspector.agentId,
                                'APPROVE'
                              )
                            }
                            style={{
                              backgroundColor: 'rgba(52, 211, 153, 0.12)',
                              color: '#34D399',
                              border: '1px solid #34D399',
                              padding: '4px 8px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            [ APROVAR ]
                          </button>
                          <button
                            type="button"
                            data-slot="sovereign-btn-revert-diff"
                            onClick={() =>
                              void executeDiffGateDecision(
                                activeDiffInspector.agentId,
                                'REVERT'
                              )
                            }
                            style={{
                              backgroundColor: 'rgba(248, 113, 113, 0.12)',
                              color: '#F87171',
                              border: '1px solid #F87171',
                              padding: '4px 8px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            [ REVERTER ]
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : activeAgent ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#AA88FF', fontWeight: 700 }}>
                        {activeAgent.filename}
                      </span>
                      <span style={{ color: '#34D399' }}>{activeAgent.status}</span>
                    </div>
                    <span style={{ color: '#9A9A9A', textTransform: 'none' }}>
                      {activeAgent.currentObjective}
                    </span>
                    <pre
                      style={{
                        margin: 0,
                        padding: '6px',
                        backgroundColor: '#07080A',
                        border: '1px solid #1F232E',
                        color: '#DDDDDD',
                        fontSize: '10.5px',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'break-word',
                        maxHeight: '140px',
                        overflowY: 'auto',
                        textTransform: 'none',
                      }}
                    >
                      {activeAgent.livePreviewStream || '[SEM DIFF EM ANDAMENTO]'}
                    </pre>
                    <SovereignAgentControlsBar agentId={activeAgent.id} />
                    <button
                      type="button"
                      onClick={() => setInspectorDrawerOpen(!isInspectorDrawerOpen)}
                      style={{
                        backgroundColor: '#0D0F14',
                        color: '#AA88FF',
                        border: '1px solid #1F232E',
                        padding: '4px 8px',
                        fontSize: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      [ ABRIR DIFF INSPECTOR COMPLETO ]
                    </button>
                  </>
                ) : selectedNote ? (
                  <>
                    <span style={{ color: '#AA88FF', fontWeight: 700 }}>{selectedNote.title}</span>
                    <span style={{ color: '#9A9A9A', fontSize: '10px' }}>
                      {selectedNote.wikilink} · {selectedNote.domain}
                    </span>
                    <span style={{ color: '#DDDDDD', textTransform: 'none' }}>
                      {selectedNote.excerpt}
                    </span>
                  </>
                ) : (
                  <span style={{ color: '#9A9A9A' }}>
                    [STANDBY: SELECIONE UM NO OU AGENTE]
                  </span>
                )}
              </div>
            </SingularityHudColumn.Block>

            {/* 2. [active_directive] */}
            <SingularityHudColumn.Block tag="active_directive">
              <div className="p-2.5 bg-[#000000] border border-[#1F232E] text-[11px] leading-tight flex flex-col gap-1.5 tabular-nums">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#34D399] font-semibold truncate">
                    {singularity.activeDirective}
                  </span>
                  <span className="text-[10px] text-[#00F0FF] shrink-0">
                    {singularity.lastAckBadge || '[ACK_VERIFIED]'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#9A9A9A]">
                  <span>SWARM: {activeAgent?.filename || systemState}</span>
                  <span className="text-[#DDDDDD]">
                    ZEN LATENCY: {singularity.zenLatencyMs.toFixed(2)}MS (&lt; 0.45MS)
                  </span>
                </div>
              </div>
            </SingularityHudColumn.Block>

            {/* 3. [gravitational_rag] */}
            <SingularityHudColumn.Block tag="gravitational_rag">
              <div className="p-2.5 bg-[#000000] border border-[#1F232E] text-[10.5px] leading-relaxed flex flex-col gap-1.5 tabular-nums">
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#9A9A9A]">CORPUS / TURB:</span>
                  <span className="text-[#DDDDDD]">
                    {cortexNoteCount.toLocaleString('en-US')} DOCS ·{' '}
                    {(singularity.accretionTurbulence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {(activeWikilinks.length > 0
                    ? activeWikilinks
                    : secondBrainNotes.slice(0, 5).map((n) => ({
                        wikilink: n.wikilink,
                        domain: n.domain,
                        position3D: undefined as [number, number, number] | undefined,
                      }))
                  ).map((item) => (
                    <button
                      key={item.wikilink}
                      type="button"
                      onClick={() => handleWikilinkPull(item.position3D)}
                      className="pointer-events-auto cursor-pointer text-[10px] font-mono text-[#DDDDDD] hover:text-[#AA88FF] bg-[#0D0F14] border border-[#1F232E] hover:border-[#AA88FF] px-1.5 py-0.5 transition-colors normal-case"
                      style={{
                        background: '#0D0F14',
                        color: '#DDDDDD',
                        border: '1px solid #1F232E',
                        padding: '2px 6px',
                        textAlign: 'left',
                        maxWidth: '100%',
                      }}
                      title={`Pull ${item.wikilink} (${item.domain}) into Event Horizon`}
                    >
                      {item.wikilink}
                    </button>
                  ))}
                  {activeWikilinks.length === 0 && secondBrainNotes.length === 0 && (
                    <span className="text-[10px] text-[#9A9A9A]">
                      [STANDBY_READY] Nenhuma nota indexada
                    </span>
                  )}
                </div>
              </div>
            </SingularityHudColumn.Block>

            {/* 4. [synaptic_feed] */}
            <SingularityHudColumn.Block tag="synaptic_feed">
              <div className="p-2.5 bg-[#000000] border border-[#1F232E] text-[10px] flex flex-col gap-1.5 font-mono tabular-nums">
                {warRoomHandoffs.length === 0 ? (
                  <span className="text-[#9A9A9A]">[STANDBY_READY] Nenhum handoff ativo</span>
                ) : (
                  warRoomHandoffs.slice(-4).map((handoff) => (
                    <div
                      key={handoff.id}
                      className="flex flex-col gap-0.5 border-l border-[#8B5CF6] pl-2"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[#00F0FF] truncate">
                          {handoff.from} -&gt; {handoff.to}
                        </span>
                        <span className="text-[#9A9A9A] shrink-0 uppercase">
                          [{handoff.domain}]
                        </span>
                      </div>
                      <span className="text-[#DDDDDD] truncate opacity-85 normal-case">
                        {handoff.action}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </SingularityHudColumn.Block>
          </SingularityHudColumn.Root>
        </div>
      )}
    </aside>
  );
}
