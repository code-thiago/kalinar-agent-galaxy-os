import { useKalinarStore } from '../../store/useKalinarStore.js';
import { SingularityHudColumn } from '../ui/SingularityHudColumn.js';

export function RightSingularityColumn() {
  const { singularity, isInspectorDrawerOpen } = useKalinarStore();

  return (
    <aside
      data-slot="right-singularity-column"
      className="fixed right-[48px] top-1/2 -translate-y-1/2 w-[360px] pointer-events-auto z-20"
    >
      <SingularityHudColumn.Root isDrawerOpen={isInspectorDrawerOpen}>
        {/* 1. Singularity Core Block */}
        <SingularityHudColumn.CoreBlock
          voiceState={singularity.voiceState}
          transcript={singularity.liveTranscript}
          zenLatencyMs={singularity.zenLatencyMs}
        />

        {/* 2. Active Directive */}
        <SingularityHudColumn.Block tag="ACTIVE_DIRECTIVE">
          <div className="p-2.5 bg-[rgba(13,15,20,0.85)] border border-[var(--ds-border-subtle)] text-[11px] leading-tight flex flex-col gap-1">
            <span className="text-[var(--ds-status-active-fg)] font-semibold">
              {singularity.activeDirective}
            </span>
            <span className="text-[var(--ds-text-secondary)] text-[10.5px]">
              Vigilância heurística sobre workspaces e barramento SQLite WAL ativo.
            </span>
          </div>
        </SingularityHudColumn.Block>

        {/* 3. Gravitational RAG */}
        <SingularityHudColumn.Block tag="GRAVITATIONAL_RAG">
          <div className="p-2.5 bg-[rgba(13,15,20,0.85)] border border-[var(--ds-border-subtle)] text-[10.5px] leading-relaxed flex flex-col gap-1.5 tabular-nums">
            <div className="flex justify-between">
              <span className="text-[var(--ds-text-secondary)]">CORPUS:</span>
              <span className="text-[var(--ds-accent-memory)] font-medium">1,113,033 DOCS (LEIS-BRAZIL)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ds-text-secondary)]">SECONDBRAIN:</span>
              <span className="text-[var(--ds-primitive-white-500)] font-medium">OBSIDIAN CANONICAL VAULT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ds-text-secondary)]">TURBULENCE:</span>
              <span className="text-[var(--ds-status-warn-fg)] font-medium">
                {(singularity.accretionTurbulence * 100).toFixed(1)}% TURB
              </span>
            </div>
          </div>
        </SingularityHudColumn.Block>

        {/* 4. Synaptic Feed */}
        <SingularityHudColumn.Block tag="SYNAPTIC_FEED">
          <div className="p-2.5 bg-[rgba(13,15,20,0.85)] border border-[var(--ds-border-subtle)] text-[10.5px] flex flex-col gap-1 font-mono">
            <div className="flex items-center gap-2 text-[var(--ds-text-secondary)]">
              <span className="text-[var(--ds-status-active-fg)]">[STREAM]</span>
              <span>DAEMON WATCHER VINCULADO</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--ds-text-secondary)]">
              <span className="text-[var(--ds-accent-singularity)]">[ZEN_JDM]</span>
              <span>FIREWALL ZERO-TRUST OPERANDO &lt; 1MS</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--ds-text-secondary)]">
              <span className="text-[var(--ds-accent-agent)]">[R3F_PREP]</span>
              <span>ESPACO GALAXY PRONTO PARA TAREFA 4</span>
            </div>
          </div>
        </SingularityHudColumn.Block>
      </SingularityHudColumn.Root>
    </aside>
  );
}
