/**
 * KALINAR MULTI-USER LLM & CLI AUTO-DISCOVERY SERVICE (v2.2.0-step3)
 * Probes with 800ms timeout:
 * 1. Local Ollama (http://127.0.0.1:11434/api/tags) -> installed local models
 * 2. Local LM Studio (http://127.0.0.1:1234/v1/models) -> loaded local models
 * 3. Local CLIs in OS PATH (claude, gemini, gh, antigravity)
 * 4. OS Environment variables (GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY)
 *    returning boolean available only (never raw secrets)
 * 5. OS-Encrypted BYOK Vault entries (SAFE_STORAGE_BYOK)
 * Strictly Zero Emojis
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  DiscoveredLlmProvider,
  DiscoveredLlmProviderSchema,
} from '../../src/types/kalinar.js';
import { LlmCredentialVault } from './LlmCredentialVault.js';

export const DEFAULT_DISCOVERY_TIMEOUT_MS = 800 as const;

export const LOCAL_OLLAMA_TAGS_URL = 'http://127.0.0.1:11434/api/tags' as const;
export const LOCAL_LM_STUDIO_MODELS_URL = 'http://127.0.0.1:1234/v1/models' as const;

export const PROBED_CLI_BINARIES = ['claude', 'gemini', 'gh', 'antigravity'] as const;

export const PROBED_ENV_KEYS = [
  'GEMINI_API_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'OPENROUTER_API_KEY',
] as const;

export type ProbedCliBinary = (typeof PROBED_CLI_BINARIES)[number];
export type ProbedEnvKey = (typeof PROBED_ENV_KEYS)[number];

export interface LlmDiscoveryOptions {
  timeoutMs?: number;
  ollamaTagsUrl?: string;
  lmStudioModelsUrl?: string;
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  cliProbeFn?: (binary: ProbedCliBinary, timeoutMs: number) => Promise<boolean>;
  credentialVault?: LlmCredentialVault;
}

export interface LlmDiscoveryReport {
  providers: DiscoveredLlmProvider[];
  discoveredModels: string[];
  activeLocalModels: string[];
  probedAt: number;
  latencyMs: number;
}

const CLI_METADATA: Record<ProbedCliBinary, { label: string; defaultModels: string[] }> = {
  claude: {
    label: 'Claude Code CLI',
    defaultModels: ['claude-sonnet-4', 'claude-3.7-sonnet'],
  },
  gemini: {
    label: 'Gemini CLI',
    defaultModels: ['gemini-4-pro', 'gemini-4-flash', 'gemini-2.5-pro'],
  },
  gh: {
    label: 'GitHub CLI (gh)',
    defaultModels: [],
  },
  antigravity: {
    label: 'Antigravity CLI',
    defaultModels: ['argon', 'gemini-4-pro', 'claude-sonnet-4'],
  },
};

const ENV_KEY_METADATA: Record<ProbedEnvKey, { providerId: string; label: string; models: string[] }> = {
  GEMINI_API_KEY: {
    providerId: 'env:GEMINI_API_KEY',
    label: 'Google Gemini (GEMINI_API_KEY)',
    models: ['gemini-4-pro', 'gemini-4-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'],
  },
  ANTHROPIC_API_KEY: {
    providerId: 'env:ANTHROPIC_API_KEY',
    label: 'Anthropic Claude (ANTHROPIC_API_KEY)',
    models: ['claude-sonnet-4', 'claude-3.7-sonnet'],
  },
  OPENAI_API_KEY: {
    providerId: 'env:OPENAI_API_KEY',
    label: 'OpenAI (OPENAI_API_KEY)',
    models: ['gpt-4o', 'o3-mini'],
  },
  OPENROUTER_API_KEY: {
    providerId: 'env:OPENROUTER_API_KEY',
    label: 'OpenRouter (OPENROUTER_API_KEY)',
    models: ['argon', 'claude-sonnet-4', 'gemini-4-pro'],
  },
};

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs: number,
  fetchImpl: typeof fetch
): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await Promise.race([
      fetchImpl(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DISCOVERY_PROBE_TIMEOUT')), timeoutMs)
      ),
    ]);

    if (!response || !response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function probeBinaryInPath(
  binary: string,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const pathVar = env.PATH || env.Path || '';
  if (!pathVar) return false;

  const isWin = process.platform === 'win32';
  const pathDirs = pathVar.split(path.delimiter).filter(Boolean);
  const rawExts = isWin
    ? (env.PATHEXT || '.COM;.EXE;.BAT;.CMD;.PS1').split(';').filter(Boolean)
    : [''];
  const extensions = isWin ? ['', ...rawExts, ...rawExts.map((e) => e.toLowerCase())] : [''];

  for (const dir of pathDirs) {
    const cleanDir = dir.trim().replace(/^"|"$/g, '');
    if (!cleanDir) continue;
    for (const ext of extensions) {
      const candidate = path.join(cleanDir, `${binary}${ext}`);
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return true;
        }
      } catch {
        // Ignore inaccessible PATH segments
      }
    }
  }
  return false;
}

export class LlmDiscoveryService {
  private readonly timeoutMs: number;
  private readonly ollamaTagsUrl: string;
  private readonly lmStudioModelsUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly env: NodeJS.ProcessEnv;
  private readonly cliProbeFn?: (binary: ProbedCliBinary, timeoutMs: number) => Promise<boolean>;
  private readonly credentialVault?: LlmCredentialVault;
  private lastReport: LlmDiscoveryReport | null = null;

  constructor(options: LlmDiscoveryOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_DISCOVERY_TIMEOUT_MS;
    this.ollamaTagsUrl = options.ollamaTagsUrl ?? LOCAL_OLLAMA_TAGS_URL;
    this.lmStudioModelsUrl = options.lmStudioModelsUrl ?? LOCAL_LM_STUDIO_MODELS_URL;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.env = options.env ?? process.env;
    this.cliProbeFn = options.cliProbeFn;
    this.credentialVault = options.credentialVault;
  }

  public getLastReport(): LlmDiscoveryReport | null {
    return this.lastReport;
  }

  public async probeOllama(): Promise<DiscoveredLlmProvider> {
    if (typeof this.fetchImpl !== 'function') {
      return DiscoveredLlmProviderSchema.parse({
        providerId: 'ollama:local',
        label: 'Ollama Local Runtime (127.0.0.1:11434)',
        source: 'OLLAMA_LOCAL',
        models: [],
        available: false,
      });
    }

    const payload = (await fetchJsonWithTimeout(
      this.ollamaTagsUrl,
      this.timeoutMs,
      this.fetchImpl
    )) as { models?: Array<{ name?: string; model?: string }> } | null;

    if (!payload || !Array.isArray(payload.models)) {
      return DiscoveredLlmProviderSchema.parse({
        providerId: 'ollama:local',
        label: 'Ollama Local Runtime (127.0.0.1:11434)',
        source: 'OLLAMA_LOCAL',
        models: [],
        available: false,
      });
    }

    const models = Array.from(
      new Set(
        payload.models
          .map((m) => (typeof m?.name === 'string' ? m.name.trim() : typeof m?.model === 'string' ? m.model.trim() : ''))
          .filter(Boolean)
      )
    );

    return DiscoveredLlmProviderSchema.parse({
      providerId: 'ollama:local',
      label: 'Ollama Local Runtime (127.0.0.1:11434)',
      source: 'OLLAMA_LOCAL',
      models,
      available: true,
    });
  }

  public async probeLmStudio(): Promise<DiscoveredLlmProvider> {
    if (typeof this.fetchImpl !== 'function') {
      return DiscoveredLlmProviderSchema.parse({
        providerId: 'lmstudio:local',
        label: 'LM Studio Local Server (127.0.0.1:1234)',
        source: 'LM_STUDIO_LOCAL',
        models: [],
        available: false,
      });
    }

    const payload = (await fetchJsonWithTimeout(
      this.lmStudioModelsUrl,
      this.timeoutMs,
      this.fetchImpl
    )) as { data?: Array<{ id?: string }> } | null;

    if (!payload || !Array.isArray(payload.data)) {
      return DiscoveredLlmProviderSchema.parse({
        providerId: 'lmstudio:local',
        label: 'LM Studio Local Server (127.0.0.1:1234)',
        source: 'LM_STUDIO_LOCAL',
        models: [],
        available: false,
      });
    }

    const models = Array.from(
      new Set(
        payload.data
          .map((item) => (typeof item?.id === 'string' ? item.id.trim() : ''))
          .filter(Boolean)
      )
    );

    return DiscoveredLlmProviderSchema.parse({
      providerId: 'lmstudio:local',
      label: 'LM Studio Local Server (127.0.0.1:1234)',
      source: 'LM_STUDIO_LOCAL',
      models,
      available: true,
    });
  }

  public async probeClis(): Promise<DiscoveredLlmProvider[]> {
    const checks = PROBED_CLI_BINARIES.map(async (binary) => {
      let available = false;
      try {
        if (this.cliProbeFn) {
          available = await Promise.race([
            this.cliProbeFn(binary, this.timeoutMs),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), this.timeoutMs)),
          ]);
        } else {
          available = probeBinaryInPath(binary, this.env);
        }
      } catch {
        available = false;
      }

      const meta = CLI_METADATA[binary];
      return DiscoveredLlmProviderSchema.parse({
        providerId: `cli:${binary}`,
        label: meta.label,
        source: 'CLI_PATH',
        models: available ? meta.defaultModels : [],
        available,
      });
    });

    return Promise.all(checks);
  }

  public probeEnvVars(): DiscoveredLlmProvider[] {
    return PROBED_ENV_KEYS.map((envKey) => {
      const rawValue = this.env[envKey];
      const available = typeof rawValue === 'string' && rawValue.trim().length > 0;
      const meta = ENV_KEY_METADATA[envKey];

      return DiscoveredLlmProviderSchema.parse({
        providerId: meta.providerId,
        label: meta.label,
        source: 'ENV_VAR',
        models: available ? meta.models : [],
        available,
      });
    });
  }

  public probeByokVault(): DiscoveredLlmProvider[] {
    if (!this.credentialVault) return [];
    return this.credentialVault
      .listDiscoveredByokProviders()
      .map((p) => DiscoveredLlmProviderSchema.parse(p));
  }

  public async discoverAllProviders(): Promise<LlmDiscoveryReport> {
    const start = performance.now();

    const [ollama, lmStudio, clis] = await Promise.all([
      this.probeOllama(),
      this.probeLmStudio(),
      this.probeClis(),
    ]);

    const envProviders = this.probeEnvVars();
    const byokProviders = this.probeByokVault();

    const providers: DiscoveredLlmProvider[] = [
      ollama,
      lmStudio,
      ...clis,
      ...envProviders,
      ...byokProviders,
    ];

    const activeLocalModels = Array.from(
      new Set([
        ...(ollama.available ? ollama.models : []),
        ...(lmStudio.available ? lmStudio.models : []),
      ])
    );

    const discoveredModels = Array.from(
      new Set(
        providers
          .filter((p) => p.available)
          .flatMap((p) => p.models)
      )
    );

    const report: LlmDiscoveryReport = {
      providers,
      discoveredModels,
      activeLocalModels,
      probedAt: Date.now(),
      latencyMs: Number(Math.max(0.1, performance.now() - start).toFixed(2)),
    };

    this.lastReport = report;
    return report;
  }
}
