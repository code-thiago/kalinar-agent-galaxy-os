/**
 * KALINAR TELEMETRY STEP MATRIX & OS PROCESS CONTROL TABLE (v1.4.0)
 * High-density tabular-nums matrix with StepDivisionCell slots, Model Badge,
 * Token Velocity (tok/s), Deterministic ETA Countdown, and OS PID Gate actions.
 * Strictly Zero Emojis, isolated with React.memo for 60 FPS WebGL protection.
 */

import { memo, useEffect, useState } from 'react';
import { AgentNode, AgentStatus, ExecutionMode } from '../../types/kalinar.js';
import { formatModelBadge } from '../ui/AgentLivePreviewCard.js';
import {
  formatEtaCountdown,
  resolveAgentStatusPalette,
} from '../../core/telemetryFormatters.js';

export interface TelemetryMatrixTableProps {
  agents: AgentNode[];
  selectedAgentId?: string | null;
  onSelectAgent?: (id: string) => void;
  onPauseAgent?: (id: string, pid: number) => void;
  onResumeAgent?: (id: string, pid: number) => void;
  onInspectDiff?: (agent: AgentNode) => void;
  onKillPid?: (pid: number, agentId: string) => void;
}

export interface StepDivisionCellProps {
  currentStep: number;
  totalSteps: number;
  stepDescription: string;
  status: AgentStatus;
}

function resolveStepBarColor(status: AgentStatus): string {
  if (status === '[PAUSED]') return '#FBBF24';
  if (status === '[HALTED]' || status === '[ERROR]') return '#F87171';
  if (status === '[VERIFIED]' || status === '[ACTIVE]' || status === '[RUNNING]') return '#34D399';
  return '#00F0FF';
}

function resolveModelBadgeStyle(modelBadge: '[ARGON]' | '[CLAUDE]' | '[GEMINI]'): {
  fg: string;
  border: string;
} {
  if (modelBadge === '[CLAUDE]') return { fg: '#E879F9', border: 'rgba(232, 121, 249, 0.45)' };
  if (modelBadge === '[GEMINI]') return { fg: '#00F0FF', border: 'rgba(0, 240, 255, 0.45)' };
  return { fg: '#AA88FF', border: 'rgba(170, 136, 255, 0.45)' };
}

function resolveExecutionModeColor(mode: ExecutionMode): string {
  if (mode === 'AUTO_PILOT') return '#34D399';
  if (mode === 'STEP_BY_STEP_GATE') return '#FBBF24';
  if (mode === 'SANDBOX_DRY_RUN') return '#00F0FF';
  return '#9A9A9A';
}

