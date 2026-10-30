/**
 * KALINAR TELEMETRY STEP MATRIX & OS PROCESS CONTROL TABLE (v0.5.0-rc1)
 * High-density monospace table with StepDivisionCell slots
 * Strictly Zero Emojis, isolated with React.memo for 60 FPS WebGL protection.
 */

import { memo } from 'react';
import { AgentNode, AgentStatus, ExecutionMode } from '../../types/kalinar.js';

export interface TelemetryMatrixTableProps {
  agents: AgentNode[];
  selectedAgentId?: string | null;
  onSelectAgent?: (id: string) => void;
  onPauseAgent?: (id: string) => void;
  onResumeAgent?: (id: string) => void;
  onApproveDiff?: (id: string) => void;
  onInspectAgent?: (id: string) => void;
  onKillPid?: (pid: number) => void;
}

export interface StepDivisionCellProps {
  currentStep: number;
  totalSteps: number;
  stepDescription: string;
  status: AgentStatus;
}

export const StepDivisionCell = memo(function StepDivisionCell({
  currentStep,
  totalSteps,
  stepDescription,
  status,
}: StepDivisionCellProps) {
  const safeTotal = Math.max(1, totalSteps || 6);
  const safeCurrent = Math.min(safeTotal, Math.max(0, currentStep || 1));

  // Determine bar fill color
  let barColor = 'bg-[var(--ds-accent-agent)]'; // Cyan
  if (status === '[PAUSED]') barColor = 'bg-[var(--ds-status-warn-fg)]'; // Amber
  if (status === '[HALTED]' || status === '[ERROR]') barColor = 'bg-[var(--ds-status-halt-fg)]'; // Crimson
  if (status === '[VERIFIED]') barColor = 'bg-[var(--ds-status-active-fg)]'; // Emerald

  return (
    <div className="flex flex-col gap-1 w-full max-w-[260px]">
      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
        <span
          data-slot="step-fraction"
          className="text-[var(--ds-text-primary)] font-semibold"
        >
          STEP {String(safeCurrent).padStart(2, '0')}/{String(safeTotal).padStart(2, '0')}
        </span>
        <span className="text-[10px] text-[var(--ds-text-secondary)]">
          {Math.round((safeCurrent / safeTotal) * 100)}%
        </span>
      </div>

      {/* Discrete N-block geometric progress bar */}
      <div
        data-slot="step-bar-track"
        className="flex items-center gap-1 w-full h-[5px] bg-[#14161d] p-0.5 border border-[var(--ds-border-subtle)]"
      >
        {Array.from({ length: safeTotal }).map((_, idx) => (
          <div
            key={idx}
            className={`flex-1 h-full transition-colors ${
              idx < safeCurrent ? barColor : 'bg-transparent'
            }`}
          />
        ))}
      </div>

      <div
        data-slot="step-label"
        className="text-[10.5px] text-[var(--ds-text-secondary)] truncate font-mono"
        title={stepDescription}
      >
        {stepDescription || 'Executando diretriz de enxame'}
      </div>
    </div>
  );
});

