import { useState, useEffect } from 'react';
import { useKalinarStore } from '../../store/useKalinarStore.js';
import { SingularityHudColumn } from '../ui/SingularityHudColumn.js';
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

const DEFAULT_ACTIVE_WIKILINKS: Array<{ wikilink: string; domain: string; position3D?: [number, number, number] }> = [
  { wikilink: '[[00_INDEX]]', domain: '05_AGENTS' },
  { wikilink: '[[04_BRIEFING_AND_DESIGN_SYSTEM]]', domain: '02_PADROES' },
  { wikilink: '[[ADR-001-Seguranca-Sessao-Server-Side-Auth]]', domain: '02_PADROES' },
  { wikilink: '[[Stack-Principal-Thiago]]', domain: '04_STACK' },
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

export function RightSingularityColumn() {
  const { singularity, agents, selectedAgentId, isInspectorDrawerOpen } = useKalinarStore();
  const [isMicActive, setIsMicActive] = useState(false);
  const [bands, setBands] = useState<TauzFrequencyBands>({
    subBass: 0,
    lowMid: 0,
    highPresence: 0,
    compositePulse: 0,
  });
  const [activeWikilinks, setActiveWikilinks] = useState(DEFAULT_ACTIVE_WIKILINKS);
  const [warRoomHandoffs, setWarRoomHandoffs] = useState<WarRoomHandoffEntry[]>(
    DEFAULT_WAR_ROOM_HANDOFFS
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setBands(kalinarVoiceService.getRealtimeFrequencyBands());
    }, 50);
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
    if (!isMicActive) {
      const enabled = await kalinarVoiceService.enableMicrophone();
      setIsMicActive(enabled);
    } else {
      kalinarVoiceService.dispose();
      setIsMicActive(false);
    }
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

  const handleWikilinkPull = (pos?: [number, number, number]) => {
    if (typeof window !== 'undefined' && typeof (window as any).__triggerGravitationalRAG === 'function') {
      const target = pos || agents.find((a) => a.id === selectedAgentId)?.position3D || [120, 80, 0];
      (window as any).__triggerGravitationalRAG(target);
    }
  };

  const activeAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  return (
    <aside
      data-slot="right-singularity-column"
      className={`fixed right-[48px] top-1/2 -translate-y-1/2 w-[360px] pointer-events-none z-[15] transition-opacity duration-300 ${
        isInspectorDrawerOpen ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        right: '48px',
        width: '360px',
        mixBlendMode: 'plus-lighter',
        pointerEvents: 'none',
        zIndex: 15,
        opacity: isInspectorDrawerOpen ? 0 : 1,
      }}
    >
      <SingularityHudColumn.Root isDrawerOpen={isInspectorDrawerOpen}>
        {/* 1. [singularity_core] */}
        <SingularityHudColumn.CoreBlock
          voiceState={singularity.voiceState}
          transcript={singularity.liveTranscript}
          zenLatencyMs={singularity.zenLatencyMs}
          onMicToggle={handleMicToggle}
          onBriefingRequest={handleBriefingRequest}
          isMicActive={isMicActive}
          frequencyBands={bands}
        />

        {/* 2. [active_directive] */}
        <SingularityHudColumn.Block tag="active_directive">
          <div className="p-2.5 bg-[rgba(13,15,20,0.55)] border border-[#1A1D26] text-[11px] leading-tight flex flex-col gap-1.5 tabular-nums">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#34D399] font-semibold truncate">
                {singularity.activeDirective}
              </span>
              <span className="text-[10px] text-[#00F0FF] shrink-0">
                {singularity.lastAckBadge || '[ACK_VERIFIED]'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#9A9A9A]">
              <span>
                SWARM: {activeAgent?.filename || '@agent-orchestrator'}
              </span>
              <span className="text-[#DDDDDD]">
                ZEN LATENCY: {singularity.zenLatencyMs.toFixed(2)}MS (&lt; 0.45MS)
              </span>
            </div>
            <span className="text-[#9A9A9A] text-[10.5px] truncate">
              {activeAgent?.currentObjective || 'Orquestracao de fila e sincronizacao de blueprint'}
            </span>
          </div>
        </SingularityHudColumn.Block>

        {/* 3. [gravitational_rag] */}
        <SingularityHudColumn.Block tag="gravitational_rag">
          <div className="p-2.5 bg-[rgba(13,15,20,0.55)] border border-[#1A1D26] text-[10.5px] leading-relaxed flex flex-col gap-1.5 tabular-nums">
            <div className="flex justify-between text-[10px]">
              <span className="text-[#9A9A9A]">CORPUS / TURB:</span>
              <span className="text-[#DDDDDD]">
                1,113,033 DOCS · {(singularity.accretionTurbulence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {activeWikilinks.map((item) => (
                <button
                  key={item.wikilink}
                  type="button"
                  onClick={() => handleWikilinkPull(item.position3D)}
                  className="pointer-events-auto cursor-pointer text-[10px] font-mono text-[#E879F9] hover:text-[#FFFFFF] bg-[rgba(232,121,249,0.08)] border border-[rgba(232,121,249,0.3)] hover:border-[#E879F9] px-1.5 py-0.5 transition-colors normal-case"
                  style={{ pointerEvents: 'auto' }}
                  title={`Pull ${item.wikilink} (${item.domain}) into Event Horizon`}
                >
                  {item.wikilink}
                </button>
              ))}
            </div>
          </div>
        </SingularityHudColumn.Block>

        {/* 4. [synaptic_feed] — Latest 4 Graph Pointer handoffs from WAR_ROOM.md */}
        <SingularityHudColumn.Block tag="synaptic_feed">
          <div className="p-2.5 bg-[rgba(13,15,20,0.55)] border border-[#1A1D26] text-[10px] flex flex-col gap-1.5 font-mono tabular-nums">
            {warRoomHandoffs.slice(-4).map((handoff) => (
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
            ))}
          </div>
        </SingularityHudColumn.Block>
      </SingularityHudColumn.Root>
    </aside>
  );
}
