/**
 * KALINAR UNIVERSAL AGENT CONNECTOR SDK (v0.3.0-alpha)
 * 3 Native Connectors: Local Vault MD, Antigravity/MCP CLI, and Localhost Webhook
 * Strictly Zero Emojis
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {
  AgentNode,
  AgentStatus,
  IKalinarAgentConnector,
  SCHEMA_VERSION,
} from '../types/kalinar.js';
import { eventBus } from '../core/KalinarEventBus.js';

export interface TelemetryDiffPayload {
  agentId: string;
  step: number;
  totalSteps: number;
  description: string;
  previewStream: string;
  diffPath?: string;
  originalContent?: string;
  modifiedContent?: string;
}

/* =====================================================================
   1. LOCAL VAULT & MARKDOWN CONNECTOR
   ===================================================================== */

export class LocalVaultAndMdConnector implements IKalinarAgentConnector {
  public readonly id = 'connector-local-vault-md';
  public readonly schemaVersion = SCHEMA_VERSION;
  private registeredAgents: Map<string, AgentNode> = new Map();
  private streamListeners: Map<string, Set<(chunk: string) => void>> = new Map();

  constructor(private vaultRoot: string = process.cwd()) {}

  public async registerAgent(agent: AgentNode): Promise<boolean> {
    this.registeredAgents.set(agent.id, agent);
    eventBus.emit('agent:registered', agent);
    return true;
  }

  public emitStepUpdate(agentId: string, currentStep: number, description: string, previewDelta: string): void {
    const agent = this.registeredAgents.get(agentId);
    if (agent) {
      agent.currentStep = currentStep;
      agent.stepDescription = description;
      agent.livePreviewStream = previewDelta;
      eventBus.emit('agent:step_updated', {
        agentId,
        step: currentStep,
        description,
        preview: previewDelta,
      });

      const listeners = this.streamListeners.get(agentId);
      if (listeners) {
        listeners.forEach((fn) => fn(previewDelta));
      }
    }
  }

  public updateStatus(agentId: string, status: AgentStatus): void {
    const agent = this.registeredAgents.get(agentId);
    if (agent) {
      const prev = agent.status;
      agent.status = status;
      eventBus.emit('agent:status_changed', { agentId, previous: prev, current: status });
    }
  }

  public onLivePreview(agentId: string, callback: (streamChunk: string) => void): () => void {
    if (!this.streamListeners.has(agentId)) {
      this.streamListeners.set(agentId, new Set());
    }
    this.streamListeners.get(agentId)!.add(callback);
    return () => {
      this.streamListeners.get(agentId)?.delete(callback);
    };
  }

  /**
   * Scans local markdown agents: 05_AGENTS/@agent-*.md, AGENTS.md, CLAUDE.md, GEMINI.md
   */
  public scanLocalAgentDefinitions(): Array<{ filename: string; role: string; fullPath: string }> {
    const candidates: Array<{ filename: string; role: string; fullPath: string }> = [];
    const rootFiles = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'];

    for (const file of rootFiles) {
      const fullPath = path.resolve(this.vaultRoot, file);
      if (fs.existsSync(fullPath)) {
        candidates.push({
          filename: file,
          role: 'Autonomous Agent Runtime Contract',
          fullPath,
        });
      }
    }

    const agentsDir = path.resolve(this.vaultRoot, '05_AGENTS');
    if (fs.existsSync(agentsDir)) {
      const entries = fs.readdirSync(agentsDir);
      for (const entry of entries) {
        if (entry.endsWith('.md')) {
          candidates.push({
            filename: entry,
            role: 'Specialist Hub Persona',
            fullPath: path.resolve(agentsDir, entry),
          });
        }
      }
    }

    return candidates;
  }

  public dispose(): void {
    this.registeredAgents.clear();
    this.streamListeners.clear();
  }
}

/* =====================================================================
   2. ANTIGRAVITY & MCP CONNECTOR
   ===================================================================== */

export class AntigravityAndMcpConnector implements IKalinarAgentConnector {
  public readonly id = 'connector-antigravity-mcp';
  public readonly schemaVersion = SCHEMA_VERSION;
  private registeredAgents: Map<string, AgentNode> = new Map();
  private streamListeners: Map<string, Set<(chunk: string) => void>> = new Map();

  public async registerAgent(agent: AgentNode): Promise<boolean> {
    this.registeredAgents.set(agent.id, agent);
    eventBus.emit('agent:registered', agent);
    return true;
  }

  public emitStepUpdate(agentId: string, currentStep: number, description: string, previewDelta: string): void {
    const agent = this.registeredAgents.get(agentId);
    if (agent) {
      agent.currentStep = currentStep;
      agent.stepDescription = description;
      agent.livePreviewStream = previewDelta;
      eventBus.emit('agent:step_updated', {
        agentId,
        step: currentStep,
        description,
        preview: previewDelta,
      });

      const listeners = this.streamListeners.get(agentId);
      if (listeners) {
        listeners.forEach((fn) => fn(previewDelta));
      }
    }
  }

  public updateStatus(agentId: string, status: AgentStatus): void {
    const agent = this.registeredAgents.get(agentId);
    if (agent) {
      const prev = agent.status;
      agent.status = status;
      eventBus.emit('agent:status_changed', { agentId, previous: prev, current: status });
    }
  }

  public onLivePreview(agentId: string, callback: (streamChunk: string) => void): () => void {
    if (!this.streamListeners.has(agentId)) {
      this.streamListeners.set(agentId, new Set());
    }
    this.streamListeners.get(agentId)!.add(callback);
    return () => {
      this.streamListeners.get(agentId)?.delete(callback);
    };
  }

