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
    <div
      data-slot="left-agent-cards-column"
      className="w-full flex flex-col gap-3"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {/* 1. Domain Filter Chips */}
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
                  ? { backgroundColor: '#E6E6E6', color: '#000000', borderColor: '#E6E6E6' }
                  : { backgroundColor: '#0D0F14', color: '#9A9A9A', borderColor: '#1A1D26' }
              }
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* 2. Scrollable List of 160px AgentLivePreviewCard Items */}
      <div
        data-slot="agent-cards-scroll-list"
        className="flex flex-col gap-3"
      >
        {filteredAgents.length === 0 ? (
          <div
            data-slot="agents-empty-standby"
            style={{
              padding: '10px',
              border: '1px solid #1F232E',
              backgroundColor: '#000000',
              color: '#9A9A9A',
              fontSize: '11px',
            }}
          >
            [STANDBY_READY] 0 agentes ativos no enxame.
          </div>
        ) : (
          filteredAgents.map((agent) => {
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
          })
        )}
      </div>
    </div>
  );
}
