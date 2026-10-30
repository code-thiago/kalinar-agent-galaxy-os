import React from 'react';
import { AgentNode, AgentStatus } from '../../types/kalinar.js';

export interface AgentLivePreviewCardRootProps extends React.HTMLAttributes<HTMLDivElement> {
  agent: AgentNode;
  children?: React.ReactNode;
}

export function AgentLivePreviewCardRoot({
  agent,
  children,
  className = '',
  ...props
}: AgentLivePreviewCardRootProps) {
  return (
    <div
      data-slot="agent-live-preview-card"
      data-agent-id={agent.id}
      data-status={agent.status}
      className={`h-[160px] w-full bg-[rgba(13,15,20,0.95)] border border-[var(--ds-border-subtle)] hover:border-[var(--ds-border-bold)] transition-colors p-3 flex flex-col justify-between overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface AgentLivePreviewCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  agent: AgentNode;
}

export function AgentLivePreviewCardHeader({
  agent,
  className = '',
  ...props
}: AgentLivePreviewCardHeaderProps) {
  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case '[ACTIVE]':
      case '[VERIFIED]':
        return 'text-[var(--ds-status-active-fg)] border-[var(--ds-status-active-border)] bg-[var(--ds-status-active-bg)]';
      case '[WARN]':
      case '[PAUSED]':
      case '[RUNNING]':
        return 'text-[var(--ds-status-warn-fg)] border-[var(--ds-status-warn-border)] bg-[var(--ds-status-warn-bg)]';
      case '[HALTED]':
      case '[ERROR]':
        return 'text-[var(--ds-status-halt-fg)] border-[var(--ds-status-halt-border)] bg-[var(--ds-status-halt-bg)]';
      default:
        return 'text-[var(--ds-text-secondary)] border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]';
    }
  };

  return (
    <div
      data-slot="agent-live-preview-card-header"
      className={`flex items-center justify-between text-[11px] uppercase tracking-wider ${className}`}
      {...props}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="font-semibold text-[var(--ds-accent-agent)] truncate">
          {agent.filename}
        </span>
        <span className="text-[var(--ds-text-secondary)] font-mono tabular-nums">
          PID:{agent.pid}
        </span>
      </div>
      <span
        className={`px-1.5 py-0.5 border text-[10px] font-mono tabular-nums font-medium ${getStatusColor(
          agent.status
        )}`}
      >
        {agent.status}
      </span>
    </div>
  );
}

export interface AgentLivePreviewCardStreamProps extends React.HTMLAttributes<HTMLDivElement> {
  streamContent: string;
}

export function AgentLivePreviewCardStream({
  streamContent,
  className = '',
  ...props
}: AgentLivePreviewCardStreamProps) {
  return (
    <div
      data-slot="agent-live-preview-card-stream"
      className={`my-1.5 p-1.5 bg-[#07080a] border border-[var(--ds-border-subtle)] font-mono text-[11px] leading-tight text-[var(--ds-text-primary)] h-[62px] overflow-hidden whitespace-pre-wrap select-text opacity-90 ${className}`}
      {...props}
    >
      <div className="line-clamp-3 font-mono text-[10.5px]">
        {streamContent || '[STREAM_STANDBY: WAITING_FOR_CHUNKS]'}
      </div>
    </div>
  );
}

export interface AgentLivePreviewCardTelemetryProps extends React.HTMLAttributes<HTMLDivElement> {
  agent: AgentNode;
}

export function AgentLivePreviewCardTelemetry({
  agent,
  className = '',
  ...props
}: AgentLivePreviewCardTelemetryProps) {
  const stepFormatted = `STEP ${String(agent.currentStep).padStart(2, '0')}/${String(
    agent.totalSteps
  ).padStart(2, '0')}`;
  const totalTokens = agent.tokensPrompt + agent.tokensCompletion;

  return (
    <div
      data-slot="agent-live-preview-card-telemetry"
      className={`text-[10.5px] font-mono uppercase text-[var(--ds-text-secondary)] flex flex-col gap-0.5 pt-1 border-t border-[var(--ds-border-subtle)] ${className}`}
      {...props}
    >
      {/* Line 1 */}
      <div className="flex justify-between items-center tabular-nums">
        <span className="text-[var(--ds-primitive-white-500)] font-medium">{stepFormatted}</span>
        <span>TOKENS: {totalTokens.toLocaleString('en-US')}</span>
      </div>
      {/* Line 2 */}
      <div className="flex justify-between items-center tabular-nums">
        <span>ETA: {agent.etaSeconds}S</span>
        <span>VEL: {agent.tokenVelocity} T/S</span>
      </div>
    </div>
  );
}

export const AgentLivePreviewCard = {
  Root: AgentLivePreviewCardRoot,
  Header: AgentLivePreviewCardHeader,
  Stream: AgentLivePreviewCardStream,
  Telemetry: AgentLivePreviewCardTelemetry,
};
