import { useKalinarStore } from '../../store/useKalinarStore.js';
import { AgentLivePreviewCard } from '../ui/AgentLivePreviewCard.js';
import { AgentNode } from '../../types/kalinar.js';

export const LEFT_COLUMN_FILTER_CHIPS = [
  'ALL',
  'AGENTS',
  'SECOND BRAIN',
  'GRAVITY',
  'ZEN JDM',
  'SANDBOX',
  'PTY',
  'METRICS',
] as const;

function extractFilePathFromPreview(stream: string, fallback = 'src/core/ZenFirewall.ts'): string {
  const match = stream.match(/@@[^\n]*@@\s+([^\s\r\n]+)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return fallback;
}

function matchesFilterChip(agent: AgentNode, activeFilter: string): boolean {
  if (activeFilter === 'ALL' || activeFilter === 'AGENTS') return true;
  if (activeFilter === 'SANDBOX') {
    return agent.executionMode === 'SANDBOX_DRY_RUN' || agent.executionMode === 'STEP_BY_STEP_GATE';
  }
  if (activeFilter === 'ZEN JDM') {
    return (
      agent.filename === '@agent-data' ||
      agent.filename === '@agent-cybersecurity' ||
      agent.filename === '@agent-orchestrator' ||
      agent.currentObjective.toUpperCase().includes('JDM')
    );
  }
  if (activeFilter === 'PTY') {
    return agent.status === '[ACTIVE]' || agent.status === '[RUNNING]';
  }
  if (activeFilter === 'SECOND BRAIN' || activeFilter === 'GRAVITY' || activeFilter === 'METRICS') {
    return true;
  }
  return agent.executionMode.includes(activeFilter);
}

export function LeftAgentCardsColumn() {
  const {
    agents,
    activeFilter,
    setFilter,
    selectAgent,
    selectedAgentId,
    setInspectorDrawerOpen,
    setInspectedFilePath,
  } = useKalinarStore();

  const filteredAgents = agents.filter((a) => matchesFilterChip(a, activeFilter));

  const handleChipClick = (chip: string) => {
    setFilter(chip);
    if (
      (chip === 'SECOND BRAIN' || chip === 'GRAVITY') &&
      typeof window !== 'undefined' &&
      typeof (window as any).__triggerGravitationalRAG === 'function'
    ) {
      const active = agents.find((a) => a.id === selectedAgentId) || agents[0];
      (window as any).__triggerGravitationalRAG(active?.position3D || [120, 80, 0]);
    }
  };

  const handleCardSelect = (agent: AgentNode) => {
    selectAgent(agent.id);
    const extractedPath = extractFilePathFromPreview(agent.livePreviewStream);
    setInspectedFilePath(extractedPath);
    setInspectorDrawerOpen(true);
  };

  return (
    <aside
      data-slot="left-agent-cards-column"
      className="fixed left-[24px] top-[24px] bottom-[52px] w-[320px] pointer-events-auto z-[15] flex flex-col gap-3.5"
      style={{
        left: '24px',
        top: '24px',
        bottom: '52px',
        width: '320px',
        pointerEvents: 'auto',
        zIndex: 15,
      }}
    >
      {/* 1. Brand Header (top: 0) */}
      <div
        data-slot="brand-header"
        className="relative top-0 left-0 right-0 flex items-center gap-3 select-none shrink-0"
      >
        {/* 40x40px Geometric 8-Point SVG Emblem (stroke: #AA88FF) */}
        <svg
          width="40"
          height="40"
          className="w-[40px] h-[40px] shrink-0"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="KALINAR Singularity Emblem"
        >
          <rect
            x="2"
            y="2"
            width="36"
            height="36"
            stroke="#AA88FF"
            strokeWidth="1.5"
            strokeOpacity="0.45"
          />
          <polygon
            points="20,4 24,16 36,20 24,24 20,36 16,24 4,20 16,16"
            fill="none"
            stroke="#AA88FF"
            strokeWidth="1.5"
          />
          <circle cx="20" cy="20" r="3" fill="#AA88FF" />
        </svg>

        <h1
          className="font-sans font-bold text-[20px] tracking-tight text-[#FFFFFF] leading-tight uppercase"
          style={{
            fontSize: '20px',
            color: '#FFFFFF',
            mixBlendMode: 'plus-lighter',
          }}
        >
          KALINAR // SINGULARITY OS
        </h1>
      </div>

      {/* 2. Domain Filter Chips */}
      <div
        data-slot="domain-filter-chips"
        className="flex flex-wrap gap-1.5 select-none shrink-0"
      >
        {LEFT_COLUMN_FILTER_CHIPS.map((chip) => {
          const isActive = activeFilter === chip;
          return (
            <button
              key={chip}
              onClick={() => handleChipClick(chip)}
              className={`text-[11px] font-mono uppercase px-2 py-1 border transition-all cursor-pointer leading-none ${
                isActive
                  ? 'bg-[#E6E6E6] text-[#000000] border-[#E6E6E6] font-semibold'
                  : 'bg-transparent border-[#1A1D26] text-[#9A9A9A] hover:border-[#2A2A2A] hover:text-[#DDDDDD]'
              }`}
              style={
                isActive
                  ? { backgroundColor: '#E6E6E6', color: '#000000' }
                  : undefined
              }
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* 3. Scrollable List of 160px AgentLivePreviewCard Items */}
      <div
        data-slot="agent-cards-scroll-list"
        className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-3"
      >
        {filteredAgents.map((agent) => {
          const isSelected = selectedAgentId === agent.id;
          return (
            <div
              key={agent.id}
              onClick={() => handleCardSelect(agent)}
              className="cursor-pointer transition-transform"
            >
              <AgentLivePreviewCard.Root agent={agent} isSelected={isSelected}>
                <AgentLivePreviewCard.LiveViewport
                  streamContent={agent.livePreviewStream}
                  activeModelId={agent.activeModelId}
                  fifoCount={agent.fifoQueueDepth ?? agent.fifoQueueCount ?? 0}
                  onInspectDiff={(e) => {
                    e.stopPropagation();
                    handleCardSelect(agent);
                  }}
                />
                <AgentLivePreviewCard.MetadataRow agent={agent} />
              </AgentLivePreviewCard.Root>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
