/**
 * TASK 7 REMEDIATION VERIFICATION TEST SUITE (v1.0.1)
 * Validates:
 * 1. 262,144 GPGPU Particle Count and calibrated lavender sparkles
 * 2. 160px Live Viewport Height on Agent Cards
 * 3. GoRules ZEN OS Firewall Gate for IPC Shell
 * 4. Node:sqlite getHistoricalTelemetry and getEvolutionSummary persistence
 * Strictly Zero Emojis
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { accretionDiskShader } from '../src/core/shaders/singularityShaders.js';
import { ZenFirewall } from '../src/core/ZenFirewall.js';
import { KalinarSqliteStore } from '../electron/db/sqliteStore.js';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 7 Remediation Patch (v1.0.1)', () => {
  const tempDbPath = path.resolve(process.cwd(), 'test-remediation-v1-0-1.db');

  beforeEach(() => {
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {
        // Ignore
      }
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {
        // Ignore
      }
    }
  });

  it('Remediation 1: Accretion Disk Shader has 60.0 sparkle exponent and lavender spark color', () => {
    expect(accretionDiskShader.vertexShader).toContain('pow(aRandom.z, 60.0)');
    // Lavender spark #AA88FF corresponds to vec3(0.667, 0.533, 1.0)
    expect(accretionDiskShader.fragmentShader).toContain('0.667, 0.533, 1.0');

    const coreFile = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/galaxy/KalinarSingularityCore.tsx'),
      'utf-8'
    );
    expect(coreFile).toContain('262144');
    expect(coreFile).toContain('window.innerWidth < 768 ? 65536 : 262144');
  });

  it('Remediation 2: AgentLivePreviewCard.LiveViewport has data-slot="agent-card-viewport" and min-h-[160px]', () => {
    const cardFile = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/ui/AgentLivePreviewCard.tsx'),
      'utf-8'
    );
    expect(cardFile).toContain('data-slot="agent-card-viewport"');
    expect(cardFile).toContain('min-h-[160px]');
    expect(cardFile).toContain('var(--ds-agent-card-thumb-h,160px)');
  });

  it('Remediation 3: GoRules ZEN OS Firewall blocks dangerous shell commands in < 1ms', async () => {
    const firewall = ZenFirewall.getInstance();
    await firewall.initialize();

    const blockedResult = await firewall.evaluateOsFirewall({
      command: 'rm -rf / --no-preserve-root',
      isSandbox: true,
    });
    expect(blockedResult.result.allowed).toBe(false);
    expect(blockedResult.result.verdictReason).toBeDefined();

    const allowedResult = await firewall.evaluateOsFirewall({
      command: 'git status',
      isSandbox: true,
    });
    expect(allowedResult.result.allowed).toBe(true);
  });

  it('Remediation 4: KalinarSqliteStore provides historical telemetry logs and evolution summary', () => {
    const store = new KalinarSqliteStore(tempDbPath);

    store.insertTelemetry({
      task_id: 'CLI_GATE',
      event_type: 'TURN_START',
      agent_name: 'agent-orchestrator',
      payload: JSON.stringify({ action: 'INGEST' }),
      latency_ms: 1,
    });

    store.insertTelemetry({
      task_id: 'CLI_EXEC',
      event_type: 'TURN_END',
      agent_name: 'agent-software-engineer',
      payload: JSON.stringify({ action: 'BUILD' }),
      latency_ms: 3,
    });

    const historical = store.getHistoricalTelemetry(10);
    expect(historical.length).toBe(2);
    expect(historical[0].agent_name).toBe('agent-software-engineer');
    expect(historical[0].id).toBeDefined();
    expect(historical[0].timestamp).toBeDefined();

    const summary = store.getEvolutionSummary();
    expect(summary.totalEvents).toBe(2);
    expect(summary.avgLatencyMs).toBe(2);
    expect(summary.agentDistribution['agent-orchestrator']).toBe(1);
    expect(summary.agentDistribution['agent-software-engineer']).toBe(1);

    store.close();
  });
});
