/**
 * KALINAR SOVEREIGN VOICE ENGINE & ACOUSTIC COUPLING SERVICE (v0.4.0-beta)
 * Web Audio AnalyserNode + Mic Interlock + Low-Mid Bass Resonance + Typewriter HUD Stream
 * Strictly Zero Emojis
 */

import { VoiceState } from '../types/kalinar.js';
import { useKalinarStore } from '../store/useKalinarStore.js';
import { kalinarSingularityBrain } from './kalinarSingularityBrain.js';
import { eventBus } from '../core/KalinarEventBus.js';

export interface VoiceServiceOptions {
  enableMic?: boolean;
  onAudioLevelChange?: (level: number) => void;
  onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
  onStateChange?: (state: VoiceState) => void;
}

export class KalinarVoiceService {
  private static instance: KalinarVoiceService;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;

  private recognition: any = null;
  private isListening = false;
  private isSpeaking = false;
  private micMutedByAcousticInterlock = false;

  private typewriterInterval: any = null;
  private currentFullTranscript = '';
  private displayedTranscript = '';

  private constructor() {}

  public static getInstance(): KalinarVoiceService {
    if (!KalinarVoiceService.instance) {
      KalinarVoiceService.instance = new KalinarVoiceService();
    }
    return KalinarVoiceService.instance;
  }

