# 01 - Product Requirements Document (`01_PRD.md`)

> Document ID: `DOC-01-PRD-KALINAR`  
> Lead Agent: `@agent-orchestrator`  
> Co-Authors: `@human-developer`, `@agent-design`, `@agent-software-engineer`, `@agent-data`, `@agent-cybersecurity`, `@agent-qa`, `@agent-content`  
> Gate Status: `APPROVED_BY_SWARM_PENDING_HUMAN`  
> Visual Constraint: `STRICT ZERO-EMOJI ENFORCEMENT - TYPOGRAPHICAL & ASCII ONLY`

---

## Collaborative Sign-Off Header Table

| Participant | Domain Role | Review Focus | Status | Timestamp (UTC) | Cryptographic / Msg Ref |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `@human-developer` | Product Owner & Final Authority | Business Value, Strategic Scope, Release Lock | `PENDING` | -- | `PO-APPROVAL-PENDING` |
| `@agent-orchestrator` | Swarm Facilitator & Product Lead | Traceability Matrix, Story Coverage, Gate Policy | `APPROVED` | `2026-10-27T23:15:00Z` | `SIG-ORCH-PRD-001` |
| `@agent-design` | UI/UX & Design System Architect | Ergonomics, WCAG AAA, Component Slot Integrity | `APPROVED` | `2026-10-27T23:16:00Z` | `SIG-DSGN-PRD-001` |
| `@agent-software-engineer` | Full-Stack & TDD Architect | Node 24 Native Feasibility, SQLite State Invariants | `APPROVED` | `2026-10-27T23:17:00Z` | `SIG-ENGR-PRD-001` |
| `@agent-data` | Decision Engine Specialist | Zen-Engine Rule Validity, Circuit Breaker Guard | `APPROVED` | `2026-10-27T23:18:00Z` | `SIG-DATA-PRD-001` |
| `@agent-cybersecurity` | Shift-Left DevSecOps Lead | Zero-Trust Boundary, Threat Model, Abuse Scenarios | `APPROVED` | `2026-10-27T23:19:00Z` | `SIG-CSEC-PRD-001` |
| `@agent-qa` | Test Architect & Quality Lead | Testability of Acceptance Criteria, Zero Flake | `APPROVED` | `2026-10-27T23:20:00Z` | `SIG-QATE-PRD-001` |
| `@agent-content` | Technical Communication Lead | Clear Terminology, Zero AI Clutter, Developer Clarity | `APPROVED` | `2026-10-27T23:21:00Z` | `SIG-CONT-PRD-001` |

---

## 1. Executive Vision & Problem Statement

### 1.1 Core Problem
Autonomous multi-agent systems routinely suffer from four catastrophic operational failure modes:
1. **Unbounded Cascading Loops:** Agents trigger runaway recursive executions, consuming API quotas and computing budgets without terminating.
2. **Opaque Execution Telemetry:** Operators have no real-time deterministic visibility into which agent holds execution lock, what decisions were evaluated, or why state transitions occurred.
3. **Insecure Channel Interception:** Remote control channels (such as chat bot integrations) lack hardware or strict identity gating, permitting unauthorized actors to inject instructions or override critical safety locks.
4. **Fragile State Persistence:** Ephemeral or un-indexed state stores fail on process restarts or crash mid-turn, losing task context and corrupting state machines.

### 1.2 Product Vision
Kalinar is an enterprise-grade Autonomous Swarm Platform and Zero-Trust Multi-Agent Operations System. It provides a local-first, zero-downtime execution daemon coupled with a high-fidelity real-time Mission Control Web UI. By enforcing mathematical decision boundaries via GoRules Zen-Engine JDM graphs, Node 24 native SQLite transactional journals, and a strict single-operator Telegram control bridge, Kalinar enables autonomous software teams to operate reliably with verifiable human-in-the-loop governance.

### 1.3 Success Metrics (North Star & Guardrail KPIs)
* **North Star Metric:** 100% deterministic task termination with 0 runaway agent loops across continuous runs.
* **Turn Transition Latency:** Agent handoff and state write latency p95 `< 15ms` in local SQLite storage.
* **Circuit Breaker Response:** Circuit trip execution within `< 5ms` upon rule violation detection by Zen-Engine.
* **Zero-Trust Enforcement:** 100% rejection rate of unauthorized Telegram user IDs or forged webhook payloads (`0` false positives allowed).
* **System Availability:** Local daemon uptime $\ge 99.99\%$; state journal recovery $\le 200\text{ms}$ upon process restart.

---

## 2. Target Personas & Trust Roles

