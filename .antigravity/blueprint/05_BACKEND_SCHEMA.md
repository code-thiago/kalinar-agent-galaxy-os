# 05 - Back-End Schema, API Contracts & Security Policies (`05_BACKEND_SCHEMA.md`)

> Document ID: `DOC-05-BACKEND-SCHEMA-KALINAR`  
> Lead Agents: `@agent-software-engineer` + `@agent-cybersecurity`  
> Co-Authors: `@human-developer`, `@agent-data`, `@agent-design`, `@agent-orchestrator`, `@agent-qa`  
> Gate Status: `APPROVED_BY_SWARM_PENDING_HUMAN`  
> Visual Constraint: `STRICT ZERO-EMOJI ENFORCEMENT - TYPOGRAPHICAL & ASCII ONLY`

---

## Collaborative Sign-Off Header Table

| Participant | Domain Role | Review Focus | Status | Timestamp (UTC) | Cryptographic / Msg Ref |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `@human-developer` | Data & Security Final Authority | Schema Ownership, DDL Invariants, STRIDE Matrix | `PENDING` | -- | `PO-APPROVAL-PENDING` |
| `@agent-software-engineer` | Full-Stack & TDD Architect | SQLite DDL, WAL Indexes, Node 24 Type Alignment | `APPROVED` | `2026-10-28T11:20:00Z` | `SIG-ENGR-SCH-002` |
| `@agent-cybersecurity` | Shift-Left DevSecOps Lead | Append-Only Triggers, Electron IPC, Voice STRIDE | `APPROVED` | `2026-10-28T11:21:00Z` | `SIG-CSEC-SCH-002` |
| `@agent-data` | Decision Engine Specialist | Zen-Engine Voice & Swarm JDM Tables, Canvas Sync | `APPROVED` | `2026-10-28T11:22:00Z` | `SIG-DATA-SCH-002` |
| `@agent-design` | UI/UX & Design System Architect | DTO Shapes for 3D Galaxy & Canvas Nodes | `APPROVED` | `2026-10-28T11:23:00Z` | `SIG-DSGN-SCH-002` |
| `@agent-orchestrator` | Swarm Facilitator & Product Lead | PRD Traceability (`TRACE-03`), State Completeness | `APPROVED` | `2026-10-28T11:24:00Z` | `SIG-ORCH-SCH-002` |
| `@agent-qa` | Test Architect & Quality Lead | SQL Migration Rollback & Concurrency Testability | `APPROVED` | `2026-10-28T11:25:00Z` | `SIG-QATE-SCH-002` |

---

## 1. Entity-Relationship Diagram (Mermaid ERD)

```mermaid
erDiagram
    TASKS ||--o{ TURNS : "contains execution history"
    TASKS ||--o{ TELEMETRY_LOGS : "generates append-only logs"
    AGENT_REGISTRY ||--o{ TURNS : "executes turns"
    CIRCUIT_BREAKER_EVENTS ||--o| TASKS : "halts or resumes"
    CANVAS_NODES ||--o| TASKS : "mirrors in KALINAR_GALAXY.canvas"

    TASKS {
        text id PK
        text project_path
        text title
        text status "PENDING | RUNNING | COMPLETED | BLOCKED | PAUSED"
        text current_agent FK
        text from_agent
        text contract_path
        text context_notes "JSON Array (Max 2 items)"
        text action_instruction
        integer qa_retries
        integer total_turns
        text created_at
        text updated_at
    }

    TURNS {
        integer id PK
        text task_id FK
        text agent_name FK
        integer turn_number
        text status "HANDOFF | COMPLETED | NEEDS_HUMAN_INPUT"
        text next_agent
        text contract_path
        text summary
        text question_for_human
        integer duration_ms
        text created_at
    }

    TELEMETRY_LOGS {
        integer id PK
        text task_id FK
        text event_type "TURN_START | TURN_END | CIRCUIT_TRIP | HALT | VOICE_CMD"
        text agent_name
        text payload "JSON String"
        integer latency_ms
        text created_at
    }

    CIRCUIT_BREAKER_EVENTS {
        integer id PK
        text task_id FK
        text state "CLOSED | OPEN | HALF_OPEN"
        text trip_reason
        text jdm_rule_matched
        text triggered_by "ZEN_ENGINE | OPERATOR_OVERRIDE | VOICE_CORE"
        text created_at
    }

    CANVAS_NODES {
        text id PK "node-task-id or node-agent-id"
        text task_id FK
        real x
        real y
        real width
        real height
        text color_token
        text canvas_file
        text last_synced_at
    }

    AGENT_REGISTRY {
        text name PK "agent-orchestrator | agent-software-engineer | ..."
        text role_description
        text system_prompt_ref
        integer is_active
    }
```

---

## 2. Production Database DDL (SQLite `node:sqlite` Native Specification)