  public dispose(): void {
    this.registeredAgents.clear();
    this.streamListeners.clear();
  }
}

/* =====================================================================
   3. EXTERNAL WEBHOOK AGENT CONNECTOR (127.0.0.1:4949 ONLY)
   ===================================================================== */

export class ExternalWebhookAgentConnector implements IKalinarAgentConnector {
  public readonly id = 'connector-external-webhook';
  public readonly schemaVersion = SCHEMA_VERSION;
  public readonly host: string;
  public readonly port: number;
  private server: http.Server | null = null;
  private registeredAgents: Map<string, AgentNode> = new Map();
  private streamListeners: Map<string, Set<(chunk: string) => void>> = new Map();
  private isListening = false;

  constructor(hostOrPort: string | number = '127.0.0.1', port = 4949) {
    if (typeof hostOrPort === 'number') {
      this.host = '127.0.0.1';
      this.port = hostOrPort;
    } else {
      this.host = hostOrPort;
      this.port = port;
    }
  }

  public async initialize(): Promise<void> {
    return this.startServer();
  }

  public handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Security Policy: Strict localhost-only verification
    const remoteIp = req.socket?.remoteAddress || '127.0.0.1';
    if (remoteIp !== '127.0.0.1' && remoteIp !== '::1' && remoteIp !== '::ffff:127.0.0.1') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '[SECURITY_VIOLATION] Only localhost binding allowed' }));
      return;
    }

    if (req.method === 'POST' && req.url === '/kalinar/events') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 2 * 1024 * 1024) {
          req.destroy(); // 2MB payload ceiling defense
        }
      });

      req.on('end', () => {
        try {
          const payload = JSON.parse(body) as TelemetryDiffPayload;
          if (!payload.agentId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing agentId' }));
            return;
          }

          this.emitStepUpdate(
            payload.agentId,
            payload.step || 1,
            payload.description || 'External step execution',
            payload.previewStream || ''
          );

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, timestamp: new Date().toISOString() }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
        }
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    }
  }

  public async startServer(): Promise<void> {
    if (this.isListening) return;

    this.server = http.createServer((req, res) => this.handleRequest(req, res));


    return new Promise((resolve) => {
      this.server!.listen(this.port, this.host, () => {
        this.isListening = true;
        resolve();
      });
    });
  }

  public async registerAgent(agent: AgentNode): Promise<boolean> {
    this.registeredAgents.set(agent.id, agent);
    eventBus.emit('agent:registered', agent);
    return true;
  }

  public emitStepUpdate(agentId: string, currentStep: number, description: string, previewDelta: string): void {
    const agent = this.registeredAgents.get(agentId);
    if (agent) {
      agent.currentStep = currentStep;
      agent.stepDescription = description;
      agent.livePreviewStream = previewDelta;
    }
    eventBus.emit('agent:step_updated', {
      agentId,
      step: currentStep,
      description,
      preview: previewDelta,
    });

    const listeners = this.streamListeners.get(agentId);
    if (listeners) {
      listeners.forEach((fn) => fn(previewDelta));
    }
  }

  public updateStatus(agentId: string, status: AgentStatus): void {
    const agent = this.registeredAgents.get(agentId);
    if (agent) {
      const prev = agent.status;
      agent.status = status;
      eventBus.emit('agent:status_changed', { agentId, previous: prev, current: status });
    }
  }

  public onLivePreview(agentId: string, callback: (streamChunk: string) => void): () => void {
    if (!this.streamListeners.has(agentId)) {
      this.streamListeners.set(agentId, new Set());
    }
    this.streamListeners.get(agentId)!.add(callback);
    return () => {
      this.streamListeners.get(agentId)?.delete(callback);
    };
  }

  public dispose(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.isListening = false;
    this.registeredAgents.clear();
    this.streamListeners.clear();
  }
}

/* =====================================================================
   4. AGENT CONNECTOR REGISTRY
   ===================================================================== */

export class AgentConnectorRegistry {
  private static instance: AgentConnectorRegistry;
  private connectors: Map<string, IKalinarAgentConnector> = new Map();

  public constructor(autoRegisterDefaults = true) {
    if (autoRegisterDefaults) {
      this.register(new LocalVaultAndMdConnector());
      this.register(new AntigravityAndMcpConnector());
      this.register(new ExternalWebhookAgentConnector());
    }
  }

  public static getInstance(): AgentConnectorRegistry {
    if (!AgentConnectorRegistry.instance) {
      AgentConnectorRegistry.instance = new AgentConnectorRegistry();
    }
    return AgentConnectorRegistry.instance;
  }

  public register(connector: IKalinarAgentConnector & { id: string }): void {
    this.connectors.set(connector.id, connector);
  }

  public registerConnector(connector: IKalinarAgentConnector & { id: string }): void {
    this.register(connector);
  }

  public getConnector<T extends IKalinarAgentConnector>(id: string): T | undefined {
    return this.connectors.get(id) as T | undefined;
  }

  public getAllConnectors(): IKalinarAgentConnector[] {
    return Array.from(this.connectors.values());
  }

  public onEvent(callback: (event: any) => void): () => void {
    const unsub1 = eventBus.on('agent:registered', (payload) => callback({ type: 'agent:registered', payload }));
    const unsub2 = eventBus.on('agent:step_updated', (payload) => callback({ type: 'agent:step_updated', payload }));
    const unsub3 = eventBus.on('agent:status_changed', (payload) => callback({ type: 'agent:status_changed', payload }));
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }

  public disposeAll(): void {
    for (const c of this.connectors.values()) {
      c.dispose();
    }
    this.connectors.clear();
  }
}

export const agentConnectorRegistry = AgentConnectorRegistry.getInstance();
