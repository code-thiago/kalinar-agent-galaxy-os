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
  singularity: {
    schemaVersion: SCHEMA_VERSION,
    voiceState: '[STANDBY]',
    liveTranscript: 'Aguardando comando tático. Núcleo gravitacional Kalinar em operação nominal.',
    accretionTurbulence: 0.12,
    activeDirective: 'MANTER_ORBITA_E_MONITORAR_WORKSPACE',
    zenLatencyMs: 0.38,
    activeAgentCount: 7,
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
    {
      id: 'agent-design-01',
      filename: '@agent-design',
      pid: 14203,
      status: '[ACTIVE]',
      executionMode: 'AUTO_PILOT',
      currentObjective: 'Design System Anti-Slop WCAG AAA e 50k galaxy shaders',
      totalSteps: 6,
      currentStep: 3,
      stepDescription: 'Renderizando shader circular radial-gradient para estrelas instanciadas',
      tokensPrompt: 3840,
      tokensCompletion: 920,
      tokenVelocity: 88,
      etaSeconds: 12,
      position3D: [-120, 60, 90],
      livePreviewStream: [
        '@@ -1,4 +1,5 @@ src/styles/design-tokens.css',
        '+ --ds-accent-singularity: #aa88ff;',
        '+ --ds-arc-cyan: #00f0ff;',
      ].join('\n'),
      activeModelId: 'claude-3.7-sonnet',
      fifoQueueCount: 0,
      lastAckBadge: '[ACK_VERIFIED]',
    },
    {
      id: 'agent-content-01',
      filename: '@agent-content',
      pid: 14204,
      status: '[IDLE]',
      executionMode: 'AUTO_PILOT',
      currentObjective: 'Sovereign Tauz voice persona e sintese pt-BR',
      totalSteps: 5,
      currentStep: 2,
      stepDescription: 'Modulando respostas de voz taticas soberanas sem emoticons',
      tokensPrompt: 2900,
      tokensCompletion: 650,
      tokenVelocity: 74,
      etaSeconds: 18,
      position3D: [140, 50, -80],
      livePreviewStream: [
        '@@ -10,3 +10,4 @@ .antigravity/blueprint/03_APP_FLOW.md',
        '+ # Sovereign Tauz persona active in pt-BR',
      ].join('\n'),
      activeModelId: 'gemini-flash',
      fifoQueueCount: 0,
      lastAckBadge: '[ACK_VERIFIED]',
    },
    {
      id: 'agent-data-01',
      filename: '@agent-data',
      pid: 14205,
      status: '[IDLE]',
      executionMode: 'STEP_BY_STEP_GATE',
      currentObjective: 'Avaliacao deterministica de regras GoRules ZEN JDM',
      totalSteps: 7,
      currentStep: 3,
      stepDescription: 'Executando grafos JDM com latencia < 0.45ms no SQLite WAL',
      tokensPrompt: 5120,
      tokensCompletion: 1100,
      tokenVelocity: 86,
      etaSeconds: 15,
      position3D: [-100, 70, -110],
      livePreviewStream: [
        '@@ -22,2 +22,3 @@ src/rules/daemon-event-router.jdm.json',
        '+ "riskLevel": "LOW",',
        '+ "allowed": true',
      ].join('\n'),
      activeModelId: 'gemini-2.5-pro',
      fifoQueueCount: 0,
      lastAckBadge: '[ACK_VERIFIED]',
    },
    {
      id: 'agent-cybersecurity-01',
      filename: '@agent-cybersecurity',
      pid: 14206,
      status: '[IDLE]',
      executionMode: 'STEP_BY_STEP_GATE',
      currentObjective: 'Auditoria DevSecOps e firewall de execucao PID',
      totalSteps: 6,
      currentStep: 2,
      stepDescription: 'Validando isolamento de PID > 100 e prevencao de path traversal',
      tokensPrompt: 4400,
      tokensCompletion: 890,
      tokenVelocity: 79,
      etaSeconds: 20,
      position3D: [90, 90, 110],
      livePreviewStream: [
        '@@ -8,3 +8,4 @@ src/core/ZenFirewall.ts',
        '+ if (pid <= 100) return { safe: false };',
      ].join('\n'),
      activeModelId: 'argon',
      fifoQueueCount: 0,
      lastAckBadge: '[ACK_VERIFIED]',
    },
    {
      id: 'agent-qa-01',
      filename: '@agent-qa',
      pid: 14207,
      status: '[IDLE]',
      executionMode: 'STEP_BY_STEP_GATE',
      currentObjective: 'Garantia deterministica de testes e suites vitest',
      totalSteps: 6,
      currentStep: 4,
      stepDescription: 'Verificando determinismo e culling do Spatial Octree LOD',
      tokensPrompt: 6300,
      tokensCompletion: 1350,
      tokenVelocity: 92,
      etaSeconds: 10,
      position3D: [-60, 100, 120],
      livePreviewStream: [
        '@@ -30,3 +30,4 @@ tests/task-10-canvas-sync-live-cortex.test.ts',
        '+ expect(octree.evaluateLOD(camera).executionTimeMs).toBeLessThan(4.0);',
      ].join('\n'),
      activeModelId: 'claude-sonnet',
      fifoQueueCount: 0,
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
  isCommandPaletteOpen: false,
  selectedAgentId: 'agent-orchestrator-01',
  inspectedFilePath: 'src/services/kalinarVoiceService.ts',

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
  enqueueFifoItemInStore: (item) =>
    set((state) => ({
      fifoQueueItems: [...state.fifoQueueItems, item],
      agents: state.agents.map((a) =>
        a.id === item.targetAgentId ||
        a.filename === item.targetAgentId ||
        a.filename.replace(/^@/, '') === item.targetAgentId.replace(/^@/, '')
          ? {
              ...a,
              fifoQueueCount: (a.fifoQueueCount ?? 0) + 1,
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
