/**
 * KALINAR SQLITE STORE (v1.6.0-alpha)
 * Strict Read-Only Electron Bridge to Canonical Daemon WAL DB + IPC Mutation Dispatch
 * Preserves isolated temp-file schema mode when unit tests supply a non-existent temp path.
 * Strictly Zero Emojis
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import {
  FifoQueueItem,
  LlmModelCheckpoint,
  LlmModelId,
  ObsidianCanvasDocument,
  SecondBrainVaultNote,
  SecondBrainVaultQueryParams,
  WorkspaceScanResult,
} from '../../src/types/kalinar.js';
import { DaemonClient, DaemonDispatchResult } from '../daemon/DaemonClient.js';

export const CANONICAL_DAEMON_DB_PATH = 'C:\\Dev\\kalinar-daemon\\data\\kalinar.db';
export const LOCAL_READONLY_SNAPSHOT_PATH = path.resolve(process.cwd(), 'kalinar-state.db');

export interface KalinarSqliteStoreOptions {
  dbPath?: string;
  fallbackSnapshotPath?: string;
  readOnly?: boolean;
  daemonClient?: DaemonClient;
}

export interface TaskRecord {
  id: string;
  project_path: string;
  title: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'BLOCKED' | 'PAUSED';
  current_agent: string;
  from_agent?: string;
  contract_path?: string;
  context_notes?: string;
  action_instruction?: string;
  qa_retries?: number;
  total_turns?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TelemetryLogRecord {
  task_id: string;
  event_type: 'TURN_START' | 'TURN_END' | 'CIRCUIT_TRIP' | 'HALT' | 'VOICE_CMD' | 'FILE_WATCH';
  agent_name: string;
  payload: string;
  latency_ms: number;
}

export interface CanvasNodeRecord {
  id: string;
  task_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color_token: string;
  canvas_file: string;
  last_synced_at?: string;
}

export interface SecondBrainNoteRecord {
  id: string;
  title: string;
  file_path: string;
  wikilink: string;
  domain: string;
  tags: string;
  frontmatter_json: string;
  wikilinks_json: string;
  excerpt: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface CortexNoteCacheRow {
  note_id: string;
  relative_path: string;
  title: string;
  domain: string;
  frontmatter_json: string;
  wikilinks_json: string;
  excerpt: string;
  content_hash: string;
  updated_at: number;
}

export class KalinarSqliteStore {
  private db: DatabaseSync;
  private dbPath: string;
  private readOnly: boolean;
  private usingFallbackSnapshot = false;
  private daemonClient: DaemonClient | null;
  private lastDispatchResult: DaemonDispatchResult | null = null;

  constructor(pathOrOptions?: string | KalinarSqliteStoreOptions) {
    const resolvedMode = this.resolveStoreMode(pathOrOptions);
    this.dbPath = resolvedMode.resolvedDbPath;
    this.readOnly = resolvedMode.readOnly;
    this.usingFallbackSnapshot = resolvedMode.usingFallbackSnapshot;
    this.daemonClient = resolvedMode.daemonClient;

    if (this.readOnly) {
      if (!fs.existsSync(this.dbPath)) {
        this.initializeEmptySnapshot(this.dbPath);
      }
      this.db = new DatabaseSync(this.dbPath, {
        readOnly: true,
        timeout: 5000,
      });
    } else {
      const parentDir = path.dirname(path.resolve(this.dbPath));
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      this.db = new DatabaseSync(this.dbPath, {
        readOnly: false,
        timeout: 5000,
      });
      this.initPragmasAndSchemaOn(this.db);
    }
  }

  private resolveStoreMode(pathOrOptions?: string | KalinarSqliteStoreOptions): {
    resolvedDbPath: string;
    readOnly: boolean;
    usingFallbackSnapshot: boolean;
    daemonClient: DaemonClient | null;
  } {
    if (pathOrOptions === undefined) {
      const canonicalExists = fs.existsSync(CANONICAL_DAEMON_DB_PATH);
      return {
        resolvedDbPath: canonicalExists ? CANONICAL_DAEMON_DB_PATH : LOCAL_READONLY_SNAPSHOT_PATH,
        readOnly: true,
        usingFallbackSnapshot: !canonicalExists,
        daemonClient: DaemonClient.getSharedInstance(),
      };
    }

    if (typeof pathOrOptions === 'string') {
      const normalizedArg = path.resolve(pathOrOptions);
      const isCanonical = normalizedArg === path.resolve(CANONICAL_DAEMON_DB_PATH);
      const alreadyExists = fs.existsSync(pathOrOptions);

      // Existing DB files and the canonical Daemon DB open strictly read-only.
      // Brand-new temp paths passed by isolated unit tests keep local schema creation.
      if (isCanonical || alreadyExists) {
        return {
          resolvedDbPath: pathOrOptions,
          readOnly: true,
          usingFallbackSnapshot: !isCanonical,
          daemonClient: DaemonClient.getSharedInstance(),
        };
      }

      return {
        resolvedDbPath: pathOrOptions,
        readOnly: false,
        usingFallbackSnapshot: false,
        daemonClient: null,
      };
    }

    const readOnly = pathOrOptions.readOnly !== false;
    const client = pathOrOptions.daemonClient ?? (readOnly ? DaemonClient.getSharedInstance() : null);

    if (!readOnly) {
      return {
        resolvedDbPath: pathOrOptions.dbPath || CANONICAL_DAEMON_DB_PATH,
        readOnly: false,
        usingFallbackSnapshot: false,
        daemonClient: client,
      };
    }

    const preferredPath = pathOrOptions.dbPath || CANONICAL_DAEMON_DB_PATH;
    if (fs.existsSync(preferredPath)) {
      return {
        resolvedDbPath: preferredPath,
        readOnly: true,
        usingFallbackSnapshot: false,
        daemonClient: client,
      };
    }

    if (!pathOrOptions.dbPath && fs.existsSync(CANONICAL_DAEMON_DB_PATH)) {
      return {
        resolvedDbPath: CANONICAL_DAEMON_DB_PATH,
        readOnly: true,
        usingFallbackSnapshot: false,
        daemonClient: client,
      };
    }

    const fallback = pathOrOptions.fallbackSnapshotPath || LOCAL_READONLY_SNAPSHOT_PATH;
    return {
      resolvedDbPath: fallback,
      readOnly: true,
      usingFallbackSnapshot: true,
      daemonClient: client,
    };
  }

  private initializeEmptySnapshot(snapshotPath: string): void {
    const parentDir = path.dirname(path.resolve(snapshotPath));
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    const bootstrapDb = new DatabaseSync(snapshotPath, {
      readOnly: false,
      timeout: 5000,
    });
    try {
      this.initPragmasAndSchemaOn(bootstrapDb);
    } finally {
      bootstrapDb.close();
    }
  }

  public isReadOnly(): boolean {
    return this.readOnly;
  }

  public isUsingFallbackSnapshot(): boolean {
    return this.usingFallbackSnapshot;
  }

  public getDbPath(): string {
    return this.dbPath;
  }

  public getDatabase(): DatabaseSync {
    return this.db;
  }

  public getDaemonClient(): DaemonClient | null {
    return this.daemonClient;
  }

  public setDaemonClient(client: DaemonClient): void {
    this.daemonClient = client;
  }

  public getLastDispatchResult(): DaemonDispatchResult | null {
    return this.lastDispatchResult;
  }

  private recordDispatch(result: DaemonDispatchResult): DaemonDispatchResult {
    result.ackPromise.catch(() => {
      // Prevent unhandled rejection when daemon is offline
    });
    this.lastDispatchResult = result;
    return result;
  }

  private initPragmasAndSchemaOn(targetDb: DatabaseSync): void {
    // 1. Performance Pragmas
    targetDb.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
    `);

    // 2. Agent Registry Table
    targetDb.exec(`
      CREATE TABLE IF NOT EXISTS agent_registry (
        name TEXT PRIMARY KEY NOT NULL,
        role_description TEXT NOT NULL,
        system_prompt_ref TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
      );
    `);

    // Seed Canonical 7 Agents
    targetDb.exec(`
      INSERT OR IGNORE INTO agent_registry (name, role_description, system_prompt_ref) VALUES
      ('agent-orchestrator', 'Swarm Facilitator, PM, and Queue Controller', '05_AGENTS/agent-orchestrator.md'),
      ('agent-software-engineer', 'Principal Full-Stack & Contract-First Architect', '05_AGENTS/agent-software-engineer.md'),
      ('agent-design', 'UI/UX, 3-Tier CSS Tokens, 3D Galaxy Architect', '05_AGENTS/agent-design.md'),
      ('agent-data', 'Decision Engine Specialist, Zen-Engine, Telemetry', '05_AGENTS/agent-data.md'),
      ('agent-cybersecurity', 'Zero-Trust Auditor, STRIDE Modeling, Security Lead', '05_AGENTS/agent-cybersecurity.md'),
      ('agent-qa', 'Test Architect, Vitest, Playwright, DAST Lead', '05_AGENTS/agent-qa.md'),
      ('agent-content', 'Technical Documentation and Developer Writing Lead', '05_AGENTS/agent-content.md');
    `);

    // 3. Tasks Table
    targetDb.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        project_path TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'BLOCKED', 'PAUSED')),
        current_agent TEXT NOT NULL REFERENCES agent_registry(name),
        from_agent TEXT,
        contract_path TEXT,
        context_notes TEXT NOT NULL DEFAULT '[]',
        action_instruction TEXT,
        qa_retries INTEGER NOT NULL DEFAULT 0,
        total_turns INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
    `);

    // Seed System Tasks to satisfy Telemetry foreign keys
    targetDb.exec(`
      INSERT OR IGNORE INTO tasks (id, project_path, title, status, current_agent) VALUES
      ('SYSTEM', 'c:/Kalinar', 'System Daemon', 'COMPLETED', 'agent-orchestrator'),
      ('WORKSPACE_DAEMON', 'c:/Kalinar', 'Workspace Chokidar Daemon', 'COMPLETED', 'agent-orchestrator'),
      ('CLI_GATE', 'c:/Kalinar', 'GoRules Zen Firewall Gate', 'COMPLETED', 'agent-cybersecurity'),
      ('CLI_EXEC', 'c:/Kalinar', 'Native Shell Execution', 'COMPLETED', 'agent-software-engineer');
    `);

    // 4. Turns Table
    targetDb.exec(`
      CREATE TABLE IF NOT EXISTS turns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        agent_name TEXT NOT NULL REFERENCES agent_registry(name),
        turn_number INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('HANDOFF', 'COMPLETED', 'NEEDS_HUMAN_INPUT')),
        next_agent TEXT REFERENCES agent_registry(name),
        contract_path TEXT,
        summary TEXT NOT NULL,
        question_for_human TEXT,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
    `);

    // 5. Telemetry Logs Table & Append-Only Triggers
    targetDb.exec(`
      CREATE TABLE IF NOT EXISTS telemetry_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        payload TEXT NOT NULL,
        latency_ms INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TRIGGER IF NOT EXISTS trg_telemetry_no_update
      BEFORE UPDATE ON telemetry_logs
      BEGIN
        SELECT RAISE(ABORT, '[SECURITY_VIOLATION] Updates forbidden on append-only telemetry_logs');
      END;

      CREATE TRIGGER IF NOT EXISTS trg_telemetry_no_delete
      BEFORE DELETE ON telemetry_logs
      BEGIN
        SELECT RAISE(ABORT, '[SECURITY_VIOLATION] Deletions forbidden on append-only telemetry_logs');
      END;
    `);

    // 6. Circuit Breaker Events Table
    targetDb.exec(`
      CREATE TABLE IF NOT EXISTS circuit_breaker_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        state TEXT NOT NULL CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
        trip_reason TEXT NOT NULL,
        jdm_rule_matched TEXT,
        triggered_by TEXT NOT NULL CHECK (triggered_by IN ('ZEN_ENGINE', 'OPERATOR_OVERRIDE', 'VOICE_CORE')),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
    `);

    // 7. Canvas Nodes Table (Zero Foreign Key Constraints - Generic Entity Ref)
    try {
      const tableInfo = targetDb
        .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'canvas_nodes'")
        .get() as { sql?: string } | undefined;
      if (tableInfo?.sql && tableInfo.sql.includes('REFERENCES tasks')) {
        targetDb.exec(`
          ALTER TABLE canvas_nodes RENAME TO canvas_nodes_old;
          CREATE TABLE canvas_nodes (
            id TEXT PRIMARY KEY NOT NULL,
            task_id TEXT NOT NULL,
            x REAL NOT NULL DEFAULT 0,
            y REAL NOT NULL DEFAULT 0,
            width REAL NOT NULL DEFAULT 320,
            height REAL NOT NULL DEFAULT 160,
            color_token TEXT NOT NULL DEFAULT '#00F0FF',
            canvas_file TEXT NOT NULL,
            last_synced_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
          );
          INSERT INTO canvas_nodes (id, task_id, x, y, width, height, color_token, canvas_file, last_synced_at)
          SELECT id, task_id, x, y, width, height, color_token, canvas_file, last_synced_at FROM canvas_nodes_old;
          DROP TABLE canvas_nodes_old;
        `);
      }
    } catch {
      // Table might not exist yet, continue to create table
    }

    targetDb.exec(`
      CREATE TABLE IF NOT EXISTS canvas_nodes (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT NOT NULL,
        x REAL NOT NULL DEFAULT 0,
        y REAL NOT NULL DEFAULT 0,
        width REAL NOT NULL DEFAULT 320,
        height REAL NOT NULL DEFAULT 160,
        color_token TEXT NOT NULL DEFAULT '#00F0FF',
        canvas_file TEXT NOT NULL,
        last_synced_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_canvas_nodes_file ON canvas_nodes(canvas_file);
    `);

    // 8. Busy Agent FIFO Queue Table (FLOW-AGENT-FIFO-01)
    targetDb.exec(`
      CREATE TABLE IF NOT EXISTS agent_task_fifo_queue (
        id TEXT PRIMARY KEY,
        target_agent_id TEXT NOT NULL,
        instruction TEXT NOT NULL,
        model_id TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    // 9. Multi-Model LLM Atomic Git Checkpoints Table (FLOW-LLM-FAILOVER-01)
    targetDb.exec(`
      CREATE TABLE IF NOT EXISTS llm_model_checkpoints (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        git_commit_or_stash_hash TEXT NOT NULL,
        active_model_id TEXT NOT NULL,
        fallback_model_id TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        status TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // 10. Second Brain Notes Table (Vault Index & Note Injection Storage)
    targetDb.exec(`
      CREATE TABLE IF NOT EXISTS second_brain_notes (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        file_path TEXT NOT NULL,
        wikilink TEXT NOT NULL,
        domain TEXT NOT NULL,
        tags TEXT NOT NULL,
        frontmatter_json TEXT NOT NULL,
        wikilinks_json TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_second_brain_domain ON second_brain_notes(domain);
      CREATE INDEX IF NOT EXISTS idx_second_brain_file_path ON second_brain_notes(file_path);
    `);

    // 11. Cortex Note Cache Table (Milestone 5 SQLite Shadow Cache for Second Brain)
    targetDb.exec(`
      CREATE TABLE IF NOT EXISTS cortex_note_cache (
        note_id TEXT PRIMARY KEY NOT NULL,
        relative_path TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        domain TEXT NOT NULL,
        frontmatter_json TEXT NOT NULL DEFAULT '{}',
        wikilinks_json TEXT NOT NULL DEFAULT '[]',
        excerpt TEXT NOT NULL DEFAULT '',
        content_hash TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_cortex_note_cache_domain ON cortex_note_cache(domain);
      CREATE INDEX IF NOT EXISTS idx_cortex_note_cache_updated ON cortex_note_cache(updated_at);
    `);
  }

  /* =====================================================================
     TASK & TELEMETRY MUTATIONS (ROUTED TO DAEMON WHEN READ-ONLY)
     ===================================================================== */

  public insertTask(task: TaskRecord): void {
    if (this.readOnly) {
      const client = this.daemonClient || DaemonClient.getSharedInstance();
      this.recordDispatch(
        client.dispatchMutation('daemon:task_created', { op: 'task:upsert', task }, task.id)
      );
      return;
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tasks (
        id, project_path, title, status, current_agent, from_agent,
        contract_path, context_notes, action_instruction, qa_retries, total_turns
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      task.id,
      task.project_path,
      task.title,
      task.status,
      task.current_agent,
      task.from_agent || null,
      task.contract_path || null,
      task.context_notes || '[]',
      task.action_instruction || null,
      task.qa_retries || 0,
      task.total_turns || 0
    );
  }

  public insertTelemetry(record: TelemetryLogRecord): void {
    if (this.readOnly) {
      const client = this.daemonClient || DaemonClient.getSharedInstance();
      this.recordDispatch(
        client.dispatchMutation(
          'daemon:stream_digest',
          { op: 'telemetry:insert', record },
          record.task_id
        )
      );
      return;
    }

    const stmt = this.db.prepare(`
      INSERT INTO telemetry_logs (task_id, event_type, agent_name, payload, latency_ms)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(record.task_id, record.event_type, record.agent_name, record.payload, record.latency_ms);
  }

  public getActiveTasks(): TaskRecord[] {
    const stmt = this.db.prepare(`SELECT * FROM tasks WHERE status IN ('PENDING', 'RUNNING')`);
    return stmt.all() as unknown as TaskRecord[];
  }

  public getTelemetryLogs(taskId: string, limit = 50): TelemetryLogRecord[] {
    const stmt = this.db.prepare(`
      SELECT task_id, event_type, agent_name, payload, latency_ms
      FROM telemetry_logs
      WHERE task_id = ?
      ORDER BY id DESC
      LIMIT ?
    `);
    return stmt.all(taskId, limit) as unknown as TelemetryLogRecord[];
  }

  public getHistoricalTelemetry(limit = 100): Array<TelemetryLogRecord & { id: number; timestamp: string }> {
    const stmt = this.db.prepare(`
      SELECT id, task_id, event_type, agent_name, payload, latency_ms, created_at as timestamp
      FROM telemetry_logs
      ORDER BY id DESC
      LIMIT ?
    `);
    return stmt.all(limit) as unknown as Array<TelemetryLogRecord & { id: number; timestamp: string }>;
  }

  public getEvolutionSummary(): {
    totalEvents: number;
    avgLatencyMs: number;
    agentDistribution: Record<string, number>;
  } {
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count, AVG(latency_ms) as avg_latency FROM telemetry_logs`);
    const countRow = countStmt.get() as { count: number; avg_latency: number | null };

    const agentStmt = this.db.prepare(`
      SELECT agent_name, COUNT(*) as count
      FROM telemetry_logs
      GROUP BY agent_name
    `);
    const agentRows = agentStmt.all() as Array<{ agent_name: string; count: number }>;

    const agentDistribution: Record<string, number> = {};
    for (const row of agentRows) {
      agentDistribution[row.agent_name] = row.count;
    }

    return {
      totalEvents: countRow?.count || 0,
      avgLatencyMs: Number((countRow?.avg_latency || 0).toFixed(2)),
      agentDistribution,
    };
  }

  /* =====================================================================
     FIFO QUEUE & MULTI-MODEL CHECKPOINT REPOSITORY METHODS
     ===================================================================== */

  public enqueueAgentFifo(item: {
    id?: string;
    targetAgentId: string;
    instruction: string;
    modelId: LlmModelId;
    status?: FifoQueueItem['status'];
    createdAt?: number;
  }): FifoQueueItem {
    const record: FifoQueueItem = {
      id: item.id || `fifo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      targetAgentId: item.targetAgentId,
      instruction: item.instruction,
      modelId: item.modelId,
      status: item.status || 'FIFO_QUEUED',
      createdAt: item.createdAt ?? Date.now(),
    };

    if (this.readOnly) {
      const client = this.daemonClient || DaemonClient.getSharedInstance();
      this.recordDispatch(
        client.dispatchMutation('daemon:fifo_queued', { op: 'fifo:enqueue', item: record })
      );
      return record;
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO agent_task_fifo_queue (
        id, target_agent_id, instruction, model_id, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.id,
      record.targetAgentId,
      record.instruction,
      record.modelId,
      record.status,
      record.createdAt
    );

    return record;
  }

  public enqueueAgentTaskFifo(item: {
    id?: string;
    targetAgentId: string;
    instruction: string;
    modelId: LlmModelId;
    status?: FifoQueueItem['status'];
    createdAt?: number;
  }): FifoQueueItem {
    return this.enqueueAgentFifo(item);
  }

  public dequeueNextAgentTaskFifo(targetAgentId: string): FifoQueueItem | null {
    const selectStmt = this.db.prepare(`
      SELECT id, target_agent_id, instruction, model_id, status, created_at
      FROM agent_task_fifo_queue
      WHERE target_agent_id = ? AND status = 'FIFO_QUEUED'
      ORDER BY created_at ASC, rowid ASC
      LIMIT 1
    `);

    const row = selectStmt.get(targetAgentId) as
      | {
          id: string;
          target_agent_id: string;
          instruction: string;
          model_id: LlmModelId;
          status: FifoQueueItem['status'];
          created_at: number;
        }
      | undefined;

    if (!row) {
      return null;
    }

    if (this.readOnly) {
      const client = this.daemonClient || DaemonClient.getSharedInstance();
      this.recordDispatch(
        client.dispatchMutation('daemon:fifo_queued', { op: 'fifo:dequeue', targetAgentId })
      );
    } else {
      const updateStmt = this.db.prepare(`
        UPDATE agent_task_fifo_queue
        SET status = 'DISPATCHED'
        WHERE id = ?
      `);
      updateStmt.run(row.id);
    }

    return {
      id: row.id,
      targetAgentId: row.target_agent_id,
      instruction: row.instruction,
      modelId: row.model_id,
      status: 'DISPATCHED',
      createdAt: row.created_at,
    };
  }

  public getAgentFifoQueue(targetAgentId?: string): FifoQueueItem[] {
    const rows = (
      targetAgentId
        ? this.db
            .prepare(`
              SELECT id, target_agent_id, instruction, model_id, status, created_at
              FROM agent_task_fifo_queue
              WHERE target_agent_id = ?
              ORDER BY created_at ASC, rowid ASC
            `)
            .all(targetAgentId)
        : this.db
            .prepare(`
              SELECT id, target_agent_id, instruction, model_id, status, created_at
              FROM agent_task_fifo_queue
              ORDER BY created_at ASC, rowid ASC
            `)
            .all()
    ) as Array<{
      id: string;
      target_agent_id: string;
      instruction: string;
      model_id: LlmModelId;
      status: FifoQueueItem['status'];
      created_at: number;
    }>;

    return rows.map((row) => ({
      id: row.id,
      targetAgentId: row.target_agent_id,
      instruction: row.instruction,
      modelId: row.model_id,
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  public promoteFifoTask(id: string): FifoQueueItem | null {
    if (this.readOnly) {
      const client = this.daemonClient || DaemonClient.getSharedInstance();
      this.recordDispatch(
        client.dispatchMutation('daemon:fifo_queued', { op: 'fifo:promote', id })
      );
    } else {
      const minRow = this.db
        .prepare(`SELECT MIN(created_at) as min_created FROM agent_task_fifo_queue WHERE status = 'FIFO_QUEUED'`)
        .get() as { min_created: number | null } | undefined;
      const promotedTimestamp = (minRow?.min_created ?? Date.now()) - 1000;

      this.db
        .prepare(`UPDATE agent_task_fifo_queue SET created_at = ?, status = 'FIFO_QUEUED' WHERE id = ?`)
        .run(promotedTimestamp, id);
    }

    const row = this.db
      .prepare(`
        SELECT id, target_agent_id, instruction, model_id, status, created_at
        FROM agent_task_fifo_queue
        WHERE id = ?
      `)
      .get(id) as
      | {
          id: string;
          target_agent_id: string;
          instruction: string;
          model_id: LlmModelId;
          status: FifoQueueItem['status'];
          created_at: number;
        }
      | undefined;

    if (!row) return null;
    return {
      id: row.id,
      targetAgentId: row.target_agent_id,
      instruction: row.instruction,
      modelId: row.model_id,
      status: row.status,
      createdAt: row.created_at,
    };
  }

  public clearAgentFifoQueue(targetAgentId?: string): number {
    if (this.readOnly) {
      const existingCount = this.getAgentFifoQueue(targetAgentId).length;
      const client = this.daemonClient || DaemonClient.getSharedInstance();
      this.recordDispatch(
        client.dispatchMutation('daemon:fifo_queued', { op: 'fifo:clear', targetAgentId })
      );
      return existingCount;
    }

    if (targetAgentId) {
      const res = this.db
        .prepare(`DELETE FROM agent_task_fifo_queue WHERE target_agent_id = ?`)
        .run(targetAgentId);
      return Number(res.changes || 0);
    }
    const res = this.db.prepare(`DELETE FROM agent_task_fifo_queue`).run();
    return Number(res.changes || 0);
  }

  public recordModelCheckpoint(checkpoint: LlmModelCheckpoint): LlmModelCheckpoint {
    if (this.readOnly) {
      const client = this.daemonClient || DaemonClient.getSharedInstance();
      this.recordDispatch(
        client.dispatchMutation(
          'daemon:model_hotswap',
          { op: 'checkpoint:record', checkpoint },
          checkpoint.taskId
        )
      );
      return checkpoint;
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO llm_model_checkpoints (
        id, agent_id, task_id, git_commit_or_stash_hash,
        active_model_id, fallback_model_id, retry_count, status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      checkpoint.id,
      checkpoint.agentId,
      checkpoint.taskId,
      checkpoint.gitCommitOrStashHash,
      checkpoint.activeModelId,
      checkpoint.fallbackModelId,
      checkpoint.retryCount,
      checkpoint.status,
      Date.now()
    );
    return checkpoint;
  }

  public updateModelCheckpointStatus(
    id: string,
    status: LlmModelCheckpoint['status'],
    retryCount: number,
    activeModelId: LlmModelId
  ): LlmModelCheckpoint | null {
    if (this.readOnly) {
      const client = this.daemonClient || DaemonClient.getSharedInstance();
      this.recordDispatch(
        client.dispatchMutation('daemon:model_hotswap', {
          op: 'checkpoint:update',
          id,
          status,
          retryCount,
          activeModelId,
        })
      );
      const current = this.getModelCheckpoint(id);
      if (!current) return null;
      return {
        ...current,
        status,
        retryCount,
        activeModelId,
      };
    }

    const updateStmt = this.db.prepare(`
      UPDATE llm_model_checkpoints
      SET status = ?, retry_count = ?, active_model_id = ?, updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(status, retryCount, activeModelId, Date.now(), id);

    return this.getModelCheckpoint(id);
  }

  public getModelCheckpoint(id: string): LlmModelCheckpoint | null {
    const stmt = this.db.prepare(`
      SELECT id, agent_id, task_id, git_commit_or_stash_hash,
             active_model_id, fallback_model_id, retry_count, status
      FROM llm_model_checkpoints
      WHERE id = ?
    `);
    const row = stmt.get(id) as
      | {
          id: string;
          agent_id: string;
          task_id: string;
          git_commit_or_stash_hash: string;
          active_model_id: LlmModelId;
          fallback_model_id: LlmModelId;
          retry_count: number;
          status: LlmModelCheckpoint['status'];
        }
      | undefined;

    if (!row) return null;

    return {
      id: row.id,
      agentId: row.agent_id,
      taskId: row.task_id,
      gitCommitOrStashHash: row.git_commit_or_stash_hash,
      activeModelId: row.active_model_id,
      fallbackModelId: row.fallback_model_id,
      retryCount: row.retry_count,
      status: row.status,
    };
  }

  /* =====================================================================
     SECOND BRAIN NOTES STORAGE & QUERY
     ===================================================================== */

  public upsertSecondBrainNote(note: SecondBrainNoteRecord): void {
    const now = new Date().toISOString();
    const fullNote: SecondBrainNoteRecord = {
      ...note,
      created_at: note.created_at || now,
      updated_at: note.updated_at || now,
    };

    if (this.readOnly) {
      const client = this.daemonClient || DaemonClient.getSharedInstance();
      this.recordDispatch(
        client.dispatchMutation('daemon:canvas_sync_requested', {
          op: 'second_brain:upsert_note',
          note: fullNote,
        })
      );
      return;
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO second_brain_notes (
        id, title, file_path, wikilink, domain, tags,
        frontmatter_json, wikilinks_json, excerpt, content, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      fullNote.id,
      fullNote.title,
      fullNote.file_path,
      fullNote.wikilink,
      fullNote.domain,
      fullNote.tags,
      fullNote.frontmatter_json,
      fullNote.wikilinks_json,
      fullNote.excerpt,
      fullNote.content,
      fullNote.created_at!,
      fullNote.updated_at!
    );
  }

  public insertSecondBrainNote(note: SecondBrainNoteRecord): void {
    this.upsertSecondBrainNote(note);
  }

  public getSecondBrainNotes(filter?: {
    domain?: string;
    query?: string;
    limit?: number;
  }): SecondBrainNoteRecord[] {
    let sql = `SELECT * FROM second_brain_notes WHERE 1=1`;
    const params: (string | number)[] = [];

    if (filter?.domain) {
      sql += ` AND domain = ?`;
      params.push(filter.domain);
    }

    if (filter?.query) {
      sql += ` AND (title LIKE ? OR content LIKE ? OR excerpt LIKE ? OR tags LIKE ?)`;
      const pattern = `%${filter.query}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    sql += ` ORDER BY updated_at DESC`;

    if (filter?.limit) {
      sql += ` LIMIT ?`;
      params.push(filter.limit);
    }

    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as unknown as SecondBrainNoteRecord[];
  }

  public getSecondBrainNoteById(id: string): SecondBrainNoteRecord | null {
    const stmt = this.db.prepare(`SELECT * FROM second_brain_notes WHERE id = ?`);
    const row = stmt.get(id);
    return (row as unknown as SecondBrainNoteRecord) || null;
  }

  public getSecondBrainNoteByPath(filePath: string): SecondBrainNoteRecord | null {
    const stmt = this.db.prepare(`SELECT * FROM second_brain_notes WHERE file_path = ?`);
    const row = stmt.get(filePath);
    return (row as unknown as SecondBrainNoteRecord) || null;
  }

  public deleteSecondBrainNote(id: string): void {
    if (this.readOnly) {
      const client = this.daemonClient || DaemonClient.getSharedInstance();
      this.recordDispatch(
        client.dispatchMutation('daemon:canvas_sync_requested', {
          op: 'second_brain:delete_note',
          id,
        })
      );
      return;
    }

    const stmt = this.db.prepare(`DELETE FROM second_brain_notes WHERE id = ?`);
    stmt.run(id);
  }

  public queryCortexNoteCache(filter?: {
    query?: string;
    domain?: string;
    relativePath?: string;
    limit?: number;
  }): CortexNoteCacheRow[] {
    try {
      let sql = `SELECT * FROM cortex_note_cache WHERE 1=1`;
      const params: Array<string | number> = [];

      if (filter?.relativePath) {
        const normalizedRel = filter.relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
        sql += ` AND relative_path = ?`;
        params.push(normalizedRel);
      }

      if (filter?.domain) {
        sql += ` AND LOWER(domain) LIKE ?`;
        params.push(`%${filter.domain.toLowerCase()}%`);
      }

      if (filter?.query) {
        sql += ` AND (LOWER(title) LIKE ? OR LOWER(excerpt) LIKE ? OR LOWER(frontmatter_json) LIKE ? OR LOWER(wikilinks_json) LIKE ? OR LOWER(relative_path) LIKE ?)`;
        const pattern = `%${filter.query.toLowerCase()}%`;
        params.push(pattern, pattern, pattern, pattern, pattern);
      }

      sql += ` ORDER BY updated_at DESC, relative_path ASC`;

      if (filter?.limit && filter.limit > 0) {
        sql += ` LIMIT ?`;
        params.push(filter.limit);
      }

      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as unknown as CortexNoteCacheRow[];
    } catch {
      return [];
    }
  }

  public querySecondBrainShadowCache(params?: SecondBrainVaultQueryParams): SecondBrainVaultNote[] {
    const normalizedTarget = params?.targetPath
      ? params.targetPath.replace(/\\/g, '/').replace(/^\/+/, '')
      : undefined;

    const cortexRows = this.queryCortexNoteCache({
      query: params?.query,
      domain: params?.domain,
      relativePath: normalizedTarget,
      limit: params?.maxResults,
    });

    const byPath = new Map<string, SecondBrainVaultNote>();

    const parseJsonSafe = <T>(raw: string, fallback: T): T => {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    };

    const normalizeExcerpt = (rawExcerpt: string, title: string): string => {
      let excerpt = (rawExcerpt || '').trim();
      if (!excerpt) {
        excerpt = `Second Brain note ${title}`;
      }
      if (excerpt.length >= 250) {
        excerpt = excerpt.slice(0, 237) + '...';
      }
      return excerpt;
    };

    for (const row of cortexRows) {
      const frontmatter = parseJsonSafe<Record<string, unknown>>(row.frontmatter_json, {});
      const wikilinksRaw = parseJsonSafe<string[]>(row.wikilinks_json, []);
      const wikilinks = Array.isArray(wikilinksRaw)
        ? wikilinksRaw.map((w) => String(w)).slice(0, 2)
        : [];
      let tags: string[] = [];
      if (Array.isArray(frontmatter.tags)) {
        tags = frontmatter.tags.map((t) => String(t));
      } else if (typeof frontmatter.tags === 'string') {
        tags = frontmatter.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      }
      if (tags.length === 0) {
        tags = ['#second-brain'];
      }
      const isoTime = new Date(Number(row.updated_at) || Date.now()).toISOString();
      const excerpt = normalizeExcerpt(row.excerpt, row.title);
      const relPath = row.relative_path.replace(/\\/g, '/');

      byPath.set(relPath, {
        id: row.note_id,
        title: row.title,
        filePath: relPath,
        wikilink: `[[${row.title}]]`,
        domain: row.domain,
        tags,
        frontmatter,
        wikilinks,
        excerpt,
        content: excerpt,
        createdAt: isoTime,
        updatedAt: isoTime,
      });
    }

    // Merge any notes from second_brain_notes table not already present or enrich content
    try {
      const sbRows = this.getSecondBrainNotes({
        domain: params?.domain,
        query: params?.query,
        limit: params?.maxResults,
      });

      for (const sb of sbRows) {
        const relPath = (sb.file_path || '').replace(/\\/g, '/').replace(/^\/+/, '');
        if (normalizedTarget && relPath !== normalizedTarget) {
          continue;
        }
        if (params?.domain && !sb.domain.toLowerCase().includes(params.domain.toLowerCase())) {
          continue;
        }
        const existing = byPath.get(relPath);
        if (existing) {
          if (sb.content && sb.content.length > (existing.content?.length ?? 0)) {
            existing.content = sb.content;
          }
          continue;
        }

        const frontmatter = parseJsonSafe<Record<string, unknown>>(sb.frontmatter_json, {});
        const wikilinksRaw = parseJsonSafe<string[]>(sb.wikilinks_json, []);
        const wikilinks = Array.isArray(wikilinksRaw)
          ? wikilinksRaw.map((w) => String(w)).slice(0, 2)
          : [];
        const tagsRaw = parseJsonSafe<string[]>(sb.tags, []);
        const tags =
          Array.isArray(tagsRaw) && tagsRaw.length > 0 ? tagsRaw.map((t) => String(t)) : ['#second-brain'];
        const excerpt = normalizeExcerpt(sb.excerpt, sb.title);
        const createdAt = sb.created_at || new Date().toISOString();
        const updatedAt = sb.updated_at || createdAt;

        byPath.set(relPath, {
          id: sb.id,
          title: sb.title,
          filePath: relPath,
          wikilink: sb.wikilink || `[[${sb.title}]]`,
          domain: sb.domain,
          tags,
          frontmatter,
          wikilinks,
          excerpt,
          content: sb.content || excerpt,
          createdAt,
          updatedAt,
        });
      }
    } catch {
      // Ignore if second_brain_notes is unavailable
    }

    const results = Array.from(byPath.values());
    if (params?.maxResults && params.maxResults > 0) {
      return results.slice(0, params.maxResults);
    }
    return results;
  }

  /* =====================================================================
     CANVAS NODES CRUD & PERSISTENCE
     ===================================================================== */

  public upsertCanvasNode(node: CanvasNodeRecord): void {
    const now = new Date().toISOString();
    const fullNode: CanvasNodeRecord = {
      ...node,
      last_synced_at: node.last_synced_at || now,
    };

    if (this.readOnly) {
      const client = this.daemonClient || DaemonClient.getSharedInstance();
      this.recordDispatch(
        client.dispatchMutation(
          'daemon:canvas_sync_requested',
          { op: 'canvas:upsert_node', node: fullNode },
          node.task_id
        )
      );
      return;
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO canvas_nodes (
        id, task_id, x, y, width, height, color_token, canvas_file, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      fullNode.id,
      fullNode.task_id,
      fullNode.x,
      fullNode.y,
      fullNode.width,
      fullNode.height,
      fullNode.color_token,
      fullNode.canvas_file,
      fullNode.last_synced_at!
    );
  }

  public getCanvasNodes(canvasFile?: string): CanvasNodeRecord[] {
    if (canvasFile) {
      const stmt = this.db.prepare(`SELECT * FROM canvas_nodes WHERE canvas_file = ?`);
      return stmt.all(canvasFile) as unknown as CanvasNodeRecord[];
    }
    const stmt = this.db.prepare(`SELECT * FROM canvas_nodes`);
    return stmt.all() as unknown as CanvasNodeRecord[];
  }

  public clearCanvasNodes(canvasFile?: string): void {
    if (this.readOnly) {
      const client = this.daemonClient || DaemonClient.getSharedInstance();
      this.recordDispatch(
        client.dispatchMutation('daemon:canvas_sync_requested', {
          op: 'canvas:clear_nodes',
          canvasFile,
        })
      );
      return;
    }

    if (canvasFile) {
      const stmt = this.db.prepare(`DELETE FROM canvas_nodes WHERE canvas_file = ?`);
      stmt.run(canvasFile);
    } else {
      const stmt = this.db.prepare(`DELETE FROM canvas_nodes`);
      stmt.run();
    }
  }

  /* =====================================================================
     BIDIRECTIONAL CANVAS SYNCHRONIZATION (OBSIDIAN JSON CANVAS 1.0)
     ===================================================================== */

  public syncToCanvas(
    canvasFilePath: string,
    topology?: WorkspaceScanResult
  ): ObsidianCanvasDocument {
    const nodes: any[] = [];
    const edges: any[] = [];

    if (topology) {
      // 1. AgentNode: color "5" (Cyan), type: 'text', 360x200
      for (const agent of topology.agents || []) {
        const x = Math.round((agent.position3D ? agent.position3D[0] : 0) * 4);
        const y = Math.round((agent.position3D ? agent.position3D[2] : 0) * 4);
        const text = `## ${agent.filename}\n**ID:** ${agent.id}\n**Status:** ${agent.status}\n**Objective:** ${agent.currentObjective}\n**Model:** ${agent.activeModelId || 'argon'}\n**Tokens:** ${agent.tokensPrompt + agent.tokensCompletion}`;

        nodes.push({
          id: agent.id,
          type: 'text',
          text,
          x,
          y,
          width: 360,
          height: 200,
          color: '5',
        });

        this.upsertCanvasNode({
          id: agent.id,
          task_id: agent.id,
          x,
          y,
          width: 360,
          height: 200,
          color_token: '5',
          canvas_file: canvasFilePath,
        });
      }

      // 2. SecondBrainNode: color "6" (Purple/Magenta), type: 'file', 320x180
      for (const sb of topology.secondBrainNodes || []) {
        const x = Math.round((sb.position3D ? sb.position3D[0] : 0) * 4);
        const y = Math.round((sb.position3D ? sb.position3D[2] : 0) * 4);

        nodes.push({
          id: sb.id,
          type: 'file',
          file: sb.notePath,
          x,
          y,
          width: 320,
          height: 180,
          color: '6',
        });

        this.upsertCanvasNode({
          id: sb.id,
          task_id: sb.id,
          x,
          y,
          width: 320,
          height: 180,
          color_token: '6',
          canvas_file: canvasFilePath,
        });
      }

      // 3. ArtifactSatelliteNode: color "3" (Amber), type: 'file', 280x150
      for (const sat of topology.artifactSatellites || []) {
        const x = Math.round((sat.position3D ? sat.position3D[0] : 0) * 4);
        const y = Math.round((sat.position3D ? sat.position3D[2] : 0) * 4);

        nodes.push({
          id: sat.id,
          type: 'file',
          file: sat.artifactPath,
          x,
          y,
          width: 280,
          height: 150,
          color: '3',
        });

        this.upsertCanvasNode({
          id: sat.id,
          task_id: sat.id,
          x,
          y,
          width: 280,
          height: 150,
          color_token: '3',
          canvas_file: canvasFilePath,
        });

        if (sat.associatedAgentId) {
          edges.push({
            id: `edge-${sat.associatedAgentId}-${sat.id}`,
            fromNode: sat.associatedAgentId,
            fromSide: 'right',
            fromEnd: 'none',
            toNode: sat.id,
            toSide: 'left',
            toEnd: 'arrow',
            color: '3',
            label: 'artifact',
          });
        }
      }
    } else {
      // Export existing DB rows
      const dbNodes = this.getCanvasNodes(canvasFilePath);
      for (const n of dbNodes) {
        nodes.push({
          id: n.id,
          type: 'text',
          text: `[ENTITY: ${n.task_id}]\nStatus: Active Node`,
          x: n.x,
          y: n.y,
          width: n.width,
          height: n.height,
          color: n.color_token,
        });
      }
    }

    const canvasDoc: ObsidianCanvasDocument = {
      nodes,
      edges,
    };

    const dir = path.dirname(canvasFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(canvasFilePath, JSON.stringify(canvasDoc, null, 2), 'utf-8');
    return canvasDoc;
  }

  public syncFromCanvas(canvasFilePath: string): ObsidianCanvasDocument | null {
    if (!fs.existsSync(canvasFilePath)) {
      return null;
    }
    const raw = fs.readFileSync(canvasFilePath, 'utf-8');
    try {
      const data = JSON.parse(raw) as ObsidianCanvasDocument;
      if (Array.isArray(data.nodes)) {
        for (const n of data.nodes) {
          this.upsertCanvasNode({
            id: n.id,
            task_id: n.id.replace('node-', ''),
            x: n.x || 0,
            y: n.y || 0,
            width: n.width || 320,
            height: n.height || 160,
            color_token: (n.color as string) || '#00F0FF',
            canvas_file: canvasFilePath,
          });
        }
      }
      return data;
    } catch {
      return null;
    }
  }

  public close(): void {
    this.db.close();
  }
}
