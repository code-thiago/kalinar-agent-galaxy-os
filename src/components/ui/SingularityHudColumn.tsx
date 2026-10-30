import React from 'react';

export interface SingularityHudColumnRootProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  isDrawerOpen?: boolean;
}

export function SingularityHudColumnRoot({
  children,
  isDrawerOpen = false,
  className = '',
  ...props
}: SingularityHudColumnRootProps) {
  return (
    <div
      data-slot="singularity-hud-column"
      className={`w-[360px] flex flex-col gap-6 text-[12px] leading-relaxed transition-all duration-300 pointer-events-auto select-none ${
        isDrawerOpen ? 'translate-x-[420px] opacity-0' : 'translate-x-0 opacity-100'
      } ${className}`}
      style={{ mixBlendMode: 'plus-lighter' }}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SingularityHudBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  tag: string;
  children?: React.ReactNode;
}

export function SingularityHudBlock({
  tag,
  children,
  className = '',
  ...props
}: SingularityHudBlockProps) {
  return (
    <div
      data-slot="singularity-hud-block"
      data-hud-tag={tag}
      className={`flex flex-col gap-1.5 ${className}`}
      {...props}
    >
      <div className="font-mono text-[11px] font-semibold tracking-wider text-[var(--ds-accent-singularity)] uppercase">
        [{tag}]
      </div>
      <div className="text-[var(--ds-text-primary)] font-mono text-[12px]">{children}</div>
    </div>
  );
}

export interface SingularityCoreBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  voiceState: string;
  transcript: string;
  zenLatencyMs?: number;
}

export function SingularityCoreBlock({
  voiceState,
  transcript,
  zenLatencyMs = 0.42,
  className = '',
  ...props
}: SingularityCoreBlockProps) {
  return (
    <div
      data-slot="singularity-core-block"
      className={`p-3 bg-[rgba(10,8,16,0.6)] border-l-2 border-[var(--ds-accent-singularity)] flex flex-col gap-2 ${className}`}
      {...props}
    >
      <div className="flex items-center justify-between text-[11px] font-mono uppercase">
        <span className="text-[var(--ds-accent-singularity)] font-semibold">[SINGULARITY_CORE]</span>
        <span className="text-[var(--ds-primitive-lavender-400)] tabular-nums">{voiceState}</span>
      </div>
      <div className="font-mono text-[13px] text-[var(--ds-accent-singularity)] leading-snug min-h-[38px] italic">
        {transcript || '"Aguardando diretriz tática. O núcleo gravitacional permanece ativo."'}
      </div>
      <div className="flex justify-between items-center text-[10px] text-[var(--ds-text-secondary)] font-mono tabular-nums pt-1 border-t border-[rgba(170,136,255,0.2)]">
        <span>SOVEREIGN PT-BR</span>
        <span>LATENCY: {zenLatencyMs.toFixed(2)}MS</span>
      </div>
    </div>
  );
}

export const SingularityHudColumn = {
  Root: SingularityHudColumnRoot,
  Block: SingularityHudBlock,
  CoreBlock: SingularityCoreBlock,
};
