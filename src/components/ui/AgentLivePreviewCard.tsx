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
      className={`w-full bg-[rgba(13,15,20,0.95)] border border-[var(--ds-border-subtle)] hover:border-[var(--ds-accent-singularity)] transition-all p-2.5 flex flex-col gap-2 overflow-hidden select-none cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface AgentLivePreviewCardLiveViewportProps extends React.HTMLAttributes<HTMLDivElement> {
  streamContent: string;
  onInspectDiff?: (e: React.MouseEvent) => void;
}

export function AgentLivePreviewCardLiveViewport({
  streamContent,
  onInspectDiff,
  className = '',
  ...props
}: AgentLivePreviewCardLiveViewportProps) {
  return (
    <div
      data-slot="agent-card-viewport"
      className={`relative h-[var(--ds-agent-card-thumb-h,160px)] min-h-[160px] w-full bg-[#0a0a0a] rounded-[2px] border border-[var(--ds-border-subtle)] p-2.5 font-mono text-[10.5px] leading-tight text-[var(--ds-text-primary)] overflow-hidden flex flex-col justify-between group ${className}`}
      {...props}
    >
      <div className="line-clamp-6 font-mono text-[10px] text-[var(--ds-primitive-white-500)] opacity-90 whitespace-pre-wrap">
        {streamContent || '[STREAM_STANDBY: AGENT_ORBIT_READY]'}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-[#1a1a1a]">
        <span className="text-[9px] text-[var(--ds-accent-singularity)] uppercase tracking-wider">
          AST DIFF STREAM
        </span>
        <button
          onClick={onInspectDiff}
          className="text-[9.5px] font-mono uppercase text-[var(--ds-accent-agent)] hover:text-white bg-[rgba(0,240,255,0.1)] px-1.5 py-0.5 rounded-[2px] transition-colors cursor-pointer"
        >
          [ INSPECT DIFF ]
        </button>
      </div>
    </div>
  );
}

export interface AgentLivePreviewCardMetadataRowProps extends React.HTMLAttributes<HTMLDivElement> {
  agent: AgentNode;
}

export function AgentLivePreviewCardMetadataRow({
  agent,
  className = '',
  ...props
}: AgentLivePreviewCardMetadataRowProps) {
  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case '[ACTIVE]':
      case '[VERIFIED]':
        return 'text-[var(--ds-status-active-fg)]';
      case '[WARN]':
      case '[PAUSED]':
      case '[RUNNING]':
        return 'text-[var(--ds-status-warn-fg)]';
      case '[HALTED]':
      case '[ERROR]':
        return 'text-[var(--ds-status-halt-fg)]';
      default:
        return 'text-[var(--ds-text-secondary)]';
    }
  };

  const totalTokens = (agent.tokensPrompt + agent.tokensCompletion).toLocaleString('en-US');
  const stepFormatted = `STEP ${String(agent.currentStep).padStart(2, '0')}/${String(
    agent.totalSteps
  ).padStart(2, '0')}`;
  const minutes = Math.floor(agent.etaSeconds / 60);
  const seconds = agent.etaSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;

  return (
    <div
      data-slot="agent-metadata-row"
      className={`grid grid-cols-2 text-[10px] font-mono pt-1.5 border-t border-[var(--ds-border-subtle)] ${className}`}
      {...props}
    >
      {/* Left Column (#FFFFFF) */}
      <div className="flex flex-col text-[#FFFFFF] truncate pr-1">
        <span className="font-semibold truncate">{agent.filename}</span>
        <span className="text-[9.5px] text-[var(--ds-primitive-white-500)] truncate opacity-85">
          {agent.stepDescription || 'Compiling IPC Bridge'}
        </span>
      </div>

      {/* Right Column (#9A9A9A, right-aligned) */}
      <div className="flex flex-col items-end text-[#9A9A9A] tabular-nums">
        <div className="flex items-center gap-1">
          <span className={`font-semibold ${getStatusColor(agent.status)}`}>{agent.status}</span>
          <span>{stepFormatted}</span>
        </div>
        <div className="text-[9.5px]">
          {totalTokens} TOK · {timeFormatted}
        </div>
      </div>
    </div>
  );
}

export const AgentLivePreviewCard = {
  Root: AgentLivePreviewCardRoot,
  LiveViewport: AgentLivePreviewCardLiveViewport,
  MetadataRow: AgentLivePreviewCardMetadataRow,
};
