import React, { useEffect, useState } from 'react';
import { TauzFrequencyBands } from '../../types/kalinar.js';

export const TRANSCRIPT_STREAM_INTERVAL_MS = 18;

export interface SingularityHudColumnRootProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  isDrawerOpen?: boolean;
}

export const SingularityHudColumnRoot = React.memo(function SingularityHudColumnRoot({
  children,
  isDrawerOpen = false,
  className = '',
  style,
  ...props
}: SingularityHudColumnRootProps) {
  return (
    <div
      data-slot="singularity-hud-root"
      data-drawer-open={isDrawerOpen}
      className={`w-full flex flex-col gap-4 text-[12px] leading-relaxed transition-all duration-300 select-none ${className}`}
      style={{
        pointerEvents: 'auto',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});

export interface SingularityHudBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  tag: string;
  children?: React.ReactNode;
}

export const SingularityHudBlock = React.memo(function SingularityHudBlock({
  tag,
  children,
  className = '',
  ...props
}: SingularityHudBlockProps) {
  return (
    <div
      data-slot="singularity-hud-block"
      data-hud-tag={tag}
      className={`flex flex-col gap-1.5 pointer-events-none ${className}`}
      {...props}
    >
      <div className="font-mono text-[11px] font-semibold tracking-wider text-[#AA88FF] normal-case">
        [{tag}]
      </div>
      <div className="text-[#DDDDDD] font-mono text-[12px] tabular-nums">{children}</div>
    </div>
  );
});

export interface SingularityCoreBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  voiceState: string;
  transcript: string;
  zenLatencyMs?: number;
  onMicToggle?: () => void;
  onBriefingRequest?: () => void;
  onSilenceRequest?: () => void;
  isMicActive?: boolean;
  frequencyBands?: TauzFrequencyBands;
}

export function resolveAcousticStateBadge(voiceState: string): string {
  if (voiceState === '[LISTENING]' || voiceState === '[LISTENING PT-BR]') {
    return '[LISTENING PT-BR]';
  }
  if (voiceState === '[GRAVITY_PULL]' || voiceState === '[GRAVITY_INGESTION]') {
    return '[GRAVITY_INGESTION]';
  }
  if (voiceState === '[SPEAKING]' || voiceState === '[KALINAR_SPEAKING]') {
    return '[KALINAR_SPEAKING]';
  }
  if (voiceState === '[VOICE_HIBERNATE]') {
    return '[VOICE_HIBERNATE]';
  }
  return '[SINGULARITY: STANDBY]';
}

export const SingularityCoreBlock = React.memo(function SingularityCoreBlock({
  voiceState,
  transcript,
  zenLatencyMs = 0.38,
  onMicToggle,
  onBriefingRequest,
  onSilenceRequest,
  isMicActive = false,
  frequencyBands,
  className = '',
  ...props
}: SingularityCoreBlockProps) {
  const fullTranscript =
    transcript || 'Aguardando diretriz tática. Núcleo gravitacional em operação nominal.';
  const [visibleChars, setVisibleChars] = useState<number>(fullTranscript.length);

  // 18ms/char progressive transcript streaming effect
  useEffect(() => {
    setVisibleChars(0);
    if (!fullTranscript) return;

    const timer = setInterval(() => {
      setVisibleChars((prev) => {
        if (prev >= fullTranscript.length) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, TRANSCRIPT_STREAM_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [fullTranscript]);

  const statusBadge = resolveAcousticStateBadge(voiceState);
  const streamedText = fullTranscript.slice(0, visibleChars);

  return (
    <div
      data-slot="singularity-core-block"
      className={`p-3 bg-[rgba(10,8,16,0.55)] border-l-2 border-[#AA88FF] flex flex-col gap-2.5 pointer-events-none ${className}`}
      {...props}
    >
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="text-[#AA88FF] font-semibold normal-case">[singularity_core]</span>
        <span
          data-slot="singularity-acoustic-badge"
          className="text-[#DDDDDD] font-medium tabular-nums"
        >
          {statusBadge}
        </span>
      </div>

      <div
        data-slot="singularity-voice-transcript"
        className="font-mono text-[13px] text-[#AA88FF] leading-snug min-h-[44px] normal-case"
        style={{ overflowWrap: 'break-word', color: '#AA88FF' }}
      >
        {streamedText}
      </div>

      {/* Real-time Tauz DSP Frequency Meters */}
      <div
        data-slot="singularity-acoustic-telemetry"
        className="font-mono text-[10px] tabular-nums text-[#DDDDDD] flex justify-between items-center px-2 py-1 bg-[rgba(13,15,20,0.65)] border border-[rgba(170,136,255,0.28)]"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[#9A9A9A]">SUB-110HZ:</span>
          <span className="text-[#AA88FF] font-semibold">
            {(frequencyBands?.subBass ?? 0).toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[#9A9A9A]">PRES-2.4KHZ:</span>
          <span className="text-[#DDDDDD] font-semibold">
            {(frequencyBands?.highPresence ?? 0).toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[#9A9A9A]">PULSE:</span>
          <span className="text-[#34D399] font-semibold">
            {(frequencyBands?.compositePulse ?? 0).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-1.5 text-[10px] text-[#9A9A9A] font-mono tabular-nums pt-1.5 border-t border-[rgba(170,136,255,0.25)]">
        <div className="flex flex-wrap items-center gap-1.5">
          {onMicToggle && (
            <button
              type="button"
              onClick={onMicToggle}
              className="pointer-events-auto px-1.5 py-0.5 border text-[9.5px] transition-colors cursor-pointer"
              style={{
                background: 'rgba(13, 15, 20, 0.88)',
                color: isMicActive ? '#AA88FF' : '#DDDDDD',
                border: isMicActive ? '1px solid #AA88FF' : '1px solid #1F232E',
                whiteSpace: 'nowrap',
                padding: '3px 6px',
              }}
            >
              {isMicActive ? '[ ESCUTANDO PT-BR ]' : '[ OUVIR PT-BR ]'}
            </button>
          )}
          {onBriefingRequest && (
            <button
              type="button"
              onClick={onBriefingRequest}
              className="pointer-events-auto px-1.5 py-0.5 border text-[9.5px] transition-colors cursor-pointer"
              style={{
                background: 'rgba(13, 15, 20, 0.88)',
                color: '#DDDDDD',
                border: '1px solid #1F232E',
                whiteSpace: 'nowrap',
                padding: '3px 6px',
              }}
            >
              [ BRIEFING ]
            </button>
          )}
          {onSilenceRequest && (
            <button
              type="button"
              data-slot="singularity-silence-btn"
              onClick={onSilenceRequest}
              className="pointer-events-auto px-1.5 py-0.5 border text-[9.5px] transition-colors cursor-pointer"
              style={{
                background: 'rgba(248, 113, 113, 0.12)',
                color: '#F87171',
                border: '1px solid #F87171',
                whiteSpace: 'nowrap',
                padding: '3px 6px',
              }}
            >
              [ SILENCIAR ]
            </button>
          )}
        </div>
        <span>ZEN: {zenLatencyMs.toFixed(2)}MS</span>
      </div>
    </div>
  );
});

export const SingularityHudColumn = {
  Root: SingularityHudColumnRoot,
  Block: SingularityHudBlock,
  CoreBlock: SingularityCoreBlock,
};