| Persona ID | Role Name | Core Jobs-to-be-Done (JTBD) | Accessibility & Device Context | Trust & Privilege Level |
| :--- | :--- | :--- | :--- | :--- |
| `PER-01` | Autonomous System Operator (`Thiago`) | Direct swarm objectives, execute emergency halts, inspect real-time agent execution graphs, approve gated releases. | Dual-monitor Desktop (4K/1080p) + Mobile Telegram client (`390px`). | Absolute Authority (`operator`: full CRUD, emergency circuit trip, manual prompt override). |
| `PER-02` | Autonomous Swarm Agent (`@agent-*`) | Execute specialized development tasks, evaluate tests, request architectural reviews, commit atomic state handoffs. | Automated headless process runtime via Node 24 daemon. | Scoped Autonomous (`agent`: read context, emit signed turn outputs, advance state machine). |
| `PER-03` | Security & Compliance Auditor | Audit immutable event logs, verify zero-trust identity isolation, validate LGPD/GDPR data hygiene. | Desktop browser in high-contrast mode with tabular export tools. | Read-Only Audit (`auditor`: full read access to telemetry, zero mutation or override rights). |
| `PER-04` | External API Integration / Webhook | Deliver remote webhook events, telemetry signals, and market or build triggers. | Server-to-server TLS 1.3 authenticated payload delivery. | Zero Trust Untrusted (`integration`: rejected unless cryptographically signed with HMAC). |

---

## 3. Functional Requirements & Traceable User Stories

> Traceability Rule (`TRACE-01`): Every `US-XXX` below maps directly to an application flow in `03_APP_FLOW.md`, design components in `04_BRIEFING_AND_DESIGN_SYSTEM.md`, database schemas in `05_BACKEND_SCHEMA.md`, and TDD test packages in `06_IMPLEMENTATION_PLAN.md`.

| Story ID | Priority | User Story (`As a... I want to... So that...`) | Deterministic Acceptance Criteria (Gherkin / Invariants) | Adversarial Abuse Case (`@agent-cybersecurity`) |
| :--- | :---: | :--- | :--- | :--- |
| `US-001` | `P0` | As an `Operator`, I want the daemon to process agent turn outputs atomically in SQLite so that system crashes never corrupt task state or duplicate turns. | **Given** an agent completes execution,<br/>**When** `AgentTurnOutputSchema` is submitted,<br/>**Then** the turn record and state transition execute in a single `BEGIN IMMEDIATE` transaction within `< 15ms`. | Attacker simulates worker crash during turn emission. System restarts and verifies zero half-written state rows (`ROLLBACK` guaranteed). |
| `US-002` | `P0` | As an `Operator`, I want GoRules Zen-Engine to evaluate swarm metrics after every turn so that runaway loops or consecutive failures trip the circuit breaker automatically. | **Given** `consecutiveFailures >= 3` or `totalTurns >= 50`,<br/>**When** Zen-Engine evaluates `swarm-guard.jdm.json`,<br/>**Then** `task.status` immediately transitions to `PAUSED` and an alert is broadcast to Telegram within `< 50ms`. | Malicious subagent attempts infinite self-handoff loop (`agent-orchestrator` -> `agent-orchestrator`). Blocked by JDM rule `loopDetected` on turn 3. |
| `US-003` | `P0` | As an `Operator`, I want the Telegram bot bridge to restrict execution exclusively to my configured `TELEGRAM_ALLOWED_USER_ID` so that external users cannot inject commands. | **Given** an incoming Telegram update,<br/>**When** `msg.from.id !== ALLOWED_USER_ID`,<br/>**Then** the update is dropped immediately with zero processing, zero reply, and a security warning logged. | External botnet messages the Telegram bot attempting `/pause` or `/resume`. System drops packet with `HTTP 200` drop and logs IP/ID hash. |
| `US-004` | `P0` | As an `Operator`, I want to send `/status`, `/pause`, `/resume`, and `/approve` via Telegram so that I can manage the swarm untethered from my desk. | **Given** an authorized operator message `/status`,<br/>**When** processed by the Grammy middleware,<br/>**Then** reply with active task ID, current agent, execution turn count, and interactive inline control buttons. | Attacker attempts command parameter injection via malformed query parameters in Telegram callback data. Zod schema parser rejects payload. |
| `US-005` | `P1` | As an `Operator`, I want a Next.js 15 Mission Control UI showing real-time agent telemetry via SSE so that I can watch live thoughts and status changes with zero page reloads. | **Given** the Mission Control web dashboard is loaded,<br/>**When** a new turn is committed in SQLite,<br/>**Then** an SSE event `task:update` pushes to the client within `< 25ms` and updates the React 19 UI without layout shift. | Client opens 50 simultaneous SSE connections to exhaust server resources. Rate-limiting middleware caps connections to 3 per authorized IP. |
| `US-006` | `P1` | As an `Operator`, I want to inspect a live DAG visualization of agent handoffs so that I can see the sequential workflow path and bottlenecks. | **Given** a task with multiple agent turns,<br/>**When** navigating to the Workflow view,<br/>**Then** render an SVG/Canvas directed acyclic graph linking each agent node with tabular execution metrics. | Rendering engine encounters cyclical or corrupted node references. DAG sanitization parser isolates cycle and marks state as `IRREGULAR_CYCLE`. |
| `US-007` | `P1` | As an `Auditor`, I want an append-only telemetry ledger storing every prompt hash, context link, and execution latency so that every action is non-repudiable. | **Given** any task transition or agent decision,<br/>**When** recorded to `telemetry_logs`,<br/>**Then** `UPDATE` and `DELETE` queries are rejected by SQLite triggers and the schema definition. | Rogue script attempts `DELETE FROM telemetry_logs WHERE taskId = 'X'`. SQLite trigger aborts execution with `UNAUTHORIZED_MUTATION`. |
| `US-008` | `P2` | As an `Operator`, I want to filter and search historical tasks by agent, status, and date range so that I can analyze performance patterns over time. | **Given** the task history view,<br/>**When** filtering by `agent-software-engineer` and `COMPLETED`,<br/>**Then** query returns paginated results in `< 10ms` using covered SQLite indexes. | Complex regex or SQL wildcard query injected via search input. Parameterized SQL query execution prevents injection completely. |