export const TelemetryMatrixTable = memo(function TelemetryMatrixTable({
  agents,
  selectedAgentId,
  onSelectAgent,
  onPauseAgent,
  onResumeAgent,
  onApproveDiff,
  onInspectAgent,
  onKillPid,
}: TelemetryMatrixTableProps) {
  const getStatusBadgeClass = (status: AgentStatus) => {
    switch (status) {
      case '[ACTIVE]':
      case '[RUNNING]':
        return 'text-[var(--ds-status-active-fg)] border-[var(--ds-status-active-border)]';
      case '[PAUSED]':
        return 'text-[var(--ds-status-warn-fg)] border-[var(--ds-status-warn-border)]';
      case '[HALTED]':
      case '[ERROR]':
        return 'text-[var(--ds-status-halt-fg)] border-[var(--ds-status-halt-border)]';
      case '[STREAM]':
        return 'text-[var(--ds-accent-singularity)] border-[var(--ds-accent-singularity)]';
      default:
        return 'text-[var(--ds-text-secondary)] border-[var(--ds-border-subtle)]';
    }
  };

  const getModeBadgeClass = (mode: ExecutionMode) => {
    switch (mode) {
      case 'AUTO_PILOT':
        return 'text-[var(--ds-status-active-fg)]';
      case 'STEP_BY_STEP_GATE':
        return 'text-[var(--ds-status-warn-fg)]';
      case 'SANDBOX_DRY_RUN':
        return 'text-[var(--ds-accent-agent)]';
      default:
        return 'text-[var(--ds-text-secondary)]';
    }
  };

  return (
    <div
      data-slot="telemetry-matrix-table"
      className="w-full h-full flex flex-col overflow-auto bg-[#07080a] select-none font-mono text-[12px]"
    >
      <table className="w-full text-left border-collapse tabular-nums">
        <thead>
          <tr className="border-b border-[var(--ds-border-subtle)] text-[10.5px] text-[var(--ds-text-secondary)] uppercase bg-[#0a0c10] sticky top-0 z-10">
            <th className="py-2.5 px-3 font-semibold">AGENT (.MD) &amp; PID</th>
            <th className="py-2.5 px-3 font-semibold">EXECUTION MODE</th>
            <th className="py-2.5 px-3 font-semibold min-w-[260px]">TASK DIVISION (STEPS)</th>
            <th className="py-2.5 px-3 font-semibold">GRAVITATIONAL RAG</th>
            <th className="py-2.5 px-3 font-semibold text-right">TOKENS SPENT</th>
            <th className="py-2.5 px-3 font-semibold text-right">ETA</th>
            <th className="py-2.5 px-3 font-semibold text-center min-w-[220px]">CONTROLS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ds-border-subtle)]">
          {agents.map((agent) => {
            const isSelected = agent.id === selectedAgentId;
            const promptTok = agent.tokensPrompt || 0;
            const compTok = agent.tokensCompletion || 0;
            const totalTok = promptTok + compTok;
            const etaSec = agent.etaSeconds || 0;
            const etaFormatted = `${String(Math.floor(etaSec / 60)).padStart(2, '0')}m ${String(
              etaSec % 60
            ).padStart(2, '0')}s`;

            return (
              <tr
                key={agent.id}
                onClick={() => onSelectAgent?.(agent.id)}
                className={`transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[rgba(170,136,255,0.08)] border-l-2 border-l-[var(--ds-accent-singularity)]'
                    : 'hover:bg-[rgba(26,29,38,0.45)]'
                }`}
              >
                {/* 1. AGENT (.MD) & PID */}
                <td className="py-2 px-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-[var(--ds-text-primary)]">
                      {agent.filename}
                    </span>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-[var(--ds-text-secondary)]">PID: {agent.pid}</span>
                      <span
                        className={`px-1 py-0.2 border text-[9.5px] uppercase ${getStatusBadgeClass(
                          agent.status
                        )}`}
                      >
                        {agent.status}
                      </span>
                    </div>
                  </div>
                </td>

                {/* 2. EXECUTION MODE */}
                <td className="py-2 px-3">
                  <span
                    className={`text-[11px] font-semibold uppercase ${getModeBadgeClass(
                      agent.executionMode
                    )}`}
                  >
                    [{agent.executionMode}]
                  </span>
                </td>

                {/* 3. TASK DIVISION (STEPS) */}
                <td className="py-2 px-3">
                  <StepDivisionCell
                    currentStep={agent.currentStep}
                    totalSteps={agent.totalSteps}
                    stepDescription={agent.stepDescription}
                    status={agent.status}
                  />
                </td>

                {/* 4. GRAVITATIONAL RAG */}
                <td className="py-2 px-3">
                  <div className="flex flex-col gap-0.5 text-[10.5px]">
                    <span className="text-[var(--ds-accent-memory)] font-medium">
                      [[02_PADROES]] · [[04_STACK]]
                    </span>
                    <span className="text-[var(--ds-status-active-fg)] text-[10px]">
                      ZEN JDM: &lt; 0.38MS [VERIFIED]
                    </span>
                  </div>
                </td>

                {/* 5. TOKENS SPENT */}
                <td className="py-2 px-3 text-right">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-[var(--ds-text-primary)]">
                      {totalTok.toLocaleString('pt-BR')} TOK
                    </span>
                    <span className="text-[10px] text-[var(--ds-text-secondary)]">
                      {promptTok.toLocaleString('pt-BR')} P · {compTok.toLocaleString('pt-BR')} C
                    </span>
                  </div>
                </td>

                {/* 6. ETA */}
                <td className="py-2 px-3 text-right">
                  <span className="font-semibold text-[var(--ds-text-primary)]">
                    {etaFormatted}
                  </span>
                </td>

                {/* 7. CONTROLS (44px target) */}
                <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {agent.status === '[PAUSED]' ? (
                      <button
                        onClick={() => onResumeAgent?.(agent.id)}
                        className="min-h-[32px] px-2.5 flex items-center justify-center border border-[var(--ds-status-active-border)] text-[var(--ds-status-active-fg)] hover:bg-[rgba(52,211,153,0.15)] text-[10px] uppercase transition-colors"
                        title="Retomar execução do processo"
                      >
                        [ RESUME ]
                      </button>
                    ) : (
                      <button
                        onClick={() => onPauseAgent?.(agent.id)}
                        className="min-h-[32px] px-2.5 flex items-center justify-center border border-[var(--ds-status-warn-border)] text-[var(--ds-status-warn-fg)] hover:bg-[rgba(251,191,36,0.15)] text-[10px] uppercase transition-colors"
                        title="Suspender processo"
                      >
                        [ PAUSE ]
                      </button>
                    )}

                    <button
                      onClick={() => onApproveDiff?.(agent.id)}
                      className="min-h-[32px] px-2.5 flex items-center justify-center border border-[var(--ds-accent-agent)] text-[var(--ds-accent-agent)] hover:bg-[rgba(0,240,255,0.15)] text-[10px] uppercase transition-colors"
                      title="Aprovar diff no disco"
                    >
                      [ APPROVE DIFF ]
                    </button>

                    <button
                      onClick={() => onInspectAgent?.(agent.id)}
                      className="min-h-[32px] px-2.5 flex items-center justify-center border border-[var(--ds-accent-singularity)] text-[var(--ds-accent-singularity)] hover:bg-[rgba(170,136,255,0.15)] text-[10px] uppercase transition-colors"
                      title="Abrir gaveta de inspeção do nó"
                    >
                      [ INSPECT ]
                    </button>

                    <button
                      onClick={() => onKillPid?.(agent.pid)}
                      className="min-h-[32px] px-2.5 flex items-center justify-center border border-[var(--ds-status-halt-border)] text-[var(--ds-status-halt-fg)] hover:bg-[rgba(248,113,113,0.15)] text-[10px] uppercase transition-colors"
                      title="Encerrar processo do SO com zero-trust"
                    >
                      [ KILL PID ]
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
