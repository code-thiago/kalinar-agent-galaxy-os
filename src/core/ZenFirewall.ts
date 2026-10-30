/**
 * KALINAR GO RULES ZEN ENGINE FIREWALL MIDDLEWARE (v0.1.0-alpha)
 * Sub-millisecond deterministic evaluation
 * Strictly Zero Emojis
 */

import path from 'node:path';
import fs from 'node:fs/promises';

export interface EventRouterInput {
  eventType: string;
  filePath: string;
  auditCycle: number;
}

export interface EventRouterOutput {
  action: 'DROP_LOOP_SUPPRESSED' | 'IGNORE_HARD' | 'WATCH_VISUAL_ONLY' | 'HALT_AUDIT_CYCLE_CAP' | 'DISPATCH_AGENT' | 'RECONCILE_WORKSPACE';
  secondBrainTag: string;
  auditAllowed: boolean;
  baseEtaSeconds: number;
}

export interface OsFirewallInput {
  command: string;
  isSandbox: boolean;
}

export interface OsFirewallOutput {
  allowed: boolean;
  verdictReason: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ExecutionGateInput {
  executionMode: 'AUTO_PILOT' | 'STEP_BY_STEP_GATE' | 'SANDBOX_DRY_RUN';
  isDestructiveAction: boolean;
  hasSingleWriterLock: boolean;
}

export interface ExecutionGateOutput {
  canProceed: boolean;
  requiresHumanApproval: boolean;
  gateReason: string;
  timeoutSeconds: number;
}

export interface VoiceCommandInput {
  intent: 'ACTIVATE_SECOND_BRAIN' | 'GET_SWARM_STATUS' | 'CONTROL_AGENT' | 'DISPATCH_ANTIGRAVITY' | 'UNKNOWN' | string;
  action?: string;
  isDestructive?: boolean;
}

export interface VoiceCommandOutput {
  allowed: boolean;
  targetHandler: 'activateSecondBrain' | 'getSwarmDevelopmentStatus' | 'controlAgentExecution' | 'dispatchAntigravityCommand' | 'rejectVoiceCommand' | string;
  feedbackPhrase: string;
  auditRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}


export class ZenFirewall {
  private static instance: ZenFirewall;
  private zenEngineInstance: any = null;
  private jdmBufferCache: Map<string, Buffer> = new Map();

  private constructor() {}

  public static getInstance(): ZenFirewall {
    if (!ZenFirewall.instance) {
      ZenFirewall.instance = new ZenFirewall();
    }
    return ZenFirewall.instance;
  }

  public async initialize(): Promise<void> {
    try {
      const { ZenEngine } = await import('@gorules/zen-engine');
      this.zenEngineInstance = new ZenEngine({
        loader: async (key: string) => {
          return await this.loadJdmContent(key);
        },
      });

      // Warm up graphs to ensure subsequent evaluations are sub-millisecond (< 1ms)
      await this.evaluateEventRouter({
        eventType: 'INIT_WARMUP',
        filePath: 'c:/Kalinar/warmup.ts',
        auditCycle: 0,
      });
      await this.evaluateOsFirewall({
        command: 'echo warmup',
        isSandbox: true,
      });
      await this.evaluateExecutionGate({
        executionMode: 'AUTO_PILOT',
        isDestructiveAction: false,
        hasSingleWriterLock: true,
      });
      await this.evaluateVoiceCommand({
        intent: 'GET_SWARM_STATUS',
        action: 'GET_STATUS',
        isDestructive: false,
      });
    } catch {
      // In-process fallback evaluator handles JDM deterministically
      this.zenEngineInstance = null;
    }
  }

  private async loadJdmContent(key: string): Promise<Buffer> {
    const filename = path.basename(key);
    if (this.jdmBufferCache.has(filename)) {
      return this.jdmBufferCache.get(filename)!;
    }
    let resolvedPath = key;
    if (!path.isAbsolute(key)) {
      resolvedPath = path.resolve(process.cwd(), 'src', 'rules', filename);
    }
    const content = await fs.readFile(resolvedPath);
    this.jdmBufferCache.set(filename, content);
    return content;
  }

  /**
   * Evaluates daemon event routing and loop suppression in < 1ms
   */
  public async evaluateEventRouter(input: EventRouterInput): Promise<{
    result: EventRouterOutput;
    latencyMs: number;
  }> {
    const start = performance.now();

    if (this.zenEngineInstance) {
      try {
        const response = await this.zenEngineInstance.evaluate('daemon-event-router.jdm.json', input, { trace: true });
        const latencyMs = performance.now() - start;
        return {
          result: response.result as EventRouterOutput,
          latencyMs,
        };
      } catch {
        // Fall back to deterministic evaluation below
      }
    }

    // Deterministic fallback matching exact JDM table logic (< 0.1ms)
    const result = this.fallbackEvaluateEventRouter(input);
    const latencyMs = performance.now() - start;
    return { result, latencyMs };
  }

