import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const DEV_PORT = 5173;

export function resolveElectronBin() {
  const require = createRequire(import.meta.url);
  let electronBin = null;

  try {
    const raw = require('electron');
    if (typeof raw === 'string') {
      electronBin = raw.trim().replace(/[\r\n]+/g, '');
    }
  } catch {
    // fallback to path.txt
  }

  if (!electronBin) {
    const pathTxt = path.resolve('node_modules/electron/path.txt');
    if (fs.existsSync(pathTxt)) {
      const execName = fs.readFileSync(pathTxt, 'utf-8').trim().replace(/[\r\n]+/g, '');
      electronBin = path.resolve('node_modules/electron/dist', execName);
    }
  }

  if (!electronBin || !fs.existsSync(electronBin)) {
    console.log('[KALINAR DEV] Binario do Electron ausente. Executando install.js...');
    const installScript = path.resolve('node_modules/electron/install.js');
    if (fs.existsSync(installScript)) {
      spawnSync(process.execPath, [installScript], { stdio: 'inherit', shell: false });
    }

    try {
      const raw = require('electron');
      if (typeof raw === 'string') {
        electronBin = raw.trim().replace(/[\r\n]+/g, '');
      }
    } catch {
      // fallback
    }

    if (!electronBin || !fs.existsSync(electronBin)) {
      const pathTxt = path.resolve('node_modules/electron/path.txt');
      if (fs.existsSync(pathTxt)) {
        const execName = fs.readFileSync(pathTxt, 'utf-8').trim().replace(/[\r\n]+/g, '');
        electronBin = path.resolve('node_modules/electron/dist', execName);
      }
    }
  }

  if (!electronBin || !fs.existsSync(electronBin)) {
    throw new Error(`[KALINAR DEV_ERROR] Nao foi possivel resolver o binario do Electron em: ${electronBin}`);
  }

  return electronBin;
}

function checkHostFree(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once('error', (err) => {
      if (err && (err.code === 'EADDRNOTAVAIL' || err.code === 'EAFNOSUPPORT')) {
        resolve(true);
        return;
      }
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen({ port, host });
  });
}

export async function isPortFree(port = DEV_PORT) {
  const ipv4Free = await checkHostFree(port, '127.0.0.1');
  if (!ipv4Free) return false;
  return await checkHostFree(port, '::1');
}

export function killPidTree(pid) {
  if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) {
    return false;
  }
  if (process.platform === 'win32') {
    const res = spawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], {
      stdio: 'ignore',
      shell: false,
      windowsHide: true,
    });
    return res.status === 0;
  }
  try {
    process.kill(pid, 'SIGTERM');
    return true;
  } catch {
    return false;
  }
}

export function findPortOwnerPidsWin32(port = DEV_PORT) {
  if (process.platform !== 'win32') return [];
  const res = spawnSync('netstat', ['-ano', '-p', 'TCP'], {
    encoding: 'utf-8',
    shell: false,
    windowsHide: true,
  });
  if (!res.stdout) return [];

  const pids = new Set();
  const portPattern = new RegExp(`:${port}\\s+.*LISTENING\\s+(\\d+)`, 'i');
  for (const line of res.stdout.split(/\r?\n/)) {
    const match = line.match(portPattern);
    if (match) {
      const pid = Number.parseInt(match[1], 10);
      if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) {
        pids.add(pid);
      }
    }
  }
  return Array.from(pids);
}

export async function ensurePortReleased(port = DEV_PORT, maxWaitMs = 1000) {
  if (await isPortFree(port)) {
    return true;
  }

  console.log(`[KALINAR DEV] Porta ${port} ocupada. Liberando processo orfao...`);
  if (process.platform === 'win32') {
    const pids = findPortOwnerPidsWin32(port);
    for (const pid of pids) {
      spawnSync('taskkill', ['/F', '/PID', String(pid)], {
        stdio: 'ignore',
        shell: false,
        windowsHide: true,
      });
    }
  } else {
    spawnSync('fuser', ['-k', `${port}/tcp`], { stdio: 'ignore', shell: false });
  }

  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (await isPortFree(port)) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  return await isPortFree(port);
}

