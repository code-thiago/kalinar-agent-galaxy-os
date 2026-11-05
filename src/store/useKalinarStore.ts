/**
 * KALINAR ZUSTAND REACTIVE STORE (v1.2.0)
 * Strict Zero Emojis
 */

import { create } from 'zustand';
import {
  AgentNode,
  AgentStatus,
  FifoQueueItem,
  LlmModelId,
  SingularityCoreState,
  VoiceState,
  SCHEMA_VERSION,
} from '../types/kalinar.js';

interface KalinarStoreState {
  singularity: SingularityCoreState;
  agents: AgentNode[];
  fifoQueueItems: FifoQueueItem[];
  activeFilter: string;
  isBottomDockExpanded: boolean;
  isInspectorDrawerOpen: boolean;
  selectedAgentId: string | null;
  inspectedFilePath: string;

  setFilter: (filter: string) => void;
  toggleBottomDock: () => void;
  setBottomDockExpanded: (expanded: boolean) => void;
  toggleInspectorDrawer: () => void;
  setInspectorDrawerOpen: (open: boolean) => void;
  setInspectedFilePath: (filePath: string) => void;
  selectAgent: (id: string | null) => void;
  updateSingularityTranscript: (transcript: string) => void;
  setVoiceState: (voiceState: VoiceState) => void;
  setSingularityAckBadge: (
    badge: '[ACK_DISPATCHED]' | '[ACK_VERIFIED]' | '[FIFO_QUEUED]' | '[MODEL_HOTSWAP]'
  ) => void;
  setActiveModelId: (modelId: LlmModelId) => void;
  setPendingVoiceQueueCount: (count: number) => void;
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
  promoteFifoItemInStore: (itemId: string) => void;
  clearFifoQueueInStore: (agentId?: string) => void;
  updateAgentStep: (agentId: string, step: number, preview: string) => void;
  addAgent: (agent: AgentNode) => void;
}

export const useKalinarStore = create<KalinarStoreState>((set) => ({
  singularity: {
    schemaVersion: SCHEMA_VERSION,
    voiceState: '[STANDBY]',
    liveTranscript: 'Aguardando comando tático. Núcleo gravitacional Kalinar em operação nominal.',
    accretionTurbulence: 0.12,
    activeDirective: 'MANTER_ORBITA_E_MONITORAR_WORKSPACE',
    zenLatencyMs: 0.38,
    activeAgentCount: 2,
    activeModelId: 'argon',
    lastAckBadge: '[ACK_VERIFIED]',
    pendingVoiceQueueCount: 0,
  },
  agents: [
    {
      id: 'agent-orchestrator-01',
      filename: '@agent-orchestrator',
      pid: 14201,
      status: '[ACTIVE]',
      executionMode: 'AUTO_PILOT',
      currentObjective: 'Orquestracao de fila e sincronizacao de blueprint',
      totalSteps: 6,
      currentStep: 4,
      stepDescription: 'Verificando integridade de lock de fila e regras JDM',
      tokensPrompt: 4120,
      tokensCompletion: 840,
      tokenVelocity: 82,
      etaSeconds: 14,
      position3D: [0, 120, 0],
      livePreviewStream: [
        '@@ -14,3 +14,4 @@ .antigravity/comms/WAR_ROOM.md',
        '- [LOCK_STATE]: PENDING_VERIFICATION',
        '+ [LOCK_STATE]: UNLOCKED_ZERO_TRUST',
        '+ [MODEL_ROUTER]: ARGON -> CLAUDE_SONNET',
      ].join('\n'),
      activeModelId: 'argon',
      fifoQueueCount: 1,
      lastAckBadge: '[ACK_DISPATCHED]',
    },
    {
      id: 'agent-software-engineer-01',
      filename: '@agent-software-engineer',
      pid: 14202,
      status: '[RUNNING]',
      executionMode: 'STEP_BY_STEP_GATE',
      currentObjective: 'Scaffolding do daemon chokidar e firewall zen',
      totalSteps: 8,
      currentStep: 5,
      stepDescription: 'Compilando TypeScript e vinculando SQLite WAL',
      tokensPrompt: 7850,
      tokensCompletion: 1420,
      tokenVelocity: 94,
      etaSeconds: 22,
      position3D: [120, 80, 0],
      livePreviewStream: [
        '@@ -42,2 +42,4 @@ src/services/kalinarVoiceService.ts',
        '- const gain = 0.0;',
        '+ lowShelf.frequency.value = 110;',
        '+ lowShelf.gain.value = 7.5;',
      ].join('\n'),
      activeModelId: 'claude-sonnet',
      fifoQueueCount: 1,
      lastAckBadge: '[ACK_VERIFIED]',
    },
  ],
  fifoQueueItems: [
    {
      id: 'fifo-init-01',
      targetAgentId: '@agent-orchestrator',
      instruction: 'Sincronizar rastreabilidade Task 9 no WAR_ROOM.md',
      modelId: 'argon',
      status: 'FIFO_QUEUED',
      createdAt: Date.now() - 12000,
    },
    {
      id: 'fifo-init-02',
      targetAgentId: '@agent-software-engineer',
      instruction: 'Auditar pipeline DSP Tauz 110Hz e 2400Hz com Vitest',
      modelId: 'claude-sonnet',
      status: 'FIFO_QUEUED',
      createdAt: Date.now() - 6000,
    },
  ],
  activeFilter: 'ALL',
  isBottomDockExpanded: false,
  isInspectorDrawerOpen: false,
  selectedAgentId: 'agent-orchestrator-01',
  inspectedFilePath: 'src/services/kalinarVoiceService.ts',

  setFilter: (activeFilter) => set({ activeFilter }),
  toggleBottomDock: () => set((state) => ({ isBottomDockExpanded: !state.isBottomDockExpanded })),
  setBottomDockExpanded: (isBottomDockExpanded) => set({ isBottomDockExpanded }),
  toggleInspectorDrawer: () =>
    set((state) => ({ isInspectorDrawerOpen: !state.isInspectorDrawerOpen })),
  setInspectorDrawerOpen: (isInspectorDrawerOpen) => set({ isInspectorDrawerOpen }),
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
  setAgentModel: (agentId, activeModelId, lastAckBadge) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId || a.filename === agentId
          ? { ...a, activeModelId, lastAckBadge: lastAckBadge || '[MODEL_HOTSWAP]' }
          : a
      ),
    })),
  updateAgentModel: (agentId, activeModelId, lastAckBadge) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId || a.filename === agentId
          ? { ...a, activeModelId, lastAckBadge: lastAckBadge || '[MODEL_HOTSWAP]' }
          : a
      ),
    })),
  updateAgentStatus: (agentId, status) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId || a.filename === agentId ? { ...a, status } : a
      ),
    })),
  setAgentFifoCount: (agentId, fifoQueueCount) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId || a.filename === agentId ? { ...a, fifoQueueCount } : a
      ),
    })),
  setFifoQueueItems: (fifoQueueItems) => set({ fifoQueueItems }),
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
          !agentId || a.id === agentId || a.filename === agentId ? { ...a, fifoQueueCount: 0 } : a
        ),
      };
    }),
  updateAgentStep: (agentId, step, preview) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId || a.filename === agentId
          ? { ...a, currentStep: step, livePreviewStream: preview }
          : a
      ),
    })),
  addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent] })),
}));