---

## 4. Non-Functional, Compliance & Security Requirements

### 4.1 Performance & Latency Budgets
* **Database Operations:** Read p95 `< 5ms`, Write p95 `< 12ms` on local NVMe storage using WAL journal mode.
* **Web UI Core Web Vitals:** Largest Contentful Paint (LCP) `< 1.2s`, Interaction to Next Paint (INP) `< 50ms`, Cumulative Layout Shift (CLS) `= 0.00`.
* **Client Bundle Size:** First load JS `< 85kB` gzipped for the entire Mission Control application shell.

### 4.2 Security, Privacy & LGPD / GDPR
* **Zero Plaintext Secrets:** Bot tokens, database connection strings, and webhook secrets are injected exclusively via environment variables and never logged or exposed to the client.
* **Telemetry Anonymization:** File paths and stack traces recorded in public telemetry are sanitized of username references and local directory identifiers.
* **Tamper-Evident Logging:** Append-only SQLite telemetry table enforced by engine-level triggers preventing any retroactive modification.

### 4.3 Accessibility (WCAG 2.2 AAA)
* **Contrast Ratio:** Minimum `7:1` contrast for normal text and `4.5:1` for large text across all dark-mode and high-contrast themes.
* **Interactive Targets:** Every clickable button, control toggle, or link must measure at least `44px x 44px`.
* **Typographical Numerals:** `font-variant-numeric: tabular-nums` applied unconditionally to all counters, timestamps, latency values, and IDs.

---

## 5. Explicit Out-of-Scope Boundaries (Anti-Scope Creep)

1. **Multi-Tenant Public Cloud Hosting:** Kalinar v0.0.1 is strictly designed as a secure single-operator local daemon and dedicated dashboard; multi-tenant cloud authentication is explicitly out of scope.
2. **Third-Party Commercial Messaging Bridges:** WhatsApp, Discord, and Slack integrations are deferred; Telegram Bot API is the sole supported external remote control channel.
3. **Automatic Code Generation without Human Gating:** Production code merges and repository releases require explicit operator sign-off; full auto-deploy is prohibited.
4. **Emoji and Visual Gimmicks:** No emojis, cartoon mascots, or animated confetti anywhere in the interface or communications.

---

## 6. Agent Review & Critique Log (`WAR_ROOM.md` Cross-Audit)

| Entry ID | Reviewing Agent | Finding / Question Raised During Review | Resolution Co-Decided with `@human-developer` |
| :--- | :--- | :--- | :--- |
| `CRIT-01` | `@agent-cybersecurity` | How is the Telegram bot protected against user ID spoofing in group chats? | Telegram bot operates in strict private chat mode only (`chat.type === 'private'`) and evaluates `from.id === ALLOWED_USER_ID` before any parsing. |
| `CRIT-02` | `@agent-software-engineer` | Should we use `better-sqlite3` or Node 24 native `node:sqlite`? | Node 24 native `node:sqlite` (`DatabaseSync`) is mandatory to eliminate native C++ compilation toolchain issues on Windows. |
| `CRIT-03` | `@agent-design` | Will the Mission Control UI support light mode? | Default to high-precision Obsidian Dark mode; light mode toggle supported via `--ds-*` semantic CSS custom properties. |
| `CRIT-04` | `@agent-data` | Can Zen-Engine rules be hot-reloaded without daemon restart? | Yes. The `SwarmCircuitBreaker` loads `swarm-guard.jdm.json` with an in-memory cache and reloads on file modification timestamp change. |
| `CRIT-05` | `@agent-qa` | How will SSE telemetry be verified in headless CI? | Playwright tests will mock SSE stream and verify DOM reconciliation; Vitest will test raw SSE handler byte output. |
