/**
 * KALINAR ZUSTAND REACTIVE STORE (v2.2.0-step2)
 * Ground-Truth Standby & Real IPC/SQLite Hydration
 * Strict Zero Emojis
 */

import { create } from 'zustand';
import {
  AgentNode,
  AgentStatus,
  DiscoveredLlmProvider,
  FifoQueueItem,
  LlmModelId,
  LlmProviderId,
  SaveLlmProviderKeyInput,
  SCHEMA_VERSION,
  SecondBrainQueryResult,
  SecondBrainVaultNote,
  SecondBrainVaultQueryParams,
  SingularityCoreState,
  SynapticBeam,
  VaultOperationResult,
  VoiceState,
  WorkspaceScanResult,
} from '../types/kalinar.js';

export type VisionBSidebarTab = 'AGENTS' | 'SECOND_BRAIN' | 'LLM_HUB' | 'FIREWALL';

export interface MiniCliHistoryEntry {
  id: string;
  timestamp: number;
  route: 'SHELL_IPC' | 'AGENT_FIFO';
  input: string;
  output: string;
  exitCode?: number;
  blockedByFirewall?: boolean;
}

export interface VisionBWorkspaceSlice {
  activeSidebarTab: VisionBSidebarTab;
  isLeftSidebarCollapsed: boolean;
  isRightInspectorCollapsed: boolean;
  isOnboardingDismissed: boolean;
  activeCliPid: number | null;
  cliHistory: MiniCliHistoryEntry[];
  setActiveSidebarTab: (tab: VisionBSidebarTab) => void;
  toggleLeftSidebar: () => void;
  toggleRightInspector: () => void;
  dismissOnboarding: () => void;
  refreshLlmDiscovery: () => Promise<void>;
  saveProviderCredential: (input: SaveLlmProviderKeyInput) => Promise<VaultOperationResult>;
  removeProviderCredential: (providerId: LlmProviderId) => Promise<VaultOperationResult>;
  dispatchMiniCliInput: (rawInput: string) => Promise<void>;
  killActiveCliProcess: () => Promise<void>;
}

export interface SovereignControlsSlice {
  activeNoteReader: ActiveNoteReaderState | null;
  activeDiffInspector: ActiveDiffInspectorState | null;
  modelHotSwapTargetAgentId: string | null;
  openSecondBrainNoteReader: (relativePath: string, title?: string) => Promise<void>;
  closeSecondBrainNoteReader: () => void;
  openAgentDiffInspector: (agentId: string) => Promise<void>;
  executeDiffGateDecision: (agentId: string, decision: 'APPROVE' | 'REVERT') => Promise<void>;
  hotSwapAgentModel: (agentId: string, newModelId: string) => Promise<void>;
  injectNoteIntoAgentContext: (agentId: string, noteRelativePath: string) => Promise<void>;
}

export interface ActiveNoteReaderState {
  relativePath: string;
  title: string;
  content: string;
  isLoading: boolean;
  error?: string;
}

export interface ActiveDiffInspectorState {
  agentId: string;
  filePath: string;
  diffLines: string[];
  isLoading: boolean;
  decisionStatus: 'PENDING' | 'APPROVED' | 'REVERTED';
  error?: string;
}

export type SystemGroundTruthState = 'STANDBY_READY' | 'ACTIVE_EXECUTION' | 'HALTED';

export interface CommandLogEntry {
  id: string | number;
  taskId: string;
  eventType: string;
  agentName: string;
  payload: string;
  latencyMs: number;
  timestamp: string;
}

export interface KalinarGroundTruthApi {
  scanWorkspaceNodes?: () => Promise<WorkspaceScanResult>;
  querySecondBrainVault?: (params?: SecondBrainVaultQueryParams) => Promise<SecondBrainQueryResult>;
  getHistoricalTelemetry?: (limit?: number) => Promise<
    Array<{
      id?: string | number;
      task_id?: string;
      taskId?: string;
      event_type?: string;
      eventType?: string;
      agent_name?: string;
      agentName?: string;
      payload?: string;
      latency_ms?: number;
      latencyMs?: number;
      timestamp?: string;
    }>
  >;
  manageFifoQueue?: (payload: {
    action: 'LIST' | 'PROMOTE' | 'CLEAR';
    targetAgentId?: string;
    itemId?: string;
  }) => Promise<{ items?: FifoQueueItem[] }>;
  discoverLlmProviders?: () => Promise<{
    providers: DiscoveredLlmProvider[];
    discoveredModels: string[];
    activeLocalModels: string[];
    probedAt: number;
    latencyMs: number;
  }>;
}

function getKalinarBridge(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).kalinarApi ?? (window as any).kalinar ?? null;
}

export function computeHasAnyConfiguredEngine(providers: DiscoveredLlmProvider[]): boolean {
  return providers.some((p) => {
    if (!p.available) return false;
    if (p.source === 'OLLAMA_LOCAL' || p.source === 'LM_STUDIO_LOCAL') {
      return Array.isArray(p.models) && p.models.length > 0;
    }
    if (p.source === 'CLI_PATH') {
      return Array.isArray(p.models) && p.models.length > 0;
    }
    return true;
  });
}

const ACTIVE_AGENT_STATUSES: ReadonlySet<AgentStatus> = new Set([
  '[ACTIVE]',
  '[RUNNING]',
  '[STREAM]',
]);

const HALTED_AGENT_STATUSES: ReadonlySet<AgentStatus> = new Set([
  '[HALTED]',
  '[ERROR]',
]);

