import { describe, it, expect, beforeAll } from 'vitest';
import { ZenFirewall } from '../src/core/ZenFirewall';
import { validatePidSafety } from '../electron/daemon/ProcessController';
import {
  AgentConnectorRegistry,
  LocalVaultAndMdConnector,
  ExternalWebhookAgentConnector,
} from '../src/connectors/AgentConnectorRegistry';
import { EventEmitter } from 'node:events';

describe('Task 3: Universal Agent Connectors, Execution Gate & Process Safety', () => {
  let firewall: ZenFirewall;

  beforeAll(async () => {
    firewall = new ZenFirewall();
    await firewall.initialize();
  });

  describe('Process Safety Gate (validatePidSafety)', () => {
    it('rejects system, kernel and low-order PIDs (PID <= 100)', () => {
      expect(validatePidSafety(0).safe).toBe(false);
      expect(validatePidSafety(4).safe).toBe(false);
      expect(validatePidSafety(1).safe).toBe(false);
      expect(validatePidSafety(99).safe).toBe(false);
      expect(validatePidSafety(100).safe).toBe(false);
      expect(validatePidSafety(-15).safe).toBe(false);
      expect(validatePidSafety(Number.NaN).safe).toBe(false);
    });

    it('allows safe user-space child PIDs (PID > 100)', () => {
      expect(validatePidSafety(101).safe).toBe(true);
      expect(validatePidSafety(4920).safe).toBe(true);
      expect(validatePidSafety(12345).safe).toBe(true);
    });
  });

  describe('GoRules ZEN Execution Gate (evaluateExecutionGate)', () => {
    it('evaluates execution gate in under 1ms', async () => {
      const { result, latencyMs } = await firewall.evaluateExecutionGate({
        executionMode: 'AUTO_PILOT',
        isDestructiveAction: false,
        hasSingleWriterLock: true,
      });

      expect(latencyMs).toBeLessThan(1.0);
      expect(result.canProceed).toBe(true);
      expect(result.requiresHumanApproval).toBe(false);
    });

    it('blocks high risk action when not approved in STEP_BY_STEP_GATE', async () => {
      const { result } = await firewall.evaluateExecutionGate({
        executionMode: 'STEP_BY_STEP_GATE',
        isDestructiveAction: true,
        hasSingleWriterLock: false,
      });

      expect(result.canProceed).toBe(false);
      expect(result.requiresHumanApproval).toBe(true);
      expect(result.gateReason).toBe('DESTRUCTIVE_STEP_AWAITING_HUMAN_APPROVAL');
    });

    it('allows execution automatically in SANDBOX_DRY_RUN', async () => {
      const { result } = await firewall.evaluateExecutionGate({
        executionMode: 'SANDBOX_DRY_RUN',
        isDestructiveAction: true,
        hasSingleWriterLock: false,
      });

      expect(result.canProceed).toBe(true);
      expect(result.requiresHumanApproval).toBe(false);
      expect(result.gateReason).toBe('SANDBOX_ISOLATED_DRY_RUN');
    });
  });

  describe('Agent Connector Registry & Event Bus', () => {
    it('registers and retrieves connectors correctly', () => {
      const registry = new AgentConnectorRegistry(false);
      const localConnector = new LocalVaultAndMdConnector();
      registry.registerConnector(localConnector);

      expect(registry.getConnector('connector-local-vault-md')).toBeDefined();
      expect(registry.getAllConnectors().length).toBe(1);
    });

    it('dispatches connector events to subscribers', async () => {
      const registry = new AgentConnectorRegistry(false);
      const localConnector = new LocalVaultAndMdConnector();
      registry.registerConnector(localConnector);

      const receivedEvents: any[] = [];
      const unsubscribe = registry.onEvent((event) => {
        receivedEvents.push(event);
      });

      await localConnector.registerAgent({
        id: 'agent-test',
        filename: '@agent-test.md',
        role: 'Test Specialist',
        status: 'ACTIVE',
        position: [0, 0, 0],
        currentStep: 1,
        totalSteps: 5,
        stepDescription: 'Verifying connector bus',
        livePreviewStream: 'console.log("ok");',
        tokensUsed: 120,
        elapsedSeconds: 5,
      });

      localConnector.emitStepUpdate('agent-test', 2, 'Next step', 'diff content');

      expect(receivedEvents.length).toBeGreaterThanOrEqual(2);
      expect(receivedEvents[0].type).toBe('agent:registered');
      expect(receivedEvents[1].type).toBe('agent:step_updated');
      expect(receivedEvents[1].payload.agentId).toBe('agent-test');

      unsubscribe();
    });
  });

  describe('External Webhook Agent Connector (Security & Payload Caps)', () => {
    const webhookConnector = new ExternalWebhookAgentConnector(4951);

    function createMockReqRes(options: {
      url: string;
      method: string;
      remoteAddress: string;
      body?: string;
    }) {
      const req = new EventEmitter() as any;
      req.url = options.url;
      req.method = options.method;
      req.socket = { remoteAddress: options.remoteAddress };

      const res = {
        statusCode: 0,
        headers: {} as Record<string, string>,
        body: '',
        writeHead(code: number, headers: Record<string, string>) {
          this.statusCode = code;
          this.headers = headers;
        },
        end(data: string) {
          this.body = data;
        },
      };

      const sendBody = () => {
        if (options.body) {
          req.emit('data', options.body);
        }
        req.emit('end');
      };

      return { req, res, sendBody };
    }

    it('accepts valid telemetry payload from 127.0.0.1 on /kalinar/events', async () => {
      const postData = JSON.stringify({
        schemaVersion: 1,
        agentId: 'external-agent-test',
        step: 3,
        totalSteps: 10,
        description: 'Compiling Rust AST',
        previewStream: 'pub fn test() {}',
      });

      const { req, res, sendBody } = createMockReqRes({
        url: '/kalinar/events',
        method: 'POST',
        remoteAddress: '127.0.0.1',
        body: postData,
      });

      webhookConnector.handleRequest(req, res as any);
      sendBody();

      expect(res.statusCode).toBe(200);
      const parsed = JSON.parse(res.body);
      expect(parsed.success).toBe(true);
    });

    it('rejects external non-localhost IP addresses with 403 Forbidden', () => {
      const { req, res } = createMockReqRes({
        url: '/kalinar/events',
        method: 'POST',
        remoteAddress: '192.168.1.100',
      });

      webhookConnector.handleRequest(req, res as any);

      expect(res.statusCode).toBe(403);
      const parsed = JSON.parse(res.body);
      expect(parsed.error).toContain('Only localhost binding allowed');
    });

    it('returns 404 for unmapped paths', () => {
      const { req, res } = createMockReqRes({
        url: '/unauthorized',
        method: 'GET',
        remoteAddress: '127.0.0.1',
      });

      webhookConnector.handleRequest(req, res as any);

      expect(res.statusCode).toBe(404);
      const parsed = JSON.parse(res.body);
      expect(parsed.error).toBe('Endpoint not found');
    });
  });
});
