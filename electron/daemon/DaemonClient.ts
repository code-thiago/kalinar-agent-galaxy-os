/**
 * KALINAR ELECTRON DAEMON IPC CLIENT (v1.6.0-alpha)
 * Windows Named Pipe (primary) + Local WebSocket 127.0.0.1:4949 (fallback)
 * Automatic Reconnect, < 0.2ms Contract Dispatch, Server-Push Alert Forwarding
 * Strictly Zero Emojis
 */

import net from 'node:net';
import http from 'node:http';
import crypto from 'node:crypto';
import {
  DAEMON_IPC_EVENTS,
  DAEMON_IPC_TRANSPORT,
  type DaemonIpcEnvelope,
  type DaemonIpcEvent,
  type DaemonIpcTransport,
  type ProcessLeaseScope,
} from '@kalinar/contracts';
import { KalinarEventBus } from '../../src/core/KalinarEventBus.js';
import type { ServerPushAlertPayload } from '../../src/types/kalinar.js';

const VALID_DAEMON_IPC_EVENTS = new Set<string>(DAEMON_IPC_EVENTS);
const MAX_OFFLINE_QUEUE = 256;

export interface DaemonIpcResponse {
  type: 'RESPONSE';
  id?: string;
  ok: boolean;
  data?: unknown;
  error?: string;
  validationLatencyMs: number;
  writeLatencyMs?: number;
}

export interface DaemonDispatchResult {
  dispatched: boolean;
  queuedOffline: boolean;
  requestId: string;
  transport: DaemonIpcTransport;
  dispatchLatencyMs: number;
  ackPromise: Promise<DaemonIpcResponse>;
}

export interface DaemonClientTransportAdapter {
  transport: DaemonIpcTransport;
  send: (
    envelope: DaemonIpcEnvelope & { id: string }
  ) => DaemonIpcResponse | Promise<DaemonIpcResponse>;
}

export interface DaemonClientOptions {
  pipePath?: string;
  wsUrl?: string;
  uiClientId?: string;
  reconnectIntervalMs?: number;
  maxReconnectIntervalMs?: number;
  autoReconnect?: boolean;
  requestTimeoutMs?: number;
  eventBus?: KalinarEventBus;
  mockTransport?: DaemonClientTransportAdapter;
}

interface PendingRequest {
  resolve: (res: DaemonIpcResponse) => void;
  deadlineMs: number;
}

interface QueuedWireItem {
  wireJson: string;
  envelope: DaemonIpcEnvelope & { id: string };
}

function encodeWsMaskedTextFrame(text: string): Buffer {
  const payload = Buffer.from(text, 'utf-8');
  const len = payload.length;
  const mask = crypto.randomBytes(4);

  let header: Buffer;
  if (len < 126) {
    header = Buffer.allocUnsafe(2);
    header[0] = 0x81;
    header[1] = 0x80 | len;
  } else if (len <= 0xffff) {
    header = Buffer.allocUnsafe(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.allocUnsafe(10);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }

  const masked = Buffer.allocUnsafe(len);
  for (let i = 0; i < len; i++) {
    masked[i] = payload[i] ^ mask[i & 3];
  }

  return Buffer.concat([header, mask, masked]);
}

function encodeWsMaskedControlFrame(opcode: number, payload: Buffer = Buffer.alloc(0)): Buffer {
  const len = payload.length;
  const mask = crypto.randomBytes(4);
  const header = Buffer.from([0x80 | (opcode & 0x0f), 0x80 | len]);
  const masked = Buffer.allocUnsafe(len);
  for (let i = 0; i < len; i++) {
    masked[i] = payload[i] ^ mask[i & 3];
  }
  return Buffer.concat([header, mask, masked]);
}

function createWsClientFrameDecoder(
  onText: (text: string) => void,
  onPing: (data: Buffer) => void,
  onClose: () => void
): (chunk: Buffer) => void {
  let buffer: Buffer = Buffer.alloc(0);

  return (chunk: Buffer) => {
    if (chunk.length === 0) return;
    buffer = buffer.length === 0 ? chunk : Buffer.concat([buffer, chunk]);

    while (buffer.length >= 2) {
      const byte0 = buffer[0];
      const byte1 = buffer[1];
      const opcode = byte0 & 0x0f;
      const isMasked = (byte1 & 0x80) !== 0;
      let payloadLen = byte1 & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (buffer.length < 4) return;
        payloadLen = buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (buffer.length < 10) return;
        const bigLen = buffer.readBigUInt64BE(2);
        if (bigLen > BigInt(16 * 1024 * 1024)) {
          buffer = Buffer.alloc(0);
          onClose();
          return;
        }
        payloadLen = Number(bigLen);
        offset = 10;
      }

      const maskLen = isMasked ? 4 : 0;
      const totalLen = offset + maskLen + payloadLen;
      if (buffer.length < totalLen) return;

      let payload: Buffer;
      if (isMasked) {
        payload = Buffer.allocUnsafe(payloadLen);
        const maskOffset = offset;
        const dataOffset = offset + 4;
        for (let i = 0; i < payloadLen; i++) {
          payload[i] = buffer[dataOffset + i] ^ buffer[maskOffset + (i & 3)];
        }
      } else {
        payload = buffer.subarray(offset, offset + payloadLen);
      }

      buffer = buffer.subarray(totalLen);

      if (opcode === 0x08) {
        onClose();
        return;
      }
      if (opcode === 0x09) {
        onPing(payload);
        continue;
      }
      if (opcode === 0x0a) {
        continue;
      }
      if (opcode === 0x01 || opcode === 0x02) {
        onText(payload.toString('utf-8'));
      }
    }
  };
}