function normalizeAgentRef(value: string): string {
  return (value || '').trim().replace(/^@/, '').replace(/\.md$/i, '').toLowerCase();
}

function matchesAgentId(agent: AgentNode, targetId: string): boolean {
  if (!targetId) return false;
  if (agent.id === targetId || agent.filename === targetId) return true;
  const normAgentId = normalizeAgentRef(agent.id);
  const normFilename = normalizeAgentRef(agent.filename);
  const normTarget = normalizeAgentRef(targetId);
  return normAgentId === normTarget || normFilename === normTarget;
}

function buildActiveSynapticBeams(agents: AgentNode[]): SynapticBeam[] {
  return agents
    .filter((a) => ACTIVE_AGENT_STATUSES.has(a.status))
    .map((a) => ({
      id: `beam-pulse-${a.id}`,
      sourceId: 'singularity-event-horizon',
      targetId: a.filename,
      beamType: 'SINGULARITY_PULSE',
      intensity: 0.85,
      colorToken: '#AA88FF',
    }));
}

function deriveGroundTruthMetrics(
  agents: AgentNode[],
  currentSingularity: SingularityCoreState
): {
  systemState: SystemGroundTruthState;
  activeAgentsCount: number;
  sessionTokens: number;
  singularity: SingularityCoreState;
} {
  const activeAgentsCount = agents.filter((a) => ACTIVE_AGENT_STATUSES.has(a.status)).length;
  const sessionTokens = agents.reduce(
    (acc, a) => acc + (a.tokensPrompt || 0) + (a.tokensCompletion || 0),
    0
  );
  const hasHalted = agents.some((a) => HALTED_AGENT_STATUSES.has(a.status));
  const systemState: SystemGroundTruthState =
    activeAgentsCount > 0 ? 'ACTIVE_EXECUTION' : hasHalted ? 'HALTED' : 'STANDBY_READY';

  const nextDirective =
    activeAgentsCount > 0
      ? currentSingularity.activeDirective === 'STANDBY_READY'
        ? 'ACTIVE_EXECUTION'
        : currentSingularity.activeDirective
      : 'STANDBY_READY';

  return {
    systemState,
    activeAgentsCount,
    sessionTokens,
    singularity: {
      ...currentSingularity,
      activeAgentCount: activeAgentsCount,
      activeDirective: nextDirective,
    },
  };
}

function createInitialStandbySnapshot(): {
  systemState: SystemGroundTruthState;
  activeAgentsCount: number;
  sessionTokens: number;
  cortexNoteCount: number;
  isHydrated: boolean;
  singularity: SingularityCoreState;
  agents: AgentNode[];
  secondBrainNotes: SecondBrainVaultNote[];
  synapticBeams: SynapticBeam[];
  commandLogs: CommandLogEntry[];
  fifoQueueItems: FifoQueueItem[];
  selectedAgentId: string | null;
  inspectedFilePath: string;
} {
  return {
    systemState: 'STANDBY_READY',
    activeAgentsCount: 0,
    sessionTokens: 0,
    cortexNoteCount: 0,
    isHydrated: false,
    singularity: {
      schemaVersion: SCHEMA_VERSION,
      voiceState: '[STANDBY]',
      liveTranscript: 'Nucleo em prontidao [STANDBY_READY]. Aguardando diretriz.',
      accretionTurbulence: 0.08,
      activeDirective: 'STANDBY_READY',
      zenLatencyMs: 0,
      activeAgentCount: 0,
      activeModelId: 'argon',
      lastAckBadge: '[ACK_VERIFIED]',
      pendingVoiceQueueCount: 0,
    },
    agents: [],
    secondBrainNotes: [],
    synapticBeams: [],
    commandLogs: [],
    fifoQueueItems: [],
    selectedAgentId: null,
    inspectedFilePath: '',
  };
}

interface KalinarStoreState extends VisionBWorkspaceSlice, SovereignControlsSlice {
  systemState: SystemGroundTruthState;
  activeAgentsCount: number;
  sessionTokens: number;
  cortexNoteCount: number;
  isHydrated: boolean;
  singularity: SingularityCoreState;
  agents: AgentNode[];
  secondBrainNotes: SecondBrainVaultNote[];
  synapticBeams: SynapticBeam[];
  commandLogs: CommandLogEntry[];
  fifoQueueItems: FifoQueueItem[];
  activeFilter: string;
  isBottomDockExpanded: boolean;
  isInspectorDrawerOpen: boolean;
  isCommandPaletteOpen: boolean;
  selectedAgentId: string | null;
  selectedNoteId: string | null;
  inspectedFilePath: string;
  discoveredProviders: DiscoveredLlmProvider[];
  discoveredModels: string[];
  activeLocalModels: string[];
  isDiscoveringLlms: boolean;
  hasAnyConfiguredEngine: boolean;

