/**
 * KALINAR ZUSTAND REACTIVE STORE (v0.1.0-alpha)
 * Strict Zero Emojis
 */

import { create } from 'zustand';
import { AgentNode, SingularityCoreState, SCHEMA_VERSION } from '../types/kalinar.js';

interface KalinarStoreState {
  singularity: SingularityCoreState;
  agents: AgentNode[];
  activeFilter: string;
  isBottomDockExpanded: boolean;
  isInspectorDrawerOpen: boolean;
  selectedAgentId: string | null;

  setFilter: (filter: string) => void;
  toggleBottomDock: () => void;
  setBottomDockExpanded: (expanded: boolean) => void;
  toggleInspectorDrawer: () => void;
  selectAgent: (id: string | null) => void;
  updateSingularityTranscript: (transcript: string) => void;
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
      livePreviewStream: '[TASK_EXECUTION: @agent-orchestrator]\n- Verificando regras no cofre Obsidian\n- Sincronizando TASK_LOCK.json\n- Status: Operacao nominal',
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
      livePreviewStream: '[BUILD_OUTPUT: @agent-software-engineer]\n> tsc --noEmit: zero erros\n> WAL pragma: ativo\n> Watcher: 300ms debounce',
    },
  ],
  activeFilter: 'ALL',
  isBottomDockExpanded: false,
  isInspectorDrawerOpen: false,
  selectedAgentId: 'agent-orchestrator-01',

  setFilter: (activeFilter) => set({ activeFilter }),
  toggleBottomDock: () => set((state) => ({ isBottomDockExpanded: !state.isBottomDockExpanded })),
  setBottomDockExpanded: (isBottomDockExpanded) => set({ isBottomDockExpanded }),
  toggleInspectorDrawer: () => set((state) => ({ isInspectorDrawerOpen: !state.isInspectorDrawerOpen })),
  selectAgent: (selectedAgentId) => set({ selectedAgentId }),
  updateSingularityTranscript: (liveTranscript) =>
    set((state) => ({ singularity: { ...state.singularity, liveTranscript } })),
  updateAgentStep: (agentId, step, preview) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, currentStep: step, livePreviewStream: preview } : a
      ),
    })),
  addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent] })),
}));