export class DaemonClient {
  private static sharedInstance: DaemonClient | null = null;

  private pipePath: string;
  private wsUrl: string;
  private uiClientId: string;
  private reconnectIntervalMs: number;
  private maxReconnectIntervalMs: number;
  private autoReconnect: boolean;
  private requestTimeoutMs: number;
  private eventBus: KalinarEventBus;
  private mockTransport: DaemonClientTransportAdapter | null;

  private pipeSocket: net.Socket | null = null;
  private wsSocket: net.Socket | null = null;
  private activeTransport: DaemonIpcTransport | null = null;
  private connected = false;
  private intentionalDisconnect = false;
  private connectPromise: Promise<DaemonIpcTransport | null> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pendingSweepTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private seq = 0;

  private pendingRequests: Map<string, PendingRequest> = new Map();
  private offlineQueue: QueuedWireItem[] = [];
  private serverPushAlertListeners: Set<(alert: ServerPushAlertPayload) => void> = new Set();
  private serverPushListeners: Set<(envelope: DaemonIpcEnvelope) => void> = new Set();
  private disconnectListeners: Set<() => void> = new Set();
  private reconnectListeners: Set<(transport: DaemonIpcTransport) => void> = new Set();

  constructor(options: DaemonClientOptions = {}) {
    this.pipePath = options.pipePath || DAEMON_IPC_TRANSPORT.NAMED_PIPE;
    this.wsUrl = options.wsUrl || DAEMON_IPC_TRANSPORT.WS_URL;
    this.uiClientId = options.uiClientId || `electron-ui-${process.pid}`;
    this.reconnectIntervalMs = options.reconnectIntervalMs ?? 500;
    this.maxReconnectIntervalMs = options.maxReconnectIntervalMs ?? 5000;
    this.autoReconnect = options.autoReconnect ?? true;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 5000;
    this.eventBus = options.eventBus || KalinarEventBus.getInstance();
    this.mockTransport = options.mockTransport ?? null;
  }

  public getUiClientId(): string {
    return this.uiClientId;
  }

  public static getSharedInstance(): DaemonClient {
    if (!DaemonClient.sharedInstance) {
      DaemonClient.sharedInstance = new DaemonClient();
    }
    return DaemonClient.sharedInstance;
  }

