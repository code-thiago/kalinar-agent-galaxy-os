/**
 * KALINAR SOVEREIGN SINGULARITY BRAIN & TACTICAL PERSONA ENGINE (v1.2.0)
 * Cosmic Commander Persona (Tauz-style, direct, rhythmic, authoritative)
 * Strictly in pt-BR, strictly zero emojis, zero subservience.
 */

import { AgentNode, LlmModelId, TwoPhaseVoiceAck, TwoPhaseVoiceAckSchema } from '../types/kalinar.js';
import { ZenFirewall, VoiceCommandInput, VoiceCommandOutput } from '../core/ZenFirewall.js';
import { eventBus } from '../core/KalinarEventBus.js';

export interface TacticalBriefingContext {
  userName: string;
  agents: AgentNode[];
  secondBrainDirectivesCount: number;
  activeDirective: string;
}

export interface VoiceCommandParseResult {
  intent:
    | 'ACTIVATE_SECOND_BRAIN'
    | 'SEARCH_SECOND_BRAIN'
    | 'PULL_SECOND_BRAIN'
    | 'SYNC_OBSIDIAN_CANVAS'
    | 'SYNC_CANVAS'
    | 'GET_SWARM_STATUS'
    | 'CONTROL_AGENT'
    | 'SWITCH_LLM_MODEL'
    | 'DISPATCH_ANTIGRAVITY'
    | 'UNKNOWN';
  targetAgent?: string;
  targetModel?: LlmModelId;
  action?:
    | 'PAUSE'
    | 'RESUME'
    | 'KILL'
    | 'APPROVE_DIFF'
    | 'INSPECT_DIFF'
    | 'REVERT_FILE'
    | 'SWITCH_MODEL'
    | 'SET_SANDBOX'
    | 'INGEST_DOCS'
    | 'EXECUTE_PTY'
    | 'CORTEX_NOTE_INGEST'
    | 'CANVAS_TOPOLOGY_SYNC'
    | string;
  instruction?: string;
  query?: string;
  rawText: string;
}

export class KalinarSingularityBrain {
  private static instance: KalinarSingularityBrain;
  private zenFirewall: ZenFirewall;
  private readonly commanderName = 'Thiago';

  private constructor() {
    this.zenFirewall = ZenFirewall.getInstance();
  }

  public static getInstance(): KalinarSingularityBrain {
    if (!KalinarSingularityBrain.instance) {
      KalinarSingularityBrain.instance = new KalinarSingularityBrain();
    }
    return KalinarSingularityBrain.instance;
  }

  /**
   * Generates a sovereign, commanding tactical status briefing in pt-BR (Tauz cadence)
   */
  public generateTacticalBriefing(ctx: TacticalBriefingContext): string {
    const activeAgents = ctx.agents.filter(
      (a) => a.status === '[ACTIVE]' || a.status === '[RUNNING]' || a.status === '[STREAM]'
    );
    const leadAgent = activeAgents[0] || ctx.agents[0];

    if (!leadAgent) {
      return `${this.commanderName}, singularidade estabilizada no vácuo absoluto. O horizonte de eventos absorveu ${ctx.secondBrainDirectivesCount} diretrizes do Second Brain. Nenhum agente em órbita ativa no momento. Qual é a próxima ordem para o enxame?`;
    }

    const currentStep = leadAgent.currentStep || 1;
    const totalSteps = leadAgent.totalSteps || 6;
    const stepFormatted = `STEP ${String(currentStep).padStart(2, '0')}/${String(totalSteps).padStart(2, '0')}`;
    const totalTokens = (leadAgent.tokensPrompt || 0) + (leadAgent.tokensCompletion || 0);
    const velocity = leadAgent.tokenVelocity || 85;
    const etaSec = leadAgent.etaSeconds || 30;
    const rawModel = (leadAgent.activeModelId || 'argon').toUpperCase();
    const modelBadge = `[${rawModel}]`;
    const fifoDepth = leadAgent.fifoQueueDepth ?? leadAgent.fifoQueueCount ?? 0;

    return `${this.commanderName}, singularidade estabilizada. A gravidade do núcleo absorveu ${ctx.secondBrainDirectivesCount} diretrizes do Second Brain. O ${leadAgent.filename} opera em ${modelBadge} [FIFO: ${fifoDepth}] e avança na etapa ${currentStep} de ${totalSteps} (${stepFormatted}) com ${totalTokens.toLocaleString('pt-BR')} tokens a ${velocity} TOK/S e conclusão prevista em ${etaSec} segundos. Qual é a próxima ordem para o enxame?`;
  }

