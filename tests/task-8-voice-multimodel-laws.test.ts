import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { ZenFirewall } from '../src/core/ZenFirewall.js';
import { KalinarSqliteStore } from '../electron/db/sqliteStore.js';
import { KalinarDaemon } from '../electron/daemon/KalinarDaemon.js';
import { KalinarVoiceService } from '../src/services/kalinarVoiceService.js';
import { useKalinarStore } from '../src/store/useKalinarStore.js';
import {
  FifoQueueItemSchema,
  LlmModelCheckpointSchema,
  StreamDigestSchema,
  TwoPhaseVoiceAckSchema,
} from '../src/types/kalinar.js';

describe('Task 8: The 7 Laws of Voice & Multi-Model Orchestration (v1.1.0)', () => {
  let store: KalinarSqliteStore;
  let daemon: KalinarDaemon;
  let firewall: ZenFirewall;
  let voiceService: KalinarVoiceService;
  let testDbPath: string;
  let testWarRoomPath: string;

  beforeEach(async () => {
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    testDbPath = path.resolve(process.cwd(), `test-task8-${uid}.db`);
    testWarRoomPath = path.resolve(process.cwd(), `test-war-room-${uid}.md`);
    fs.writeFileSync(testWarRoomPath, '# TEST WAR ROOM\n', 'utf-8');

    store = new KalinarSqliteStore(testDbPath);
    daemon = new KalinarDaemon(
      {
        workspacePath: process.cwd(),
        warRoomPath: testWarRoomPath,
      },
      store
    );
    firewall = ZenFirewall.getInstance();
    await firewall.initialize();
    voiceService = KalinarVoiceService.getInstance();
  });

  afterEach(async () => {
    await daemon.stop();
    store.close();
    for (const f of [
      testDbPath,
      `${testDbPath}-wal`,
      `${testDbPath}-shm`,
      testWarRoomPath,
    ]) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch {
          // Best-effort cleanup
        }
      }
    }
  });

  it('Law 1: executes < 10ms Escape / Singularity-click TTS kill-switch and enforces 400ms mic interlock decay', async () => {
    voiceService.engageMicInterlock();
    expect(voiceService.isMicInterlockEngaged()).toBe(true);

    // 1. Trigger < 10ms Escape kill-switch
    const escKill = voiceService.triggerEmergencyKillSwitch('ESCAPE_KEY');
    expect(escKill.latencyMs).toBeLessThan(10.0);
    expect(escKill.ttsAborted).toBe(true);
    expect(escKill.newVoiceState).toBe('[LISTENING PT-BR]');
    expect(useKalinarStore.getState().singularity.voiceState).toBe('[LISTENING PT-BR]');
    expect(voiceService.isMicInterlockEngaged()).toBe(false);

    // 2. Trigger < 10ms Singularity-click kill-switch
    voiceService.engageMicInterlock();
    const clickKill = voiceService.triggerEmergencyKillSwitch('SINGULARITY_CLICK');
    expect(clickKill.latencyMs).toBeLessThan(10.0);
    expect(clickKill.newVoiceState).toBe('[LISTENING PT-BR]');

    // 3. Verify 400ms post-TTS acoustic interlock decay constant & release
    expect(KalinarVoiceService.MIC_INTERLOCK_DECAY_MS).toBe(400);
    voiceService.engageMicInterlock();
    expect(voiceService.isMicInterlockEngaged()).toBe(true);
    await voiceService.releaseMicInterlockWithDecay(20);
    expect(voiceService.isMicInterlockEngaged()).toBe(false);
  });

  it('Law 2: enforces 200-entry Ring Buffer cap and extracts < 150 token deterministic Stream-to-Digest', () => {
    // Push 225 raw log chunks and verify Ring Buffer stays strictly capped at 200
    for (let i = 0; i < 225; i++) {
      daemon.appendStreamChunk(`Raw terminal line ${i}`, 'CLI_EXEC', 'agent-software-engineer');
    }
    const buffer = daemon.getStreamRingBuffer();
    expect(buffer.length).toBe(200);
    expect(buffer[0].rawLog).toBe('Raw terminal line 25');

    // Extract deterministic StreamDigest from a verbose multi-line TypeScript error dump
    const verboseCompilerDump = [
      'npm run build',
      '> tsc --noEmit',
      'src/components/galaxy/KalinarSingularityCore.tsx(88,14): error TS2322: Type string is not assignable to type number.',
      ...Array.from({ length: 80 }, (_, idx) => `    at Object.compileFrame_${idx} (node_modules/typescript/lib/tsc.js:${idx}:12)`),
      'Process exited with code 2',
    ].join('\n');

    const digest = daemon.extractStreamDigest(
      verboseCompilerDump,
      'TASK-BUILD-08',
      'agent-software-engineer'
    );

    const validated = StreamDigestSchema.parse(digest);
    expect(validated.exitCode).toBe(2);
    expect(validated.filePath).toBe('src/components/galaxy/KalinarSingularityCore.tsx');
    expect(validated.line).toBe(88);
    expect(validated.col).toBe(14);
    expect(validated.errorSignature).toContain('error TS2322');
    expect(validated.tokenCount).toBeLessThanOrEqual(150);
  });

  it('Law 3: maintains 90,000ms Hot Window and auto-hibernates to [VOICE_HIBERNATE] after 90s of silence', () => {
    const baseTime = 1_700_000_000_000;
    voiceService.touchHotWindow(baseTime);
    useKalinarStore.getState().setVoiceState('[STANDBY]');

    // At +45,000ms (< 90s), session remains active in Hot Window
    const expiredAt45s = voiceService.checkHotWindowExpiration(baseTime + 45_000);
    expect(expiredAt45s).toBe(false);
    expect(useKalinarStore.getState().singularity.voiceState).toBe('[STANDBY]');

    // At +90,001ms (>= 90s), session automatically transitions to [VOICE_HIBERNATE]
    const expiredAt90s = voiceService.checkHotWindowExpiration(baseTime + 90_001);
    expect(expiredAt90s).toBe(true);
    expect(useKalinarStore.getState().singularity.voiceState).toBe('[VOICE_HIBERNATE]');

    // Touching hot window wakes session from [VOICE_HIBERNATE] back to [STANDBY]
    voiceService.touchHotWindow(baseTime + 95_000);
    expect(useKalinarStore.getState().singularity.voiceState).toBe('[STANDBY]');
  });

  it('Law 4: enforces Two-Phase Voice Ack (STATUS_DISPATCHED vs STATUS_VERIFIED gated by exitCode === 0)', async () => {
    // Phase 1: STATUS_DISPATCHED announces dispatch only, never claiming completion
    const phase1 = await voiceService.emitPhase1DispatchedAck({
      taskId: 'TASK-LAW4',
      targetAgentId: '@agent-software-engineer',
      pid: 14202,
      isFifoQueued: false,
    });

    const parsedPhase1 = TwoPhaseVoiceAckSchema.parse(phase1);
    expect(parsedPhase1.phase).toBe('STATUS_DISPATCHED');
    expect(parsedPhase1.spokenMessage).toContain('[ACK_DISPATCHED]');
    expect(parsedPhase1.spokenMessage).not.toContain('[ACK_VERIFIED]');
    expect(useKalinarStore.getState().singularity.lastAckBadge).toBe('[ACK_DISPATCHED]');

    // Phase 2 with non-zero exitCode (exitCode: 1) MUST be rejected
    const failedPhase2 = await voiceService.emitPhase2VerifiedAck({
      taskId: 'TASK-LAW4',
      targetAgentId: '@agent-software-engineer',
      pid: 14202,
      exitCode: 1,
      sqliteVerified: true,
    });
    expect(failedPhase2.ack).toBeNull();
    expect(failedPhase2.arbitrationVerdict).toBe('REJECTED_NON_ZERO_EXIT');

    // Phase 2 with exitCode === 0 and sqliteVerified === true emits STATUS_VERIFIED
    useKalinarStore.getState().setVoiceState('[STANDBY]');
    const verifiedPhase2 = await voiceService.emitPhase2VerifiedAck({
      taskId: 'TASK-LAW4',
      targetAgentId: '@agent-software-engineer',
      pid: 14202,
      exitCode: 0,
      sqliteVerified: true,
    });
    expect(verifiedPhase2.ack).not.toBeNull();
    expect(verifiedPhase2.ack?.phase).toBe('STATUS_VERIFIED');
    expect(verifiedPhase2.ack?.exitCode).toBe(0);
    expect(verifiedPhase2.ack?.spokenMessage).toContain('[ACK_VERIFIED]');
    expect(useKalinarStore.getState().singularity.lastAckBadge).toBe('[ACK_VERIFIED]');
  });

  it('Law 5: Speech Arbitration Rule B queues non-emergency Phase 2 notifications in PendingVoiceQueue during [LISTENING PT-BR] and preempts on [HALTED] / HARD_BLOCK', async () => {
    // Clear any prior queue
    await voiceService.flushPendingVoiceQueue();

    // Operator is actively speaking ([LISTENING PT-BR])
    useKalinarStore.getState().setVoiceState('[LISTENING PT-BR]');

    const standardNotif = await voiceService.emitPhase2VerifiedAck({
      taskId: 'TASK-RULE-B-1',
      targetAgentId: '@agent-data',
      exitCode: 0,
      sqliteVerified: true,
    });

    expect(standardNotif.arbitrationVerdict).toBe('QUEUE_IN_PENDING_VOICE');
    expect(voiceService.getPendingVoiceQueue().length).toBe(1);
    expect(useKalinarStore.getState().singularity.pendingVoiceQueueCount).toBe(1);

    // Emergency [HALTED] or HARD_BLOCK preempts immediately even while [LISTENING PT-BR]
    const emergencyNotif = await voiceService.emitPhase2VerifiedAck({
      taskId: 'TASK-RULE-B-EMG',
      targetAgentId: '@agent-cybersecurity',
      exitCode: 1,
      agentStatus: '[HALTED]',
      firewallVerdict: 'HARD_BLOCK',
    });

    expect(emergencyNotif.arbitrationVerdict).toBe('PREEMPT_IMMEDIATELY');
    expect(emergencyNotif.ack?.emergencyPreempt).toBe(true);

    // Flushing PendingVoiceQueue after operator finishes speaking delivers queued items
    const flushed = await voiceService.flushPendingVoiceQueue();
    expect(flushed.length).toBe(1);
    expect(flushed[0].taskId).toBe('TASK-RULE-B-1');
    expect(voiceService.getPendingVoiceQueue().length).toBe(0);
  });

  it('Law 6: Busy Agent FIFO Queue enqueues directives into SQLite and WAR_ROOM.md without killing active PID, and auto-dequeues on exitCode === 0', () => {
    const agentId = 'agent-software-engineer';

    // 1. First dispatch sets agent [ACTIVE] with PID 15500
    const firstDispatch = daemon.dispatchOrEnqueueAgentDirective({
      targetAgentId: agentId,
      instruction: 'Implementar schema SQLite WAL',
      modelId: 'argon',
      pid: 15500,
    });
    expect(firstDispatch.dispatchedImmediately).toBe(true);
    expect(firstDispatch.badge).toBe('[ACK_DISPATCHED]');
    expect(daemon.getAgentStatus(agentId)).toBe('[ACTIVE]');
    expect(daemon.getAgentPid(agentId)).toBe(15500);

    // 2. Second directive arrives while agent is [ACTIVE] -> must enqueue in FIFO without altering PID 15500
    const secondDispatch = daemon.dispatchOrEnqueueAgentDirective({
      targetAgentId: agentId,
      instruction: 'Adicionar testes unitarios Vitest',
      modelId: 'claude-sonnet',
    });
    expect(secondDispatch.dispatchedImmediately).toBe(false);
    expect(secondDispatch.badge).toBe('[FIFO_QUEUED]');
    expect(daemon.getAgentPid(agentId)).toBe(15500);
    expect(secondDispatch.queueItem).not.toBeNull();

    const parsedQueueItem = FifoQueueItemSchema.parse(secondDispatch.queueItem);
    expect(parsedQueueItem.status).toBe('FIFO_QUEUED');

    // Verify SQLite queue table and WAR_ROOM.md pointer line
    const queuedInDb = store.getAgentFifoQueue(agentId);
    expect(queuedInDb.length).toBe(1);
    expect(queuedInDb[0].instruction).toBe('Adicionar testes unitarios Vitest');

    const warRoomContent = fs.readFileSync(testWarRoomPath, 'utf-8');
    expect(warRoomContent).toContain('[FIFO_QUEUED]');
    expect(warRoomContent).toContain('Adicionar testes unitarios Vitest');

    // 3. Completing current turn (exitCode === 0) automatically dequeues and dispatches the FIFO item
    const completion = daemon.completeAgentTurn(agentId, 0, 'TASK-FIFO-1');
    expect(completion.verifiedAckEmitted).toBe(true);
    expect(completion.nextDequeuedItem).not.toBeNull();
    expect(completion.nextDequeuedItem?.status).toBe('DISPATCHED');
    expect(completion.nextDequeuedItem?.instruction).toBe('Adicionar testes unitarios Vitest');
    expect(daemon.getAgentStatus(agentId)).toBe('[ACTIVE]');
  });

  it('Law 7: evaluates llm-model-router.jdm.json in < 0.45ms across Argon/Claude/Gemini and performs atomic Git rollback + [MODEL_HOTSWAP] on HTTP 429/timeout', async () => {
    // 1. Verify sub-0.45ms deterministic routing across all 4 models
    const archRoute = await firewall.evaluateLlmModelRouter({ taskDomain: 'ARCHITECTURE' });
    expect(archRoute.latencyMs).toBeLessThan(0.45);
    expect(archRoute.result.activeModelId).toBe('argon');
    expect(archRoute.result.fallbackModelId).toBe('claude-sonnet');

    const uiRoute = await firewall.evaluateLlmModelRouter({ taskDomain: 'WEBGL_SHADER' });
    expect(uiRoute.latencyMs).toBeLessThan(0.45);
    expect(uiRoute.result.activeModelId).toBe('claude-sonnet');
    expect(uiRoute.result.fallbackModelId).toBe('argon');

    const ragRoute = await firewall.evaluateLlmModelRouter({ taskDomain: 'RAG_AUDIT' });
    expect(ragRoute.latencyMs).toBeLessThan(0.45);
    expect(ragRoute.result.activeModelId).toBe('gemini-pro');
    expect(ragRoute.result.fallbackModelId).toBe('argon');

    const fastRoute = await firewall.evaluateLlmModelRouter({ taskDomain: 'FAST_TRIAGE' });
    expect(fastRoute.latencyMs).toBeLessThan(0.45);
    expect(fastRoute.result.activeModelId).toBe('gemini-flash');
    expect(fastRoute.result.fallbackModelId).toBe('gemini-pro');

    // 2. Create Atomic Git Checkpoint before mutating a file
    const tempTrackedFile = path.resolve(process.cwd(), `test-dirty-${Date.now()}.tmp`);
    const cleanContent = 'export const CLEAN_STATE = true;\n';
    fs.writeFileSync(tempTrackedFile, cleanContent, 'utf-8');

    try {
      const checkpoint = await daemon.createAtomicGitCheckpoint(
        'agent-software-engineer',
        'SYSTEM',
        'ARCHITECTURE'
      );
      const validChk = LlmModelCheckpointSchema.parse(checkpoint);
      expect(validChk.activeModelId).toBe('argon');
      expect(validChk.fallbackModelId).toBe('claude-sonnet');
      expect(validChk.status).toBe('CHECKPOINTED');

      // Simulate dirty partial file write before stream failure
      fs.writeFileSync(tempTrackedFile, 'export const CORRUPT_PARTIAL = ', 'utf-8');

      // First HTTP 429 failure (retryCount === 0 -> RETRY_WITH_BACKOFF)
      const firstFail = await daemon.handleModelFailureAndHotSwap({
        checkpointId: checkpoint.id,
        taskDomain: 'ARCHITECTURE',
        errorCode: 429,
        dirtyFilePath: tempTrackedFile,
        cleanFileContent: cleanContent,
      });
      expect(firstFail.verdict).toBe('RETRY_WITH_BACKOFF');
      expect(firstFail.retryCount).toBe(1);
      expect(firstFail.activeModelId).toBe('argon');

      // Second TIMEOUT failure (retryCount === 1 -> ATOMIC_ROLLBACK_AND_HOTSWAP to claude-sonnet)
      const secondFail = await daemon.handleModelFailureAndHotSwap({
        checkpointId: checkpoint.id,
        taskDomain: 'ARCHITECTURE',
        errorCode: 'TIMEOUT',
        dirtyFilePath: tempTrackedFile,
        cleanFileContent: cleanContent,
      });
      expect(secondFail.verdict).toBe('ATOMIC_ROLLBACK_AND_HOTSWAP');
      expect(secondFail.badge).toBe('[MODEL_HOTSWAP]');
      expect(secondFail.activeModelId).toBe('claude-sonnet');
      expect(secondFail.rolledBackDirtyFiles).toBe(true);
      expect(secondFail.checkpoint.status).toBe('HOT_SWAPPED');

      // Verify dirty file was restored to clean content
      const restoredContent = fs.readFileSync(tempTrackedFile, 'utf-8');
      expect(restoredContent).toBe(cleanContent);
    } finally {
      if (fs.existsSync(tempTrackedFile)) {
        fs.unlinkSync(tempTrackedFile);
      }
    }
  });
});
