/**
 * KALINAR SHARED TYPESCRIPT CONTRACTS (v1.1.0)
 * Strict schemaVersion: 1
 * Strictly Zero Emojis
 */

import { z } from 'zod';

export const SCHEMA_VERSION = 1 as const;

export type LlmModelId =
  | 'argon'
  | 'claude-sonnet'
  | 'claude-3.7-sonnet'
  | 'gemini-pro'
  | 'gemini-2.5-pro'
  | 'gemini-flash'
  | 'gemini-2.5-flash';

export const LlmModelIdSchema = z.enum([
  'argon',
  'claude-sonnet',
  'claude-3.7-sonnet',
  'gemini-pro',
  'gemini-2.5-pro',
  'gemini-flash',
  'gemini-2.5-flash',
]);

export type VoiceState =
  | '[STANDBY]'
  | '[LISTENING]'
  | '[SPEAKING]'
  | '[GRAVITY_PULL]'
  | '[SINGULARITY: STANDBY]'
  | '[LISTENING PT-BR]'
  | '[GRAVITY_INGESTION]'
  | '[KALINAR_SPEAKING]'
  | '[VOICE_HIBERNATE]';

export type AgentStatus =
  | '[ACTIVE]'
  | '[IDLE]'
  | '[HALTED]'
  | '[PAUSED]'
  | '[RUNNING]'
  | '[VERIFIED]'
  | '[WARN]'
  | '[ERROR]'
  | '[STREAM]'
  | '[ACK_DISPATCHED]'
  | '[ACK_VERIFIED]'
  | '[FIFO_QUEUED]'
  | '[MODEL_HOTSWAP]';

export type AsciiStatusBadge =
  | VoiceState
  | AgentStatus
  | '[VOICE_HIBERNATE]'
  | '[ACK_DISPATCHED]'
  | '[ACK_VERIFIED]'
  | '[FIFO_QUEUED]'
  | '[MODEL_HOTSWAP]';

export const StreamDigestSchema = z.object({
  taskId: z.string().min(1),
  agentId: z.string().min(1),
  exitCode: z.number().int(),
  filePath: z.string().optional(),
  line: z.number().int().nonnegative().optional(),
  col: z.number().int().nonnegative().optional(),
  errorSignature: z.string().optional(),
  summaryText: z.string().min(1),
  tokenCount: z.number().int().min(1).max(150),
});

export type StreamDigest = z.infer<typeof StreamDigestSchema>;

export const TwoPhaseVoiceAckSchema = z.object({
  phase: z.enum(['STATUS_DISPATCHED', 'STATUS_VERIFIED']),
  taskId: z.string().min(1),
  targetAgentId: z.string().min(1),
  pid: z.number().int().optional(),
  exitCode: z.number().int().optional(),
  spokenMessage: z.string().min(1),
  emergencyPreempt: z.boolean(),
});

export type TwoPhaseVoiceAck = z.infer<typeof TwoPhaseVoiceAckSchema>;

export const FifoQueueItemSchema = z.object({
  id: z.string().min(1),
  targetAgentId: z.string().min(1),
  instruction: z.string().min(1),
  modelId: LlmModelIdSchema,
  status: z.enum(['FIFO_QUEUED', 'DISPATCHED', 'COMPLETED', 'CANCELLED']),
  createdAt: z.number().int().nonnegative(),
});

export type FifoQueueItem = z.infer<typeof FifoQueueItemSchema>;

export const LlmModelCheckpointSchema = z.object({
  id: z.string().min(1),
  agentId: z.string().min(1),
  taskId: z.string().min(1),
  gitCommitOrStashHash: z.string().min(1),
  activeModelId: LlmModelIdSchema,
  fallbackModelId: LlmModelIdSchema,
  retryCount: z.number().int().min(0),
  status: z.enum(['CHECKPOINTED', 'ROLLED_BACK', 'HOT_SWAPPED', 'COMMITTED']),
});

export type LlmModelCheckpoint = z.infer<typeof LlmModelCheckpointSchema>;

export type ExecutionMode = 'AUTO_PILOT' | 'STEP_BY_STEP_GATE' | 'SANDBOX_DRY_RUN';

export type CanonicalAgentFilename = 
  | '@agent-orchestrator'
  | '@agent-software-engineer'
  | '@agent-design'
  | '@agent-data'
  | '@agent-cybersecurity'
  | '@agent-qa'
  | '@agent-content';

export type BeamType = 'GRAVITATIONAL_PULL' | 'SINGULARITY_PULSE' | 'AGENT_TO_AGENT';

export interface SingularityCoreState {
  schemaVersion: typeof SCHEMA_VERSION;
  voiceState: VoiceState;
  liveTranscript: string;
  accretionTurbulence: number;
  activeDirective: string;
  zenLatencyMs: number;
  activeAgentCount: number;
  activeModelId?: LlmModelId;
  lastAckBadge?: '[ACK_DISPATCHED]' | '[ACK_VERIFIED]' | '[FIFO_QUEUED]' | '[MODEL_HOTSWAP]';
  pendingVoiceQueueCount?: number;
}

