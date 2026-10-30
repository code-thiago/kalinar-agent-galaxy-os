import React, { useState } from 'react';

export interface RetractableIdeDockRootProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  isExpanded?: boolean;
  onToggleExpand?: (nextExpanded: boolean) => void;
}

export function RetractableIdeDockRoot({
  children,
  isExpanded: controlledExpanded,
  onToggleExpand,
  className = '',
  ...props
}: RetractableIdeDockRootProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    const next = !isExpanded;
    if (onToggleExpand) {
      onToggleExpand(next);
    } else {
      setInternalExpanded(next);
    }
  };

  return (
    <div
      data-slot="retractable-ide-dock"
      data-expanded={isExpanded}
      className={`fixed bottom-0 inset-x-0 bg-[rgba(7,8,10,0.96)] border-t border-[var(--ds-border-subtle)] transition-all duration-300 z-30 flex flex-col pointer-events-auto ${
        isExpanded ? 'h-[350px]' : 'h-[36px]'
      } ${className}`}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            isExpanded,
            onToggle: handleToggle,
          });
        }
        return child;
      })}
    </div>
  );
}

export interface RetractableIdeDockTacticalBarProps extends React.HTMLAttributes<HTMLDivElement> {
  isExpanded?: boolean;
  onToggle?: () => void;
  activeAgentsCount?: number;
  circuitState?: string;
}

export function RetractableIdeDockTacticalBar({
  isExpanded = false,
  onToggle,
  activeAgentsCount = 1,
  circuitState = 'CLOSED',
  className = '',
  ...props
}: RetractableIdeDockTacticalBarProps) {
  return (
    <div
      data-slot="dock-tactical-bar"
      onClick={onToggle}
      className={`h-[36px] min-h-[36px] px-4 flex items-center justify-between font-mono text-[11px] uppercase cursor-pointer select-none hover:bg-[rgba(26,29,38,0.4)] transition-colors ${className}`}
      {...props}
    >
      <div className="flex items-center gap-4">
        <span className="font-semibold text-[var(--ds-accent-singularity)] tracking-wider">
          [KALINAR_IDE_DOCK]
        </span>
        <span className="text-[var(--ds-text-secondary)] tabular-nums">
          STATUS: {isExpanded ? 'EXPANDED (350PX)' : 'COLLAPSED (36PX)'}
        </span>
        <span className="text-[var(--ds-status-active-fg)] tabular-nums">
          SWARM: {activeAgentsCount} ACTIVE
        </span>
      </div>

      <div className="flex items-center gap-4 tabular-nums">
        <span className="text-[var(--ds-text-secondary)]">CIRCUIT:</span>
        <span
          className={`px-1.5 py-0.5 border text-[10px] ${
            circuitState === 'CLOSED'
              ? 'text-[var(--ds-status-active-fg)] border-[var(--ds-status-active-border)]'
              : 'text-[var(--ds-status-halt-fg)] border-[var(--ds-status-halt-border)]'
          }`}
        >
          [{circuitState}]
        </span>
        <span className="text-[var(--ds-accent-singularity)] text-[10px]">
          {isExpanded ? '[ CLIQUE PARA RECOLHER ]' : '[ CLIQUE PARA EXPANDIR ]'}
        </span>
      </div>
    </div>
  );
}

export interface RetractableIdeDockWorkspaceProps extends React.HTMLAttributes<HTMLDivElement> {
  isExpanded?: boolean;
  children?: React.ReactNode;
}

export function RetractableIdeDockWorkspace({
  isExpanded = false,
  children,
  className = '',
  ...props
}: RetractableIdeDockWorkspaceProps) {
  if (!isExpanded) {
    return null;
  }

  return (
    <div
      data-slot="dock-expanded-workspace"
      className={`flex-1 p-3 overflow-auto bg-[#07080a] border-t border-[var(--ds-border-subtle)] font-mono text-[12px] text-[var(--ds-text-primary)] ${className}`}
      {...props}
    >
      {children || (
        <div className="h-full flex flex-col justify-center items-center text-[var(--ds-text-secondary)] gap-2">
          <div className="text-[var(--ds-accent-singularity)] font-semibold uppercase">
            [WORKSPACE_SHELL_STANDBY]
          </div>
          <div className="text-[11px] tabular-nums">
            Terminal interativo node-pty e inspetor de nós serão vinculados na Tarefa 5.
          </div>
        </div>
      )}
    </div>
  );
}

export const RetractableIdeDock = {
  Root: RetractableIdeDockRoot,
  TacticalBar: RetractableIdeDockTacticalBar,
  Workspace: RetractableIdeDockWorkspace,
};
