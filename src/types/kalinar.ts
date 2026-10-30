/**
 * KALINAR SHARED TYPESCRIPT CONTRACTS (v0.1.0-alpha)
 * Strict schemaVersion: 1
 * Strictly Zero Emojis
 */

export const SCHEMA_VERSION = 1 as const;

export type VoiceState = '[STANDBY]' | '[LISTENING]' | '[SPEAKING]' | '[GRAVITY_PULL]';

export type AgentStatus = 
  | '[ACTIVE]' 
  | '[IDLE]' 
  | '[HALTED]' 
  | '[PAUSED]' 
  | '[RUNNING]' 
  | '[VERIFIED]' 
  | '[WARN]' 
  | '[ERROR]' 
  | '[STREAM]';

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
  'agent:registered': AgentNode;
  'agent:step_updated': { agentId: string; step: number; description: string; preview: string };
  'agent:status_changed': { agentId: string; previous: AgentStatus; current: AgentStatus };
  'agent:metric_updated': { agentId: string; tokensPrompt: number; tokensCompletion: number; eta: number };
  'watcher:file_event': { path: string; event: 'add' | 'change' | 'unlink'; category: 'WATCH_VISUAL_ONLY' | 'STANDARD_WATCH' };
  'zen:rule_evaluated': { ruleKey: string; latencyMs: number; allowed: boolean; details: Record<string, unknown> };
  'circuit_breaker:state_changed': { state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'; reason: string };
  'canvas:sync_requested': { canvasFile: string; nodesCount: number };
};
