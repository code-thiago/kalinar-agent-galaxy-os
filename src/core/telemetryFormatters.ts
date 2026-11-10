import { AgentNode, AgentStatus } from '../types/kalinar.js';

export interface StatusColorStyle {
  fg: string;
  border: string;
  bg: string;
}

const STATUS_STYLE_MAP: Record<string, StatusColorStyle> = {
  '[ACTIVE]': { fg: '#34D399', border: '#10B981', bg: 'rgba(16, 185, 129, 0.10)' },
  '[RUNNING]': { fg: '#34D399', border: '#10B981', bg: 'rgba(16, 185, 129, 0.10)' },
  '[VERIFIED]': { fg: '#34D399', border: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  '[ACK_VERIFIED]': { fg: '#34D399', border: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  '[PAUSED]': { fg: '#FBBF24', border: '#F59E0B', bg: 'rgba(245, 158, 11, 0.10)' },
  '[WARN]': { fg: '#FBBF24', border: '#F59E0B', bg: 'rgba(245, 158, 11, 0.10)' },
  '[FIFO_QUEUED]': { fg: '#FBBF24', border: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  '[HALTED]': { fg: '#F87171', border: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
  '[ERROR]': { fg: '#F87171', border: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
  '[STREAM]': { fg: '#AA88FF', border: '#AA88FF', bg: 'rgba(170, 136, 255, 0.10)' },
  '[ACK_DISPATCHED]': { fg: '#00F0FF', border: '#00F0FF', bg: 'rgba(0, 240, 255, 0.10)' },
  '[MODEL_HOTSWAP]': { fg: '#E879F9', border: '#E879F9', bg: 'rgba(232, 121, 249, 0.10)' },
  '[IDLE]': { fg: '#9A9A9A', border: '#1A1D26', bg: 'rgba(26, 29, 38, 0.35)' },
};

const DEFAULT_STATUS_STYLE: StatusColorStyle = {
  fg: '#9A9A9A',
  border: '#1A1D26',
  bg: 'transparent',
};

/**
 * Resolves WCAG-compliant foreground, border, and surface colors for an ASCII agent status badge.
 */
export function resolveAgentStatusPalette(status: AgentStatus | string): StatusColorStyle {
  return STATUS_STYLE_MAP[status] || DEFAULT_STATUS_STYLE;
}

/**
 * Formats an integer ETA in seconds into deterministic monospace MMm SSs notation.
 */
export function formatEtaCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

/**
 * Extracts target workspace file path from unified diff preview header, falling back safely.
 */
export function extractFilePathFromDiff(
  stream: string | undefined,
  fallback = 'src/core/ZenFirewall.ts'
): string {
  if (!stream) return fallback;
  const match = stream.match(/@@[^\n]*@@\s+([^\s\r\n]+)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return fallback;
}

/**
 * Matches an agent node by exact id, filename, or stripped @handle.
 */
export function findAgentByIdentifier(agents: AgentNode[], identifier: string): AgentNode | undefined {
  const normalized = identifier.trim().toLowerCase().replace(/^@/, '');
  if (!normalized) return undefined;
  return agents.find(
    (a) =>
      a.id.toLowerCase() === normalized ||
      a.filename.toLowerCase() === identifier.trim().toLowerCase() ||
      a.filename.toLowerCase().replace(/^@/, '') === normalized
  );
}