  public setMockTransport(adapter: DaemonClientTransportAdapter | null): void {
    this.mockTransport = adapter;
    if (adapter) {
      this.connected = true;
      this.activeTransport = adapter.transport;
    } else if (!this.pipeSocket && !this.wsSocket) {
      this.connected = false;
      this.activeTransport = null;
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getActiveTransport(): DaemonIpcTransport | null {
    return this.activeTransport;
  }

  public getOfflineQueueLength(): number {
    return this.offlineQueue.length;
  }

  public onServerPushAlert(callback: (alert: ServerPushAlertPayload) => void): () => void {
    this.serverPushAlertListeners.add(callback);
    return () => {
      this.serverPushAlertListeners.delete(callback);
    };
  }

  public onServerPush(callback: (envelope: DaemonIpcEnvelope) => void): () => void {
    this.serverPushListeners.add(callback);
    return () => {
      this.serverPushListeners.delete(callback);
    };
  }

  public onDisconnect(callback: () => void): () => void {
    this.disconnectListeners.add(callback);
    return () => {
      this.disconnectListeners.delete(callback);
    };
  }

  public onReconnect(callback: (transport: DaemonIpcTransport) => void): () => void {
    this.reconnectListeners.add(callback);
    return () => {
      this.reconnectListeners.delete(callback);
    };
  }

  public async connect(): Promise<DaemonIpcTransport | null> {
    if (this.connected && this.activeTransport) {
      return this.activeTransport;
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.intentionalDisconnect = false;
    this.clearReconnectTimer();

    if (this.mockTransport) {
      this.connected = true;
      this.activeTransport = this.mockTransport.transport;
      this.flushOfflineQueue();
      return this.activeTransport;
    }

    this.connectPromise = (async () => {
      const wasReconnect = this.reconnectAttempts > 0;
      const pipeOk = await this.tryConnectPipe();
      if (pipeOk) {
        this.reconnectAttempts = 0;
        this.flushOfflineQueue();
        this.notifyUiClientHello();
        if (wasReconnect) {
          for (const cb of this.reconnectListeners) cb(DAEMON_IPC_TRANSPORT.NAMED_PIPE);
        }
        return DAEMON_IPC_TRANSPORT.NAMED_PIPE;
      }

      const wsOk = await this.tryConnectWebSocket();
      if (wsOk) {
        this.reconnectAttempts = 0;
        this.flushOfflineQueue();
        this.notifyUiClientHello();
        if (wasReconnect) {
          for (const cb of this.reconnectListeners) cb(DAEMON_IPC_TRANSPORT.WS_URL);
        }
        return DAEMON_IPC_TRANSPORT.WS_URL;
      }

      this.connected = false;
      this.activeTransport = null;
      if (this.autoReconnect && !this.intentionalDisconnect) {
        this.scheduleReconnect();
      }
      return null;
    })();

    try {
      return await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  private tryConnectPipe(): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      const socket = net.createConnection(this.pipePath);
      socket.setNoDelay(true);

      let lineBuf = '';

      const onConnect = () => {
        if (settled) return;
        settled = true;
        this.pipeSocket = socket;
        this.connected = true;
        this.activeTransport = DAEMON_IPC_TRANSPORT.NAMED_PIPE;
        resolve(true);
      };

      const onStartupError = () => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(false);
      };

      socket.once('connect', onConnect);
      socket.once('error', onStartupError);

      socket.on('data', (chunk) => {
        lineBuf += chunk.toString('utf-8');
        let idx = lineBuf.indexOf('\n');
        while (idx !== -1) {
          const line = lineBuf.slice(0, idx).trim();
          lineBuf = lineBuf.slice(idx + 1);
          if (line.length > 0) {
            this.handleIncomingMessage(line);
          }
          idx = lineBuf.indexOf('\n');
        }
      });

      socket.on('close', () => {
        if (this.pipeSocket === socket) {
          this.pipeSocket = null;
          this.handleTransportClosed();
        }
      });
    });
  }

  private tryConnectWebSocket(): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(this.wsUrl);
      } catch {
        resolve(false);
        return;
      }

