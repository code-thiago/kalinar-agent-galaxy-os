/**
 * KALINAR ELECTRON MAIN CONTROLLER (v0.1.0-alpha)
 * Strict Zero-Trust Architecture
 * Strictly Zero Emojis
 */

import { app, BrowserWindow, ipcMain, Menu, safeStorage, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { KalinarSqliteStore } from './db/sqliteStore.js';
import { KalinarDaemon } from './daemon/KalinarDaemon.js';
import { DaemonClient } from './daemon/DaemonClient.js';
import {
  handleInjectSecondBrainNote,
  handleQuerySecondBrainVault,
  handleReadSecondBrainNote,
  handleSyncObsidianCanvas,
} from './daemon/VaultIpcRouter.js';
import { processController } from './daemon/ProcessController.js';
import { LlmCredentialVault, SafeStorageAdapter, VaultSaveKeyPayload } from './llm/LlmCredentialVault.js';
import { LlmDiscoveryService } from './llm/LlmDiscoveryService.js';
import { eventBus } from '../src/core/KalinarEventBus.js';
import { ZenFirewall } from '../src/core/ZenFirewall.js';
import {
  SingularityCoreState,
  SCHEMA_VERSION,
  LlmModelId,
  ExecutionMode,
  ProcessLeaseScope,
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
  'kalinar:control_process_pid',
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
  'kalinar:discover_llm_providers',
  'kalinar:save_llm_provider_key',
  'kalinar:remove_llm_provider_key',
  'kalinar:read_second_brain_note',
] as const;

let mainWindow: BrowserWindow | null = null;
let sqliteStore: KalinarSqliteStore | null = null;
let daemon: KalinarDaemon | null = null;
let daemonClient: DaemonClient | null = null;
let llmCredentialVault: LlmCredentialVault | null = null;
let llmDiscoveryService: LlmDiscoveryService | null = null;
const activeShellLeases = new Map<
  number,
  { pid: number; leaseScope: ProcessLeaseScope; command: string }
>();

function getOrCreateLlmCredentialVault(): LlmCredentialVault {
  if (!llmCredentialVault) {
    const electronSafeStorageAdapter: SafeStorageAdapter | undefined =
      safeStorage &&
      typeof safeStorage.isEncryptionAvailable === 'function' &&
      safeStorage.isEncryptionAvailable()
        ? {
            isEncryptionAvailable: () => safeStorage.isEncryptionAvailable(),
            encryptString: (plainText: string) => safeStorage.encryptString(plainText),
            decryptString: (encrypted: Buffer) => safeStorage.decryptString(encrypted),
          }
        : undefined;

    llmCredentialVault = new LlmCredentialVault({
      userDataDir: app.getPath('userData'),
      safeStorageAdapter: electronSafeStorageAdapter,
    });
  }
  return llmCredentialVault;
}

function getOrCreateLlmDiscoveryService(): LlmDiscoveryService {
  if (!llmDiscoveryService) {
    llmDiscoveryService = new LlmDiscoveryService({
      timeoutMs: 800,
      credentialVault: getOrCreateLlmCredentialVault(),
    });
  }
  return llmDiscoveryService;
}

const initialSingularityState: SingularityCoreState = {
  schemaVersion: SCHEMA_VERSION,
  voiceState: '[STANDBY]',
  liveTranscript: 'Nucleo em prontidao [STANDBY_READY]. Aguardando diretriz.',
  accretionTurbulence: 0.08,
  activeDirective: 'STANDBY_READY',
  zenLatencyMs: 0,
  activeAgentCount: 0,
};

function createWindow(): void {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#000000',
      symbolColor: '#AA88FF',
      height: 32,
    },
    title: 'KALINAR OS | SINGULARITY TELEMETRY',
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

  mainWindow.webContents.on('did-finish-load', () => {
    if (daemonClient?.isConnected()) {
      daemonClient.notifyUiClientHello();
    }
  });

  mainWindow.on('closed', () => {
    if (daemonClient?.isConnected()) {
      daemonClient.notifyUiClientDisconnect('main-window-closed');
    }
    mainWindow = null;
  });
}