export function cleanupOrphanElectronProcesses(projectRoot = process.cwd()) {
  if (process.platform !== 'win32') return [];
  const normalizedRoot = path.resolve(projectRoot).toLowerCase();
  const escapedRoot = normalizedRoot.replace(/'/g, "''");
  const psScript = `Get-CimInstance Win32_Process -Filter "Name='electron.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.ToLower().Contains('${escapedRoot}') } | Select-Object -ExpandProperty ProcessId`;

  const res = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', psScript],
    {
      encoding: 'utf-8',
      shell: false,
      windowsHide: true,
    }
  );

  if (!res.stdout) return [];

  const killed = [];
  for (const raw of res.stdout.split(/\r?\n/)) {
    const pid = Number.parseInt(raw.trim(), 10);
    if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) {
      if (killPidTree(pid)) {
        killed.push(pid);
      }
    }
  }

  if (killed.length > 0) {
    console.log(`[KALINAR DEV] Processos electron.exe orfaos encerrados: ${killed.join(', ')}`);
  }
  return killed;
}

export function runTsc() {
  return new Promise((resolve, reject) => {
    console.log('[KALINAR DEV] Compilando Electron TypeScript (dist-electron)...');
    const tscScript = path.resolve('node_modules/typescript/bin/tsc');
    const proc = spawn(process.execPath, [tscScript, '-p', 'tsconfig.electron.json'], {
      stdio: 'inherit',
      shell: false,
    });

    proc.on('error', (err) => {
      reject(err);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('[KALINAR DEV] Electron TypeScript compilado com sucesso.');
        resolve();
      } else {
        reject(new Error(`[KALINAR DEV] tsc encerrou com codigo ${code}`));
      }
    });
  });
}

export function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode && res.statusCode < 500) {
            resolve();
          } else {
            setTimeout(check, 250);
          }
        })
        .on('error', () => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`[KALINAR DEV] Timeout aguardando Vite dev server em ${url}`));
          } else {
            setTimeout(check, 250);
          }
        });
    };
    check();
  });
}

export async function startDev() {
  cleanupOrphanElectronProcesses(process.cwd());
  await ensurePortReleased(DEV_PORT, 1000);
  await runTsc();

  const electronBin = resolveElectronBin();

  console.log('[KALINAR DEV] Iniciando Vite Dev Server...');
  const viteScript = path.resolve('node_modules/vite/bin/vite.js');
  const viteProc = spawn(process.execPath, [viteScript, '--port', String(DEV_PORT), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  viteProc.stdout?.on('data', (data) => {
    process.stdout.write(data);
  });
  viteProc.stderr?.on('data', (data) => {
    process.stderr.write(data);
  });

  let electronProc = null;
  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;

    if (electronProc && !electronProc.killed) {
      if (electronProc.pid) {
        killPidTree(electronProc.pid);
      }
      try {
        electronProc.kill('SIGTERM');
      } catch {
        // ignore
      }
    }

    if (viteProc && !viteProc.killed) {
      if (viteProc.pid) {
        killPidTree(viteProc.pid);
      }
      try {
        viteProc.kill('SIGTERM');
      } catch {
        // ignore
      }
    }
  };

  process.once('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.once('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
  process.once('exit', () => {
    cleanup();
  });

  try {
    await waitForServer(`http://localhost:${DEV_PORT}`, 25000);
    console.log(`[KALINAR DEV] Vite pronto em http://localhost:${DEV_PORT}. Abrindo janela Electron...`);

    const electronEnv = {
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: `http://localhost:${DEV_PORT}`,
    };
    delete electronEnv.ELECTRON_RUN_AS_NODE;

    const mainScript = path.resolve('dist-electron/electron/main.js');
    electronProc = spawn(electronBin, [mainScript], {
      stdio: 'inherit',
      shell: false,
      env: electronEnv,
    });

    electronProc.on('error', (err) => {
      console.error('[KALINAR DEV_ERROR] Falha no processo Electron:', err);
      cleanup();
      process.exit(1);
    });

    electronProc.on('close', (code) => {
      console.log(`[KALINAR DEV] Electron encerrado (codigo ${code}). Encerrando Vite...`);
      cleanup();
      process.exit(code || 0);
    });
  } catch (err) {
    console.error('[KALINAR DEV_ERROR]:', err);
    cleanup();
    process.exit(1);
  }
}

const isDirectRun = Boolean(
  process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()
);

if (isDirectRun) {
  startDev();
}