      const key = crypto.randomBytes(16).toString('base64');
      const req = http.request({
        host: parsedUrl.hostname,
        port: Number(parsedUrl.port || 4949),
        path: parsedUrl.pathname || '/',
        headers: {
          Connection: 'Upgrade',
          Upgrade: 'websocket',
          'Sec-WebSocket-Key': key,
          'Sec-WebSocket-Version': '13',
        },
      });

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          req.destroy();
          resolve(false);
        }
      }, 1000);
      timeout.unref?.();

      req.on('upgrade', (_res, socket, head) => {
        clearTimeout(timeout);
        if (settled) {
          socket.destroy();
          return;
        }
        settled = true;
        socket.setNoDelay(true);
        this.wsSocket = socket;
        this.connected = true;
        this.activeTransport = DAEMON_IPC_TRANSPORT.WS_URL;

        const decode = createWsClientFrameDecoder(
          (msg) => this.handleIncomingMessage(msg),
          (pingPayload) => {
            if (!socket.destroyed) {
              socket.write(encodeWsMaskedControlFrame(0x0a, pingPayload));
            }
          },
          () => {
            socket.destroy();
          }
        );

        socket.on('data', decode);
        socket.on('error', () => {
          // Handled on close
        });
        socket.on('close', () => {
          if (this.wsSocket === socket) {
            this.wsSocket = null;
            this.handleTransportClosed();
          }
        });

        if (head && head.length > 0) {
          decode(head);
        }

        resolve(true);
      });

      req.on('error', () => {
        clearTimeout(timeout);
        if (!settled) {
          settled = true;
          resolve(false);
        }
      });

      req.on('response', (res) => {
        clearTimeout(timeout);
        res.resume();
        if (!settled) {
          settled = true;
          resolve(false);
        }
      });

      req.end();
    });
  }

  private handleTransportClosed(): void {
    this.connected = false;
    this.activeTransport = null;
    this.stopPendingSweep();

    for (const [id, pending] of this.pendingRequests) {
      pending.resolve({
        type: 'RESPONSE',
        id,
        ok: false,
        error: 'DAEMON_CONNECTION_CLOSED',
        validationLatencyMs: 0,
      });
    }
    this.pendingRequests.clear();

    for (const cb of this.disconnectListeners) {
      cb();
    }

    if (this.autoReconnect && !this.intentionalDisconnect) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.intentionalDisconnect) return;
    const delay = Math.min(
      this.maxReconnectIntervalMs,
      this.reconnectIntervalMs * Math.pow(2, Math.min(this.reconnectAttempts, 5))
    );
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.intentionalDisconnect && !this.connected) {
        void this.connect();
      }
    }, delay);
    this.reconnectTimer.unref?.();
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private handleIncomingMessage(rawJson: string): void {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawJson) as Record<string, unknown>;
    } catch {
      return;
    }

    if (parsed.type === 'RESPONSE') {
      const id = typeof parsed.id === 'string' ? parsed.id : '';
      const pending = this.pendingRequests.get(id);
      if (pending) {
        this.pendingRequests.delete(id);
        if (this.pendingRequests.size === 0) {
          this.stopPendingSweep();
        }
        pending.resolve(parsed as unknown as DaemonIpcResponse);
      }
      return;
    }

    if (parsed.type === 'SERVER_PUSH') {
      const event = typeof parsed.event === 'string' ? parsed.event : '';
      if (!VALID_DAEMON_IPC_EVENTS.has(event)) {
        return;
      }

      const envelope: DaemonIpcEnvelope = {
        event: event as DaemonIpcEvent,
        transport:
          (parsed.transport as DaemonIpcTransport) ||
          this.activeTransport ||
          DAEMON_IPC_TRANSPORT.NAMED_PIPE,
        timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : Date.now(),
        taskId: typeof parsed.taskId === 'string' ? parsed.taskId : undefined,
        payload:
          parsed.payload && typeof parsed.payload === 'object'
            ? (parsed.payload as Record<string, unknown>)
            : {},
      };

      for (const listener of this.serverPushListeners) {
        try {
          listener(envelope);
        } catch {
          // Keep push dispatch resilient
        }
      }

      if (envelope.event === 'daemon:server_push_alert') {
        const alert = envelope.payload as unknown as ServerPushAlertPayload;
        for (const listener of this.serverPushAlertListeners) {
          try {
            listener(alert);
          } catch {
            // Keep push dispatch resilient
          }
        }
        this.eventBus.emit('daemon:server_push_alert', alert);
      }
    }
  }

  public dispatchMutation(
    event: DaemonIpcEvent,
    payload: Record<string, unknown>,
    taskId?: string
  ): DaemonDispatchResult {
    const start = performance.now();

    if (!VALID_DAEMON_IPC_EVENTS.has(event)) {
      const requestId = `req-${++this.seq}`;
      const latency = Number((performance.now() - start).toFixed(4));
      return {
        dispatched: false,
        queuedOffline: false,
        requestId,
        transport: this.activeTransport || DAEMON_IPC_TRANSPORT.NAMED_PIPE,
        dispatchLatencyMs: latency,
        ackPromise: Promise.resolve({
          type: 'RESPONSE',
          id: requestId,
          ok: false,
          error: `INVALID_IPC_EVENT: ${event}`,
          validationLatencyMs: latency,
        }),
      };
    }

    const requestId = `req-${++this.seq}`;
    const transport: DaemonIpcTransport =
      this.activeTransport || DAEMON_IPC_TRANSPORT.NAMED_PIPE;

    const wireEnvelope: DaemonIpcEnvelope & { id: string } = {
      id: requestId,
      event,
      transport,
      timestamp: Date.now(),
      ...(taskId ? { taskId } : {}),
      payload,
    };

    if (this.mockTransport) {
      const mockRes = this.mockTransport.send(wireEnvelope);
      const dispatchLatencyMs = Number((performance.now() - start).toFixed(4));
      return {
        dispatched: true,
        queuedOffline: false,
        requestId,
        transport: this.mockTransport.transport,
        dispatchLatencyMs,
        ackPromise: Promise.resolve(mockRes),
      };
    }

    const wireJson = JSON.stringify(wireEnvelope);

    if (this.pipeSocket && !this.pipeSocket.destroyed) {
      const targetPipe = this.pipeSocket;
      const ackPromise = this.registerPending(requestId);
      const dispatchLatencyMs = Number((performance.now() - start).toFixed(4));
      queueMicrotask(() => {
        if (!targetPipe.destroyed) {
          targetPipe.write(`${wireJson}\n`);
        }
      });
      return {
        dispatched: true,
        queuedOffline: false,
        requestId,
        transport: DAEMON_IPC_TRANSPORT.NAMED_PIPE,
        dispatchLatencyMs,
        ackPromise,
      };
    }

    if (this.wsSocket && !this.wsSocket.destroyed) {
      const targetWs = this.wsSocket;
      const ackPromise = this.registerPending(requestId);
      const dispatchLatencyMs = Number((performance.now() - start).toFixed(4));
      queueMicrotask(() => {
        if (!targetWs.destroyed) {
          targetWs.write(encodeWsMaskedTextFrame(wireJson));
        }
      });
      return {
        dispatched: true,
        queuedOffline: false,
        requestId,
        transport: DAEMON_IPC_TRANSPORT.WS_URL,
        dispatchLatencyMs,
        ackPromise,
      };
    }

    // Daemon offline: queue bounded mutation for reconnect flush without blocking caller
    if (this.offlineQueue.length >= MAX_OFFLINE_QUEUE) {
      this.offlineQueue.shift();
    }
    this.offlineQueue.push({ wireJson, envelope: wireEnvelope });

    if (this.autoReconnect && !this.intentionalDisconnect && !this.connectPromise) {
      this.scheduleReconnect();
    }

    const dispatchLatencyMs = Number((performance.now() - start).toFixed(4));
    return {
      dispatched: false,
      queuedOffline: true,
      requestId,
      transport,
      dispatchLatencyMs,
      ackPromise: Promise.resolve({
        type: 'RESPONSE',
        id: requestId,
        ok: false,
        error: 'DAEMON_OFFLINE',
        validationLatencyMs: 0,
      }),
    };
  }

  public sendMutation(
    event: DaemonIpcEvent,
    payload: Record<string, unknown>,
    taskId?: string
  ): Promise<DaemonIpcResponse> {
    return this.dispatchMutation(event, payload, taskId).ackPromise;
  }

  public notifyUiClientHello(): DaemonDispatchResult {
    return this.dispatchMutation('daemon:ui_client_hello', {
      uiClientId: this.uiClientId,
    });
  }

  public notifyUiClientDisconnect(reason = 'window-all-closed'): DaemonDispatchResult {
    return this.dispatchMutation('daemon:ui_client_disconnect', {
      uiClientId: this.uiClientId,
      reason,
    });
  }

  public registerPtyLease(params: {
    pid: number;
    leaseScope: ProcessLeaseScope;
    command?: string;
    origin?: string;
  }): DaemonDispatchResult {
    return this.dispatchMutation('daemon:pty_lease_register', {
      pid: params.pid,
      leaseScope: params.leaseScope,
      uiClientId: params.leaseScope === 'DETACHED_DAEMON_SERVICE' ? null : this.uiClientId,
      command: params.command,
      origin: params.origin,
    });
  }

  public releasePtyLease(pid: number): DaemonDispatchResult {
    return this.dispatchMutation('daemon:pty_lease_release', {
      pid,
      uiClientId: this.uiClientId,
    });
  }

  public injectSecondBrainNote(payload: {
    title: string;
    domain: string;
    tags?: string[];
    content: string;
    filePath?: string;
    notePath?: string;
    vaultRoot?: string;
    frontmatter?: Record<string, unknown>;
  }): DaemonDispatchResult {
    return this.dispatchMutation(
      'daemon:second_brain_inject',
      {
        op: 'second_brain:inject_note',
        ...payload,
      },
      'SECOND_BRAIN_INJECT'
    );
  }

  public syncObsidianCanvas(payload: {
    direction?: string;
    canvasPath?: string;
    vaultRoot?: string;
    document?: unknown;
    topology?: unknown;
  }): DaemonDispatchResult {
    return this.dispatchMutation(
      'daemon:canvas_sync_requested',
      {
        op: 'canvas:sync_document',
        ...payload,
      },
      'CANVAS_SYNC'
    );
  }

  public requestCortexReindex(vaultRoot?: string): DaemonDispatchResult {
    return this.dispatchMutation(
      'daemon:cortex_reindex',
      {
        op: 'cortex:reindex',
        ...(vaultRoot ? { vaultRoot } : {}),
      },
      'CORTEX_REINDEX'
    );
  }

  private registerPending(requestId: string): Promise<DaemonIpcResponse> {
    return new Promise((resolve) => {
      this.pendingRequests.set(requestId, {
        resolve,
        deadlineMs: Date.now() + this.requestTimeoutMs,
      });
      this.ensurePendingSweep();
    });
  }

  private ensurePendingSweep(): void {
    if (this.pendingSweepTimer) return;
    const sweepMs = Math.max(50, Math.min(500, this.requestTimeoutMs));
    this.pendingSweepTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, pending] of this.pendingRequests) {
        if (now >= pending.deadlineMs) {
          this.pendingRequests.delete(id);
          pending.resolve({
            type: 'RESPONSE',
            id,
            ok: false,
            error: 'DAEMON_ACK_TIMEOUT',
            validationLatencyMs: 0,
          });
        }
      }
      if (this.pendingRequests.size === 0) {
        this.stopPendingSweep();
      }
    }, sweepMs);
    this.pendingSweepTimer.unref?.();
  }

  private stopPendingSweep(): void {
    if (this.pendingSweepTimer) {
      clearInterval(this.pendingSweepTimer);
      this.pendingSweepTimer = null;
    }
  }

  private flushOfflineQueue(): void {
    if (this.offlineQueue.length === 0) return;

    while (this.offlineQueue.length > 0) {
      const item = this.offlineQueue.shift();
      if (!item) break;
      if (this.pipeSocket && !this.pipeSocket.destroyed) {
        this.pipeSocket.write(`${item.wireJson}\n`);
      } else if (this.wsSocket && !this.wsSocket.destroyed) {
        this.wsSocket.write(encodeWsMaskedTextFrame(item.wireJson));
      } else {
        this.offlineQueue.unshift(item);
        break;
      }
    }
  }

  public disconnect(): void {
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();
    this.stopPendingSweep();
    this.connected = false;
    this.activeTransport = null;

    for (const [id, pending] of this.pendingRequests) {
      pending.resolve({
        type: 'RESPONSE',
        id,
        ok: false,
        error: 'CLIENT_DISCONNECTED',
        validationLatencyMs: 0,
      });
    }
    this.pendingRequests.clear();

    if (this.pipeSocket) {
      const s = this.pipeSocket;
      this.pipeSocket = null;
      s.destroy();
    }
    if (this.wsSocket) {
      const s = this.wsSocket;
      this.wsSocket = null;
      s.destroy();
    }
  }
}
