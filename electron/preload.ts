/**
 * KALINAR SECURE ELECTRON PRELOAD BRIDGE (v0.1.0-alpha)
 * Strict Whitelist Bridge - contextIsolation: true, nodeIntegration: false
 * Strictly Zero Emojis
 */

import { contextBridge, ipcRenderer } from 'electron';
import {
  AgentNode,
  ApproveOrRevertDiffResult,
  CanvasSyncRequest,
  CanvasSyncResult,
  ExecutionMode,
  LiveGitDiffResult,
  LlmModelId,
  SecondBrainInjectPayload,
  SecondBrainInjectResult,
  SecondBrainQueryResult,
  SecondBrainVaultQueryParams,
  SingularityCoreState,
  WorkspaceScanResult,
} from '../src/types/kalinar.js';

export const ELECTRON_IPC_CHANNELS = [
  'kalinar:get_singularity_state',
  'kalinar:get_active_agents',
  'kalinar:invoke_task_action',
  'kalinar:get_historical_telemetry',
  'kalinar:get_evolution_summary',
  'kalinar:execute_shell_command',
  'kalinar:enqueue_agent_fifo',
  'kalinar:manage_fifo_queue',
  'kalinar:switch_llm_model',
  'kalinar:evaluate_zen_rule',
  'kalinar:get_live_git_diff',
  'kalinar:approve_or_revert_diff',
  'kalinar:scan_workspace_nodes',
  'kalinar:sync_obsidian_canvas',
  'kalinar:query_second_brain_vault',
  'kalinar:inject_second_brain_note',
] as const;

export interface ShellResult {
  allowed: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface KalinarApiBridge {
  getSingularityState: () => Promise<SingularityCoreState>;
  getActiveAgents: () => Promise<AgentNode[]>;
  invokeTaskAction: (taskId: string, action: string) => Promise<{ success: boolean; message: string }>;
  getHistoricalTelemetry: (limit?: number) => Promise<any[]>;
  getEvolutionSummary: () => Promise<any>;
  executeShellCommand: (cmd: string, cwd?: string) => Promise<ShellResult>;
  enqueueAgentFifo: (payload: {
    targetAgentId: string;
    instruction: string;
    modelId?: LlmModelId;
  }) => Promise<any>;
  manageFifoQueue: (payload: {
    action: 'LIST' | 'PROMOTE' | 'CLEAR';
    targetAgentId?: string;
    itemId?: string;
  }) => Promise<any>;
  switchLlmModel: (payload: {
    agentId: string;
    targetModel?: LlmModelId;
    taskId?: string;
    taskDomain?: string;
    checkpointId?: string;
    errorCode?: 429 | 'TIMEOUT' | 'HTTP_429' | 'NONE';
  }) => Promise<any>;
  getLiveGitDiff: (payload: { filePath: string; stagedBuffer?: string }) => Promise<LiveGitDiffResult>;
  approveOrRevertDiff: (payload: {
    filePath: string;
    action: 'APPROVE' | 'REVERT';
    executionMode?: ExecutionMode;
    stagedContent?: string;
    cleanSnapshotContent?: string;
    agentId?: string;
  }) => Promise<ApproveOrRevertDiffResult>;
  scanWorkspaceNodes: () => Promise<WorkspaceScanResult>;
  evaluateZenRule: (graph: string, input: any) => Promise<any>;
  syncObsidianCanvas: (payload?: CanvasSyncRequest) => Promise<CanvasSyncResult>;
  querySecondBrainVault: (params?: SecondBrainVaultQueryParams) => Promise<SecondBrainQueryResult>;
  injectSecondBrainNote: (payload: SecondBrainInjectPayload) => Promise<SecondBrainInjectResult>;
  onTelemetryStream: (callback: (data: any) => void) => () => void;
  onVoiceStateChange: (callback: (state: any) => void) => () => void;
  onAgentUpdate: (callback: (agent: AgentNode) => void) => () => void;
}

const api: KalinarApiBridge = {
  getSingularityState: () => ipcRenderer.invoke('kalinar:get_singularity_state'),
  getActiveAgents: () => ipcRenderer.invoke('kalinar:get_active_agents'),
  invokeTaskAction: (taskId: string, action: string) =>
    ipcRenderer.invoke('kalinar:invoke_task_action', { taskId, action }),
  getHistoricalTelemetry: (limit?: number) =>
    ipcRenderer.invoke('kalinar:get_historical_telemetry', limit),
  getEvolutionSummary: () =>
    ipcRenderer.invoke('kalinar:get_evolution_summary'),
  executeShellCommand: (cmd: string, cwd?: string) =>
    ipcRenderer.invoke('kalinar:execute_shell_command', { cmd, cwd }),
  enqueueAgentFifo: (payload) =>
    ipcRenderer.invoke('kalinar:enqueue_agent_fifo', payload),
  manageFifoQueue: (payload) =>
    ipcRenderer.invoke('kalinar:manage_fifo_queue', payload),
  switchLlmModel: (payload) =>
    ipcRenderer.invoke('kalinar:switch_llm_model', payload),
  getLiveGitDiff: (payload) =>
    ipcRenderer.invoke('kalinar:get_live_git_diff', payload),
  approveOrRevertDiff: (payload) =>
    ipcRenderer.invoke('kalinar:approve_or_revert_diff', payload),
  scanWorkspaceNodes: () =>
    ipcRenderer.invoke('kalinar:scan_workspace_nodes'),
  evaluateZenRule: (graph, input) =>
    ipcRenderer.invoke('kalinar:evaluate_zen_rule', { graph, input }),
  syncObsidianCanvas: (payload) =>
    ipcRenderer.invoke('kalinar:sync_obsidian_canvas', payload),
  querySecondBrainVault: (params) =>
    ipcRenderer.invoke('kalinar:query_second_brain_vault', params),
  injectSecondBrainNote: (payload) =>
    ipcRenderer.invoke('kalinar:inject_second_brain_note', payload),
  onTelemetryStream: (callback: (data: any) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on('telemetry:stream', handler);
    return () => {
      ipcRenderer.removeListener('telemetry:stream', handler);
    };
  },
  onVoiceStateChange: (callback: (state: any) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on('voice:state_change', handler);
    return () => {
      ipcRenderer.removeListener('voice:state_change', handler);
    };
  },
  onAgentUpdate: (callback: (agent: AgentNode) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on('agent:update', handler);
    return () => {
      ipcRenderer.removeListener('agent:update', handler);
    };
  },
};

if (contextBridge && typeof contextBridge.exposeInMainWorld === 'function') {
  contextBridge.exposeInMainWorld('kalinarApi', api);
}