  /**
   * Evaluates OS command execution against zero-trust destructive rules in < 1ms
   */
  public async evaluateOsFirewall(input: OsFirewallInput): Promise<{
    result: OsFirewallOutput;
    latencyMs: number;
  }> {
    const start = performance.now();

    if (this.zenEngineInstance) {
      try {
        const response = await this.zenEngineInstance.evaluate('os-execution-firewall.jdm.json', input, { trace: true });
        const latencyMs = performance.now() - start;
        return {
          result: response.result as OsFirewallOutput,
          latencyMs,
        };
      } catch {
        // Fall back to deterministic evaluation below
      }
    }

    // Deterministic fallback matching exact JDM table logic (< 0.1ms)
    const result = this.fallbackEvaluateOsFirewall(input);
    const latencyMs = performance.now() - start;
    return { result, latencyMs };
  }

  /**
   * Evaluates execution mode gate (AUTO_PILOT, STEP_BY_STEP_GATE, SANDBOX_DRY_RUN) in < 1ms
   */
  public async evaluateExecutionGate(input: ExecutionGateInput): Promise<{
    result: ExecutionGateOutput;
    latencyMs: number;
  }> {
    const start = performance.now();

    if (this.zenEngineInstance) {
      try {
        const response = await this.zenEngineInstance.evaluate('execution-gate.jdm.json', input, { trace: true });
        const latencyMs = performance.now() - start;
        return {
          result: response.result as ExecutionGateOutput,
          latencyMs,
        };
      } catch {
        // Fall back to deterministic evaluation below
      }
    }

    const result = this.fallbackEvaluateExecutionGate(input);
    const latencyMs = performance.now() - start;
    return { result, latencyMs };
  }

  /**
   * Evaluates voice command execution against sovereign guardrails in < 1ms
   */
  public async evaluateVoiceCommand(input: VoiceCommandInput): Promise<{
    result: VoiceCommandOutput;
    latencyMs: number;
  }> {
    const start = performance.now();

    if (this.zenEngineInstance) {
      try {
        const response = await this.zenEngineInstance.evaluate('voice-command-guard.jdm.json', input, { trace: true });
        const latencyMs = performance.now() - start;
        return {
          result: response.result as VoiceCommandOutput,
          latencyMs,
        };
      } catch {
        // Fall back to deterministic evaluation below
      }
    }

    const result = this.fallbackEvaluateVoiceCommand(input);
    const latencyMs = performance.now() - start;
    return { result, latencyMs };
  }

  private fallbackEvaluateVoiceCommand(input: VoiceCommandInput): VoiceCommandOutput {
    if (input.intent === 'ACTIVATE_SECOND_BRAIN') {
      return {
        allowed: true,
        targetHandler: 'activateSecondBrain',
        feedbackPhrase: 'Gravidade do nucleo expandida. Absorvendo base de conhecimento do Second Brain.',
        auditRisk: 'LOW',
      };
    }

    if (input.intent === 'GET_SWARM_STATUS') {
      return {
        allowed: true,
        targetHandler: 'getSwarmDevelopmentStatus',
        feedbackPhrase: 'Calculando telemetria do enxame. Transmitindo relatorio tatico agora.',
        auditRisk: 'LOW',
      };
    }

    if (input.intent === 'CONTROL_AGENT') {
      if (input.action === 'KILL') {
        return {
          allowed: true,
          targetHandler: 'controlAgentExecution',
          feedbackPhrase: 'Interrompendo processo do agente imediatamente sob protocolo de seguranca.',
          auditRisk: 'HIGH',
        };
      }
      if (input.action === 'APPROVE_DIFF') {
        return {
          allowed: true,
          targetHandler: 'controlAgentExecution',
          feedbackPhrase: 'Diff aprovado. Gravando mutacao no disco com trava de gravacao.',
          auditRisk: 'MEDIUM',
        };
      }
      return {
        allowed: true,
        targetHandler: 'controlAgentExecution',
        feedbackPhrase: 'Diretriz de controle de agente acionada.',
        auditRisk: 'LOW',
      };
    }

    if (input.intent === 'DISPATCH_ANTIGRAVITY') {
      return {
        allowed: true,
        targetHandler: 'dispatchAntigravityCommand',
        feedbackPhrase: 'Feixe relativistico disparado. Instrucao propagada ao agente no Antigravity.',
        auditRisk: 'MEDIUM',
      };
    }

    return {
      allowed: false,
      targetHandler: 'rejectVoiceCommand',
      feedbackPhrase: 'Comando nao reconhecido pelo nucleo. Repita a diretriz com clareza.',
      auditRisk: 'LOW',
    };
  }


