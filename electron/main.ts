/**
 * KALINAR ELECTRON MAIN CONTROLLER (v0.1.0-alpha)
 * Strict Zero-Trust Architecture
 * Strictly Zero Emojis
 */

import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { KalinarSqliteStore } from './db/sqliteStore.js';
import { KalinarDaemon } from './daemon/KalinarDaemon.js';
import { eventBus } from '../src/core/KalinarEventBus.js';
import { ZenFirewall } from '../src/core/ZenFirewall.js';
import { SingularityCoreState, AgentNode, SCHEMA_VERSION } from '../src/types/kalinar.js';

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

  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
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