```sql
-- SQLite Performance Pragmas
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

-- 1. Agent Registry Table
CREATE TABLE IF NOT EXISTS agent_registry (
    name TEXT PRIMARY KEY NOT NULL,
    role_description TEXT NOT NULL,
    system_prompt_ref TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

-- Seed Canonical 7 Agents
INSERT OR IGNORE INTO agent_registry (name, role_description, system_prompt_ref) VALUES
('agent-orchestrator', 'Swarm Facilitator, PM, and Queue Controller', '05_AGENTS/agent-orchestrator.md'),
('agent-software-engineer', 'Principal Full-Stack & Contract-First Architect', '05_AGENTS/agent-software-engineer.md'),
('agent-design', 'UI/UX, 3-Tier CSS Tokens, 3D Galaxy Architect', '05_AGENTS/agent-design.md'),
('agent-data', 'Decision Engine Specialist, Zen-Engine, Telemetry', '05_AGENTS/agent-data.md'),
('agent-cybersecurity', 'Zero-Trust Auditor, STRIDE Modeling, Security Lead', '05_AGENTS/agent-cybersecurity.md'),
('agent-qa', 'Test Architect, Vitest, Playwright, DAST Lead', '05_AGENTS/agent-qa.md'),
('agent-content', 'Technical Documentation and Developer Writing Lead', '05_AGENTS/agent-content.md');

-- 2. Tasks Table
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

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at DESC);

-- 3. Turns Table
CREATE TABLE IF NOT EXISTS turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL REFERENCES agent_registry(name),
    turn_number INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('HANDOFF', 'COMPLETED', 'NEEDS_HUMAN_INPUT')),
    next_agent TEXT,
    contract_path TEXT NOT NULL,
    summary TEXT NOT NULL,
    question_for_human TEXT,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_turns_task_id ON turns(task_id, turn_number);

-- 4. Telemetry Logs Table (Append-Only)
CREATE TABLE IF NOT EXISTS telemetry_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    payload TEXT NOT NULL,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_telemetry_task_created ON telemetry_logs(task_id, created_at DESC);

-- Invariant Enforcement: Prevent UPDATE and DELETE on telemetry_logs
CREATE TRIGGER IF NOT EXISTS trg_prevent_telemetry_update
BEFORE UPDATE ON telemetry_logs
BEGIN
    SELECT RAISE(ABORT, 'SECURITY_VIOLATION: telemetry_logs table is strictly append-only. UPDATE prohibited.');
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_telemetry_delete
BEFORE DELETE ON telemetry_logs
BEGIN
    SELECT RAISE(ABORT, 'SECURITY_VIOLATION: telemetry_logs table is strictly append-only. DELETE prohibited.');
END;

-- 5. Circuit Breaker Events Table
CREATE TABLE IF NOT EXISTS circuit_breaker_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    state TEXT NOT NULL CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
    trip_reason TEXT NOT NULL,
    jdm_rule_matched TEXT,
    triggered_by TEXT NOT NULL CHECK (triggered_by IN ('ZEN_ENGINE', 'OPERATOR_OVERRIDE', 'VOICE_CORE')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_cb_task_id ON circuit_breaker_events(task_id);

-- 6. Canvas Nodes Table (Mirror of KALINAR_GALAXY.canvas)
CREATE TABLE IF NOT EXISTS canvas_nodes (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    x REAL NOT NULL DEFAULT 0.0,
    y REAL NOT NULL DEFAULT 0.0,
    width REAL NOT NULL DEFAULT 320.0,
    height REAL NOT NULL DEFAULT 160.0,
    color_token TEXT NOT NULL DEFAULT '--ds-accent-agent',
    canvas_file TEXT NOT NULL DEFAULT 'KALINAR_GALAXY.canvas',
    last_synced_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

---

## 3. Zod API Contracts & Runtime Validation Schemas

```typescript
import { z } from 'zod';

export const VALID_AGENTS = [
  'agent-orchestrator',
  'agent-software-engineer',
  'agent-design',
  'agent-data',
  'agent-cybersecurity',
  'agent-qa',
  'agent-content'
] as const;

export type ValidAgent = (typeof VALID_AGENTS)[number];

// Contract: Turn Output Emitted by Any Swarm Agent
export const AgentTurnOutputSchema = z.object({
  status: z.enum(['HANDOFF', 'COMPLETED', 'NEEDS_HUMAN_INPUT']),
  nextAgent: z.enum(VALID_AGENTS).nullable(),
  contractPath: z.string().min(1, 'contractPath cannot be empty'),
  contextNotes: z.array(z.string()).max(2, 'Strict cap: max 2 context notes allowed'),
  actionInstruction: z.string().min(1, 'actionInstruction cannot be empty'),
  summary: z.string().min(1, 'summary cannot be empty'),
  questionForHuman: z.string().optional()
});

export type AgentTurnOutput = z.infer<typeof AgentTurnOutputSchema>;

// Contract: Voice Command Ingress Intent
export const VoiceCommandIntentSchema = z.object({
  rawTranscript: z.string().min(1),
  locale: z.literal('pt-BR'),
  intent: z.enum(['STATUS', 'PAUSE', 'RESUME', 'APPROVE_RELEASE', 'HALT', 'GALAXY_FOCUS']),
  targetEntityId: z.string().optional(),
  confidence: z.number().min(0.0).max(1.0)
});

