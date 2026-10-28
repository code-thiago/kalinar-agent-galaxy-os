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
| `@agent-orchestrator` | Swarm Facilitator & Product Lead | Traceability Matrix, Story Coverage, Gate Policy | `APPROVED` | `2026-10-28T11:10:00Z` | `SIG-ORCH-PRD-002` |
| `@agent-design` | UI/UX & Design System Architect | Ergonomics, WCAG AAA, 3D Galaxy Navigation | `APPROVED` | `2026-10-28T11:11:00Z` | `SIG-DSGN-PRD-002` |
| `@agent-software-engineer` | Full-Stack & TDD Architect | Electron OS, Node 24 Native Feasibility, SQLite WAL | `APPROVED` | `2026-10-28T11:12:00Z` | `SIG-ENGR-PRD-002` |
| `@agent-data` | Decision Engine Specialist | Zen-Engine Rule Validity, Voice Safety Guard | `APPROVED` | `2026-10-28T11:13:00Z` | `SIG-DATA-PRD-002` |
| `@agent-cybersecurity` | Shift-Left DevSecOps Lead | Electron IPC Isolation, Threat Model, Abuse Cases | `APPROVED` | `2026-10-28T11:14:00Z` | `SIG-CSEC-PRD-002` |
| `@agent-qa` | Test Architect & Quality Lead | Testability of Acceptance Criteria, Zero Flake | `APPROVED` | `2026-10-28T11:15:00Z` | `SIG-QATE-PRD-002` |
| `@agent-content` | Technical Communication Lead | Clear Terminology, Zero AI Clutter, Developer Clarity | `APPROVED` | `2026-10-28T11:16:00Z` | `SIG-CONT-PRD-002` |

---

## 1. Executive Vision & Problem Statement

### 1.1 Core Problem
Autonomous multi-agent systems routinely suffer from four catastrophic operational failure modes:
1. **Unbounded Cascading Loops:** Agents trigger runaway recursive executions, consuming API quotas and computing budgets without terminating.
2. **Opaque Execution Telemetry:** Operators have no real-time deterministic visibility into which agent holds execution lock, what decisions were evaluated, or why state transitions occurred.
3. **Fragmented Workspace Tooling:** Context switches between terminal shells, code editors, file system trees, and web dashboards fragment the developer experience and cause state drift.
4. **Fragile State Persistence:** Ephemeral or un-indexed state stores fail on process restarts or crash mid-turn, losing task context and corrupting state machines.

### 1.2 Product Vision
Kalinar is an enterprise-grade Desktop Operating System and 3D Agent Galaxy platform. It provides a local-first, zero-downtime execution daemon integrated into an Electron desktop container (`main.ts` + `preload.ts` with `contextIsolation: true`), an interactive 3D Galaxy knowledge graph rendered via Three.js / React Three Fiber (`THREE.InstancedMesh` 50,000+ nodes at 60 FPS), a Voice Core state machine powered by Gemini Live WebSocket with acoustic mic-muting interlock, and mathematical decision boundaries enforced by GoRules Zen-Engine JDM graphs.

### 1.3 Success Metrics (North Star & Guardrail KPIs)
* **North Star Metric:** 100% deterministic task termination with 0 runaway agent loops across continuous runs.
* **3D Galaxy Render Performance:** Stable 60 FPS rendering 50,000+ procedural star nodes under spatial octree LOD zoom.
* **Voice Interaction Latency:** Speech-to-Intent turn completion p95 `< 350ms` via Web Speech API (`pt-BR`) and Gemini Live WebSocket.
* **Turn Transition Latency:** Agent handoff and state write latency p95 `< 15ms` in local SQLite storage.
* **System Availability:** Local daemon uptime $\ge 99.99\%$; state journal recovery $\le 200\text{ms}$ upon process restart.

---

## 2. Target Personas & Trust Roles

| Persona ID | Role Name | Core Jobs-to-be-Done (JTBD) | Accessibility & Device Context | Trust & Privilege Level |
| :--- | :--- | :--- | :--- | :--- |
| `PER-01` | Autonomous System Operator (`Thiago`) | Direct swarm objectives, execute spoken or visual emergency halts, inspect 3D Galaxy knowledge nodes, approve releases. | Dual-monitor Desktop (4K/1080p) + Voice audio input/output (`pt-BR`). | Absolute Authority (`operator`: full CRUD, emergency circuit trip, manual prompt override). |
| `PER-02` | Autonomous Swarm Agent (`@agent-*`) | Execute specialized development tasks, evaluate tests, request architectural reviews, commit atomic state handoffs. | Automated headless process runtime via Node 24 daemon. | Scoped Autonomous (`agent`: read context, emit signed turn outputs, advance state machine). |
| `PER-03` | Security & Compliance Auditor | Audit immutable event logs, verify zero-trust identity isolation, validate LGPD/GDPR data hygiene. | Desktop browser in high-contrast mode with tabular export tools. | Read-Only Audit (`auditor`: full read access to telemetry, zero mutation or override rights). |
| `PER-04` | External API Integration / Webhook | Deliver remote webhook events, telemetry signals, and market or build triggers. | Server-to-server TLS 1.3 authenticated payload delivery. | Zero Trust Untrusted (`integration`: rejected unless cryptographically signed with HMAC). |