  private fallbackEvaluateExecutionGate(input: ExecutionGateInput): ExecutionGateOutput {
    if (input.executionMode === 'SANDBOX_DRY_RUN') {
      return {
        canProceed: true,
        requiresHumanApproval: false,
        gateReason: 'SANDBOX_ISOLATED_DRY_RUN',
        timeoutSeconds: 30,
      };
    }

    if (input.executionMode === 'STEP_BY_STEP_GATE') {
      if (input.isDestructiveAction) {
        return {
          canProceed: false,
          requiresHumanApproval: true,
          gateReason: 'DESTRUCTIVE_STEP_AWAITING_HUMAN_APPROVAL',
          timeoutSeconds: 600,
        };
      }
      return {
        canProceed: false,
        requiresHumanApproval: true,
        gateReason: 'STEP_BY_STEP_CHECKPOINT',
        timeoutSeconds: 300,
      };
    }

    if (input.executionMode === 'AUTO_PILOT') {
      if (!input.isDestructiveAction && input.hasSingleWriterLock) {
        return {
          canProceed: true,
          requiresHumanApproval: false,
          gateReason: 'AUTO_PILOT_LOCKED_EXECUTION',
          timeoutSeconds: 120,
        };
      }
      return {
        canProceed: true,
        requiresHumanApproval: false,
        gateReason: 'AUTO_PILOT_NOMINAL',
        timeoutSeconds: 120,
      };
    }

    return {
      canProceed: false,
      requiresHumanApproval: true,
      gateReason: 'DEFAULT_SAFETY_GATE_TRIGGERED',
      timeoutSeconds: 60,
    };
  }

  private fallbackEvaluateEventRouter(input: EventRouterInput): EventRouterOutput {
    const pathStr = input.filePath || '';
    const cycle = input.auditCycle || 0;

    // Rule 1: Loop suppression on .kalinar-lock
    if (pathStr.includes('.kalinar-lock')) {
      return {
        action: 'DROP_LOOP_SUPPRESSED',
        secondBrainTag: '#lock',
        auditAllowed: false,
        baseEtaSeconds: 0,
      };
    }

    // Rule 2: Hard ignore
    if (pathStr.includes('node_modules') || pathStr.includes('.git')) {
      return {
        action: 'IGNORE_HARD',
        secondBrainTag: '#ignored',
        auditAllowed: false,
        baseEtaSeconds: 0,
      };
    }

    // Rule 3: Visual only watch
    if (
      pathStr.includes('KALINAR_GALAXY.canvas') ||
      pathStr.includes('05_EXECUCOES') ||
      pathStr.includes('WAR_ROOM.md')
    ) {
      return {
        action: 'WATCH_VISUAL_ONLY',
        secondBrainTag: '#visual_sync',
        auditAllowed: true,
        baseEtaSeconds: 2,
      };
    }

    // Rule 4: Cap self-audit cycles at max 2
    if (cycle > 2) {
      return {
        action: 'HALT_AUDIT_CYCLE_CAP',
        secondBrainTag: '#circuit_trip',
        auditAllowed: false,
        baseEtaSeconds: 0,
      };
    }

    // Rule 5: Standard agent turn
    if (input.eventType === 'AGENT_TURN') {
      return {
        action: 'DISPATCH_AGENT',
        secondBrainTag: '#agent_turn',
        auditAllowed: true,
        baseEtaSeconds: 12,
      };
    }

    // Rule 6: Default reconcile
    return {
      action: 'RECONCILE_WORKSPACE',
      secondBrainTag: '#workspace_sync',
      auditAllowed: true,
      baseEtaSeconds: 5,
    };
  }

  private fallbackEvaluateOsFirewall(input: OsFirewallInput): OsFirewallOutput {
    const cmd = input.command || '';
    const cmdLower = cmd.toLowerCase();

    if (cmd.includes('rm -rf /') || cmd.includes('rm -rf *')) {
      return {
        allowed: false,
        verdictReason: 'DESTRUCTIVE_ROOT_WIPE_PROHIBITED',
        riskLevel: 'CRITICAL',
      };
    }

    if (cmdLower.includes('del /f /s /q') || cmdLower.includes('format c:')) {
      return {
        allowed: false,
        verdictReason: 'DESTRUCTIVE_DISK_FORMAT_PROHIBITED',
        riskLevel: 'CRITICAL',
      };
    }

    if (cmdLower.includes('drop database') || cmdLower.includes('drop table telemetry_logs')) {
      return {
        allowed: false,
        verdictReason: 'DATABASE_DESTRUCTION_PROHIBITED',
        riskLevel: 'CRITICAL',
      };
    }

    if (cmd.includes('kill -9 1') || cmdLower.includes('taskkill /f /pid 4')) {
      return {
        allowed: false,
        verdictReason: 'SYSTEM_INIT_KILL_PROHIBITED',
        riskLevel: 'HIGH',
      };
    }

    return {
      allowed: true,
      verdictReason: 'COMMAND_VETTED_BY_FIREWALL',
      riskLevel: 'LOW',
    };
  }
}

export const zenFirewall = ZenFirewall.getInstance();