// Contract: Electron IPC Channel Whitelist
export const ELECTRON_IPC_CHANNELS = [
  'kalinar:task:action',
  'kalinar:telemetry:stream',
  'kalinar:terminal:write',
  'kalinar:terminal:resize',
  'kalinar:voice:state',
  'kalinar:canvas:sync'
] as const;
```

---

## 4. GoRules Zen-Engine Decision Table Specifications

### 4.1 Swarm Guard (`rules/swarm-guard.jdm.json`)
```json
{
  "nodes": [
    {
      "id": "decisionTable",
      "type": "decisionTable",
      "content": {
        "hitPolicy": "first",
        "inputs": [
          { "field": "consecutiveFailures", "type": "number" },
          { "field": "totalTurns", "type": "number" },
          { "field": "turnDurationMs", "type": "number" },
          { "field": "loopDetected", "type": "boolean" }
        ],
        "outputs": [
          { "field": "action", "type": "string" },
          { "field": "reason", "type": "string" }
        ],
        "rules": [
          {
            "inputs": [">= 3", "-", "-", "-"],
            "outputs": ["PAUSE", "CONSECUTIVE_FAILURES_EXCEEDED"]
          },
          {
            "inputs": ["-", ">= 50", "-", "-"],
            "outputs": ["PAUSE", "MAX_TURNS_PER_TASK_EXCEEDED"]
          },
          {
            "inputs": ["-", "-", "> 600000", "-"],
            "outputs": ["PAUSE", "TURN_DURATION_TIMEOUT_EXCEEDED"]
          },
          {
            "inputs": ["-", "-", "-", "true"],
            "outputs": ["PAUSE", "CYCLIC_LOOP_DETECTED"]
          },
          {
            "inputs": ["-", "-", "-", "-"],
            "outputs": ["ALLOW", "ALL_GUARDRAILS_NOMINAL"]
          }
        ]
      }
    }
  ]
}
```

### 4.2 Voice Command Safety Guard (`rules/voice-command-guard.jdm.json`)
```json
{
  "nodes": [
    {
      "id": "voiceGuardTable",
      "type": "decisionTable",
      "content": {
        "hitPolicy": "first",
        "inputs": [
          { "field": "intent", "type": "string" },
          { "field": "confidence", "type": "number" },
          { "field": "isAcousticMuted", "type": "boolean" }
        ],
        "outputs": [
          { "field": "action", "type": "string" },
          { "field": "feedbackPrompt", "type": "string" }
        ],
        "rules": [
          {
            "inputs": ["-", "-", "true"],
            "outputs": ["DROP", "MIC_MUTED_DURING_TTS"]
          },
          {
            "inputs": ["'HALT' | 'APPROVE_RELEASE'", "< 0.85", "false"],
            "outputs": ["CONFIRM", "Comando critico requer confirmacao falada"]
          },
          {
            "inputs": ["'STATUS' | 'GALAXY_FOCUS'", ">= 0.60", "false"],
            "outputs": ["ALLOW", "Executando consulta"]
          },
          {
            "inputs": ["'PAUSE' | 'RESUME'", ">= 0.75", "false"],
            "outputs": ["ALLOW", "Estado de execucao alterado"]
          },
          {
            "inputs": ["-", "-", "-"],
            "outputs": ["IGNORE", "Comando nao reconhecido"]
          }
        ]
      }
    }
  ]
}
```

---

## 5. STRIDE Threat Model Matrix

| Threat Category | Specific Kalinar Vector | Impact & Severity | Cryptographic / Technical Mitigation |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Compromised renderer script attempts sending spoofed IPC calls to spawn native processes. | **CRITICAL** - Host shell compromise. | Electron `contextIsolation: true` and strict `preload.ts` channel whitelist with payload schema validation. |
| **Tampering** | Rogue worker process attempts modifying historical turn summaries or audit logs in SQLite. | **HIGH** - Obfuscated failure modes or corrupted compliance history. | Database triggers `trg_prevent_telemetry_update` and `trg_prevent_telemetry_delete` reject mutations at SQLite engine level. |
| **Repudiation** | Operator denies issuing spoken emergency halt or release approval. | **MEDIUM** - Disputed operational timeline. | All voice-triggered events record audio transcript, intent confidence, and are written append-only to `telemetry_logs`. |
| **Information Disclosure** | Local filesystem paths or environment secrets leaked into 3D Galaxy node labels. | **HIGH** - Localhost reconnaissance by malicious plugins. | Sanitization transformer scrubs user home directory paths (`C:\Users\thiag\`) before serializing node coordinates. |
| **Denial of Service** | Malicious script launches 100,000 un-culled Three.js meshes to crash GPU driver. | **CRITICAL** - System freeze and VRAM exhaustion. | `THREE.InstancedMesh` with strict Spatial Octree LOD culling caps simultaneous render draw calls. |
| **Elevation of Privilege** | Acoustic feedback loop triggers unauthorized spoken commands from assistant output. | **HIGH** - Runaway execution triggered by voice reflection. | Hardware mic-muting interlock engages unconditionally whenever TTS audio is playing. |