export const StepDivisionCell = memo(function StepDivisionCell({
  currentStep,
  totalSteps,
  stepDescription,
  status,
}: StepDivisionCellProps) {
  const safeTotal = Math.max(1, totalSteps || 6);
  const safeCurrent = Math.min(safeTotal, Math.max(0, currentStep || 1));
  const barColor = resolveStepBarColor(status);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: '100%',
        maxWidth: '240px',
      }}
    >
      <div
        className="tabular-nums"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontFamily: 'var(--ds-primitive-font-mono)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span
          data-slot="step-fraction"
          style={{ color: '#DDDDDD', fontWeight: 600 }}
        >
          STEP {String(safeCurrent).padStart(2, '0')}/{String(safeTotal).padStart(2, '0')}
        </span>
        <span style={{ fontSize: '10px', color: '#9A9A9A' }}>
          {Math.round((safeCurrent / safeTotal) * 100)}%
        </span>
      </div>

      {/* Discrete N-block geometric progress bar */}
      <div
        data-slot="step-bar-track"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          width: '100%',
          height: '6px',
          backgroundColor: '#14161d',
          padding: '1px',
          border: '1px solid #1A1D26',
        }}
      >
        {Array.from({ length: safeTotal }).map((_, idx) => (
          <div
            key={idx}
            style={{
              flex: 1,
              height: '100%',
              backgroundColor: idx < safeCurrent ? barColor : 'transparent',
              transition: 'background-color 200ms ease',
            }}
          />
        ))}
      </div>

      <div
        data-slot="step-label"
        className="truncate"
        style={{
          fontSize: '10px',
          color: '#9A9A9A',
          fontFamily: 'var(--ds-primitive-font-mono)',
          textTransform: 'none',
        }}
        title={stepDescription}
      >
        {stepDescription || 'Awaiting directive'}
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
  onInspectDiff,
  onKillPid,
}: TelemetryMatrixTableProps) {
  const [elapsedOffsets, setElapsedOffsets] = useState<Record<string, number>>({});

  // Deterministic 1s ETA countdown for running/active agents only
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedOffsets((prev) => {
        let changed = false;
        const next: Record<string, number> = { ...prev };
        for (const agent of agents) {
          const isRunning =
            agent.status === '[ACTIVE]' ||
            agent.status === '[RUNNING]' ||
            agent.status === '[STREAM]';
          const currentOffset = prev[agent.id] || 0;
          if (isRunning && currentOffset < (agent.etaSeconds || 0)) {
            next[agent.id] = currentOffset + 1;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [agents]);

  return (
    <div
      data-slot="telemetry-matrix-table"
      className="tabular-nums"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        backgroundColor: '#07080a',
        fontFamily: 'var(--ds-primitive-font-mono)',
        fontSize: '11.5px',
        fontVariantNumeric: 'tabular-nums',
        userSelect: 'none',
      }}
    >
      <table
        className="tabular-nums"
        style={{
          width: '100%',
          textAlign: 'left',
          borderCollapse: 'collapse',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: '1px solid #1A1D26',
              fontSize: '10px',
              color: '#9A9A9A',
              textTransform: 'uppercase',
              backgroundColor: '#0A0C10',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            <th style={{ padding: '8px 10px', fontWeight: 600 }}>AGENT ID &amp; PID</th>
            <th style={{ padding: '8px 10px', fontWeight: 600 }}>STATUS</th>
            <th style={{ padding: '8px 10px', fontWeight: 600 }}>MODEL</th>
            <th style={{ padding: '8px 10px', fontWeight: 600, minWidth: '220px' }}>
              STEP PROGRESS
            </th>
            <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>
              TOKENS SPENT
            </th>
            <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>
              VELOCITY
            </th>
            <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>
              ETA
            </th>
            <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'center', minWidth: '210px' }}>
              ACTIONS
            </th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => {
            const isSelected = agent.id === selectedAgentId;
            const statusPalette = resolveAgentStatusPalette(agent.status);
            const modelBadge = formatModelBadge(agent.activeModelId);
            const modelPalette = resolveModelBadgeStyle(modelBadge);
            const promptTok = agent.tokensPrompt || 0;
            const compTok = agent.tokensCompletion || 0;
            const totalTok = promptTok + compTok;
            const remainingEta = Math.max(
              0,
              (agent.etaSeconds || 0) - (elapsedOffsets[agent.id] || 0)
            );
            const fifoCount = agent.fifoQueueDepth ?? agent.fifoQueueCount ?? 0;

            return (
              <tr
                key={agent.id}
                data-slot="telemetry-matrix-row"
                data-agent-id={agent.id}
                onClick={() => onSelectAgent?.(agent.id)}
                style={{
                  borderBottom: '1px solid #1A1D26',
                  borderLeft: isSelected ? '2px solid #AA88FF' : '2px solid transparent',
                  backgroundColor: isSelected ? 'rgba(170, 136, 255, 0.08)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 150ms ease',
                }}
              >
                {/* 1. AGENT ID & PID */}
                <td style={{ padding: '7px 10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 600, color: '#DDDDDD' }}>{agent.filename}</span>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '10px',
                        color: '#9A9A9A',
                      }}
                    >
                      <span>{agent.id}</span>
                      <span>|</span>
                      <span>PID: {agent.pid}</span>
                    </div>
                  </div>
                </td>

                {/* 2. STATUS BADGE + MODE + FIFO */}
                <td style={{ padding: '7px 10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          padding: '1px 5px',
                          border: `1px solid ${statusPalette.border}`,
                          backgroundColor: statusPalette.bg,
                          color: statusPalette.fg,
                          fontSize: '9.5px',
                          fontWeight: 600,
                        }}
                      >
                        {agent.status}
                      </span>
                      {fifoCount > 0 && (
                        <span
                          style={{
                            padding: '1px 5px',
                            border: '1px solid #F59E0B',
                            backgroundColor: 'rgba(245, 158, 11, 0.12)',
                            color: '#FBBF24',
                            fontSize: '9px',
                            fontWeight: 600,
                          }}
                        >
                          [FIFO_QUEUED:{fifoCount}]
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '9.5px',
                        color: resolveExecutionModeColor(agent.executionMode),
                      }}
                    >
                      [{agent.executionMode}]
                    </span>
                  </div>
                </td>

                {/* 3. MODEL (ARGON / CLAUDE / GEMINI) */}
                <td style={{ padding: '7px 10px' }}>
                  <span
                    data-slot="matrix-model-badge"
                    style={{
                      padding: '2px 6px',
                      border: `1px solid ${modelPalette.border}`,
                      color: modelPalette.fg,
                      backgroundColor: 'rgba(13, 15, 20, 0.9)',
                      fontSize: '10px',
                      fontWeight: 600,
                    }}
                  >
                    {modelBadge}
                  </span>
                </td>

                {/* 4. STEP PROGRESS */}
                <td style={{ padding: '7px 10px' }}>
                  <StepDivisionCell
                    currentStep={agent.currentStep}
                    totalSteps={agent.totalSteps}
                    stepDescription={agent.stepDescription}
                    status={agent.status}
                  />
                </td>

                {/* 5. TOKENS SPENT */}
                <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 600, color: '#DDDDDD' }}>
                      {totalTok.toLocaleString('en-US')} TOK
                    </span>
                    <span style={{ fontSize: '9.5px', color: '#9A9A9A' }}>
                      {promptTok.toLocaleString('en-US')}P / {compTok.toLocaleString('en-US')}C
                    </span>
                  </div>
                </td>

                {/* 6. TOKEN VELOCITY (TOK/S) */}
                <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                  <span style={{ color: '#00F0FF', fontWeight: 600 }}>
                    {agent.status === '[PAUSED]' || agent.status === '[HALTED]'
                      ? '0 TOK/S'
                      : `${agent.tokenVelocity || 0} TOK/S`}
                  </span>
                </td>

                {/* 7. DETERMINISTIC ETA COUNTDOWN */}
                <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                  <span
                    data-slot="matrix-eta-countdown"
                    style={{
                      fontWeight: 600,
                      color:
                        agent.status === '[PAUSED]'
                          ? '#FBBF24'
                          : agent.status === '[HALTED]'
                          ? '#F87171'
                          : '#DDDDDD',
                    }}
                  >
                    {formatEtaCountdown(remainingEta)}
                  </span>
                </td>

                {/* 8. QUICK ACTIONS */}
                <td
                  style={{ padding: '7px 10px', textAlign: 'center' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {agent.status === '[PAUSED]' ? (
                      <button
                        type="button"
                        onClick={() => onResumeAgent?.(agent.id, agent.pid)}
                        style={{
                          minHeight: '28px',
                          padding: '0 8px',
                          backgroundColor: 'rgba(16, 185, 129, 0.10)',
                          border: '1px solid #10B981',
                          color: '#34D399',
                          fontSize: '9.5px',
                          fontFamily: 'var(--ds-primitive-font-mono)',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                        }}
                        title="Resume agent OS PID"
                      >
                        [ RESUME ]
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onPauseAgent?.(agent.id, agent.pid)}
                        style={{
                          minHeight: '28px',
                          padding: '0 8px',
                          backgroundColor: 'rgba(245, 158, 11, 0.10)',
                          border: '1px solid #F59E0B',
                          color: '#FBBF24',
                          fontSize: '9.5px',
                          fontFamily: 'var(--ds-primitive-font-mono)',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                        }}
                        title="Pause agent OS PID"
                      >
                        [ PAUSE ]
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onInspectDiff?.(agent)}
                      style={{
                        minHeight: '28px',
                        padding: '0 8px',
                        backgroundColor: 'rgba(170, 136, 255, 0.10)',
                        border: '1px solid #AA88FF',
                        color: '#AA88FF',
                        fontSize: '9.5px',
                        fontFamily: 'var(--ds-primitive-font-mono)',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                      }}
                      title="Open live diff in 480px NodeInspectorDrawer"
                    >
                      [ INSPECT DIFF ]
                    </button>

                    <button
                      type="button"
                      onClick={() => onKillPid?.(agent.pid, agent.id)}
                      style={{
                        minHeight: '28px',
                        padding: '0 8px',
                        backgroundColor: 'rgba(239, 68, 68, 0.10)',
                        border: '1px solid #EF4444',
                        color: '#F87171',
                        fontSize: '9.5px',
                        fontFamily: 'var(--ds-primitive-font-mono)',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                      }}
                      title="Terminate PID via zero-trust OS controller (PID > 100)"
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
