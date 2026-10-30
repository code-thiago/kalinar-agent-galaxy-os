import { useKalinarStore } from '../../store/useKalinarStore.js';

export function NodeInspectorDrawer() {
  const { isInspectorDrawerOpen, toggleInspectorDrawer, agents, selectedAgentId } = useKalinarStore();
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  return (
    <div
      data-slot="node-inspector-drawer"
      data-open={isInspectorDrawerOpen}
      className={`fixed top-0 bottom-[36px] right-0 w-[480px] bg-[rgba(10,12,16,0.98)] border-l border-[var(--ds-border-subtle)] z-25 transition-transform duration-300 flex flex-col p-6 pointer-events-auto select-none ${
        isInspectorDrawerOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--ds-border-subtle)]">
        <div className="flex flex-col">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ds-accent-singularity)]">
            [SECOND_BRAIN_INSPECTOR]
          </span>
          <span className="font-sans font-semibold text-[15px] text-[var(--ds-primitive-white-500)]">
            {selectedAgent?.filename || 'NÓ SELECIONADO'}
          </span>
        </div>
        <button
          onClick={toggleInspectorDrawer}
          className="px-2 py-1 text-[11px] font-mono uppercase border border-[var(--ds-border-subtle)] hover:border-[var(--ds-status-halt-border)] hover:text-[var(--ds-status-halt-fg)] text-[var(--ds-text-secondary)] transition-colors cursor-pointer"
        >
          [FECHAR]
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 py-4 flex flex-col gap-4 overflow-y-auto font-mono text-[12px]">
        <div className="p-3 bg-[#07080a] border border-[var(--ds-border-subtle)] flex flex-col gap-2">
          <span className="text-[10px] text-[var(--ds-text-secondary)] uppercase">
            STATUS OPERACIONAL
          </span>
          <div className="flex justify-between items-center tabular-nums">
            <span className="text-[var(--ds-status-active-fg)] font-medium">
              {selectedAgent?.status}
            </span>
            <span className="text-[var(--ds-text-secondary)]">PID: {selectedAgent?.pid}</span>
          </div>
          <div className="text-[11px] text-[var(--ds-text-primary)]">
            {selectedAgent?.currentObjective}
          </div>
        </div>

        <div className="p-3 bg-[#07080a] border border-[var(--ds-border-subtle)] flex flex-col gap-2">
          <span className="text-[10px] text-[var(--ds-text-secondary)] uppercase">
            CONEXÕES SECOND BRAIN (WIKILINKS)
          </span>
          <div className="flex flex-col gap-1 text-[11px] text-[var(--ds-accent-singularity)]">
            <span>[[00_INDEX]]</span>
            <span>[[01_PROJETOS/Kalinar-Agent-Galaxy-OS]]</span>
            <span>[[02_PADROES/ADR-004-Six-Pillar-Blueprint-Lock]]</span>
            <span>[[04_STACK/zen-engine]]</span>
          </div>
        </div>

        <div className="p-3 bg-[#07080a] border border-[var(--ds-border-subtle)] flex flex-col gap-2">
          <span className="text-[10px] text-[var(--ds-text-secondary)] uppercase">
            BUFFER DE TELEMETRIA
          </span>
          <div className="p-2 bg-black border border-[var(--ds-border-subtle)] text-[10.5px] leading-relaxed whitespace-pre-wrap text-[var(--ds-text-primary)]">
            {selectedAgent?.livePreviewStream}
          </div>
        </div>
      </div>
    </div>
  );
}
