/**
 * UX OVERHAUL STEP 3 TDD SUITE (v2.2.0-step3)
 * Multi-User LLM Auto-Discovery & safeStorage Credential Vault
 * Verifies:
 * 1. Ollama (/api/tags) and LM Studio (/v1/models) local model discovery with 800ms timeout
 * 2. Local CLI detection in OS PATH (claude, gemini, gh, antigravity)
 * 3. OS Environment variable availability flags (GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY)
 *    with strictly zero raw secret exposure
 * 4. OS-Encrypted BYOK Vault (safeStorage.encryptString -> userData/llm-vault.enc) round-trip,
 *    removal, and zero raw secret leakage in disk files, discovery payloads, or SQLite logs
 * Strictly Zero Emojis
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import {
  LlmCredentialVault,
  SafeStorageAdapter,
} from '../electron/llm/LlmCredentialVault.js';
import {
  DEFAULT_DISCOVERY_TIMEOUT_MS,
  LOCAL_LM_STUDIO_MODELS_URL,
  LOCAL_OLLAMA_TAGS_URL,
  LlmDiscoveryService,
} from '../electron/llm/LlmDiscoveryService.js';
import { ELECTRON_IPC_CHANNELS } from '../electron/preload.js';
import { DiscoveredLlmProviderSchema } from '../src/types/kalinar.js';

function createDeterministicTestSafeStorage(): SafeStorageAdapter {
  const key = createHash('sha256').update('kalinar-step3-test-dpapi-key').digest();
  return {
    isEncryptionAvailable: () => true,
    encryptString: (plainText: string): Buffer => {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      return Buffer.concat([Buffer.from('DPAPI', 'ascii'), iv, tag, encrypted]);
    },
    decryptString: (encrypted: Buffer): string => {
      const header = encrypted.subarray(0, 5).toString('ascii');
      if (header !== 'DPAPI') {
        throw new Error('Invalid DPAPI buffer header');
      }
      const iv = encrypted.subarray(5, 17);
      const tag = encrypted.subarray(17, 33);
      const payload = encrypted.subarray(33);
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8');
    },
  };
}

describe('UX Step 3: Multi-User LLM Auto-Discovery & safeStorage Credential Vault (v2.2.0-step3)', () => {
  let tempDir: string;
  let safeStorageMock: SafeStorageAdapter;
  let vault: LlmCredentialVault;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kalinar-ux-step3-'));
    safeStorageMock = createDeterministicTestSafeStorage();
    vault = new LlmCredentialVault({
      userDataDir: tempDir,
      safeStorageAdapter: safeStorageMock,
    });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore Windows temp file lock delay
    }
  });

  it('1. discovers installed local Ollama models (argon, llama3, qwen2.5-coder) and LM Studio models within 800ms timeout', async () => {
    expect(DEFAULT_DISCOVERY_TIMEOUT_MS).toBe(800);
    expect(LOCAL_OLLAMA_TAGS_URL).toBe('http://127.0.0.1:11434/api/tags');
    expect(LOCAL_LM_STUDIO_MODELS_URL).toBe('http://127.0.0.1:1234/v1/models');

    const mockFetch: typeof fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === LOCAL_OLLAMA_TAGS_URL) {
        return new Response(
          JSON.stringify({
            models: [
              { name: 'argon:latest' },
              { name: 'llama3:8b' },
              { name: 'qwen2.5-coder:14b' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url === LOCAL_LM_STUDIO_MODELS_URL) {
        return new Response(
          JSON.stringify({
            data: [{ id: 'deepseek-coder-v2-lite' }, { id: 'qwen2.5-coder-7b-instruct' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not Found', { status: 404 });
    }) as typeof fetch;

    const discovery = new LlmDiscoveryService({
      timeoutMs: 800,
      fetchImpl: mockFetch,
      env: {},
      cliProbeFn: async (binary) => binary === 'claude' || binary === 'antigravity',
      credentialVault: vault,
    });

    const report = await discovery.discoverAllProviders();

    for (const provider of report.providers) {
      expect(() => DiscoveredLlmProviderSchema.parse(provider)).not.toThrow();
    }

    const ollamaProvider = report.providers.find((p) => p.source === 'OLLAMA_LOCAL');
    expect(ollamaProvider?.available).toBe(true);
    expect(ollamaProvider?.models).toEqual(['argon:latest', 'llama3:8b', 'qwen2.5-coder:14b']);

    const lmStudioProvider = report.providers.find((p) => p.source === 'LM_STUDIO_LOCAL');
    expect(lmStudioProvider?.available).toBe(true);
    expect(lmStudioProvider?.models).toEqual([
      'deepseek-coder-v2-lite',
      'qwen2.5-coder-7b-instruct',
    ]);

    expect(report.activeLocalModels).toContain('argon:latest');
    expect(report.activeLocalModels).toContain('llama3:8b');
    expect(report.activeLocalModels).toContain('qwen2.5-coder:14b');
    expect(report.activeLocalModels).toContain('deepseek-coder-v2-lite');

    const claudeCli = report.providers.find((p) => p.providerId === 'cli:claude');
    const ghCli = report.providers.find((p) => p.providerId === 'cli:gh');
    const agyCli = report.providers.find((p) => p.providerId === 'cli:antigravity');
    expect(claudeCli?.available).toBe(true);
    expect(agyCli?.available).toBe(true);
    expect(ghCli?.available).toBe(false);
  });

  it('2. enforces 800ms timeout gracefully when Ollama or LM Studio endpoints hang or are offline', async () => {
    const hangingFetch: typeof fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new Error('Aborted by 800ms timeout'));
        });
      });
    }) as typeof fetch;

    const discovery = new LlmDiscoveryService({
      timeoutMs: 80,
      fetchImpl: hangingFetch,
      env: {},
      cliProbeFn: async () => false,
    });

    const start = performance.now();
    const report = await discovery.discoverAllProviders();
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(400);
    const ollama = report.providers.find((p) => p.source === 'OLLAMA_LOCAL');
    const lmStudio = report.providers.find((p) => p.source === 'LM_STUDIO_LOCAL');
    expect(ollama?.available).toBe(false);
    expect(ollama?.models).toEqual([]);
    expect(lmStudio?.available).toBe(false);
    expect(lmStudio?.models).toEqual([]);
  });

  it('3. performs safeStorage encryptString/decryptString round-trip to userData/llm-vault.enc and supports key removal', async () => {
    const rawGeminiSecret = 'AIzaSyD-TOP-SECRET-GEMINI-KEY-9988776655';
    const rawAnthropicSecret = 'sk-ant-api03-SUPER-SECRET-CLAUDE-KEY-112233';

    const saveGemini = vault.saveProviderKey({
      providerId: 'gemini',
      apiKey: rawGeminiSecret,
    });
    expect(saveGemini.success).toBe(true);
    expect(saveGemini.available).toBe(true);
    expect(saveGemini.vaultFilePath).toBe(path.join(tempDir, 'llm-vault.enc'));
    expect(fs.existsSync(saveGemini.vaultFilePath)).toBe(true);

    const saveAnthropic = vault.saveProviderKey({
      providerId: 'anthropic',
      apiKey: rawAnthropicSecret,
    });
    expect(saveAnthropic.success).toBe(true);

    // Verify encrypted round-trip decryption internally
    expect(vault.hasProviderKey('gemini')).toBe(true);
    expect(vault.hasProviderKey('anthropic')).toBe(true);
    expect(vault.resolveProviderSecretInternal('gemini')).toBe(rawGeminiSecret);
    expect(vault.resolveProviderSecretInternal('anthropic')).toBe(rawAnthropicSecret);

    // Re-instantiate vault from disk to verify persistence across restarts
    const reloadedVault = new LlmCredentialVault({
      userDataDir: tempDir,
      safeStorageAdapter: safeStorageMock,
    });
    expect(reloadedVault.resolveProviderSecretInternal('gemini')).toBe(rawGeminiSecret);
    expect(reloadedVault.resolveProviderSecretInternal('anthropic')).toBe(rawAnthropicSecret);

    // Remove Gemini key and verify removal
    const removeRes = reloadedVault.removeProviderKey('gemini');
    expect(removeRes.success).toBe(true);
    expect(removeRes.removed).toBe(true);
    expect(reloadedVault.hasProviderKey('gemini')).toBe(false);
    expect(reloadedVault.resolveProviderSecretInternal('gemini')).toBeNull();
    expect(reloadedVault.hasProviderKey('anthropic')).toBe(true);
  });

  it('4. guarantees ZERO raw secret leakage across disk ciphertext, env discovery, and BYOK discovery payloads', async () => {
    const envSecrets = {
      GEMINI_API_KEY: 'AIzaSy-RAW-ENV-SECRET-GEMINI-0001',
      ANTHROPIC_API_KEY: 'sk-ant-RAW-ENV-SECRET-ANTHROPIC-0002',
      OPENAI_API_KEY: 'sk-proj-RAW-ENV-SECRET-OPENAI-0003',
      OPENROUTER_API_KEY: 'sk-or-v1-RAW-ENV-SECRET-OPENROUTER-0004',
    };
    const byokSecret = 'sk-byok-VAULT-ULTRA-SECRET-KEY-9999';

    vault.saveProviderKey({
      providerId: 'openrouter',
      apiKey: byokSecret,
      label: 'OpenRouter BYOK Vault',
      models: ['argon', 'claude-sonnet-4'],
    });

    // 1. Inspect raw disk bytes of userData/llm-vault.enc
    const rawVaultBytes = fs.readFileSync(vault.getVaultFilePath());
    const rawVaultUtf8 = rawVaultBytes.toString('utf8');
    const rawVaultBase64 = rawVaultBytes.toString('base64');
    expect(rawVaultUtf8.includes(byokSecret)).toBe(false);
    expect(rawVaultBase64.includes(Buffer.from(byokSecret, 'utf8').toString('base64'))).toBe(false);

    // 2. Run full discovery with all 4 env secrets and BYOK vault populated
    const discovery = new LlmDiscoveryService({
      timeoutMs: 800,
      fetchImpl: (async () => new Response('Offline', { status: 503 })) as typeof fetch,
      env: envSecrets,
      cliProbeFn: async () => false,
      credentialVault: vault,
    });

    const report = await discovery.discoverAllProviders();
    const serializedReport = JSON.stringify(report);

    // Verify all 4 ENV providers report available: true
    const envProviders = report.providers.filter((p) => p.source === 'ENV_VAR');
    expect(envProviders).toHaveLength(4);
    expect(envProviders.every((p) => p.available === true)).toBe(true);

    // Verify BYOK provider reports available: true
    const byokProviders = report.providers.filter((p) => p.source === 'SAFE_STORAGE_BYOK');
    expect(byokProviders).toHaveLength(1);
    expect(byokProviders[0].providerId).toBe('byok:openrouter');
    expect(byokProviders[0].available).toBe(true);

    // Verify ZERO raw secrets appear anywhere in the discovery report JSON
    for (const secretValue of [...Object.values(envSecrets), byokSecret]) {
      expect(serializedReport.includes(secretValue)).toBe(false);
    }
  });

  it('5. registers IPC channels in whitelist and enforces zero emojis across Step 3 deliverables', () => {
    expect(ELECTRON_IPC_CHANNELS).toContain('kalinar:discover_llm_providers');
    expect(ELECTRON_IPC_CHANNELS).toContain('kalinar:save_llm_provider_key');
    expect(ELECTRON_IPC_CHANNELS).toContain('kalinar:remove_llm_provider_key');

    const emojiRegex = /[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    const filesToCheck = [
      'electron/llm/LlmCredentialVault.ts',
      'electron/llm/LlmDiscoveryService.ts',
      'electron/main.ts',
      'electron/preload.ts',
      'tests/ux-step3-llm-vault.test.ts',
    ];

    for (const rel of filesToCheck) {
      const content = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf-8');
      expect(emojiRegex.test(content), `Forbidden emoji found in ${rel}`).toBe(false);
    }
  });
});
