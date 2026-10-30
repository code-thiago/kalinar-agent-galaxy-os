/**
 * KALINAR SOVEREIGN SINGULARITY BRAIN & TACTICAL PERSONA ENGINE (v0.4.0-beta)
 * Cosmic Commander Persona (Tauz-style, direct, rhythmic, authoritative)
 * Strictly in pt-BR, strictly zero emojis, zero subservience.
 */

import { AgentNode } from '../types/kalinar.js';
import { ZenFirewall, VoiceCommandInput, VoiceCommandOutput } from '../core/ZenFirewall.js';

export interface TacticalBriefingContext {
  userName: string;
  agents: AgentNode[];
  secondBrainDirectivesCount: number;
  activeDirective: string;
}

export interface VoiceCommandParseResult {
  intent: 'ACTIVATE_SECOND_BRAIN' | 'GET_SWARM_STATUS' | 'CONTROL_AGENT' | 'DISPATCH_ANTIGRAVITY' | 'UNKNOWN';
  targetAgent?: string;
  action?: 'PAUSE' | 'RESUME' | 'KILL' | 'APPROVE_DIFF' | 'SET_SANDBOX' | 'INGEST_DOCS' | 'EXECUTE_PTY' | string;
  instruction?: string;
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
   * Generates a sovereign, commanding tactical status briefing in pt-BR
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
    const totalTokens = (leadAgent.tokensPrompt || 0) + (leadAgent.tokensCompletion || 0);
    const etaSec = leadAgent.etaSeconds || 30;

    return `${this.commanderName}, singularidade estabilizada. A gravidade do núcleo absorveu ${ctx.secondBrainDirectivesCount} diretrizes do Second Brain. O ${leadAgent.filename} avança na etapa ${currentStep} de ${totalSteps} com ${totalTokens.toLocaleString('pt-BR')} tokens e conclusão prevista em ${etaSec} segundos. Qual é a próxima ordem para o enxame?`;
  }

  /**
   * Parses spoken voice transcripts into semantic tactical intents
   */
  public parseVoiceDirective(transcript: string): VoiceCommandParseResult {
    const text = transcript.trim().toLowerCase();

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

    // 3. Agent Lifecycle & Process Controls
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

    if (text.includes('aprovar diff') || text.includes('aprovar alteração') || text.includes('gravar arquivo')) {
      const targetAgent = this.extractTargetAgent(text);
      return {
        intent: 'CONTROL_AGENT',
        action: 'APPROVE_DIFF',
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

    // 4. Dispatch Antigravity Relativistic Command
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
    const isDestructive = parsed.action === 'KILL';

    const input: VoiceCommandInput = {
      intent: parsed.intent,
      action: parsed.action,
      isDestructive,
    };

    const { result, latencyMs } = await this.zenFirewall.evaluateVoiceCommand(input);

    let spokenResponse = result.feedbackPhrase;
    if (result.allowed) {
      spokenResponse = `${this.commanderName}, ${result.feedbackPhrase.toLowerCase()}`;
    }

    return {
      allowed: result.allowed,
      output: result,
      spokenResponse,
      latencyMs,
    };
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
      text.includes('conteudo')
    ) {
      return '@agent-content';
    }
    return undefined;
  }
}

export const kalinarSingularityBrain = KalinarSingularityBrain.getInstance();
