/**
 * KALINAR SQLITE STORE (v0.1.0-alpha)
 * Native node:sqlite DatabaseSync with WAL Mode and Append-Only Telemetry Triggers
 * Strictly Zero Emojis
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

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

export class KalinarSqliteStore {
  private db: DatabaseSync;
  private dbPath: string;

  constructor(customPath?: string) {
    this.dbPath = customPath || path.resolve(process.cwd(), 'kalinar-state.db');
    this.db = new DatabaseSync(this.dbPath);
    this.initPragmasAndSchema();
  }

  private initPragmasAndSchema(): void {
    // 1. Performance Pragmas
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
    `);

    // 2. Agent Registry Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_registry (
        name TEXT PRIMARY KEY NOT NULL,
        role_description TEXT NOT NULL,
        system_prompt_ref TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
      );
    `);

    // Seed Canonical 7 Agents
    this.db.exec(`
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
    this.db.exec(`
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

    // 4. Turns Table
    this.db.exec(`
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
    this.db.exec(`
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
    this.db.exec(`
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

    // 7. Canvas Nodes Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS canvas_nodes (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        x REAL NOT NULL,
        y REAL NOT NULL,
        width REAL NOT NULL DEFAULT 320,
        height REAL NOT NULL DEFAULT 160,
        color_token TEXT NOT NULL DEFAULT '#00F0FF',
        canvas_file TEXT NOT NULL,
        last_synced_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
    `);
  }

  /* =====================================================================
     TASK & TELEMETRY MUTATIONS
     ===================================================================== */

  public insertTask(task: TaskRecord): void {
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
      SELECT * FROM telemetry_logs WHERE task_id = ? ORDER BY id DESC LIMIT ?
    `);
    return stmt.all(taskId, limit) as unknown as TelemetryLogRecord[];
  }

  /* =====================================================================
     BIDIRECTIONAL CANVAS SYNCHRONIZATION
     ===================================================================== */

  public syncToCanvas(canvasFilePath: string): void {
    const stmt = this.db.prepare(`SELECT * FROM canvas_nodes WHERE canvas_file = ?`);
    const nodes = stmt.all(canvasFilePath) as unknown as CanvasNodeRecord[];

    const canvasData = {
      nodes: nodes.map((n) => ({
        id: n.id,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        color: n.color_token,
        type: 'text',
        text: `[TASK: ${n.task_id}]\nStatus: Active Node`,
      })),
      edges: [],
    };

    fs.writeFileSync(canvasFilePath, JSON.stringify(canvasData, null, 2), 'utf-8');
  }

  public syncFromCanvas(canvasFilePath: string): void {
    if (!fs.existsSync(canvasFilePath)) {
      return;
    }
    const raw = fs.readFileSync(canvasFilePath, 'utf-8');
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data.nodes)) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO canvas_nodes (id, task_id, x, y, width, height, color_token, canvas_file)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const n of data.nodes) {
          stmt.run(
            n.id,
            n.id.replace('node-', ''),
            n.x || 0,
            n.y || 0,
            n.width || 320,
            n.height || 160,
            n.color || '#00F0FF',
            canvasFilePath
          );
        }
      }
    } catch {
      // Ignored if JSON parsing fails
    }
  }

  public close(): void {
    this.db.close();
  }
}
