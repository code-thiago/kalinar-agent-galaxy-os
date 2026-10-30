/**
 * KALINAR SECURE ELECTRON PRELOAD BRIDGE (v0.1.0-alpha)
 * Strict Whitelist Bridge - contextIsolation: true, nodeIntegration: false
 * Strictly Zero Emojis
 */

import { contextBridge, ipcRenderer } from 'electron';
import { AgentNode, AgentStatus, SingularityCoreState } from '../src/types/kalinar.js';

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

contextBridge.exposeInMainWorld('kalinarApi', api);