  /**
   * Initializes Web Audio Context and AnalyserNode
   */
  public async initializeAudio(): Promise<boolean> {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return false;
        this.audioContext = new AudioCtx();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.85;
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Attaches microphone input to the frequency analyser
   */
  public async enableMicrophone(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }

    try {
      await this.initializeAudio();
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (this.audioContext && this.analyser) {
        this.micSource = this.audioContext.createMediaStreamSource(this.micStream);
        this.micSource.connect(this.analyser);
      }

      this.setupSpeechRecognition();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns normalized audio frequency magnitude [0.0 - 2.5] for the Black Hole Singularity shader
   */
  public getAudioFrequencyMagnitude(): number {
    if (!this.analyser || !this.frequencyData) {
      return this.isSpeaking ? 1.25 : 0.05;
    }

    this.analyser.getByteFrequencyData(this.frequencyData);

    // Focus on lower and mid-range frequencies (bass and resonance of voice)
    let sum = 0;
    const count = Math.min(64, this.frequencyData.length);
    for (let i = 0; i < count; i++) {
      sum += this.frequencyData[i];
    }

    const average = sum / count;
    // Normalize to 0.0 - 2.5 range with exponential boost for voice dynamics
    const normalized = Math.min(2.5, Math.pow(average / 128.0, 1.3) * 1.8);
    return Math.max(0.04, normalized);
  }

  /**
   * Configures native Speech Recognition with strict pt-BR
   */
  private setupSpeechRecognition(): void {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'pt-BR';

    this.recognition.onstart = () => {
      this.isListening = true;
      if (!this.isSpeaking) {
        this.setVoiceState('[LISTENING]');
      }
    };

    this.recognition.onresult = async (event: any) => {
      // Acoustic interlock check: ignore input if Kalinar is currently speaking
      if (this.micMutedByAcousticInterlock || this.isSpeaking) {
        return;
      }

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeText = finalTranscript || interimTranscript;
      if (activeText.trim()) {
        this.startTypewriterStream(activeText.trim());
      }

      if (finalTranscript.trim()) {
        await this.handleUserDirective(finalTranscript.trim());
      }
    };

    this.recognition.onerror = () => {
      if (!this.isSpeaking) {
        this.setVoiceState('[STANDBY]');
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // Auto-restart recognition unless muted or speaking
      if (!this.micMutedByAcousticInterlock && !this.isSpeaking) {
        try {
          this.recognition.start();
        } catch {
          // Ignore restart error if already restarting
        }
      }
    };

    try {
      this.recognition.start();
    } catch {
      // Audio permission or already started
    }
  }

  /**
   * Speaks authoritative tactical response in pt-BR with low-mid bass boost
   */
  public async speakDirective(text: string): Promise<void> {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      this.startTypewriterStream(text);
      return;
    }

    // 1. Activate hardware/software acoustic interlock
    this.isSpeaking = true;
    this.micMutedByAcousticInterlock = true;
    this.setVoiceState('[SPEAKING]');

    // Stop recognition to eliminate self-triggering audio loops
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Safe to ignore
      }
    }

    // Cancel pending utterances
    window.speechSynthesis.cancel();

    // 2. Stream spoken response character-by-character into [singularity_core]
    this.startTypewriterStream(text);

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      // Low pitch and steady rhythmic cadence inspired by Tauz / deep cosmic commander
      utterance.pitch = 0.85;
      utterance.rate = 0.98;

      // Select Portuguese voice if available
      const voices = window.speechSynthesis.getVoices();
      const ptVoice =
        voices.find((v) => v.lang.startsWith('pt') && v.name.toLowerCase().includes('male')) ||
        voices.find((v) => v.lang.startsWith('pt'));
      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      utterance.onend = () => {
        this.isSpeaking = false;
        // Release acoustic interlock after small decay buffer (400ms)
        setTimeout(() => {
          this.micMutedByAcousticInterlock = false;
          this.setVoiceState('[STANDBY]');
          if (this.recognition) {
            try {
              this.recognition.start();
            } catch {
              // Ignore already active
            }
          }
          resolve();
        }, 400);
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        this.micMutedByAcousticInterlock = false;
        this.setVoiceState('[STANDBY]');
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Processes recognized user directive through GoRules ZEN Engine guardrail
   */
  public async handleUserDirective(rawText: string): Promise<void> {
    const brain = kalinarSingularityBrain;
    const parsed = brain.parseVoiceDirective(rawText);

    this.setVoiceState('[GRAVITY_PULL]');

    const evaluation = await brain.evaluateVoiceDirective(parsed);

    // Update ZEN Latency telemetry in store
    const store = useKalinarStore.getState();
    store.updateSingularityTranscript(rawText);

    if (evaluation.allowed) {
      // Execute verified action handlers
      switch (evaluation.output.targetHandler) {
        case 'activateSecondBrain': {
          if (typeof window !== 'undefined' && (window as any).__triggerGravitationalRAG) {
            (window as any).__triggerGravitationalRAG();
          }
          eventBus.emit('zen:rule_evaluated', {
            ruleKey: 'voice-command-guard.jdm.json',
            latencyMs: evaluation.latencyMs,
            allowed: true,
            details: { action: 'INGEST_DOCS', source: 'voice' },
          });
          break;
        }

        case 'getSwarmDevelopmentStatus': {
          const briefing = brain.generateTacticalBriefing({
            userName: 'Thiago',
            agents: store.agents,
            secondBrainDirectivesCount: 4,
            activeDirective: store.singularity.activeDirective,
          });
          await this.speakDirective(briefing);
          return;
        }

        case 'controlAgentExecution': {
          if (parsed.targetAgent && parsed.action) {
            eventBus.emit('agent:status_changed', {
              agentId: parsed.targetAgent,
              previous: '[ACTIVE]',
              current: parsed.action === 'PAUSE' ? '[PAUSED]' : '[HALTED]',
            });
          }
          break;
        }

        case 'dispatchAntigravityCommand': {
          eventBus.emit('agent:step_updated', {
            agentId: parsed.targetAgent || '@agent-software-engineer',
            step: 5,
            description: parsed.instruction || 'Relativistic dispatch',
            preview: `[RELATIVISTIC_DISPATCH]\nInstruction: ${parsed.rawText}`,
          });
          break;
        }
      }

      await this.speakDirective(evaluation.spokenResponse);
    } else {
      await this.speakDirective(evaluation.spokenResponse);
    }
  }

  /**
   * Character-by-character typewriter effect for the [singularity_core] HUD block
   */
  private startTypewriterStream(fullText: string): void {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }

    this.currentFullTranscript = fullText;
    let charIndex = 0;
    this.displayedTranscript = '';

    const store = useKalinarStore.getState();

    this.typewriterInterval = setInterval(() => {
      if (charIndex < this.currentFullTranscript.length) {
        this.displayedTranscript += this.currentFullTranscript.charAt(charIndex);
        charIndex++;
        store.updateSingularityTranscript(this.displayedTranscript);
      } else {
        clearInterval(this.typewriterInterval);
        this.typewriterInterval = null;
      }
    }, 18);
  }

  private setVoiceState(voiceState: VoiceState): void {
    const store = useKalinarStore.getState();
    store.updateSingularityTranscript(store.singularity.liveTranscript);
    useKalinarStore.setState((state) => ({
      singularity: {
        ...state.singularity,
        voiceState,
      },
    }));
  }

  public dispose(): void {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

export const kalinarVoiceService = KalinarVoiceService.getInstance();
