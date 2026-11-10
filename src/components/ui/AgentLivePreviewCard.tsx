import React from 'react';
import { AgentNode, AgentStatus } from '../../types/kalinar.js';

export interface AgentLivePreviewCardRootProps extends React.HTMLAttributes<HTMLDivElement> {
  agent: AgentNode;
  isSelected?: boolean;
  children?: React.ReactNode;
}

export const AgentLivePreviewCardRoot = React.memo(function AgentLivePreviewCardRoot({
  agent,
  isSelected = false,
  children,
  className = '',
  ...props
}: AgentLivePreviewCardRootProps) {
  return (
    <div
      data-slot="agent-card-root"
      data-agent-id={agent.id}
      data-status={agent.status}
      className={`w-full bg-[#07080A] border transition-all p-2.5 flex flex-col gap-2 overflow-hidden select-none cursor-pointer ${
        isSelected
          ? 'border-[#AA88FF] ring-1 ring-[#AA88FF]'
          : 'border-[#1A1D26] hover:border-[#AA88FF]'
      } ${className}`}
      style={{ mixBlendMode: 'normal' }}
      {...props}
    >
      {children}
    </div>
  );
});

export interface AgentLivePreviewCardLiveViewportProps extends React.HTMLAttributes<HTMLDivElement> {
  streamContent: string;
  activeModelId?: string;
  fifoCount?: number;
  onInspectDiff?: (e: React.MouseEvent) => void;
}

export function formatModelBadge(modelId?: string): '[ARGON]' | '[CLAUDE]' | '[GEMINI]' {
  const normalized = (modelId || 'argon').toLowerCase();
  if (normalized.includes('claude')) return '[CLAUDE]';
  if (normalized.includes('gemini')) return '[GEMINI]';
  return '[ARGON]';
}

export const AgentLivePreviewCardLiveViewport = React.memo(function AgentLivePreviewCardLiveViewport({
  streamContent,
  activeModelId = 'argon',
  fifoCount = 0,
  onInspectDiff,
  className = '',
  style,
  ...props
}: AgentLivePreviewCardLiveViewportProps) {
  const rawLines = (streamContent || '[STREAM_STANDBY: AGENT_ORBIT_READY]').split(/\r?\n/).slice(0, 6);
  const modelBadge = formatModelBadge(activeModelId);

  return (
    <div
      data-slot="agent-card-viewport"
      className={`relative h-[var(--ds-agent-card-thumb-h,160px)] min-h-[160px] w-full bg-[#07080A] rounded-[2px] border border-[#1A1D26] p-2.5 font-mono text-[10.5px] leading-tight text-[#DDDDDD] overflow-hidden flex flex-col justify-between group ${className}`}
      style={{
        backgroundColor: '#07080A',
        border: '1px solid #1A1D26',
        mixBlendMode: 'normal',
        ...style,
      }}
      {...props}
    >
      {/* Top Badge Strip inside 160px Viewport */}
      <div className="flex items-center justify-between text-[9px] font-mono border-b border-[#1A1D26] pb-1 mb-1">
        <span
          data-slot="agent-viewport-model-badge"
          className="text-[#AA88FF] font-semibold tracking-wider"
        >
          {modelBadge}
        </span>
        <span
          data-slot="agent-viewport-fifo-badge"
          className="text-[#9A9A9A] tabular-nums"
        >
          [FIFO: {fifoCount}]
        </span>
      </div>

      {/* Colored Unified Diff Stream (+ Emerald #34D399, - Crimson #F87171) */}
      <div className="flex-1 overflow-hidden flex flex-col gap-0.5 font-mono text-[10px]">
        {rawLines.map((line, idx) => {
          const isAdd = line.startsWith('+') && !line.startsWith('+++');
          const isDel = line.startsWith('-') && !line.startsWith('---');
          const lineColor = isAdd
            ? 'text-[#34D399]'
            : isDel
            ? 'text-[#F87171]'
            : 'text-[#DDDDDD] opacity-85';
          return (
            <div key={idx} className={`truncate whitespace-pre ${lineColor}`}>
              {line}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-[#1A1D26]">
        <span className="text-[9px] text-[#AA88FF] uppercase tracking-wider">
          AST DIFF STREAM
        </span>
        <button
          onClick={onInspectDiff}
          className="text-[9.5px] font-mono uppercase text-[#00F0FF] hover:text-[#FFFFFF] bg-[rgba(0,240,255,0.1)] px-1.5 py-0.5 rounded-[2px] transition-colors cursor-pointer"
        >
          [ INSPECT DIFF ]
        </button>
      </div>
    </div>
  );
});

export interface AgentLivePreviewCardMetadataRowProps extends React.HTMLAttributes<HTMLDivElement> {
  agent: AgentNode;
}

export const AgentLivePreviewCardMetadataRow = React.memo(function AgentLivePreviewCardMetadataRow({
  agent,
  className = '',
  ...props
}: AgentLivePreviewCardMetadataRowProps) {
  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case '[ACTIVE]':
      case '[VERIFIED]':
      case '[ACK_VERIFIED]':
        return 'text-[#34D399]';
      case '[ACK_DISPATCHED]':
        return 'text-[#00F0FF]';
      case '[MODEL_HOTSWAP]':
        return 'text-[#E879F9]';
      case '[WARN]':
      case '[PAUSED]':
      case '[RUNNING]':
      case '[FIFO_QUEUED]':
        return 'text-[#FBBF24]';
      case '[HALTED]':
      case '[ERROR]':
        return 'text-[#F87171]';
      default:
        return 'text-[#9A9A9A]';
    }
  };

  const totalTokens = (agent.tokensPrompt + agent.tokensCompletion).toLocaleString('en-US');
  const stepFormatted = `STEP ${String(agent.currentStep).padStart(2, '0')}/${String(
    agent.totalSteps
  ).padStart(2, '0')}`;
  const minutes = Math.floor(agent.etaSeconds / 60);
  const seconds = agent.etaSeconds % 60;
  const etaFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}s`;
  const modelLabel = formatModelBadge(agent.activeModelId);
  const fifoCount = agent.fifoQueueDepth ?? agent.fifoQueueCount ?? 0;

  return (
    <div
      data-slot="agent-card-meta"
      className={`flex flex-col gap-0.5 text-[10px] font-mono pt-1.5 border-t border-[#1A1D26] tabular-nums ${className}`}
      {...props}
    >
      {/* Line 1: Agent identity, active model, FIFO & status */}
      <div className="flex items-center justify-between gap-2 text-[#FFFFFF]">
        <span className="font-semibold truncate">
          {agent.filename} · {modelLabel}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[#9A9A9A]">[FIFO: {fifoCount}]</span>
          <span className={`font-semibold ${getStatusColor(agent.status)}`}>{agent.status}</span>
        </div>
      </div>

      {/* Line 2: Tabular telemetry summary */}
      <div className="flex items-center justify-between text-[10px] text-[#9A9A9A] tabular-nums tracking-tight truncate">
        <span>
          {stepFormatted} | TOKENS: {totalTokens} | ETA: {etaFormatted}
        </span>
      </div>
    </div>
  );
});

export const AgentLivePreviewCard = {
  Root: AgentLivePreviewCardRoot,
  LiveViewport: AgentLivePreviewCardLiveViewport,
  MetadataRow: AgentLivePreviewCardMetadataRow,
};
