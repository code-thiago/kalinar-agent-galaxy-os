/**
 * KALINAR ZUSTAND REACTIVE STORE (v2.2.0-step2)
 * Ground-Truth Standby & Real IPC/SQLite Hydration
 * Strict Zero Emojis
 */

import { create } from 'zustand';
import {
  AgentNode,
  AgentStatus,
  FifoQueueItem,
  LlmModelId,
  SCHEMA_VERSION,
  SecondBrainQueryResult,
  SecondBrainVaultNote,
  SecondBrainVaultQueryParams,
  SingularityCoreState,
  SynapticBeam,
  VoiceState,
  WorkspaceScanResult,
} from '../types/kalinar.js';

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

interface KalinarStoreState {
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
  inspectedFilePath: string;

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
}

export const useKalinarStore = create<KalinarStoreState>((set) => ({
  ...createInitialStandbySnapshot(),
  activeFilter: 'ALL',
  isBottomDockExpanded: false,
  isInspectorDrawerOpen: false,
  isCommandPaletteOpen: false,

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
      apiOverride ??
      (typeof window !== 'undefined' ? ((window as any).kalinarApi as KalinarGroundTruthApi) : null);
    if (!api) {
      set({ isHydrated: true });
      return;
    }

    const [scanRes, vaultRes, telemetryRes, fifoRes] = await Promise.allSettled([
      api.scanWorkspaceNodes ? api.scanWorkspaceNodes() : Promise.resolve(null),
      api.querySecondBrainVault ? api.querySecondBrainVault({ maxResults: 50 }) : Promise.resolve(null),
      api.getHistoricalTelemetry ? api.getHistoricalTelemetry(50) : Promise.resolve([]),
      api.manageFifoQueue ? api.manageFifoQueue({ action: 'LIST' }) : Promise.resolve(null),
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

      return {
        isHydrated: true,
        agents: nextAgents,
        secondBrainNotes: nextNotes,
        cortexNoteCount: nextCortexCount,
        synapticBeams: buildActiveSynapticBeams(nextAgents),
        commandLogs: nextLogs,
        fifoQueueItems: nextFifo,
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