---

## 3. Functional Requirements & Traceable User Stories

> Traceability Rule (`TRACE-01`): Every `US-XXX` below maps directly to an application flow in `03_APP_FLOW.md`, design components in `04_BRIEFING_AND_DESIGN_SYSTEM.md`, database schemas in `05_BACKEND_SCHEMA.md`, and TDD test packages in `06_IMPLEMENTATION_PLAN.md`.

| Story ID | Priority | User Story (`As a... I want to... So that...`) | Deterministic Acceptance Criteria (Gherkin / Invariants) | Adversarial Abuse Case (`@agent-cybersecurity`) |
| :--- | :---: | :--- | :--- | :--- |
| `US-001` | `P0` | As an `Operator`, I want the daemon to process agent turn outputs atomically in SQLite so that system crashes never corrupt task state or duplicate turns. | **Given** an agent completes execution,<br/>**When** `AgentTurnOutputSchema` is submitted,<br/>**Then** the turn record and state transition execute in a single `BEGIN IMMEDIATE` transaction within `< 15ms`. | Attacker simulates worker crash during turn emission. System restarts and verifies zero half-written state rows (`ROLLBACK` guaranteed). |
| `US-002` | `P0` | As an `Operator`, I want GoRules Zen-Engine to evaluate swarm metrics after every turn so that runaway loops or consecutive failures trip the circuit breaker automatically. | **Given** `consecutiveFailures >= 3` or `totalTurns >= 50`,<br/>**When** Zen-Engine evaluates `swarm-guard.jdm.json`,<br/>**Then** `task.status` immediately transitions to `PAUSED` and an alert is broadcast to the Desktop UI within `< 50ms`. | Malicious subagent attempts infinite self-handoff loop (`agent-orchestrator` -> `agent-orchestrator`). Blocked by JDM rule `loopDetected` on turn 3. |
| `US-003` | `P0` | As an `Operator`, I want to issue voice commands in Brazilian Portuguese (`pt-BR`) with acoustic mic-muting during TTS so that I can control the swarm hands-free without feedback loops. | **Given** the operator speaks a command,<br/>**When** processed by Web Speech API and Gemini Live WebSocket,<br/>**Then** `voice-command-guard.jdm.json` validates the intent, executes the action, and mutes audio input while speaking the reply. | Acoustic feedback loop: assistant speech reflections re-triggering mic input. Hardware-level acoustic muting interlock blocks self-triggering completely. |
| `US-004` | `P0` | As an `Operator`, I want a multi-workspace file watcher (`chokidar`) with `300ms` debounce and single-writer loop prevention so that file changes sync to `KALINAR_GALAXY.canvas` without trigger storms. | **Given** a file modification in a registered workspace,<br/>**When** debounce window expires without agent lock token,<br/>**Then** reconcile delta with SQLite and update `KALINAR_GALAXY.canvas` in `< 100ms`. | Agent-watcher-agent feedback storm: agent file write re-triggering file watcher. Single-writer `.kalinar-lock` token file suppresses internal triggers. |
| `US-005` | `P1` | As an `Operator`, I want an Electron Desktop OS container with `contextIsolation: true` and embedded `node-pty` terminal so that I can execute CLI workflows natively within Kalinar. | **Given** the operator opens the terminal tab,<br/>**When** terminal spawns native shell,<br/>**Then** IPC communication occurs strictly over whitelisted preload channels without exposing raw Node APIs. | Malicious renderer script attempts accessing `process.env` or spawning arbitrary binaries via IPC. Preload channel whitelist rejects unauthorized calls. |
| `US-006` | `P1` | As an `Operator`, I want an interactive 3D Galaxy visualization rendering 50,000+ procedural star nodes at 60 FPS so that I can visually inspect the entire multi-agent knowledge graph. | **Given** navigation to `/galaxy`,<br/>**When** Three.js / R3F initializes,<br/>**Then** render nodes via `THREE.InstancedMesh` with spatial octree LOD zoom (`FLOW-GALAXY-LOD-01`) at 60 FPS. | Camera rapid zoom attempting to force 50,000 un-culled node render passes. Spatial octree frustum culling maintains frame rate $\ge 55\text{ FPS}$. |
| `US-007` | `P1` | As an `Auditor`, I want an append-only telemetry ledger storing every prompt hash, context link, and execution latency so that every action is non-repudiable. | **Given** any task transition or agent decision,<br/>**When** recorded to `telemetry_logs`,<br/>**Then** `UPDATE` and `DELETE` queries are rejected by SQLite triggers and the schema definition. | Rogue script attempts `DELETE FROM telemetry_logs WHERE taskId = 'X'`. SQLite trigger aborts execution with `UNAUTHORIZED_MUTATION`. |
| `US-008` | `P2` | As an `Operator`, I want bidirectional synchronization between SQLite task states and Obsidian's `KALINAR_GALAXY.canvas` so that my visual notes reflect live agent executions. | **Given** an agent turn completion,<br/>**When** state commits to SQLite,<br/>**Then** update corresponding JSON node in `KALINAR_GALAXY.canvas` with status color token within `< 100ms`. | File locking conflict between Obsidian and Kalinar daemon on canvas file. Safe file replacement via atomic temporary file rename (`fs.rename`). |

