import { useKalinarStore } from '../../store/useKalinarStore.js';

export function TopRightTrigger() {
  const { agents, toggleInspectorDrawer, isInspectorDrawerOpen } = useKalinarStore();

  const handleSecondBrainTrigger = () => {
    toggleInspectorDrawer();
  };

  return (
    <div
      data-slot="top-right-trigger"
      className="fixed top-[24px] right-[24px] flex items-center gap-3 z-30 select-none pointer-events-auto"
    >
      {/* 44x44px circular counter showing active agent count */}
      <div
        className="w-[44px] h-[44px] rounded-full border border-[var(--ds-accent-singularity)] bg-[rgba(13,15,20,0.9)] flex items-center justify-center font-mono text-[13px] font-bold text-[var(--ds-accent-singularity)] tabular-nums shadow-sm"
        title="Agentes Ativos"
      >
        {agents.length}
      </div>

      {/* [ ACIONAR SECOND BRAIN ] trigger */}
      <button
        onClick={handleSecondBrainTrigger}
        className="h-[44px] px-4 border border-[var(--ds-border-subtle)] hover:border-[var(--ds-accent-singularity)] bg-[rgba(13,15,20,0.9)] text-[var(--ds-primitive-white-500)] hover:text-[var(--ds-accent-singularity)] font-mono text-[11px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
      >
        <span>[ {isInspectorDrawerOpen ? 'FECHAR GAVETA' : 'ACIONAR SECOND BRAIN'} ]</span>
        <span className="w-2 h-2 rounded-full bg-[var(--ds-status-active-fg)] animate-pulse" />
      </button>
    </div>
  );
}