  setFilter: (filter: string) => void;
  toggleBottomDock: () => void;
  setBottomDockExpanded: (expanded: boolean) => void;
  toggleInspectorDrawer: () => void;
  setInspectorDrawerOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setInspectedFilePath: (filePath: string) => void;
  selectAgent: (id: string | null) => void;
  updateSingularityTranscript: (transcript: string) => void;
  setVoiceState: (voiceState: VoiceState) => void;
  setSingularityAckBadge: (
    badge: '[ACK_DISPATCHED]' | '[ACK_VERIFIED]' | '[FIFO_QUEUED]' | '[MODEL_HOTSWAP]'
  ) => void;
  setActiveModelId: (modelId: LlmModelId) => void;
  setPendingVoiceQueueCount: (count: number) => void;
  setAgents: (agents: AgentNode[]) => void;
  setSecondBrainNotes: (notes: SecondBrainVaultNote[], cortexNoteCount?: number) => void;
  setSynapticBeams: (beams: SynapticBeam[]) => void;
  setCommandLogs: (logs: CommandLogEntry[]) => void;
  appendCommandLog: (entry: CommandLogEntry) => void;
  updateAgentMetrics: (
    agentId: string,
    tokensPrompt: number,
    tokensCompletion: number,
    tokenVelocity?: number,
    etaSeconds?: number
  ) => void;
  applyDaemonEvent: (payload: Record<string, unknown>) => void;
  hydrateFromGroundTruth: (apiOverride?: KalinarGroundTruthApi) => Promise<void>;
  resetToStandby: () => void;
  setAgentModel: (
    agentId: string,
    modelId: LlmModelId,
    badge?: '[ACK_DISPATCHED]' | '[ACK_VERIFIED]' | '[FIFO_QUEUED]' | '[MODEL_HOTSWAP]'
  ) => void;
  updateAgentModel: (
    agentId: string,
    modelId: LlmModelId,
    badge?: '[ACK_DISPATCHED]' | '[ACK_VERIFIED]' | '[FIFO_QUEUED]' | '[MODEL_HOTSWAP]'
  ) => void;
  updateAgentStatus: (agentId: string, status: AgentStatus) => void;
  setAgentFifoCount: (agentId: string, count: number) => void;
  setFifoQueueItems: (items: FifoQueueItem[]) => void;
  enqueueFifoItemInStore: (item: FifoQueueItem) => void;
  promoteFifoItemInStore: (itemId: string) => void;
  clearFifoQueueInStore: (agentId?: string) => void;
  updateAgentStep: (agentId: string, step: number, preview: string) => void;
  addAgent: (agent: AgentNode) => void;
  selectNote: (noteId: string | null) => void;
}

