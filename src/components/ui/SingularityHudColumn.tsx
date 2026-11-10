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
      className={`w-[360px] flex flex-col gap-5 text-[12px] leading-relaxed transition-all duration-300 pointer-events-none select-none ${
        isDrawerOpen ? 'translate-x-6 opacity-0' : 'translate-x-0 opacity-100'
      } ${className}`}
      style={{
        mixBlendMode: 'plus-lighter',
        pointerEvents: 'none',
        opacity: isDrawerOpen ? 0 : 1,
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

      <div className="flex justify-between items-center text-[10px] text-[#9A9A9A] font-mono tabular-nums pt-1.5 border-t border-[rgba(170,136,255,0.25)]">
        <div className="flex items-center gap-2">
          <span>SOVEREIGN PT-BR</span>
          {onMicToggle && (
            <button
              onClick={onMicToggle}
              className={`pointer-events-auto px-1.5 py-0.5 border text-[9.5px] transition-colors cursor-pointer ${
                isMicActive
                  ? 'border-[#AA88FF] text-[#AA88FF] bg-[rgba(170,136,255,0.15)]'
                  : 'border-[#1A1D26] text-[#9A9A9A] hover:text-[#DDDDDD]'
              }`}
            >
              {isMicActive ? '[MIC ACTIVE]' : '[ENABLE MIC]'}
            </button>
          )}
          {onBriefingRequest && (
            <button
              onClick={onBriefingRequest}
              className="pointer-events-auto px-1.5 py-0.5 border border-[#1A1D26] text-[9.5px] text-[#9A9A9A] hover:text-[#AA88FF] hover:border-[#AA88FF] transition-colors cursor-pointer"
            >
              [TACTICAL BRIEFING]
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