export interface AgentNode {
  id: string;
  filename: CanonicalAgentFilename | string;
  pid: number;
  status: AgentStatus;
  executionMode: ExecutionMode;
  currentObjective: string;
  totalSteps: number;
  currentStep: number;
  stepDescription: string;
  tokensPrompt: number;
  tokensCompletion: number;
  tokenVelocity: number;
  etaSeconds: number;
  position3D: [number, number, number];
  livePreviewStream: string;
  activeModelId?: LlmModelId;
  fifoQueueCount?: number;
  fifoQueueDepth?: number;
  lastAckBadge?: '[ACK_DISPATCHED]' | '[ACK_VERIFIED]' | '[FIFO_QUEUED]' | '[MODEL_HOTSWAP]';
}

export interface ArtifactSatelliteNode {
  id: string;
  associatedAgentId: string;
  artifactPath: string;
  fileHash: string;
  title: string;
  status: 'GENERATING' | 'COMMITTED' | 'VERIFIED' | 'REJECTED';
  byteSize: number;
  lastModified: string;
}

export interface SecondBrainNode {
  id: string;
  wikilink: string;
  notePath: string;
  tagList: string[];
  domain: '01_PROJETOS' | '02_PADROES' | '03_PREFERENCIAS' | '04_STACK' | '05_EXECUCOES' | string;
  connectionCount: number;
  summary: string;
}

export interface SynapticBeam {
  id: string;
  sourceId: string;
  targetId: string;
  beamType: BeamType;
  intensity: number;
  colorToken: string;
}

export interface IKalinarAgentConnector {
  registerAgent(agent: AgentNode): Promise<boolean>;
  emitStepUpdate(agentId: string, currentStep: number, description: string, previewDelta: string): void;
  updateStatus(agentId: string, status: AgentStatus): void;
  onLivePreview(agentId: string, callback: (streamChunk: string) => void): () => void;
  dispose(): void;
}

/* =====================================================================
   DAEMON & EVENT BUS EVENTS
   ===================================================================== */

export type KalinarEventMap = {
  'singularity:state_changed': SingularityCoreState;
  'singularity:voice_transcript': { text: string; isFinal: boolean; source: 'OPERATOR' | 'KALINAR' };
  'voice:two_phase_ack': TwoPhaseVoiceAck;
  'agent:registered': AgentNode;
  'agent:step_updated': { agentId: string; step: number; description: string; preview: string };
  'agent:status_changed': { agentId: string; previous: AgentStatus; current: AgentStatus };
  'agent:metric_updated': { agentId: string; tokensPrompt: number; tokensCompletion: number; eta: number };
  'agent:fifo_queued': FifoQueueItem;
  'agent:model_hotswap': LlmModelCheckpoint;
  'watcher:file_event': { path: string; event: 'add' | 'change' | 'unlink'; category: 'WATCH_VISUAL_ONLY' | 'STANDARD_WATCH' };
  'zen:rule_evaluated': { ruleKey: string; latencyMs: number; allowed: boolean; details: Record<string, unknown> };
  'circuit_breaker:state_changed': { state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'; reason: string };
  'canvas:sync_requested': { canvasFile: string; nodesCount: number };
  'diff:approved': { filePath: string; agentId: string };
  'diff:reverted': { filePath: string; agentId: string };
};

/* =====================================================================
   TASK 9: TAUZ ACOUSTIC DSP & LIVE GIT DIFF CONTRACTS (v1.2.0)
   ===================================================================== */

export interface TauzFrequencyBands {
  subBass: number;
  lowMid: number;
  highPresence: number;
  compositePulse: number;
}

export interface StructuredDiffLine {
  type: '+' | '-' | 'add' | 'remove' | 'context' | 'header';
  content: string;
  lineNumber?: number;
}

export interface LiveGitDiffResult {
  allowed?: boolean;
  filePath: string;
  rawDiff: string;
  lines: StructuredDiffLine[];
  additions?: number;
  deletions?: number;
  latencyMs: number;
  error?: string;
}

export interface ApproveOrRevertDiffResult {
  success?: boolean;
  allowed?: boolean;
  filePath: string;
  action: 'APPROVE' | 'REVERT' | 'UNLOCK_WRITER';
  status?: 'APPROVED_AND_COMMITTED' | 'REVERTED_TO_BASELINE' | 'SINGLE_WRITER_LOCK_RELEASED' | 'GATE_BLOCKED';
  gateStatus?: string;
  gateReason?: string;
  message?: string;
  latencyMs: number;
  error?: string;
}

export interface WorkspaceScanResult {
  agents: AgentNode[];
  secondBrainNodes: SecondBrainNode[];
  artifactSatellites: ArtifactSatelliteNode[];
  warRoomPointers: Array<
    | string
    | {
        id: string;
        timestamp: string;
        from: string;
        to: string;
        domain: string;
        wikilinks: string[];
        action: string;
      }
  >;
}