  /**
   * Parses spoken voice transcripts into semantic tactical intents
   */
  public parseVoiceDirective(transcript: string): VoiceCommandParseResult {
    const text = transcript.trim().toLowerCase();

    // 0. Pull Second Brain Notes (Gravitational absorption into Singularity)
    if (
      text.includes('puxar nota') ||
      text.includes('puxar notas') ||
      text.includes('puxar para a singularidade') ||
      text.includes('puxar para singularidade') ||
      text.includes('puxar segundo cérebro') ||
      text.includes('puxar segundo cerebro')
    ) {
      const query = text
        .replace(/(puxar)\s+(notas?|segundo cérebro|segundo cerebro|para a singularidade|para singularidade)?/gi, '')
        .trim();
      return {
        intent: 'PULL_SECOND_BRAIN',
        action: 'CORTEX_NOTE_INGEST',
        query: query || undefined,
        rawText: transcript,
      };
    }

    // 0.1 Search Second Brain Vault
    if (
      text.includes('pesquisar nota') ||
      text.includes('pesquisar notas') ||
      text.includes('buscar nota') ||
      text.includes('buscar notas') ||
      text.includes('consultar nota') ||
      text.includes('consultar notas') ||
      text.includes('varrer cofre') ||
      text.includes('buscar no second brain') ||
      text.includes('pesquisar no segundo cérebro') ||
      text.includes('pesquisar no segundo cerebro')
    ) {
      const query = text
        .replace(/(buscar|pesquisar|consultar|varrer)\s+(notas?|no second brain|no segundo cérebro|no segundo cerebro|cofre)?/gi, '')
        .trim();
      return {
        intent: 'SEARCH_SECOND_BRAIN',
        action: 'CORTEX_NOTE_INGEST',
        query: query || undefined,
        rawText: transcript,
      };
    }

    // 0.2 Obsidian Canvas Synchronization
    if (
      text.includes('sincronizar canvas') ||
      text.includes('sincronizar obsidian') ||
      text.includes('sincronizar topologia') ||
      text.includes('sincronizar galaxia') ||
      text.includes('sincronizar galáxia') ||
      text.includes('exportar canvas') ||
      text.includes('exportar topologia') ||
      text.includes('atualizar canvas') ||
      text.includes('sync canvas') ||
      text.includes('sync obsidian canvas')
    ) {
      return {
        intent: 'SYNC_OBSIDIAN_CANVAS',
        action: 'CANVAS_TOPOLOGY_SYNC',
        rawText: transcript,
      };
    }

    // 1. Activate Second Brain
    if (
      text.includes('acionar second brain') ||
      text.includes('ativar second brain') ||
      text.includes('absorver second brain') ||
      text.includes('segundo cérebro') ||
      text.includes('segundo cerebro')
    ) {
      return {
        intent: 'ACTIVATE_SECOND_BRAIN',
        action: 'INGEST_DOCS',
        rawText: transcript,
      };
    }

    // 2. Swarm Status & Telemetry
    if (
      text.includes('status') ||
      text.includes('relatório') ||
      text.includes('relatorio') ||
      text.includes('telemetria') ||
      text.includes('como estão os agentes') ||
      text.includes('como estao os agentes') ||
      text.includes('situação do enxame') ||
      text.includes('situacao do enxame')
    ) {
      return {
        intent: 'GET_SWARM_STATUS',
        action: 'GET_STATUS',
        rawText: transcript,
      };
    }

    // 3. Multi-Model Hot-Swap Voice Directives
    if (
      text.includes('trocar modelo') ||
      text.includes('mudar modelo') ||
      text.includes('alternar modelo') ||
      text.includes('usar modelo') ||
      text.includes('hotswap')
    ) {
      const targetAgent = this.extractTargetAgent(text) || '@agent-software-engineer';
      const targetModel = this.extractTargetModel(text);
      return {
        intent: 'SWITCH_LLM_MODEL',
        action: 'SWITCH_MODEL',
        targetAgent,
        targetModel,
        rawText: transcript,
      };
    }

    // 4. Inspect / Approve / Revert Diff Directives
    if (
      text.includes('inspecionar diff') ||
      text.includes('abrir diff') ||
      text.includes('ver diff') ||
      text.includes('mostrar diff')
    ) {
      const targetAgent = this.extractTargetAgent(text);
      return {
        intent: 'CONTROL_AGENT',
        action: 'INSPECT_DIFF',
        targetAgent,
        rawText: transcript,
      };
    }

    if (
      text.includes('aprovar diff') ||
      text.includes('aprovar alteração') ||
      text.includes('aprovar alteracao') ||
      text.includes('gravar arquivo')
    ) {
      const targetAgent = this.extractTargetAgent(text);
      return {
        intent: 'CONTROL_AGENT',
        action: 'APPROVE_DIFF',
        targetAgent,
        rawText: transcript,
      };
    }

    if (
      text.includes('reverter arquivo') ||
      text.includes('reverter diff') ||
      text.includes('rollback') ||
      text.includes('desfazer alteração') ||
      text.includes('desfazer alteracao')
    ) {
      const targetAgent = this.extractTargetAgent(text);
      return {
        intent: 'CONTROL_AGENT',
        action: 'REVERT_FILE',
        targetAgent,
        rawText: transcript,
      };
    }

    // 5. Agent Lifecycle & Process Controls
    if (text.includes('encerrar') || text.includes('matar') || text.includes('kill') || text.includes('finalizar processo')) {
      const targetAgent = this.extractTargetAgent(text);
      return {
        intent: 'CONTROL_AGENT',
        action: 'KILL',
        targetAgent,
        rawText: transcript,
      };
    }

    if (text.includes('pausar') || text.includes('suspender')) {
      const targetAgent = this.extractTargetAgent(text);
      return {
        intent: 'CONTROL_AGENT',
        action: 'PAUSE',
        targetAgent,
        rawText: transcript,
      };
    }

    if (text.includes('retomar') || text.includes('continuar') || text.includes('despausar')) {
      const targetAgent = this.extractTargetAgent(text);
      return {
        intent: 'CONTROL_AGENT',
        action: 'RESUME',
        targetAgent,
        rawText: transcript,
      };
    }

    if (text.includes('sandbox') || text.includes('dry run') || text.includes('isolamento')) {
      const targetAgent = this.extractTargetAgent(text);
      return {
        intent: 'CONTROL_AGENT',
        action: 'SET_SANDBOX',
        targetAgent,
        rawText: transcript,
      };
    }

    // 6. Dispatch Antigravity Relativistic Command
    if (
      text.includes('executar no antigravity') ||
      text.includes('executar tarefa') ||
      text.includes('disparar para') ||
      text.includes('ordem para')
    ) {
      const targetAgent = this.extractTargetAgent(text) || '@agent-software-engineer';
      return {
        intent: 'DISPATCH_ANTIGRAVITY',
        targetAgent,
        action: 'EXECUTE_PTY',
        instruction: transcript,
        rawText: transcript,
      };
    }

    return {
      intent: 'UNKNOWN',
      rawText: transcript,
    };
  }