---

## 4. Non-Functional, Compliance & Security Requirements

### 4.1 Performance & Latency Budgets
* **3D Galaxy Render Rate:** Stable 60 FPS with 50,000+ nodes using `THREE.InstancedMesh`.
* **Database Operations:** Read p95 `< 5ms`, Write p95 `< 12ms` on local NVMe storage using WAL journal mode.
* **Voice Intent Latency:** Spoken command to Zen-Engine gating p95 `< 350ms`.
* **File Watcher Debounce:** Exact `300ms` debounce window.

### 4.2 Security, Privacy & Desktop Isolation
* **Electron Hardening:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, CSP headers enforced.
* **Zero Plaintext Secrets:** API keys and credentials injected exclusively via local environment variables; never logged in telemetry.
* **Tamper-Evident Logging:** Append-only SQLite telemetry table enforced by engine-level triggers preventing any retroactive modification.

### 4.3 Accessibility (WCAG 2.2 AAA)
* **Contrast Ratio:** Minimum `7:1` contrast for normal text and `4.5:1` for large text across all dark-mode and high-contrast themes.
* **Interactive Targets:** Every clickable button, control toggle, or link must measure at least `44px x 44px`.
* **Typographical Numerals:** `font-variant-numeric: tabular-nums` applied unconditionally to all counters, timestamps, latency values, and IDs.

---

## 5. Explicit Out-of-Scope Boundaries (Anti-Scope Creep)

1. **Multi-Tenant Public Cloud Hosting:** Kalinar v0.0.1 is strictly designed as a secure single-operator Desktop OS; multi-tenant cloud authentication is explicitly out of scope.
2. **Third-Party Commercial Messaging Bridges:** Chat bot bridges are replaced by native Voice Core and embedded terminal; Telegram/Discord bots are out of scope.
3. **Automatic Code Generation without Human Gating:** Production code merges and repository releases require explicit operator sign-off; full auto-deploy is prohibited.
4. **Emoji and Visual Gimmicks:** No emojis, cartoon mascots, or animated confetti anywhere in the interface or communications.

---

## 6. Agent Review & Critique Log (`WAR_ROOM.md` Cross-Audit)

| Entry ID | Reviewing Agent | Finding / Question Raised During Review | Resolution Co-Decided with `@human-developer` |
| :--- | :--- | :--- | :--- |
| `CRIT-01` | `@agent-cybersecurity` | How is the Electron renderer protected against remote code execution? | Enforced `contextIsolation: true`, `nodeIntegration: false`, and strict preload IPC handler whitelisting. |
| `CRIT-02` | `@agent-software-engineer` | Should we use `better-sqlite3` or Node 24 native `node:sqlite`? | Node 24 native `node:sqlite` (`DatabaseSync`) is mandatory to eliminate native C++ compilation toolchain issues on Windows. |
| `CRIT-03` | `@agent-design` | How to maintain 60 FPS in 3D Galaxy with 50,000+ nodes? | Used `THREE.InstancedMesh` with single draw call per archetype and Spatial Octree LOD distance culling. |
| `CRIT-04` | `@agent-data` | How to prevent acoustic feedback loops during voice synthesis? | Hardware mic-muting interlock engaged automatically whenever TTS audio is rendering. |
| `CRIT-05` | `@agent-qa` | How will Electron and 3D canvas be tested in CI? | Playwright Electron test runner with headless WebGL software rasterizer (`--use-gl=angle --use-angle=swiftshader`). |