function setupIpcHandlers(): void {
  ipcMain.handle('kalinar:get_singularity_state', async () => {
    if (!daemon && sqliteStore) {
      daemon = new KalinarDaemon({}, sqliteStore, eventBus);
    }
    const scannedAgents = daemon ? daemon.scanWorkspaceNodes().agents : [];
    const activeCount = scannedAgents.filter(
      (a) => a.status === '[ACTIVE]' || a.status === '[RUNNING]' || a.status === '[STREAM]'
    ).length;

    return {
      ...initialSingularityState,
      activeAgentCount: activeCount,
      activeDirective: activeCount > 0 ? 'ACTIVE_EXECUTION' : 'STANDBY_READY',
    };
  });

  ipcMain.handle('kalinar:get_active_agents', async () => {
    if (!daemon && sqliteStore) {
      daemon = new KalinarDaemon({}, sqliteStore, eventBus);
    }
    if (!daemon) {
      daemon = new KalinarDaemon();
    }
    return daemon.scanWorkspaceNodes().agents;
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

  ipcMain.handle(
    'kalinar:execute_shell_command',
    async (_event, { cmd, cwd, origin }: { cmd: string; cwd?: string; origin?: string }) => {
      const start = performance.now();
      const effectiveOrigin = origin || 'ANTIGRAVITY_CLI_TAB';
      const firewall = ZenFirewall.getInstance();
      const verdict = await firewall.evaluateOsFirewall({
        command: cmd,
        isSandbox: true,
        origin: effectiveOrigin,
      });

      if (!verdict.result.allowed) {
        const latency = Math.round(performance.now() - start);
        sqliteStore?.insertTelemetry({
          task_id: 'CLI_GATE',
          event_type: 'HALT',
          agent_name: 'zen-firewall',
          payload: JSON.stringify({
            cmd,
            origin: effectiveOrigin,
            reason: verdict.result.verdictReason,
            risk: verdict.result.riskLevel,
            leaseScope: verdict.result.leaseScope,
          }),
          latency_ms: latency,
        });
        return {
          allowed: false,
          stdout: '',
          stderr: `[FIREWALL_HALT]: Command rejected by GoRules ZEN Engine: ${verdict.result.verdictReason} [RISK: ${verdict.result.riskLevel}]`,
          exitCode: 1,
          leaseScope: verdict.result.leaseScope,
        };
      }

      const leaseScope: ProcessLeaseScope = verdict.result.leaseScope || 'EPHEMERAL_UI_BOUND';

      return new Promise((resolve) => {
        const isWin = process.platform === 'win32';
        const shellCmd = isWin ? 'powershell.exe' : '/bin/sh';
        const shellArgs = isWin ? ['-NoProfile', '-NonInteractive', '-Command', cmd] : ['-c', cmd];

        let stdout = '';
        let stderr = '';

        const proc = spawn(shellCmd, shellArgs, {
          cwd: cwd || process.cwd(),
          windowsHide: true,
          detached: !isWin,
        });

        const spawnedPid = proc.pid;
        if (spawnedPid && spawnedPid > 100) {
          activeShellLeases.set(spawnedPid, {
            pid: spawnedPid,
            leaseScope,
            command: cmd,
          });
          processController.registerManagedPid(spawnedPid);
          daemonClient?.registerPtyLease({
            pid: spawnedPid,
            leaseScope,
            command: cmd,
            origin: effectiveOrigin,
          });
        }

        const releaseTrackedPid = () => {
          if (spawnedPid && spawnedPid > 100) {
            activeShellLeases.delete(spawnedPid);
            processController.unregisterManagedPid(spawnedPid);
            daemonClient?.releasePtyLease(spawnedPid);
          }
        };

        proc.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        proc.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        proc.on('close', async (code) => {
          releaseTrackedPid();
          const latency = Math.round(performance.now() - start);
          const exitCode = code ?? 0;
          sqliteStore?.insertTelemetry({
            task_id: 'CLI_EXEC',
            event_type: exitCode === 0 ? 'TURN_END' : 'HALT',
            agent_name: 'operator',
            payload: JSON.stringify({ cmd, exitCode, leaseScope, origin: effectiveOrigin }),
            latency_ms: latency,
          });

          if (daemon) {
            try {
              const { digest, zenLatencyMs } = await daemon.processStreamOutput({
                rawLog: [stdout, stderr, `exitCode=${exitCode}`].filter(Boolean).join('\n'),
                taskId: 'CLI_EXEC',
                agentId: 'agent-software-engineer',
                explicitExitCode: exitCode,
              });
              mainWindow?.webContents.send('telemetry:stream', {
                type: exitCode === 0 ? 'STEP_COMPLETED' : 'AGENT_HALTED',
                taskId: digest.taskId,
                targetAgentId: digest.agentId,
                exitCode: digest.exitCode,
                sqliteVerified: true,
                agentStatus: exitCode === 0 ? '[VERIFIED]' : '[HALTED]',
                summaryText: digest.summaryText,
                zenLatencyMs,
              });
            } catch {
              // Keep shell IPC resilient
            }
          }

          resolve({
            allowed: true,
            stdout,
            stderr,
            exitCode,
            leaseScope,
          });
        });

        proc.on('error', (err) => {
          releaseTrackedPid();
          const latency = Math.round(performance.now() - start);
          sqliteStore?.insertTelemetry({
            task_id: 'CLI_EXEC',
            event_type: 'HALT',
            agent_name: 'operator',
            payload: JSON.stringify({ cmd, error: err.message, leaseScope, origin: effectiveOrigin }),
            latency_ms: latency,
          });
          resolve({
            allowed: true,
            stdout,
            stderr: err.message,
            exitCode: 1,
            leaseScope,
          });
        });
      });
    }
  );

  ipcMain.handle(
    'kalinar:control_process_pid',
    async (
      _event,
      payload: { pid: number; action: 'SUSPEND' | 'RESUME' | 'KILL'; agentId?: string }
    ) => {
      const start = performance.now();
      const action = payload?.action || 'SUSPEND';
      const pid = payload?.pid;

      const result =
        action === 'KILL'
          ? await processController.killProcess(pid)
          : action === 'RESUME'
          ? await processController.resumeProcess(pid)
          : await processController.suspendProcess(pid);

      const latency = Number(Math.max(0.1, performance.now() - start).toFixed(2));
      sqliteStore?.insertTelemetry({
        task_id: 'CLI_GATE',
        event_type: result.success && action === 'KILL' ? 'HALT' : result.success ? 'TURN_START' : 'HALT',
        agent_name: payload?.agentId || 'operator',
        payload: JSON.stringify({
          pid,
          action,
          success: result.success,
          message: result.message,
        }),
        latency_ms: latency,
      });

      return result;
    }
  );

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
      if (!daemonClient) {
        daemonClient = DaemonClient.getSharedInstance();
      }
      if (!sqliteStore) {
        sqliteStore = new KalinarSqliteStore({
          readOnly: true,
          daemonClient,
        });
      }
      return await handleSyncObsidianCanvas(payload, {
        sqliteStore,
        daemonClient,
        vaultRoot: wsPath,
      });
    }
  );

  ipcMain.handle(
    'kalinar:query_second_brain_vault',
    async (_event, params?: SecondBrainVaultQueryParams) => {
      const wsPath = process.cwd();
      if (!daemonClient) {
        daemonClient = DaemonClient.getSharedInstance();
      }
      if (!sqliteStore) {
        sqliteStore = new KalinarSqliteStore({
          readOnly: true,
          daemonClient,
        });
      }
      return handleQuerySecondBrainVault(params, {
        sqliteStore,
        daemonClient,
        vaultRoot: wsPath,
      });
    }
  );

  ipcMain.handle(
    'kalinar:inject_second_brain_note',
    async (_event, payload: SecondBrainInjectPayload) => {
      const wsPath = process.cwd();
      if (!daemonClient) {
        daemonClient = DaemonClient.getSharedInstance();
      }
      if (!sqliteStore) {
        sqliteStore = new KalinarSqliteStore({
          readOnly: true,
          daemonClient,
        });
      }
      return await handleInjectSecondBrainNote(payload, {
        sqliteStore,
        daemonClient,
        vaultRoot: wsPath,
      });
    }
  );

  ipcMain.handle(
    'kalinar:read_second_brain_note',
    async (_event, payload: { relativePath: string } | string) => {
      const wsPath = process.cwd();
      if (!daemonClient) {
        daemonClient = DaemonClient.getSharedInstance();
      }
      if (!sqliteStore) {
        sqliteStore = new KalinarSqliteStore({
          readOnly: true,
          daemonClient,
        });
      }
      return handleReadSecondBrainNote(payload, {
        sqliteStore,
        daemonClient,
        vaultRoot: wsPath,
      });
    }
  );

  ipcMain.handle('kalinar:discover_llm_providers', async () => {
    const discovery = getOrCreateLlmDiscoveryService();
    return await discovery.discoverAllProviders();
  });

  ipcMain.handle(
    'kalinar:save_llm_provider_key',
    async (_event, payload: VaultSaveKeyPayload) => {
      const vault = getOrCreateLlmCredentialVault();
      const result = vault.saveProviderKey(payload);
      // Telemetry logs strictly record metadata (providerId + boolean available), NEVER raw API keys
      if (sqliteStore) {
        sqliteStore.insertTelemetry({
          task_id: 'SYSTEM',
          event_type: 'TURN_END',
          agent_name: 'agent-cybersecurity',
          payload: JSON.stringify({
            action: 'SAVE_BYOK_CREDENTIAL',
            providerId: result.providerId,
            available: result.available,
            success: result.success,
          }),
          latency_ms: 1,
        });
      }
      const discovery = getOrCreateLlmDiscoveryService();
      const report = await discovery.discoverAllProviders();
      return {
        ...result,
        providers: report.providers,
      };
    }
  );

  ipcMain.handle(
    'kalinar:remove_llm_provider_key',
    async (_event, payload: { providerId: string } | string) => {
      const providerId = typeof payload === 'string' ? payload : payload?.providerId || '';
      const vault = getOrCreateLlmCredentialVault();
      const result = vault.removeProviderKey(providerId);
      if (sqliteStore) {
        sqliteStore.insertTelemetry({
          task_id: 'SYSTEM',
          event_type: 'TURN_END',
          agent_name: 'agent-cybersecurity',
          payload: JSON.stringify({
            action: 'REMOVE_BYOK_CREDENTIAL',
            providerId: result.providerId,
            removed: result.removed,
          }),
          latency_ms: 1,
        });
      }
      const discovery = getOrCreateLlmDiscoveryService();
      const report = await discovery.discoverAllProviders();
      return {
        ...result,
        providers: report.providers,
      };
    }
  );
}