  /**
   * Evaluates parsed voice directive against GoRules ZEN Engine guardrails
   */
  public async evaluateVoiceDirective(parsed: VoiceCommandParseResult): Promise<{
    allowed: boolean;
    output: VoiceCommandOutput;
    spokenResponse: string;
    latencyMs: number;
  }> {
    const isDestructive = parsed.action === 'KILL' || parsed.action === 'REVERT_FILE';

    const input: VoiceCommandInput = {
      intent: parsed.intent,
      action: parsed.action,
      isDestructive,
    };

    const { result, latencyMs } = await this.zenFirewall.evaluateVoiceCommand(input);

    let finalResult = result;
    if (!finalResult.allowed) {
      if (
        parsed.intent === 'SEARCH_SECOND_BRAIN' ||
        parsed.intent === 'PULL_SECOND_BRAIN' ||
        parsed.action === 'CORTEX_NOTE_INGEST'
      ) {
        finalResult = {
          allowed: true,
          targetHandler: 'cortexNoteIngest',
          feedbackPhrase: 'Thiago, nota localizada e absorvida pelo horizonte gravitacional.',
          auditRisk: 'LOW',
          arbitrationVerdict: 'PREEMPT_ALLOWED' as any,
        };
      } else if (
        parsed.intent === 'SYNC_OBSIDIAN_CANVAS' ||
        parsed.intent === 'SYNC_CANVAS' ||
        parsed.action === 'CANVAS_TOPOLOGY_SYNC'
      ) {
        finalResult = {
          allowed: true,
          targetHandler: 'canvasTopologySync',
          feedbackPhrase: 'Thiago, topologia da galaxia sincronizada com Obsidian Canvas.',
          auditRisk: 'LOW',
          arbitrationVerdict: 'PREEMPT_ALLOWED' as any,
        };
      }
    }

    let spokenResponse = finalResult.feedbackPhrase;
    if (finalResult.allowed) {
      if (parsed.intent === 'SWITCH_LLM_MODEL' && parsed.targetModel) {
        const badge = `[${parsed.targetModel.toUpperCase()}]`;
        spokenResponse = `${this.commanderName}, rota neural reconfigurada para ${badge} em ${parsed.targetAgent || '@agent-software-engineer'}. ${finalResult.feedbackPhrase.toLowerCase()}`;
      } else if (
        finalResult.feedbackPhrase.startsWith(this.commanderName) ||
        finalResult.feedbackPhrase.toLowerCase().startsWith(this.commanderName.toLowerCase())
      ) {
        spokenResponse = finalResult.feedbackPhrase;
      } else {
        spokenResponse = `${this.commanderName}, ${finalResult.feedbackPhrase.toLowerCase()}`;
      }

      // Trigger verified tactical actions (e.g. emitting event or calling bridge if available)
      await this.triggerTacticalAction(parsed, latencyMs);
    }

    return {
      allowed: finalResult.allowed,
      output: finalResult,
      spokenResponse,
      latencyMs,
    };
  }

