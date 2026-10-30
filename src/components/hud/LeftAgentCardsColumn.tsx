import { useKalinarStore } from '../../store/useKalinarStore.js';
import { AgentLivePreviewCard } from '../ui/AgentLivePreviewCard.js';

const FILTER_CHIPS = [
  'ALL',
  'AGENTS',
  'SECOND BRAIN',
  'GRAVITY',
  'ZEN JDM',
  'SANDBOX',
  'PTY',
  'METRICS',
] as const;

export function LeftAgentCardsColumn() {
  const { agents, activeFilter, setFilter, selectAgent, selectedAgentId } = useKalinarStore();

  const filteredAgents = agents.filter((a) => {
    if (activeFilter === 'ALL' || activeFilter === 'AGENTS') return true;
    return a.executionMode.includes(activeFilter);
  });

  return (
    <aside
      data-slot="left-agent-cards-column"
      className="fixed left-[24px] top-0 bottom-[44px] w-[320px] pointer-events-auto z-20 flex flex-col"
    >
      {/* 1. Brand Mark & Title (top: 24px) */}
      <div className="absolute top-[24px] left-0 right-0 flex items-center gap-3 select-none">
        {/* 40x40 8-Point Geometric SVG Mark */}
        <svg
          className="w-[40px] h-[40px] shrink-0 text-[var(--ds-accent-singularity)]"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="2"
            y="2"
            width="36"
            height="36"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />
          {/* 8-Point Geometric Star / Singularity Core */}
          <polygon
            points="20,4 24,16 36,20 24,24 20,36 16,24 4,20 16,16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle cx="20" cy="20" r="3" fill="currentColor" />
        </svg>

        <div className="flex flex-col">
          <div className="font-sans font-bold text-[16px] tracking-wider text-[var(--ds-primitive-white-500)] flex items-center gap-1.5">
            KALINAR
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-[var(--ds-primitive-slate-800)] text-[var(--ds-accent-singularity)] border border-[var(--ds-border-subtle)]">
              v0.2.0-alpha
            </span>
          </div>
          <div className="text-[10.5px] font-mono text-[var(--ds-text-secondary)] uppercase tracking-tight">
            SINGULARITY TELEMETRY OS
          </div>
        </div>
      </div>

      {/* 2. Domain Filter Chips (top: 120px) */}
      <div className="absolute top-[120px] left-0 right-0 flex flex-wrap gap-1.5 select-none">
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeFilter === chip;
          return (
            <button
              key={chip}
              onClick={() => setFilter(chip)}
              className={`text-[10px] font-mono uppercase px-2 py-1 border transition-all cursor-pointer ${
                isActive
                  ? 'border-[var(--ds-accent-singularity)] text-[var(--ds-accent-singularity)] bg-[rgba(170,136,255,0.08)]'
                  : 'border-[var(--ds-border-subtle)] text-[var(--ds-text-secondary)] hover:border-[var(--ds-border-bold)] hover:text-[var(--ds-text-primary)]'
              }`}
            >
              [{chip}]
            </button>
          );
        })}
      </div>

      {/* 3. Scrollable List of 160px AgentLivePreviewCard Items (top: 250px) */}
      <div className="absolute top-[250px] bottom-0 left-0 right-0 overflow-y-auto pr-1 flex flex-col gap-3">
        {filteredAgents.map((agent) => {
          const isSelected = selectedAgentId === agent.id;
          return (
            <div
              key={agent.id}
              onClick={() => selectAgent(agent.id)}
              className={`cursor-pointer transition-transform ${
                isSelected ? 'ring-1 ring-[var(--ds-accent-singularity)]' : ''
              }`}
            >
              <AgentLivePreviewCard.Root agent={agent}>
                <AgentLivePreviewCard.Header agent={agent} />
                <AgentLivePreviewCard.Stream streamContent={agent.livePreviewStream} />
                <AgentLivePreviewCard.Telemetry agent={agent} />
              </AgentLivePreviewCard.Root>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