if (!app.isPackaged || process.env.VITE_DEV_SERVER_URL) {
  const devUserData = path.join(app.getPath('appData'), 'kalinar-agent-galaxy-os-dev');
  app.setPath('userData', devUserData);
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[ELECTRON] Another instance is already running; terminating duplicate process.');
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  try {
    daemonClient = new DaemonClient({ eventBus });
    void daemonClient.connect();

    sqliteStore = new KalinarSqliteStore({
      readOnly: true,
      daemonClient,
    });
    daemon = new KalinarDaemon({}, sqliteStore, eventBus);
    await daemon.start();

    // Bridge Daemon Server-Push Events to Renderer Telemetry & Voice Control Plane
    eventBus.on('daemon:server_push_alert', (alert) => {
      mainWindow?.webContents.send('telemetry:stream', alert);
    });
    eventBus.on('voice:two_phase_ack', (ack) => {
      mainWindow?.webContents.send('voice:state_change', {
        transcript: ack.spokenMessage,
        ack,
      });
    });
    eventBus.on('agent:model_hotswap', (checkpoint) => {
      mainWindow?.webContents.send('telemetry:stream', {
        type: 'MODEL_HOTSWAP',
        checkpoint,
      });
    });
    eventBus.on('agent:status_changed', (evt) => {
      mainWindow?.webContents.send('telemetry:stream', {
        type: 'AGENT_STATUS_CHANGED',
        ...evt,
      });
    });
    eventBus.on('agent:step_updated', (evt) => {
      mainWindow?.webContents.send('telemetry:stream', {
        type: 'AGENT_STEP_UPDATED',
        ...evt,
      });
    });
    eventBus.on('agent:metric_updated', (evt) => {
      mainWindow?.webContents.send('telemetry:stream', {
        type: 'AGENT_METRIC_UPDATED',
        ...evt,
      });
    });
    eventBus.on('agent:fifo_queued', (item) => {
      mainWindow?.webContents.send('telemetry:stream', {
        type: 'AGENT_FIFO_QUEUED',
        item,
      });
    });
  } catch (err) {
    console.error('[DAEMON_INIT_ERROR]:', err);
  }

  setupIpcHandlers();
  void getOrCreateLlmDiscoveryService().discoverAllProviders();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  if (daemonClient?.isConnected()) {
    const disconnectDispatch = daemonClient.notifyUiClientDisconnect('window-all-closed');
    await Promise.race([
      disconnectDispatch.ackPromise.catch(() => null),
      new Promise<void>((resolve) => setTimeout(resolve, 150)),
    ]);
  } else {
    // Standalone fallback: reap EPHEMERAL_UI_BOUND shells while preserving DETACHED_DAEMON_SERVICE
    for (const [pid, lease] of activeShellLeases.entries()) {
      if (lease.leaseScope === 'EPHEMERAL_UI_BOUND') {
        await processController.killProcessTree(pid);
        activeShellLeases.delete(pid);
      }
    }
  }

  if (daemon) {
    await daemon.stop();
  }
  if (daemonClient) {
    daemonClient.disconnect();
  }
  if (sqliteStore) {
    sqliteStore.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