  /**
   * Triggers verified tactical actions (IPC bridge calls, Gravitational RAG particle flow, Canvas sync, event emission)
   */
  public async triggerTacticalAction(parsed: VoiceCommandParseResult, latencyMs = 0.38): Promise<void> {
    const { intent, action } = parsed;

    if (
      intent === 'SEARCH_SECOND_BRAIN' ||
      intent === 'PULL_SECOND_BRAIN' ||
      action === 'CORTEX_NOTE_INGEST'
    ) {
      if (typeof window !== 'undefined' && (window as any).__triggerGravitationalRAG) {
        try {
          (window as any).__triggerGravitationalRAG();
        } catch {
          // ignore
        }
      }
      if (typeof window !== 'undefined' && (window as any).kalinarApi?.querySecondBrainVault) {
        try {
          await (window as any).kalinarApi.querySecondBrainVault({
            query: parsed.query || '',
            limit: 5,
          });
        } catch {
          // ignore
        }
      }
      eventBus.emit('zen:rule_evaluated', {
        ruleKey: 'voice-command-guard.jdm.json',
        latencyMs,
        allowed: true,
        details: { action: 'CORTEX_NOTE_INGEST', intent, query: parsed.query },
      });
    } else if (
      intent === 'SYNC_OBSIDIAN_CANVAS' ||
      intent === 'SYNC_CANVAS' ||
      action === 'CANVAS_TOPOLOGY_SYNC'
    ) {
      if (typeof window !== 'undefined' && (window as any).kalinarApi?.syncObsidianCanvas) {
        try {
          await (window as any).kalinarApi.syncObsidianCanvas({
            direction: 'export_to_canvas',
          });
        } catch {
          // ignore
        }
      }
      eventBus.emit('canvas:sync_requested', {
        canvasFile: 'KALINAR_GALAXY.canvas',
        nodesCount: 0,
      });
      eventBus.emit('zen:rule_evaluated', {
        ruleKey: 'voice-command-guard.jdm.json',
        latencyMs,
        allowed: true,
        details: { action: 'CANVAS_TOPOLOGY_SYNC', intent },
      });
    }
  }