export const useKalinarStore = create<KalinarStoreState>((set, get) => ({
  ...createInitialStandbySnapshot(),
  activeFilter: 'ALL',
  isBottomDockExpanded: false,
  isInspectorDrawerOpen: false,
  isCommandPaletteOpen: false,
  selectedNoteId: null,
  activeSidebarTab: 'AGENTS',
  isLeftSidebarCollapsed: false,
  isRightInspectorCollapsed: false,
  isOnboardingDismissed: false,
  activeCliPid: null,
  cliHistory: [],
  discoveredProviders: [],
  discoveredModels: [],
  activeLocalModels: [],
  isDiscoveringLlms: false,
  hasAnyConfiguredEngine: false,
  activeNoteReader: null,
  activeDiffInspector: null,
  modelHotSwapTargetAgentId: null,

  setActiveSidebarTab: (activeSidebarTab) => set({ activeSidebarTab }),
  toggleLeftSidebar: () =>
    set((state) => ({ isLeftSidebarCollapsed: !state.isLeftSidebarCollapsed })),
  toggleRightInspector: () =>
    set((state) => ({ isRightInspectorCollapsed: !state.isRightInspectorCollapsed })),
  dismissOnboarding: () => set({ isOnboardingDismissed: true }),
  selectNote: (selectedNoteId) => set({ selectedNoteId }),
  closeSecondBrainNoteReader: () => set({ activeNoteReader: null }),

  openSecondBrainNoteReader: async (relativePath, title) => {
    set({
      activeDiffInspector: null,
      activeNoteReader: {
        relativePath,
        title: title || relativePath,
        content: '',
        isLoading: true,
      },
    });
    const bridge = getKalinarBridge();
    if (!bridge || typeof bridge.readSecondBrainNote !== 'function') {
      set({
        activeNoteReader: {
          relativePath,
          title: title || relativePath,
          content: '',
          isLoading: false,
          error: '[IPC_UNAVAILABLE] readSecondBrainNote indisponivel.',
        },
      });
      return;
    }
    try {
      const res = await bridge.readSecondBrainNote({ relativePath });
      if (!res || res.ok === false) {
        set({
          activeNoteReader: {
            relativePath,
            title: title || relativePath,
            content: '',
            isLoading: false,
            error: res?.error || 'READ_FAILED',
          },
        });
        return;
      }
      set({
        activeNoteReader: {
          relativePath: res.relativePath || relativePath,
          title: res.title || title || relativePath,
          content: res.content || '',
          isLoading: false,
        },
      });
    } catch (err: unknown) {
      set({
        activeNoteReader: {
          relativePath,
          title: title || relativePath,
          content: '',
          isLoading: false,
          error: err instanceof Error ? err.message : 'READ_ERROR',
        },
      });
    }
  },

  openAgentDiffInspector: async (agentId) => {
    const agent = get().agents.find((a) => matchesAgentId(a, agentId));
    const match = (agent?.livePreviewStream || '').match(/@@[^\n]*@@\s+([^\s\r\n]+)/);
    const filePath = match && match[1] ? match[1].trim() : 'src/core/ZenFirewall.ts';

    set({
      selectedAgentId: agent?.id || agentId,
      activeNoteReader: null,
      activeDiffInspector: {
        agentId: agent?.id || agentId,
        filePath,
        diffLines: [],
        isLoading: true,
        decisionStatus: 'PENDING',
      },
    });

    const bridge = getKalinarBridge();
    if (!bridge || typeof bridge.getLiveGitDiff !== 'function') {
      set({
        activeDiffInspector: {
          agentId: agent?.id || agentId,
          filePath,
          diffLines: [],
          isLoading: false,
          decisionStatus: 'PENDING',
          error: '[IPC_UNAVAILABLE] getLiveGitDiff indisponivel.',
        },
      });
      return;
    }

    try {
      const res = await bridge.getLiveGitDiff({ filePath, agentId: agent?.id || agentId });
      const rawLines: string[] = Array.isArray(res?.lines)
        ? res.lines.map((l: any) => (typeof l === 'string' ? l : String(l?.content ?? '')))
        : typeof res?.rawDiff === 'string' && res.rawDiff.trim().length > 0
        ? res.rawDiff.split(/\r?\n/)
        : [];
      set({
        activeDiffInspector: {
          agentId: agent?.id || agentId,
          filePath: res?.filePath || filePath,
          diffLines: rawLines.filter((l) => l.length > 0),
          isLoading: false,
          decisionStatus: 'PENDING',
          ...(res?.error ? { error: String(res.error) } : {}),
        },
      });
    } catch (err: unknown) {
      set({
        activeDiffInspector: {
          agentId: agent?.id || agentId,
          filePath,
          diffLines: [],
          isLoading: false,
          decisionStatus: 'PENDING',
          error: err instanceof Error ? err.message : 'DIFF_LOAD_FAILED',
        },
      });
    }
  },

  executeDiffGateDecision: async (agentId, decision) => {
    const current = get().activeDiffInspector;
    const filePath = current?.filePath || 'src/core/ZenFirewall.ts';
    const bridge = getKalinarBridge();

    if (bridge && typeof bridge.approveOrRevertDiff === 'function') {
      try {
        await bridge.approveOrRevertDiff({
          filePath,
          action: decision,
          agentId,
        });
      } catch (err: unknown) {
        set((state) => ({
          activeDiffInspector: state.activeDiffInspector
            ? {
                ...state.activeDiffInspector,
                error: err instanceof Error ? err.message : 'GATE_DECISION_ERROR',
              }
            : null,
        }));
        return;
      }
    }

    set((state) => {
      const nextStatus: AgentStatus = decision === 'APPROVE' ? '[VERIFIED]' : '[WARN]';
      const nextAgents = state.agents.map((a) =>
        matchesAgentId(a, agentId) ? { ...a, status: nextStatus } : a
      );
      return {
        agents: nextAgents,
        synapticBeams: buildActiveSynapticBeams(nextAgents),
        activeDiffInspector: state.activeDiffInspector
          ? {
              ...state.activeDiffInspector,
              decisionStatus: decision === 'APPROVE' ? 'APPROVED' : 'REVERTED',
            }
          : null,
        ...deriveGroundTruthMetrics(nextAgents, state.singularity),
      };
    });
  },

  hotSwapAgentModel: async (agentId, newModelId) => {
    const bridge = getKalinarBridge();
    if (bridge && typeof bridge.switchLlmModel === 'function') {
      try {
        await bridge.switchLlmModel({
          agentId,
          targetModel: newModelId,
          taskId: 'SOVEREIGN_1CLICK_HOTSWAP',
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'HOTSWAP_FAILED';
        set((state) => ({
          commandLogs: [
            {
              id: `hotswap-err-${Date.now()}`,
              taskId: 'SYSTEM',
              eventType: 'MODEL_HOTSWAP_ERROR',
              agentName: agentId,
              payload: JSON.stringify({ error: msg, targetModel: newModelId }),
              latencyMs: 0,
              timestamp: new Date().toISOString(),
            },
            ...state.commandLogs,
          ].slice(0, 100),
        }));
        return;
      }
    }

    set((state) => ({
      modelHotSwapTargetAgentId: null,
      agents: state.agents.map((a) =>
        matchesAgentId(a, agentId)
          ? { ...a, activeModelId: newModelId, lastAckBadge: '[MODEL_HOTSWAP]' }
          : a
      ),
    }));
  },

  injectNoteIntoAgentContext: async (agentId, noteRelativePath) => {
    const note = get().secondBrainNotes.find(
      (n) =>
        n.filePath === noteRelativePath ||
        n.id === noteRelativePath ||
        n.wikilink === noteRelativePath
    );
    const bridge = getKalinarBridge();
    if (bridge && typeof bridge.injectSecondBrainNote === 'function') {
      try {
        await bridge.injectSecondBrainNote({
          title: note?.title || noteRelativePath,
          domain: note?.domain || '02_PADROES',
          tags: note?.tags || ['rag'],
          content: note?.excerpt || note?.content || `Injected context: ${noteRelativePath}`,
          filePath: note?.filePath || noteRelativePath,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'RAG_INJECT_FAILED';
        set((state) => ({
          commandLogs: [
            {
              id: `rag-err-${Date.now()}`,
              taskId: 'SYSTEM',
              eventType: 'RAG_INJECT_ERROR',
              agentName: agentId,
              payload: JSON.stringify({ error: msg, noteRelativePath }),
              latencyMs: 0,
              timestamp: new Date().toISOString(),
            },
            ...state.commandLogs,
          ].slice(0, 100),
        }));
        return;
      }
    }

    if (
      typeof window !== 'undefined' &&
      typeof (window as any).__triggerGravitationalRAG === 'function'
    ) {
      const targetAgent = get().agents.find((a) => matchesAgentId(a, agentId));
      (window as any).__triggerGravitationalRAG(targetAgent?.position3D || [120, 80, 0]);
    }

    set((state) => ({
      agents: state.agents.map((a) =>
        matchesAgentId(a, agentId)
          ? {
              ...a,
              lastAckBadge: '[ACK_DISPATCHED]',
            }
          : a
      ),
    }));
  },

  refreshLlmDiscovery: async () => {
    const bridge = getKalinarBridge();
    if (!bridge || typeof bridge.discoverLlmProviders !== 'function') {
      set({ isDiscoveringLlms: false });
      return;
    }
    set({ isDiscoveringLlms: true });
    try {
      const report = await bridge.discoverLlmProviders();
      const providers = Array.isArray(report?.providers) ? report.providers : [];
      const discoveredModels = Array.isArray(report?.discoveredModels)
        ? report.discoveredModels
        : [];
      const activeLocalModels = Array.isArray(report?.activeLocalModels)
        ? report.activeLocalModels
        : [];
      set({
        discoveredProviders: providers,
        discoveredModels,
        activeLocalModels,
        hasAnyConfiguredEngine: computeHasAnyConfiguredEngine(providers),
        isDiscoveringLlms: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'DISCOVERY_FAILED';
      set((state) => ({
        isDiscoveringLlms: false,
        commandLogs: [
          {
            id: `llm-disc-err-${Date.now()}`,
            taskId: 'SYSTEM',
            eventType: 'LLM_DISCOVERY_ERROR',
            agentName: 'system',
            payload: JSON.stringify({ error: msg }),
            latencyMs: 0,
            timestamp: new Date().toISOString(),
          },
          ...state.commandLogs,
        ].slice(0, 100),
      }));
    }
  },

  saveProviderCredential: async (input) => {
    const bridge = getKalinarBridge();
    if (!bridge || typeof bridge.saveLlmProviderKey !== 'function') {
      return {
        success: false,
        providerId: String(input.providerId),
        error: '[IPC_UNAVAILABLE] Bridge Kalinar indisponivel.',
      };
    }
    try {
      const res: VaultOperationResult = await bridge.saveLlmProviderKey(input);
      if (Array.isArray(res?.providers)) {
        set({
          discoveredProviders: res.providers,
          hasAnyConfiguredEngine: computeHasAnyConfiguredEngine(res.providers),
        });
      }
      if (res?.success) {
        await get().refreshLlmDiscovery();
      }
      return res;
    } catch (err: unknown) {
      return {
        success: false,
        providerId: String(input.providerId),
        error: err instanceof Error ? err.message : '[VAULT_ERROR] Falha ao salvar chave.',
      };
    }
  },

  removeProviderCredential: async (providerId) => {
    const bridge = getKalinarBridge();
    if (!bridge || typeof bridge.removeLlmProviderKey !== 'function') {
      return {
        success: false,
        providerId: String(providerId),
        error: '[IPC_UNAVAILABLE] Bridge Kalinar indisponivel.',
      };
    }
    try {
      const res: VaultOperationResult = await bridge.removeLlmProviderKey(providerId);
      if (Array.isArray(res?.providers)) {
        set({
          discoveredProviders: res.providers,
          hasAnyConfiguredEngine: computeHasAnyConfiguredEngine(res.providers),
        });
      }
      if (res?.success) {
        await get().refreshLlmDiscovery();
      }
      return res;
    } catch (err: unknown) {
      return {
        success: false,
        providerId: String(providerId),
        error: err instanceof Error ? err.message : '[VAULT_ERROR] Falha ao remover chave.',
      };
    }
  },

  dispatchMiniCliInput: async (rawInput) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    const bridge = getKalinarBridge();
    const entryId = `cli-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    if (trimmed.startsWith('@agent-')) {
      const match = trimmed.match(/^(@agent-[a-z0-9-]+)\s*(.*)$/i);
      const targetAgentId = match ? match[1] : '@agent-orchestrator';
      const instruction = (match && match[2] ? match[2].trim() : '') || 'status';

      let output = `[FIFO_QUEUED] -> ${targetAgentId}: ${instruction}`;
      if (bridge && typeof bridge.enqueueAgentFifo === 'function') {
        try {
          const res = await bridge.enqueueAgentFifo({ targetAgentId, instruction });
          if (res?.error) {
            output = `[FIFO_ERROR] ${String(res.error)}`;
          }
        } catch (err: unknown) {
          output = `[FIFO_ERROR] ${err instanceof Error ? err.message : 'IPC failure'}`;
        }
      }

      set((state) => ({
        cliHistory: [
          {
            id: entryId,
            timestamp: Date.now(),
            route: 'AGENT_FIFO' as const,
            input: trimmed,
            output,
            exitCode: 0,
            blockedByFirewall: false,
          },
          ...state.cliHistory,
        ].slice(0, 100),
      }));
      return;
    }

    if (!bridge || typeof bridge.executeShellCommand !== 'function') {
      set((state) => ({
        activeCliPid: null,
        cliHistory: [
          {
            id: entryId,
            timestamp: Date.now(),
            route: 'SHELL_IPC' as const,
            input: trimmed,
            output: '[IPC_UNAVAILABLE] executeShellCommand indisponivel.',
            exitCode: 1,
            blockedByFirewall: false,
          },
          ...state.cliHistory,
        ].slice(0, 100),
      }));
      return;
    }

    try {
      const res = await bridge.executeShellCommand(trimmed, undefined, 'UI_CLI');
      const blocked = res?.allowed === false;
      const outputText = blocked
        ? `[FIREWALL BLOCKED] ${res?.stderr || 'Comando bloqueado por os-execution-firewall.jdm.json'}`
        : (res?.stdout || res?.stderr || '[OK]').trim();

      set((state) => ({
        activeCliPid: null,
        cliHistory: [
          {
            id: entryId,
            timestamp: Date.now(),
            route: 'SHELL_IPC' as const,
            input: trimmed,
            output: outputText,
            exitCode: typeof res?.exitCode === 'number' ? res.exitCode : blocked ? 126 : 0,
            blockedByFirewall: blocked,
          },
          ...state.cliHistory,
        ].slice(0, 100),
      }));
    } catch (err: unknown) {
      set((state) => ({
        activeCliPid: null,
        cliHistory: [
          {
            id: entryId,
            timestamp: Date.now(),
            route: 'SHELL_IPC' as const,
            input: trimmed,
            output: `[SHELL_ERROR] ${err instanceof Error ? err.message : 'Execution failed'}`,
            exitCode: 1,
            blockedByFirewall: false,
          },
          ...state.cliHistory,
        ].slice(0, 100),
      }));
    }
  },

  killActiveCliProcess: async () => {
    const pid = get().activeCliPid;
    if (pid === null) return;
    const bridge = getKalinarBridge();
    try {
      if (bridge && typeof bridge.controlProcessPid === 'function') {
        await bridge.controlProcessPid({ pid, action: 'KILL' });
      } else if (bridge && typeof bridge.killProcess === 'function') {
        await bridge.killProcess(pid);
      }
    } catch (err: unknown) {
      set((state) => ({
        cliHistory: [
          {
            id: `cli-kill-err-${Date.now()}`,
            timestamp: Date.now(),
            route: 'SHELL_IPC' as const,
            input: `[KILL PID ${pid}]`,
            output: `[KILL_ERROR] ${err instanceof Error ? err.message : 'Failed'}`,
            exitCode: 1,
          },
          ...state.cliHistory,
        ].slice(0, 100),
      }));
    } finally {
      set({ activeCliPid: null });
    }
  },

  setFilter: (activeFilter) => set({ activeFilter }),
  toggleBottomDock: () => set((state) => ({ isBottomDockExpanded: !state.isBottomDockExpanded })),
  setBottomDockExpanded: (isBottomDockExpanded) => set({ isBottomDockExpanded }),
  toggleInspectorDrawer: () =>
    set((state) => ({ isInspectorDrawerOpen: !state.isInspectorDrawerOpen })),
  setInspectorDrawerOpen: (isInspectorDrawerOpen) => set({ isInspectorDrawerOpen }),
  toggleCommandPalette: () =>
    set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  setCommandPaletteOpen: (isCommandPaletteOpen) => set({ isCommandPaletteOpen }),
  setInspectedFilePath: (inspectedFilePath) => set({ inspectedFilePath }),
  selectAgent: (selectedAgentId) => set({ selectedAgentId }),
  updateSingularityTranscript: (liveTranscript) =>
    set((state) => ({ singularity: { ...state.singularity, liveTranscript } })),
  setVoiceState: (voiceState) =>
    set((state) => ({ singularity: { ...state.singularity, voiceState } })),
  setSingularityAckBadge: (lastAckBadge) =>
    set((state) => ({ singularity: { ...state.singularity, lastAckBadge } })),
  setActiveModelId: (activeModelId) =>
    set((state) => ({ singularity: { ...state.singularity, activeModelId } })),
  setPendingVoiceQueueCount: (pendingVoiceQueueCount) =>
    set((state) => ({ singularity: { ...state.singularity, pendingVoiceQueueCount } })),

  setAgents: (agents) =>
    set((state) => ({
      agents,
      synapticBeams: buildActiveSynapticBeams(agents),
      selectedAgentId:
        state.selectedAgentId && agents.some((a) => a.id === state.selectedAgentId)
          ? state.selectedAgentId
          : agents[0]?.id ?? null,
      ...deriveGroundTruthMetrics(agents, state.singularity),
    })),

  setSecondBrainNotes: (secondBrainNotes, cortexNoteCount) =>
    set((state) => ({
      secondBrainNotes,
      cortexNoteCount:
        typeof cortexNoteCount === 'number'
          ? cortexNoteCount
          : Math.max(state.cortexNoteCount, secondBrainNotes.length),
    })),

  setSynapticBeams: (synapticBeams) => set({ synapticBeams }),
  setCommandLogs: (commandLogs) => set({ commandLogs }),
  appendCommandLog: (entry) =>
    set((state) => ({
      commandLogs: [entry, ...state.commandLogs].slice(0, 100),
    })),

  updateAgentMetrics: (agentId, tokensPrompt, tokensCompletion, tokenVelocity, etaSeconds) =>
    set((state) => {
      const nextAgents = state.agents.map((a) =>
        matchesAgentId(a, agentId)
          ? {
              ...a,
              tokensPrompt,
              tokensCompletion,
              tokenVelocity: tokenVelocity ?? a.tokenVelocity,
              etaSeconds: etaSeconds ?? a.etaSeconds,
            }
          : a
      );
      return {
        agents: nextAgents,
        ...deriveGroundTruthMetrics(nextAgents, state.singularity),
      };
    }),

  applyDaemonEvent: (payload) => {
    if (!payload || typeof payload !== 'object') return;
    const evtType = String(payload.type || payload.event_type || 'DAEMON_EVENT');
    const targetAgentId = String(payload.targetAgentId || payload.agentId || payload.agent_name || '');

    set((state) => {
      let nextAgents = state.agents;

      if (targetAgentId) {
        nextAgents = state.agents.map((a) => {
          if (!matchesAgentId(a, targetAgentId)) return a;
          const nextStatus =
            (payload.agentStatus as AgentStatus | undefined) ||
            (payload.current as AgentStatus | undefined) ||
            (evtType === 'STEP_COMPLETED'
              ? '[VERIFIED]'
              : evtType === 'AGENT_HALTED' || evtType === 'HARD_BLOCK'
              ? '[HALTED]'
              : a.status);
          const nextStep =
            typeof payload.step === 'number' ? payload.step : a.currentStep;
          const nextPreview =
            typeof payload.preview === 'string'
              ? payload.preview
              : typeof payload.summaryText === 'string'
              ? payload.summaryText
              : a.livePreviewStream;
          const nextPrompt =
            typeof payload.tokensPrompt === 'number' ? payload.tokensPrompt : a.tokensPrompt;
          const nextCompletion =
            typeof payload.tokensCompletion === 'number'
              ? payload.tokensCompletion
              : a.tokensCompletion;
          const nextEta =
            typeof payload.eta === 'number'
              ? payload.eta
              : typeof payload.etaSeconds === 'number'
              ? payload.etaSeconds
              : a.etaSeconds;

          return {
            ...a,
            status: nextStatus,
            currentStep: nextStep,
            livePreviewStream: nextPreview,
            tokensPrompt: nextPrompt,
            tokensCompletion: nextCompletion,
            etaSeconds: nextEta,
            pid: typeof payload.pid === 'number' ? payload.pid : a.pid,
          };
        });
      }

      const logEntry: CommandLogEntry = {
        id: `evt-${Date.now()}-${state.commandLogs.length + 1}`,
        taskId: String(payload.taskId || payload.task_id || 'DAEMON'),
        eventType: evtType,
        agentName: targetAgentId || 'kalinar-daemon',
        payload: JSON.stringify(payload),
        latencyMs:
          typeof payload.zenLatencyMs === 'number'
            ? payload.zenLatencyMs
            : typeof payload.latencyMs === 'number'
            ? payload.latencyMs
            : 0,
        timestamp: new Date().toISOString(),
      };

      const nextSingularity: SingularityCoreState =
        typeof payload.zenLatencyMs === 'number'
          ? { ...state.singularity, zenLatencyMs: payload.zenLatencyMs }
          : state.singularity;

      return {
        agents: nextAgents,
        synapticBeams: buildActiveSynapticBeams(nextAgents),
        commandLogs: [logEntry, ...state.commandLogs].slice(0, 100),
        ...deriveGroundTruthMetrics(nextAgents, nextSingularity),
      };
    });
  },

  hydrateFromGroundTruth: async (apiOverride) => {
    const api: KalinarGroundTruthApi | null =
      apiOverride ?? (getKalinarBridge() as KalinarGroundTruthApi | null);
    if (!api) {
      set({ isHydrated: true });
      return;
    }

    const [scanRes, vaultRes, telemetryRes, fifoRes, llmRes] = await Promise.allSettled([
      api.scanWorkspaceNodes ? api.scanWorkspaceNodes() : Promise.resolve(null),
      api.querySecondBrainVault ? api.querySecondBrainVault({ maxResults: 50 }) : Promise.resolve(null),
      api.getHistoricalTelemetry ? api.getHistoricalTelemetry(50) : Promise.resolve([]),
      api.manageFifoQueue ? api.manageFifoQueue({ action: 'LIST' }) : Promise.resolve(null),
      api.discoverLlmProviders ? api.discoverLlmProviders() : Promise.resolve(null),
    ]);

    set((state) => {
      const nextAgents: AgentNode[] =
        scanRes.status === 'fulfilled' && scanRes.value && Array.isArray(scanRes.value.agents)
          ? scanRes.value.agents
          : state.agents;

      const vaultData = vaultRes.status === 'fulfilled' ? vaultRes.value : null;
      const nextNotes: SecondBrainVaultNote[] =
        vaultData && Array.isArray(vaultData.notes) ? vaultData.notes : state.secondBrainNotes;
      const nextCortexCount: number = vaultData
        ? typeof vaultData.cortexCacheCount === 'number'
          ? vaultData.cortexCacheCount
          : typeof vaultData.total === 'number'
          ? vaultData.total
          : nextNotes.length
        : state.cortexNoteCount;

      const rawTelemetry =
        telemetryRes.status === 'fulfilled' && Array.isArray(telemetryRes.value)
          ? telemetryRes.value
          : [];
      const nextLogs: CommandLogEntry[] = rawTelemetry.map((row, idx) => ({
        id: row.id ?? idx + 1,
        taskId: String(row.task_id || row.taskId || 'SYSTEM'),
        eventType: String(row.event_type || row.eventType || 'TELEMETRY'),
        agentName: String(row.agent_name || row.agentName || 'system'),
        payload: String(row.payload || '{}'),
        latencyMs: Number(row.latency_ms ?? row.latencyMs ?? 0),
        timestamp: String(row.timestamp || new Date().toISOString()),
      }));

      const nextFifo: FifoQueueItem[] =
        fifoRes.status === 'fulfilled' && fifoRes.value && Array.isArray(fifoRes.value.items)
          ? fifoRes.value.items
          : state.fifoQueueItems;

      const latestLatency = nextLogs.length > 0 ? nextLogs[0].latencyMs : 0;
      const baseSingularity: SingularityCoreState = {
        ...state.singularity,
        zenLatencyMs: latestLatency,
      };

      const llmReport = llmRes.status === 'fulfilled' ? llmRes.value : null;
      const nextProviders =
        llmReport && Array.isArray(llmReport.providers)
          ? llmReport.providers
          : state.discoveredProviders;
      const nextDiscoveredModels =
        llmReport && Array.isArray(llmReport.discoveredModels)
          ? llmReport.discoveredModels
          : state.discoveredModels;
      const nextActiveLocalModels =
        llmReport && Array.isArray(llmReport.activeLocalModels)
          ? llmReport.activeLocalModels
          : state.activeLocalModels;

      return {
        isHydrated: true,
        agents: nextAgents,
        secondBrainNotes: nextNotes,
        cortexNoteCount: nextCortexCount,
        synapticBeams: buildActiveSynapticBeams(nextAgents),
        commandLogs: nextLogs,
        fifoQueueItems: nextFifo,
        discoveredProviders: nextProviders,
        discoveredModels: nextDiscoveredModels,
        activeLocalModels: nextActiveLocalModels,
        hasAnyConfiguredEngine: computeHasAnyConfiguredEngine(nextProviders),
        selectedAgentId:
          state.selectedAgentId && nextAgents.some((a) => a.id === state.selectedAgentId)
            ? state.selectedAgentId
            : nextAgents[0]?.id ?? null,
        ...deriveGroundTruthMetrics(nextAgents, baseSingularity),
      };
    });
  },

  resetToStandby: () =>
    set({
      ...createInitialStandbySnapshot(),
      activeFilter: 'ALL',
      isBottomDockExpanded: false,
      isInspectorDrawerOpen: false,
      isCommandPaletteOpen: false,
      selectedNoteId: null,
      activeSidebarTab: 'AGENTS',
      isLeftSidebarCollapsed: false,
      isRightInspectorCollapsed: false,
      isOnboardingDismissed: false,
      activeCliPid: null,
      cliHistory: [],
      discoveredProviders: [],
      discoveredModels: [],
      activeLocalModels: [],
      isDiscoveringLlms: false,
      hasAnyConfiguredEngine: false,
      activeNoteReader: null,
      activeDiffInspector: null,
      modelHotSwapTargetAgentId: null,
    }),

  setAgentModel: (agentId, activeModelId, lastAckBadge) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        matchesAgentId(a, agentId)
          ? { ...a, activeModelId, lastAckBadge: lastAckBadge || '[MODEL_HOTSWAP]' }
          : a
      ),
    })),

  updateAgentModel: (agentId, activeModelId, lastAckBadge) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        matchesAgentId(a, agentId)
          ? { ...a, activeModelId, lastAckBadge: lastAckBadge || '[MODEL_HOTSWAP]' }
          : a
      ),
    })),

  updateAgentStatus: (agentId, status) =>
    set((state) => {
      const nextAgents = state.agents.map((a) =>
        matchesAgentId(a, agentId) ? { ...a, status } : a
      );
      return {
        agents: nextAgents,
        synapticBeams: buildActiveSynapticBeams(nextAgents),
        ...deriveGroundTruthMetrics(nextAgents, state.singularity),
      };
    }),

  setAgentFifoCount: (agentId, fifoQueueCount) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        matchesAgentId(a, agentId) ? { ...a, fifoQueueCount, fifoQueueDepth: fifoQueueCount } : a
      ),
    })),

  setFifoQueueItems: (fifoQueueItems) => set({ fifoQueueItems }),

  enqueueFifoItemInStore: (item) =>
    set((state) => ({
      fifoQueueItems: [...state.fifoQueueItems, item],
      agents: state.agents.map((a) =>
        matchesAgentId(a, item.targetAgentId)
          ? {
              ...a,
              fifoQueueCount: (a.fifoQueueCount ?? 0) + 1,
              fifoQueueDepth: (a.fifoQueueDepth ?? a.fifoQueueCount ?? 0) + 1,
              lastAckBadge: '[FIFO_QUEUED]',
            }
          : a
      ),
    })),

  promoteFifoItemInStore: (itemId) =>
    set((state) => {
      const target = state.fifoQueueItems.find((i) => i.id === itemId);
      if (!target) return state;
      const others = state.fifoQueueItems.filter((i) => i.id !== itemId);
      const promoted: FifoQueueItem = { ...target, status: 'DISPATCHED', createdAt: 0 };
      return { fifoQueueItems: [promoted, ...others] };
    }),

  clearFifoQueueInStore: (agentId) =>
    set((state) => {
      const remaining = agentId
        ? state.fifoQueueItems.filter(
            (i) => i.targetAgentId !== agentId && !agentId.includes(i.targetAgentId)
          )
        : [];
      return {
        fifoQueueItems: remaining,
        agents: state.agents.map((a) =>
          !agentId || matchesAgentId(a, agentId)
            ? { ...a, fifoQueueCount: 0, fifoQueueDepth: 0 }
            : a
        ),
      };
    }),

  updateAgentStep: (agentId, step, preview) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        matchesAgentId(a, agentId)
          ? { ...a, currentStep: step, livePreviewStream: preview }
          : a
      ),
    })),

  addAgent: (agent) =>
    set((state) => {
      const nextAgents = [...state.agents, agent];
      return {
        agents: nextAgents,
        synapticBeams: buildActiveSynapticBeams(nextAgents),
        ...deriveGroundTruthMetrics(nextAgents, state.singularity),
      };
    }),
}));
