import { spawn } from 'node:child_process';
import http from 'node:http';
import electronPath from 'electron';

function runTsc() {
  return new Promise((resolve, reject) => {
    console.log('[KALINAR DEV] Compilando Electron TypeScript (dist-electron)...');
    const isWin = process.platform === 'win32';
    const npxCmd = isWin ? 'npx.cmd' : 'npx';
    const proc = spawn(npxCmd, ['tsc', '-p', 'tsconfig.electron.json'], {
      stdio: 'inherit',
      shell: isWin,
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

function waitForServer(url, timeoutMs = 25000) {
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

async function startDev() {
  await runTsc();

  console.log('[KALINAR DEV] Iniciando Vite Dev Server...');
  const isWin = process.platform === 'win32';
  const npxCmd = isWin ? 'npx.cmd' : 'npx';

  const viteProc = spawn(npxCmd, ['vite'], {
    stdio: 'inherit',
    shell: isWin,
  });

  try {
    await waitForServer('http://localhost:5173', 25000);
    console.log('[KALINAR DEV] Vite pronto em http://localhost:5173. Abrindo janela Electron...');

    const electronProc = spawn(electronPath, ['dist-electron/electron/main.js'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'development',
      },
    });

    electronProc.on('close', (code) => {
      console.log(`[KALINAR DEV] Electron encerrado (codigo ${code}). Encerrando Vite...`);
      viteProc.kill();
      process.exit(code || 0);
    });
  } catch (err) {
    console.error('[KALINAR DEV_ERROR]:', err);
    viteProc.kill();
    process.exit(1);
  }

  process.on('SIGINT', () => {
    viteProc.kill();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    viteProc.kill();
    process.exit(0);
  });
}

startDev();
