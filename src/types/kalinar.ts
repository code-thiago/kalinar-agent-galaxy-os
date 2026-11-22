/**
 * KALINAR SHARED TYPESCRIPT CONTRACTS (v1.1.0)
 * Strict schemaVersion: 1
 * Strictly Zero Emojis
 */

import type {
  AgentStatus,
  FifoQueueItem,
  LlmModelCheckpoint,
  LlmModelId,
  SingularityCoreState,
  StreamDigest,
  TwoPhaseVoiceAck,
  VoiceState,
} from '@kalinar/contracts';

export * from '@kalinar/contracts';

export type AsciiStatusBadge =
  | VoiceState
  | AgentStatus
  | '[VOICE_HIBERNATE]'
  | '[ACK_DISPATCHED]'
  | '[ACK_VERIFIED]'
  | '[FIFO_QUEUED]'
  | '[MODEL_HOTSWAP]';

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
  position3D?: [number, number, number];
}

export interface SecondBrainNode {
  id: string;
  wikilink: string;
  notePath: string;
  tagList: string[];
  domain: '01_PROJETOS' | '02_PADROES' | '03_PREFERENCIAS' | '04_STACK' | '05_EXECUCOES' | string;
  connectionCount: number;
  summary: string;
  position3D?: [number, number, number];
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

export interface ServerPushAlertPayload {
  type: 'STEP_COMPLETED' | 'AGENT_HALTED' | 'HARD_BLOCK';
  taskId: string;
  targetAgentId: string;
  pid?: number;
  exitCode: number;
  sqliteVerified?: boolean;
  agentStatus?: AgentStatus;
  firewallVerdict?: string;
  summaryText?: string;
}

export interface SyncSentinelEventPayload {
  mode: 'WATCHING' | 'SYNC_MUTE_WINDOW';
  status:
    | 'NO_LOCK'
    | 'SYNC_MUTE_WINDOW'
    | 'SYNC_MUTE_RELEASED'
    | 'RECOVERED_PID_DEAD'
    | 'RECOVERED_TTL_EXPIRED'
    | 'RECOVERED_INVALID_SCHEMA';
  lockPath: string;
  pid?: number;
  timestamp?: number;
  ttlMs?: number;
  ageMs?: number;
  staleLockRemoved: boolean;
  suppressedCount?: number;
  flushedCount?: number;
  reason: string;
}

export type KalinarEventMap = {
  'singularity:state_changed': SingularityCoreState;
  'singularity:voice_transcript': { text: string; isFinal: boolean; source: 'OPERATOR' | 'KALINAR' };
  'voice:two_phase_ack': TwoPhaseVoiceAck;
  'daemon:stream_digest': StreamDigest;
  'daemon:server_push_alert': ServerPushAlertPayload;
  'daemon:sync_sentinel_lock': SyncSentinelEventPayload;
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

/* =====================================================================
   OBSIDIAN JSON CANVAS 1.0 CONTRACT SPECIFICATION
   ===================================================================== */

export type CanvasNodeColor = '1' | '2' | '3' | '4' | '5' | '6' | string;

export interface CanvasTextNode {
  id: string;
  type: 'text';
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: CanvasNodeColor;
}

export interface CanvasFileNode {
  id: string;
  type: 'file';
  file: string;
  subpath?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: CanvasNodeColor;
}

export interface CanvasLinkNode {
  id: string;
  type: 'link';
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: CanvasNodeColor;
}

export interface CanvasGroupNode {
  id: string;
  type: 'group';
  label?: string;
  background?: string;
  backgroundStyle?: 'cover' | 'ratio' | 'repeat';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: CanvasNodeColor;
}

export type CanvasNode = CanvasTextNode | CanvasFileNode | CanvasLinkNode | CanvasGroupNode;

export interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide?: 'top' | 'right' | 'bottom' | 'left';
  fromEnd?: 'none' | 'arrow';
  toNode: string;
  toSide?: 'top' | 'right' | 'bottom' | 'left';
  toEnd?: 'none' | 'arrow';
  color?: CanvasNodeColor;
  label?: string;
}

export interface ObsidianCanvasDocument {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface CanvasSyncRequest {
  direction?: 'EXPORT_TO_CANVAS' | 'IMPORT_FROM_CANVAS' | 'BIDIRECTIONAL' | 'export_to_canvas' | 'import_from_canvas';
  canvasPath?: string;
  topology?: WorkspaceScanResult;
}

export interface CanvasSyncResult {
  success: boolean;
  direction?: string;
  canvasPath?: string;
  nodesCount?: number;
  edgesCount?: number;
  nodesExported?: number;
  nodesImported?: number;
  topology?: WorkspaceScanResult;
  document?: ObsidianCanvasDocument;
  latencyMs?: number;
  error?: string;
}

/* =====================================================================
   SECOND BRAIN VAULT RAG & NOTE INJECTION CONTRACTS
   ===================================================================== */

export interface SecondBrainVaultNote {
  id: string;
  title: string;
  filePath: string;
  wikilink: string;
  domain: string;
  tags: string[];
  frontmatter: Record<string, any>;
  wikilinks: string[]; // Strictly capped at maximum 2 per Graph Pointer
  excerpt: string; // Strictly under 250 characters
  content?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SecondBrainVaultQueryParams {
  query?: string;
  domain?: string;
  targetPath?: string;
  maxResults?: number;
}

export interface SecondBrainQueryResult {
  success: boolean;
  notes: SecondBrainVaultNote[];
  total: number;
  searchLatencyMs: number;
  error?: string;
}

export interface SecondBrainInjectPayload {
  title: string;
  domain: string;
  tags?: string[];
  content: string;
  filePath?: string;
  notePath?: string;
  frontmatter?: Record<string, any>;
}

export interface SecondBrainInjectResult {
  success: boolean;
  note: SecondBrainVaultNote | null;
  spawned3DNode?: SecondBrainNode | null;
  node3D?: SecondBrainNode | null;
  persistedToDisk: boolean;
  persistedToSqlite: boolean;
  latencyMs: number;
  error?: string;
}

