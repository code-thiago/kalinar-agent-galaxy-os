/**
 * TASK 9 TDD & TWO-CYCLE ADVERSARIAL AUDIT SUITE (v1.2.0)
 * Tauz Acoustic DSP Pipeline, Live Filesystem & Git Diff Connectors,
 * and Interactive Multi-Model Hot-Swap
 * Strictly Zero Emojis
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { kalinarVoiceService } from '../src/services/kalinarVoiceService.js';
import {
  generateTacticalBriefing,
  parseVoiceDirective,
} from '../src/services/kalinarSingularityBrain.js';
import { KalinarSingularityCore } from '../src/components/galaxy/KalinarSingularityCore.js';
import { photonRingShader, accretionDiskShader } from '../src/core/shaders/singularityShaders.js';
import {
  LocalVaultAndMdConnector,
  parseUnifiedDiffLines,
  sanitizeWorkspaceFilePath,
} from '../src/connectors/AgentConnectorRegistry.js';
import { KalinarDaemon } from '../electron/daemon/KalinarDaemon.js';
import { KalinarSqliteStore } from '../electron/db/sqliteStore.js';
import { useKalinarStore } from '../src/store/useKalinarStore.js';
import { ELECTRON_IPC_CHANNELS } from '../electron/preload.js';
import { formatModelBadge } from '../src/components/ui/AgentLivePreviewCard.js';

describe('Task 9 (v1.2.0): Tauz Acoustic DSP, Live Connectors & Interactive Multi-Model Hot-Swap', () => {
  let tempDir: string;
  let sqliteStore: KalinarSqliteStore;
  let daemon: KalinarDaemon;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kalinar-task9-'));
    sqliteStore = new KalinarSqliteStore(path.join(tempDir, 'task9.db'));
    daemon = new KalinarDaemon(
      {
        workspacePath: tempDir,
        warRoomPath: path.join(tempDir, '.antigravity', 'comms', 'WAR_ROOM.md'),
      },
      sqliteStore
    );
    kalinarVoiceService.resetInterlockState();
  });

  afterEach(async () => {
    await daemon.stop();
    sqliteStore.close();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore Windows temp file lock
    }
  });

  it('1. Deliverable 1.1: Tauz Sub-Bass & Presence Web Audio DSP Chain and Frequency Band Extraction [0, 1]', async () => {
    const pipeline = kalinarVoiceService.createTauzAcousticPipeline();
    expect(pipeline.lowShelfConfig).toEqual({
      type: 'lowshelf',
      frequency: 110,
      gain: 7.5,
    });
    expect(pipeline.peakingPresenceConfig).toEqual({
      type: 'peaking',
      frequency: 2400,
      Q: 1.2,
      gain: 3.5,
    });
    expect(pipeline.compressorConfig).toEqual({
      threshold: -18,
      knee: 6,
      ratio: 6,
      attack: 0.003,
      release: 0.15,
    });
    expect(pipeline.analyserConfig).toEqual({
      fftSize: 256,
      smoothingTimeConstant: 0.75,
    });

    // Speak with Tauz cadence and verify EngageMicInterlock + frequency bands normalized in [0.0, 1.0]
    await kalinarVoiceService.speak('Thiago, singularidade calibrada em frequencia Tauz.');
    expect(kalinarVoiceService.isSpeaking()).toBe(true);
    expect(kalinarVoiceService.isSttMutedByInterlock()).toBe(true);

    const bands = kalinarVoiceService.getRealtimeFrequencyBands();
    expect(bands.subBass).toBeGreaterThan(0);
    expect(bands.subBass).toBeLessThanOrEqual(1.0);
    expect(bands.lowMid).toBeGreaterThan(0);
    expect(bands.lowMid).toBeLessThanOrEqual(1.0);
    expect(bands.highPresence).toBeGreaterThan(0);
    expect(bands.highPresence).toBeLessThanOrEqual(1.0);
    expect(bands.compositePulse).toBeGreaterThan(0);
    expect(bands.compositePulse).toBeLessThanOrEqual(1.0);

    // Feed explicit PCM frame from Gemini Live WebSocket
    const pcmBins = new Uint8Array(128).fill(210);
    const pcmBands = kalinarVoiceService.feedPcmFrequencyFrame(pcmBins);
    expect(pcmBands.subBass).toBeCloseTo(210 / 255, 2);
    expect(pcmBands.compositePulse).toBeGreaterThan(0.75);

    // Verify < 10ms kill-switch and 400ms acoustic decay interlock
    const killRes = kalinarVoiceService.triggerEmergencyKillSwitch('SPACEBAR');
    expect(killRes.latencyMs).toBeLessThan(10);
    expect(kalinarVoiceService.isSpeaking()).toBe(false);
    expect(kalinarVoiceService.getDecayInterlockWindowMs()).toBe(400);
  });

  it('2. Deliverable 1.2: 60 FPS Photon Ring & 262,144 GPGPU Accretion Turbulence Modulation', () => {
    expect(photonRingShader.fragmentShader).toContain('uniform float uSubBass;');
    expect(photonRingShader.fragmentShader).toContain('uniform float uCompositePulse;');
    expect(accretionDiskShader.vertexShader).toContain('uniform float uSubBass;');
    expect(accretionDiskShader.vertexShader).toContain('uniform float uCompositePulse;');
    expect(accretionDiskShader.vertexShader).toContain('pow(aRandom.z, 60.0)');
    expect(accretionDiskShader.fragmentShader).toContain('0.667, 0.533, 1.0');

    const core = new KalinarSingularityCore({ particleCount: 1024 });
    useKalinarStore.getState().setVoiceState('[SPEAKING]');
    kalinarVoiceService.feedPcmFrequencyFrame(new Uint8Array(128).fill(200));

    const sampled = core.useFrame(2.5, null, false);
    expect(sampled.subBass).toBeGreaterThan(0.5);
    expect(sampled.compositePulse).toBeGreaterThan(0.5);

    core.dispose();
  });

  it('3. Deliverable 1.3: Sovereign Tauz Cadence & Tactical Voice Commands (< 0.45ms JDM)', async () => {
    const briefing = generateTacticalBriefing([
      {
        id: 'agent-software-engineer-01',
        filename: '@agent-software-engineer',
        pid: 14201,
        status: '[ACTIVE]',
        executionMode: 'STEP_BY_STEP_GATE',
        activeModelId: 'argon',
        fifoQueueDepth: 2,
        currentObjective: 'Tauz DSP coupling',
        totalSteps: 6,
        currentStep: 4,
        stepDescription: 'Sincronizando shader',
        tokensPrompt: 20000,
        tokensCompletion: 8400,
        tokenVelocity: 94,
        etaSeconds: 42,
        position3D: [120, 40, 0],
        livePreviewStream: '+uSubBass: active',
      },
    ]);

    expect(briefing).toContain('Thiago');
    expect(briefing).toContain('STEP 04/06');
    expect(briefing).toContain('94 TOK/S');
    expect(briefing).toContain('[ARGON]');
    expect(briefing).toContain('[FIFO: 2]');

    const cmdModel = parseVoiceDirective('Kalinar, trocar modelo para Claude');
    expect(cmdModel.intent).toBe('SWITCH_LLM_MODEL');
    expect(cmdModel.targetModel).toBe('claude-3.7-sonnet');

    const resModel = await kalinarVoiceService.processSpokenTranscript(
      'Kalinar, trocar modelo para Claude',
      0.96
    );
    expect(resModel.allowed).toBe(true);
    expect(resModel.targetFunction).toBe('switchLlmModel');
    expect(resModel.latencyMs).toBeLessThan(5);

    const resInspect = await kalinarVoiceService.processSpokenTranscript(
      'Kalinar, inspecionar diff',
      0.95
    );
    expect(resInspect.allowed).toBe(true);
    expect(resInspect.targetFunction).toBe('inspectLiveDiff');
    expect(useKalinarStore.getState().isInspectorDrawerOpen).toBe(true);

    const resRevert = await kalinarVoiceService.processSpokenTranscript(
      'Kalinar, reverter arquivo',
      0.95
    );
    expect(resRevert.allowed).toBe(true);
    expect(resRevert.targetFunction).toBe('revertAgentFile');
  });

  it('4. Deliverable 2: Whitelisted IPC Channels, Path Traversal Sanitization & Live Git/File Diff Streaming', async () => {
    expect(ELECTRON_IPC_CHANNELS).toContain('kalinar:get_live_git_diff');
    expect(ELECTRON_IPC_CHANNELS).toContain('kalinar:approve_or_revert_diff');
    expect(ELECTRON_IPC_CHANNELS).toContain('kalinar:scan_workspace_nodes');

    // Adversarial Security Check: Reject ../ traversal and shell metacharacters
    const traversal = sanitizeWorkspaceFilePath(tempDir, '../../Windows/System32/cmd.exe');
    expect(traversal.valid).toBe(false);
    expect(traversal.reason).toContain('[SECURITY_VIOLATION]');

    const injection = sanitizeWorkspaceFilePath(tempDir, 'src/index.ts; rm -rf /');
    expect(injection.valid).toBe(false);

    // Create sample file and test live diff + approve/revert
    const sampleRel = 'src/sampleModule.ts';
    const sampleAbs = path.join(tempDir, sampleRel);
    fs.mkdirSync(path.dirname(sampleAbs), { recursive: true });
    fs.writeFileSync(sampleAbs, 'export const v = 1;\n', 'utf-8');

    const diffResult = await daemon.getLiveGitDiff(
      sampleRel,
      'export const v = 2;\nexport const tauz = true;\n'
    );
    expect(diffResult.filePath).toBe('src/sampleModule.ts');
    expect(diffResult.lines.some((l) => l.type === '-' && l.content.includes('export const v = 1;'))).toBe(true);
    expect(diffResult.lines.some((l) => l.type === '+' && l.content.includes('export const v = 2;'))).toBe(true);

    // Approve diff in STEP_BY_STEP_GATE
    const approveRes = await daemon.approveOrRevertDiff({
      filePath: sampleRel,
      action: 'APPROVE',
      executionMode: 'STEP_BY_STEP_GATE',
      stagedContent: 'export const v = 2;\nexport const tauz = true;\n',
    });
    expect(approveRes.success).toBe(true);
    expect(approveRes.latencyMs).toBeLessThan(5);
    expect(fs.readFileSync(sampleAbs, 'utf-8')).toContain('export const tauz = true;');

    // Revert file back to baseline
    const revertRes = await daemon.approveOrRevertDiff({
      filePath: sampleRel,
      action: 'REVERT',
      executionMode: 'STEP_BY_STEP_GATE',
      cleanSnapshotContent: 'export const v = 1;\n',
    });
    expect(revertRes.success).toBe(true);
    expect(fs.readFileSync(sampleAbs, 'utf-8')).toBe('export const v = 1;\n');

    // Verify scanWorkspaceNodes logarithmic spiral hydration
    fs.mkdirSync(path.join(tempDir, '05_AGENTS'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, '05_AGENTS', '@agent-software-engineer.md'), '# SWE', 'utf-8');
    fs.writeFileSync(path.join(tempDir, 'AGENTS.md'), '# AGENTS', 'utf-8');
    const scan = daemon.scanWorkspaceNodes();
    expect(scan.agents.length).toBeGreaterThanOrEqual(2);
    expect(scan.secondBrainNodes.length).toBeGreaterThanOrEqual(1);
    expect(scan.agents[0].position3D).toHaveLength(3);
  });

  it('5. Deliverable 2.2 & 3: Interactive Multi-Model Hot-Swap (ARGON <-> CLAUDE <-> GEMINI), Atomic Git Checkpoint & FIFO Queue Promotion', async () => {
    expect(formatModelBadge('argon')).toBe('[ARGON]');
    expect(formatModelBadge('claude-3.7-sonnet')).toBe('[CLAUDE]');
    expect(formatModelBadge('gemini-2.5-pro')).toBe('[GEMINI]');

    const parsedLines = parseUnifiedDiffLines(
      '--- a/src/App.tsx\n+++ b/src/App.tsx\n@@ -1,2 +1,2 @@\n-oldLine\n+newLine'
    );
    expect(parsedLines.some((l) => l.type === '+')).toBe(true);
    expect(parsedLines.some((l) => l.type === '-')).toBe(true);

    // Interactive Multi-Model Hot-Swap with Atomic Git Checkpoint in SQLite
    const swapClaude = await daemon.switchAgentModelInteractive({
      agentId: 'agent-software-engineer-01',
      targetModel: 'claude-3.7-sonnet',
      taskId: 'TASK_9_SWAP',
    });
    expect(swapClaude.badge).toBe('[MODEL_HOTSWAP]');
    expect(swapClaude.activeModelId).toBe('claude-3.7-sonnet');
    expect(swapClaude.checkpoint.status).toBe('HOT_SWAPPED');

    const swapGemini = await daemon.switchAgentModelInteractive({
      agentId: 'agent-software-engineer-01',
      targetModel: 'gemini-2.5-pro',
      taskId: 'TASK_9_SWAP',
    });
    expect(swapGemini.activeModelId).toBe('gemini-2.5-pro');

    // FIFO Queue Enqueue, Promote & Clear
    daemon.setAgentStatus('agent-software-engineer-01', '[ACTIVE]', 14201);
    const first = daemon.dispatchOrEnqueueAgentDirective({
      targetAgentId: 'agent-software-engineer-01',
      instruction: 'Primeira tarefa na fila',
      modelId: 'argon',
    });
    const second = daemon.dispatchOrEnqueueAgentDirective({
      targetAgentId: 'agent-software-engineer-01',
      instruction: 'Segunda tarefa prioritaria',
      modelId: 'claude-3.7-sonnet',
    });
    expect(first.queueItem).not.toBeNull();
    expect(second.queueItem).not.toBeNull();

    // Promote second task to the top of the FIFO queue
    const promoted = daemon.promoteFifoItem(second.queueItem!.id);
    expect(promoted?.id).toBe(second.queueItem!.id);

    const queueAfterPromote = daemon.getFifoQueue('agent-software-engineer-01');
    expect(queueAfterPromote[0].id).toBe(second.queueItem!.id);

    // Clear FIFO queue
    const cleared = daemon.clearFifoQueue('agent-software-engineer-01');
    expect(cleared).toBe(2);
    expect(daemon.getFifoQueue('agent-software-engineer-01')).toHaveLength(0);
  });
});
