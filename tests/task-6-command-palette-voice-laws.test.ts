/**
 * TASK 6 VERIFICATION SUITE:
 * Tauz Acoustic DSP Pipeline (60 FPS), All 7 Voice & Multi-Model Laws (Argon/Claude/Gemini),
 * Proactive Server-Push Alerts, and Global Tactical Command Palette (Ctrl+K / Cmd+K)
 * Strictly Zero Emojis
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { KalinarCommandPalette } from '../src/components/hud/KalinarCommandPalette.js';
import { KalinarSingularityCore } from '../src/components/galaxy/KalinarSingularityCore.js';
import { KalinarVoiceService, kalinarVoiceService } from '../src/services/kalinarVoiceService.js';
import { KalinarDaemon } from '../electron/daemon/KalinarDaemon.js';
import { KalinarSqliteStore } from '../electron/db/sqliteStore.js';
import { ZenFirewall } from '../src/core/ZenFirewall.js';
import { eventBus } from '../src/core/KalinarEventBus.js';
import { useKalinarStore } from '../src/store/useKalinarStore.js';

describe('Task 6: Tauz Acoustic DSP, 7 Laws of Voice/Multi-Model & Ctrl+K Command Palette', () => {
  let tempDir: string;
  let sqliteStore: KalinarSqliteStore;
  let daemon: KalinarDaemon;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kalinar-task6-palette-'));
    sqliteStore = new KalinarSqliteStore(path.join(tempDir, 'task6.db'));
    daemon = new KalinarDaemon(
      {
        workspacePath: tempDir,
        debounceMs: 30,
        warRoomPath: path.join(tempDir, '.antigravity', 'comms', 'WAR_ROOM.md'),
      },
      sqliteStore
    );
    await ZenFirewall.getInstance().initialize();
    kalinarVoiceService.resetInterlockState();
    await kalinarVoiceService.flushPendingVoiceQueue();
    useKalinarStore.getState().setCommandPaletteOpen(false);
  });

  afterEach(async () => {
    await daemon.stop();
    sqliteStore.close();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore Windows temp lock
    }
  });

  it('1. Tauz Acoustic DSP Pipeline feeds normalized 60 FPS frequency bands into Fresnel Photon Ring for all active voice states', () => {
    const pipeline = kalinarVoiceService.createTauzAcousticPipeline();
    expect(pipeline.lowShelfConfig).toEqual({ type: 'lowshelf', frequency: 110, gain: 7.5 });
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
    expect(pipeline.analyserConfig).toEqual({ fftSize: 256, smoothingTimeConstant: 0.75 });

    const core = new KalinarSingularityCore({ particleCount: 512 });

    // Verify [KALINAR_SPEAKING] and [LISTENING PT-BR] both drive non-zero frequency bands in Photon Ring
    useKalinarStore.getState().setVoiceState('[KALINAR_SPEAKING]');
    kalinarVoiceService.feedPcmFrequencyFrame(new Uint8Array(128).fill(180));
    const speakingBands = core.useFrame(1.0, null, false);
    expect(speakingBands.subBass).toBeGreaterThan(0.5);
    expect(speakingBands.compositePulse).toBeGreaterThan(0.5);

    useKalinarStore.getState().setVoiceState('[LISTENING PT-BR]');
    const listeningBands = core.useFrame(1.5, null, false);
    expect(listeningBands.subBass).toBeGreaterThan(0.5);

    core.dispose();
  });

  it('2. Law 2 & Law 3: Daemon Stream-to-Digest evaluates < 0.45ms JDM and emits proactive server-push voice alert on step completion / halt', async () => {
    const receivedAlerts: any[] = [];
    const unsub = eventBus.on('daemon:server_push_alert', (alert) => {
      receivedAlerts.push(alert);
    });

    try {
      useKalinarStore.getState().setVoiceState('[STANDBY]');
      const out = await daemon.processStreamOutput({
        rawLog: [
          'vite build',
          'src/components/hud/KalinarCommandPalette.tsx(12,4): built in 320ms',
          'exitCode=0',
        ].join('\n'),
        taskId: 'TASK-BUILD-6',
        agentId: 'agent-software-engineer',
        explicitExitCode: 0,
      });

      expect(out.digest.exitCode).toBe(0);
      expect(out.digest.tokenCount).toBeLessThanOrEqual(150);
      expect(out.zenLatencyMs).toBeLessThan(0.45);
      expect(out.routingDecision.action).toBe('DISPATCH_AGENT');
      expect(receivedAlerts.length).toBe(1);
      expect(receivedAlerts[0].type).toBe('STEP_COMPLETED');

      // Law 3 & Law 5: Operator is listening ([LISTENING PT-BR]) -> non-emergency completion queues; halt preempts immediately
      await kalinarVoiceService.flushPendingVoiceQueue();
      useKalinarStore.getState().setVoiceState('[LISTENING PT-BR]');

      const queuedStep = await kalinarVoiceService.handleServerPushAlert({
        type: 'STEP_COMPLETED',
        taskId: 'TASK-6-STEP',
        targetAgentId: '@agent-software-engineer',
        exitCode: 0,
        sqliteVerified: true,
      });
      expect(queuedStep.arbitrationVerdict).toBe('QUEUE_IN_PENDING_VOICE');

      const preemptHalt = await kalinarVoiceService.handleServerPushAlert({
        type: 'AGENT_HALTED',
        taskId: 'TASK-6-HALT',
        targetAgentId: '@agent-cybersecurity',
        exitCode: 1,
        agentStatus: '[HALTED]',
      });
      expect(preemptHalt.arbitrationVerdict).toBe('PREEMPT_IMMEDIATELY');
      expect(preemptHalt.ack?.emergencyPreempt).toBe(true);
    } finally {
      unsub();
    }
  });

  it('3. Law 4 & Law 6: Chokidar debounce confirms SQLite WAL turn and [RUNNING] agent enqueues directives in FIFO without dropping PID', async () => {
    const agentId = 'agent-design';
    daemon.setAgentStatus(agentId, '[RUNNING]', 14203);

    const queued = daemon.dispatchOrEnqueueAgentDirective({
      targetAgentId: agentId,
      instruction: 'Ajustar tokens WCAG AAA na paleta Ctrl+K',
      modelId: 'claude-3.7-sonnet',
    });

    expect(queued.dispatchedImmediately).toBe(false);
    expect(queued.badge).toBe('[FIFO_QUEUED]');
    expect(daemon.getAgentPid(agentId)).toBe(14203);

    const completion = await daemon.confirmTurnWithChokidarDebounce(agentId, 0, 'TASK-DESIGN-6');
    expect(completion.verifiedAckEmitted).toBe(true);
    expect(completion.nextDequeuedItem?.status).toBe('DISPATCHED');

    const logs = sqliteStore.getHistoricalTelemetry(10);
    expect(logs.some((l) => l.event_type === 'TURN_END' && l.agent_name === agentId)).toBe(true);
  });

  it('4. Law 1 & Law 3 constants and KalinarCommandPalette mounting + store controls', () => {
    expect(KalinarVoiceService.MIC_INTERLOCK_DECAY_MS).toBe(400);
    expect(KalinarVoiceService.HOT_WINDOW_MS).toBe(90_000);

    // Command Palette React.memo check (zero forwardRef)
    expect((KalinarCommandPalette as any).$$typeof?.toString()).toContain('react.memo');

    // Store toggle check
    expect(useKalinarStore.getState().isCommandPaletteOpen).toBe(false);
    useKalinarStore.getState().toggleCommandPalette();
    expect(useKalinarStore.getState().isCommandPaletteOpen).toBe(true);
    useKalinarStore.getState().setCommandPaletteOpen(false);
    expect(useKalinarStore.getState().isCommandPaletteOpen).toBe(false);

    // Source verification of Ctrl+K / Cmd+K, Argon/Claude/Gemini hot-swap, RAG, Voice Link & App mounting
    const paletteSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/hud/KalinarCommandPalette.tsx'),
      'utf-8'
    );
    expect(paletteSrc).toContain("e.key.toLowerCase() === 'k'");
    expect(paletteSrc).toContain('e.ctrlKey || e.metaKey');
    expect(paletteSrc).toContain('ARGON');
    expect(paletteSrc).toContain('CLAUDE');
    expect(paletteSrc).toContain('GEMINI');
    expect(paletteSrc).toContain('__triggerGravitationalRAG');
    expect(paletteSrc).toContain('toggleVoiceLink');
    expect(paletteSrc).toContain('triggerEmergencyKillSwitch');
    expect(paletteSrc).not.toContain('forwardRef');

    const appSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');
    expect(appSrc).toContain('KalinarCommandPalette');
    expect(appSrc).toContain('onTelemetryStream');
    expect(appSrc).toContain('handleServerPushAlert');
  });

  it('5. Enforces strictly zero emojis and zero prohibited terms in all Task 6 files', () => {
    const files = [
      'src/components/hud/KalinarCommandPalette.tsx',
      'src/components/hud/TopRightTrigger.tsx',
      'src/components/hud/RightSingularityColumn.tsx',
      'src/components/galaxy/KalinarSingularityCore.tsx',
      'src/components/galaxy/KalinarGalaxyCanvas.tsx',
      'src/services/kalinarVoiceService.ts',
      'src/App.tsx',
      'electron/daemon/KalinarDaemon.ts',
      'electron/main.ts',
    ];

    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    const surrogateRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF]/;
    const prohibited = ['jarvis', 'j.a.r.v.i.s.'];

    for (const rel of files) {
      const content = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf-8');
      expect(emojiRegex.test(content), `Forbidden emoji in ${rel}`).toBe(false);
      expect(surrogateRegex.test(content), `Forbidden surrogate emoji in ${rel}`).toBe(false);
      const lower = content.toLowerCase();
      for (const term of prohibited) {
        expect(lower.includes(term), `Forbidden term ${term} in ${rel}`).toBe(false);
      }
    }
  });
});

