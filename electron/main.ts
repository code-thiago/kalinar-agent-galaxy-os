/**
 * KALINAR ELECTRON MAIN CONTROLLER (v0.1.0-alpha)
 * Strict Zero-Trust Architecture
 * Strictly Zero Emojis
 */

import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { KalinarSqliteStore } from './db/sqliteStore.js';
import { KalinarDaemon } from './daemon/KalinarDaemon.js';
import { eventBus } from '../src/core/KalinarEventBus.js';
import { ZenFirewall } from '../src/core/ZenFirewall.js';
import {
  SingularityCoreState,
  AgentNode,
  SCHEMA_VERSION,
  LlmModelId,
  ExecutionMode,
  CanvasSyncRequest,
  SecondBrainInjectPayload,
  SecondBrainVaultQueryParams,
} from '../src/types/kalinar.js';
import {
  LocalVaultAndMdConnector,
  sanitizeWorkspaceFilePath,
} from '../src/connectors/AgentConnectorRegistry.js';

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

let mainWindow: BrowserWindow | null = null;
let sqliteStore: KalinarSqliteStore | null = null;
let daemon: KalinarDaemon | null = null;

const initialSingularityState: SingularityCoreState = {
  schemaVersion: SCHEMA_VERSION,
  voiceState: '[STANDBY]',
  liveTranscript: 'Aguardando diretriz tática. O núcleo gravitacional permanece ativo.',
  accretionTurbulence: 0.15,
  activeDirective: 'MANTER_ORBITA_E_MONITORAR_WORKSPACE',
  zenLatencyMs: 0.38,
  activeAgentCount: 1,
};

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#000000',
    title: 'KALINAR OS | SINGULARITY TELEMETRY',
    frame: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Zero-Trust Navigation Guard: Block external navigation
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'http://localhost:5173' && parsedUrl.protocol !== 'file:') {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const isDev = process.env.NODE_ENV === 'development';
  const hasDist = fs.existsSync(path.join(__dirname, '../dist/index.html'));
  if (isDev || !hasDist) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIpcHandlers(): void {
  ipcMain.handle('kalinar:get_singularity_state', async () => {
    return initialSingularityState;
  });

  ipcMain.handle('kalinar:get_active_agents', async () => {
    const defaultAgents: AgentNode[] = [
      {
        id: 'agent-orchestrator-01',
        filename: '@agent-orchestrator',
        pid: 14201,
        status: '[ACTIVE]',
        executionMode: 'AUTO_PILOT',
        currentObjective: 'Orquestracao de fila e sincronizacao de blueprint',
        totalSteps: 6,
        currentStep: 4,
        stepDescription: 'Verificando invariantes de integridade do cofre Obsidian',
        tokensPrompt: 4120,
        tokensCompletion: 840,
        tokenVelocity: 82,
        etaSeconds: 14,
        position3D: [0, 120, 0],
        livePreviewStream: '[TASK_EXECUTION: @agent-orchestrator]\n- Verificando regras no cofre Obsidian\n- Sincronizando TASK_LOCK.json\n- Status: Operacao nominal',
      },
    ];
    return defaultAgents;
  });

  ipcMain.handle('kalinar:invoke_task_action', async (_event, { taskId, action }) => {
    if (sqliteStore) {
      sqliteStore.insertTelemetry({
        task_id: taskId,
        event_type: 'TURN_START',
        agent_name: 'operator',
        payload: JSON.stringify({ action }),
        latency_ms: 1,
      });
    }
    return { success: true, message: `[ACTION_ACCEPTED: ${action} ON ${taskId}]` };
  });

  ipcMain.handle('kalinar:get_historical_telemetry', async (_event, limit = 100) => {
    if (!sqliteStore) return [];
    return sqliteStore.getHistoricalTelemetry(limit);
  });

  ipcMain.handle('kalinar:get_evolution_summary', async () => {
    if (!sqliteStore) {
      return { totalEvents: 0, avgLatencyMs: 0, agentDistribution: {} };
    }
    return sqliteStore.getEvolutionSummary();
  });

  ipcMain.handle('kalinar:execute_shell_command', async (_event, { cmd, cwd }: { cmd: string; cwd?: string }) => {
    const start = performance.now();
    const firewall = ZenFirewall.getInstance();
    const verdict = await firewall.evaluateOsFirewall({ command: cmd, isSandbox: true });

    if (!verdict.result.allowed) {
      const latency = Math.round(performance.now() - start);
      sqliteStore?.insertTelemetry({
        task_id: 'CLI_GATE',
        event_type: 'HALT',
        agent_name: 'zen-firewall',
        payload: JSON.stringify({ cmd, reason: verdict.result.verdictReason, risk: verdict.result.riskLevel }),
        latency_ms: latency,
      });
      return {
        allowed: false,
        stdout: '',
        stderr: `[FIREWALL_HALT]: Command rejected by GoRules ZEN Engine: ${verdict.result.verdictReason} [RISK: ${verdict.result.riskLevel}]`,
        exitCode: 1,
      };
    }

    return new Promise((resolve) => {
      const isWin = process.platform === 'win32';
      const shellCmd = isWin ? 'powershell.exe' : '/bin/sh';
      const shellArgs = isWin ? ['-NoProfile', '-NonInteractive', '-Command', cmd] : ['-c', cmd];

      let stdout = '';
      let stderr = '';

      const proc = spawn(shellCmd, shellArgs, {
        cwd: cwd || process.cwd(),
        windowsHide: true,
      });

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        const latency = Math.round(performance.now() - start);
        sqliteStore?.insertTelemetry({
          task_id: 'CLI_EXEC',
          event_type: 'TURN_END',
          agent_name: 'operator',
          payload: JSON.stringify({ cmd, exitCode: code }),
          latency_ms: latency,
        });
        resolve({
          allowed: true,
          stdout,
          stderr,
          exitCode: code ?? 0,
        });
      });

      proc.on('error', (err) => {
        const latency = Math.round(performance.now() - start);
        sqliteStore?.insertTelemetry({
          task_id: 'CLI_EXEC',
          event_type: 'HALT',
          agent_name: 'operator',
          payload: JSON.stringify({ cmd, error: err.message }),
          latency_ms: latency,
        });
        resolve({
          allowed: true,
          stdout,
          stderr: err.message,
          exitCode: 1,
        });
      });
    });
  });

  ipcMain.handle(
    'kalinar:enqueue_agent_fifo',
    async (
      _event,
      payload: { targetAgentId: string; instruction: string; modelId?: LlmModelId }
    ) => {
      if (!daemon && sqliteStore) {
        daemon = new KalinarDaemon({}, sqliteStore, eventBus);
      }
      if (!daemon) {
        return {
          dispatchedImmediately: false,
          badge: '[FIFO_QUEUED]' as const,
          queueItem: null,
        };
      }
      return daemon.dispatchOrEnqueueAgentDirective(payload);
    }
  );

  ipcMain.handle(
    'kalinar:switch_llm_model',
    async (
      _event,
      payload: {
        agentId: string;
        targetModel?: LlmModelId;
        taskId?: string;
        taskDomain?: string;
        checkpointId?: string;
        errorCode?: 429 | 'TIMEOUT' | 'HTTP_429' | 'NONE';
      }
    ) => {
      if (!daemon && sqliteStore) {
        daemon = new KalinarDaemon({}, sqliteStore, eventBus);
      }

      if (daemon && payload.checkpointId && payload.errorCode && payload.errorCode !== 'NONE') {
        return await daemon.handleModelFailureAndHotSwap({
          checkpointId: payload.checkpointId,
          taskDomain: payload.taskDomain,
          errorCode: payload.errorCode,
        });
      }

      if (daemon) {
        return await daemon.switchAgentModelInteractive({
          agentId: payload.agentId,
          targetModel: payload.targetModel,
          taskId: payload.taskId,
          taskDomain: payload.taskDomain,
        });
      }

      const firewall = ZenFirewall.getInstance();
      const evaluation = await firewall.evaluateLlmModelRouter({
        taskDomain: payload.taskDomain || 'ARCHITECTURE',
        errorCode: payload.errorCode || 'NONE',
        retryCount: 0,
      });

      return {
        verdict: evaluation.result.failoverVerdict,
        badge: '[MODEL_HOTSWAP]' as const,
        activeModelId: payload.targetModel || evaluation.result.activeModelId,
        fallbackModelId: evaluation.result.fallbackModelId,
        latencyMs: evaluation.latencyMs,
      };
    }
  );

  ipcMain.handle(
    'kalinar:get_live_git_diff',
    async (_event, payload: { filePath: string; stagedBuffer?: string }) => {
      if (!daemon && sqliteStore) {
        daemon = new KalinarDaemon({}, sqliteStore, eventBus);
      }
      if (!daemon) {
        daemon = new KalinarDaemon();
      }
      return await daemon.getLiveGitDiff(payload.filePath, payload.stagedBuffer);
    }
  );

  ipcMain.handle(
    'kalinar:approve_or_revert_diff',
    async (
      _event,
      payload: {
        filePath: string;
        action: 'APPROVE' | 'REVERT';
        executionMode?: ExecutionMode;
        stagedContent?: string;
        cleanSnapshotContent?: string;
        agentId?: string;
      }
    ) => {
      if (!daemon && sqliteStore) {
        daemon = new KalinarDaemon({}, sqliteStore, eventBus);
      }
      if (!daemon) {
        daemon = new KalinarDaemon();
      }
      return await daemon.approveOrRevertDiff(payload);
    }
  );

  ipcMain.handle('kalinar:scan_workspace_nodes', async () => {
    if (!daemon && sqliteStore) {
      daemon = new KalinarDaemon({}, sqliteStore, eventBus);
    }
    if (!daemon) {
      daemon = new KalinarDaemon();
    }
    return daemon.scanWorkspaceNodes();
  });

  ipcMain.handle(
    'kalinar:manage_fifo_queue',
    async (
      _event,
      payload: {
        action: 'LIST' | 'PROMOTE' | 'CLEAR';
        targetAgentId?: string;
        itemId?: string;
      }
    ) => {
      if (!daemon && sqliteStore) {
        daemon = new KalinarDaemon({}, sqliteStore, eventBus);
      }
      if (!daemon) {
        return { items: [], promoted: null, clearedCount: 0 };
      }
      if (payload.action === 'PROMOTE' && payload.itemId) {
        const promoted = daemon.promoteFifoItem(payload.itemId);
        return {
          items: daemon.getFifoQueue(payload.targetAgentId),
          promoted,
          clearedCount: 0,
        };
      }
      if (payload.action === 'CLEAR') {
        const clearedCount = daemon.clearFifoQueue(payload.targetAgentId);
        return {
          items: daemon.getFifoQueue(payload.targetAgentId),
          promoted: null,
          clearedCount,
        };
      }
      return {
        items: daemon.getFifoQueue(payload.targetAgentId),
        promoted: null,
        clearedCount: 0,
      };
    }
  );

  ipcMain.handle(
    'kalinar:evaluate_zen_rule',
    async (_event, { graph, input }: { graph: string; input: any }) => {
      const firewall = ZenFirewall.getInstance();
      switch (graph) {
        case 'voice-command-guard':
          return await firewall.evaluateVoiceCommand(input);
        case 'execution-gate':
          return await firewall.evaluateExecutionGate(input);
        case 'os-execution-firewall':
          return await firewall.evaluateOsFirewall(input);
        case 'daemon-event-router':
          return await firewall.evaluateEventRouter(input);
        case 'llm-model-router':
          return await firewall.evaluateLlmModelRouter(input);
        default:
          throw new Error(`[ZEN_FIREWALL_ERROR] Unknown ZEN graph: ${graph}`);
      }
    }
  );

  ipcMain.handle(
    'kalinar:sync_obsidian_canvas',
    async (_event, payload?: CanvasSyncRequest) => {
      const wsPath = process.cwd();
      if (payload?.canvasPath) {
        const check = sanitizeWorkspaceFilePath(wsPath, payload.canvasPath);
        if (!check.valid) {
          return {
            success: false,
            direction: payload?.direction || 'EXPORT_TO_CANVAS',
            canvasPath: payload.canvasPath,
            latencyMs: 0,
            error: check.reason,
          };
        }
      }
      const connector = new LocalVaultAndMdConnector(wsPath);
      if (!sqliteStore) {
        sqliteStore = new KalinarSqliteStore();
      }
      return await connector.syncObsidianCanvas({
        direction: payload?.direction,
        canvasPath: payload?.canvasPath,
        topology: payload?.topology,
        store: sqliteStore,
      });
    }
  );

  ipcMain.handle(
    'kalinar:query_second_brain_vault',
    async (_event, params?: SecondBrainVaultQueryParams) => {
      const wsPath = process.cwd();
      if (params?.targetPath) {
        const check = sanitizeWorkspaceFilePath(wsPath, params.targetPath);
        if (!check.valid) {
          return {
            success: false,
            notes: [],
            total: 0,
            searchLatencyMs: 0,
            error: check.reason,
          };
        }
      }
      const connector = new LocalVaultAndMdConnector(wsPath);
      return connector.querySecondBrainVault(params);
    }
  );

  ipcMain.handle(
    'kalinar:inject_second_brain_note',
    async (_event, payload: SecondBrainInjectPayload) => {
      const wsPath = process.cwd();
      const targetPath =
        payload.filePath ||
        payload.notePath ||
        path.join(
          payload.domain || '01_PROJETOS',
          `${(payload.title || 'untitled').toLowerCase().replace(/[^a-z0-9_-]/g, '-')}.md`
        );
      const check = sanitizeWorkspaceFilePath(wsPath, targetPath);
      if (!check.valid) {
        return {
          success: false,
          note: null,
          spawned3DNode: null,
          node3D: null,
          persistedToDisk: false,
          persistedToSqlite: false,
          latencyMs: 0,
          error: check.reason,
        };
      }
      const connector = new LocalVaultAndMdConnector(wsPath);
      if (!sqliteStore) {
        sqliteStore = new KalinarSqliteStore();
      }
      return connector.injectSecondBrainNote(payload, sqliteStore);
    }
  );
}

app.whenReady().then(async () => {
  try {
    sqliteStore = new KalinarSqliteStore();
    daemon = new KalinarDaemon({}, sqliteStore, eventBus);
    await daemon.start();
  } catch (err) {
    console.error('[DAEMON_INIT_ERROR]:', err);
  }

  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  if (daemon) {
    await daemon.stop();
  }
  if (sqliteStore) {
    sqliteStore.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