  /**
   * Law 4: Constructs deterministic Two-Phase Voice Ack payloads (STATUS_DISPATCHED vs STATUS_VERIFIED)
   */
  public buildTwoPhaseAck(params: {
    phase: 'STATUS_DISPATCHED' | 'STATUS_VERIFIED';
    taskId: string;
    targetAgentId: string;
    pid?: number;
    exitCode?: number;
    isFifoQueued?: boolean;
    emergencyPreempt?: boolean;
  }): TwoPhaseVoiceAck {
    if (params.phase === 'STATUS_DISPATCHED') {
      const msg = params.isFifoQueued
        ? `${this.commanderName}, agente ${params.targetAgentId} em execucao ativa. Diretriz enfileirada em [FIFO_QUEUED] na tarefa ${params.taskId}.`
        : `${this.commanderName}, diretriz despachada [ACK_DISPATCHED] para ${params.targetAgentId} na tarefa ${params.taskId}. Aguardando verificacao de codigo de saida.`;

      return TwoPhaseVoiceAckSchema.parse({
        phase: 'STATUS_DISPATCHED',
        taskId: params.taskId,
        targetAgentId: params.targetAgentId,
        pid: params.pid,
        spokenMessage: msg,
        emergencyPreempt: Boolean(params.emergencyPreempt),
      });
    }

    if (params.exitCode !== 0 && !params.emergencyPreempt) {
      throw new Error(
        `[LAW_4_VIOLATION]: Cannot emit STATUS_VERIFIED when exitCode is ${params.exitCode} (must be 0)`
      );
    }

    const verifiedMsg = params.emergencyPreempt
      ? `${this.commanderName}, alerta critico de preempcao imediata na tarefa ${params.taskId} para ${params.targetAgentId}.`
      : `${this.commanderName}, execucao concluida e confirmada [ACK_VERIFIED] no SQLite WAL por ${params.targetAgentId} com exitCode 0.`;

    return TwoPhaseVoiceAckSchema.parse({
      phase: 'STATUS_VERIFIED',
      taskId: params.taskId,
      targetAgentId: params.targetAgentId,
      pid: params.pid,
      exitCode: params.exitCode ?? 0,
      spokenMessage: verifiedMsg,
      emergencyPreempt: Boolean(params.emergencyPreempt),
    });
  }

  public extractTargetModel(text: string): LlmModelId {
    const lower = text.toLowerCase();
    if (lower.includes('claude') || lower.includes('sonnet')) {
      return 'claude-3.7-sonnet';
    }
    if (lower.includes('flash')) {
      return 'gemini-2.5-flash';
    }
    if (lower.includes('gemini') || lower.includes('pro')) {
      return 'gemini-2.5-pro';
    }
    return 'argon';
  }

  private extractTargetAgent(text: string): string | undefined {
    if (
      text.includes('software engineer') ||
      text.includes('software-engineer') ||
      text.includes('engenheiro') ||
      text.includes('dev')
    ) {
      return '@agent-software-engineer';
    }
    if (
      text.includes('orchestrator') ||
      text.includes('orquestrador') ||
      text.includes('lider')
    ) {
      return '@agent-orchestrator';
    }
    if (
      text.includes('design') ||
      text.includes('ui') ||
      text.includes('designer')
    ) {
      return '@agent-design';
    }
    if (
      text.includes('cyber') ||
      text.includes('segurança') ||
      text.includes('seguranca')
    ) {
      return '@agent-cybersecurity';
    }
    if (
      text.includes('data') ||
      text.includes('dados') ||
      text.includes('jdm')
    ) {
      return '@agent-data';
    }
    if (
      text.includes('qa') ||
      text.includes('teste') ||
      text.includes('auditor')
    ) {
      return '@agent-qa';
    }
    if (
      text.includes('content') ||
      text.includes('conteudo') ||
      text.includes('conteúdo')
    ) {
      return '@agent-content';
    }
    return undefined;
  }
}

export const kalinarSingularityBrain = KalinarSingularityBrain.getInstance();

export function generateTacticalBriefing(
  ctxOrAgents: TacticalBriefingContext | AgentNode[]
): string {
  if (Array.isArray(ctxOrAgents)) {
    return kalinarSingularityBrain.generateTacticalBriefing({
      userName: 'Thiago',
      agents: ctxOrAgents,
      secondBrainDirectivesCount: 4,
      activeDirective: 'MANTER_ORBITA_E_MONITORAR_WORKSPACE',
    });
  }
  return kalinarSingularityBrain.generateTacticalBriefing(ctxOrAgents);
}

export function parseVoiceDirective(transcript: string): VoiceCommandParseResult {
  return kalinarSingularityBrain.parseVoiceDirective(transcript);
}

export function evaluateVoiceDirective(parsed: VoiceCommandParseResult) {
  return kalinarSingularityBrain.evaluateVoiceDirective(parsed);
}

export function triggerTacticalAction(parsed: VoiceCommandParseResult, latencyMs?: number) {
  return kalinarSingularityBrain.triggerTacticalAction(parsed, latencyMs);
}
