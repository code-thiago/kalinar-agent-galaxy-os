import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

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
  await runTsc();

  const electronBin = resolveElectronBin();

  console.log('[KALINAR DEV] Iniciando Vite Dev Server...');
  const viteScript = path.resolve('node_modules/vite/bin/vite.js');
  const viteProc = spawn(process.execPath, [viteScript, '--port', '5173', '--strictPort'], {
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

  const cleanup = () => {
    if (electronProc && !electronProc.killed) {
      try {
        electronProc.kill();
      } catch {
        // ignore
      }
    }
    if (viteProc && !viteProc.killed) {
      try {
        viteProc.kill();
      } catch {
        // ignore
      }
    }
  };

  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  try {
    await waitForServer('http://localhost:5173', 25000);
    console.log('[KALINAR DEV] Vite pronto em http://localhost:5173. Abrindo janela Electron...');

    const electronEnv = {
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: 'http://localhost:5173',
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
