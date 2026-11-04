# 01_PRD.md — KALINAR SINGULARITY PRODUCT REQUIREMENTS DOCUMENT (v1.1.0 LOCK)

> **Document ID:** `DOC-01-PRD-KALINAR-v1.1.0`  
> **Lead Agent:** `@agent-orchestrator`  
> **Co-Authors:** `@human-developer`, `@agent-design`, `@agent-software-engineer`, `@agent-data`, `@agent-cybersecurity`, `@agent-qa`, `@agent-content`  
> **Gate Status:** `APPROVED_BY_SWARM_LOCKED_V1_1_0`  
> **Visual Constraint:** `STRICT ZERO-EMOJI ENFORCEMENT — ASCII & MONOSPACE TELEMETRY ONLY`

---

## Collaborative Sign-Off Header Table

| Participant | Domain Role | Review Focus | Status | Timestamp (UTC) | Cryptographic / Msg Ref |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `@human-developer` | Sovereign Principal Architect | Business Value, Strategic Scope, Release v1.1.0 Lock | `APPROVED` | `2026-11-03T19:00:00Z` | `PO-APPROVAL-V1-1-0` |
| `@agent-orchestrator` | Swarm Facilitator & Product Lead | Traceability Matrix (`US-001`..`US-010`), FIFO Queueing | `APPROVED` | `2026-11-03T19:01:00Z` | `SIG-ORCH-PRD-110` |
| `@agent-design` | UI/UX & Design System Architect | 262k GPGPU Singularity, 160px Cards, WCAG 2.2 AAA | `APPROVED` | `2026-11-03T19:01:15Z` | `SIG-DSGN-PRD-110` |
| `@agent-software-engineer` | Full-Stack & TDD Architect | Electron 33, IPC Shell, Atomic Git Checkpoint, Multi-LLM | `APPROVED` | `2026-11-03T19:01:30Z` | `SIG-ENGR-PRD-110` |
| `@agent-data` | Decision Engine Specialist | GoRules ZEN `< 0.45ms`, Stream-to-Digest, SQLite Charts | `APPROVED` | `2026-11-03T19:01:45Z` | `SIG-DATA-PRD-110` |
| `@agent-cybersecurity` | DevSecOps & PID Gatekeeper | PID > 100 Gate, OS Firewall JDM, Preload Whitelist | `APPROVED` | `2026-11-03T19:02:00Z` | `SIG-CSEC-PRD-110` |
| `@agent-qa` | QA & Traceability Auditor | Gherkin Determinism, Abuse Cases, Zero-Flake E2E | `APPROVED` | `2026-11-03T19:02:15Z` | `SIG-QATE-PRD-110` |
| `@agent-content` | Technical Communication Lead | Sovereign `pt-BR` Persona Contract, Zero AI Slop | `APPROVED` | `2026-11-03T19:02:30Z` | `SIG-CONT-PRD-110` |

---

## 1. Executive Vision & North Star KPIs

### 1.1 Executive Vision
KALINAR is a native **Electron 33 Desktop OS** engineered for autonomous multi-agent orchestration (`05_AGENTS/@agent-*.md`), **Second Brain gravitational RAG**, and real-time **3D WebGL telemetry** centered on a **Black Hole Singularity** (`--ds-surface-singularity-void: #000000` pure void base + `--ds-accent-singularity: #AA88FF` Event Horizon Lavender).

Unlike conventional chat wrappers or fragmented web dashboards, KALINAR unifies thecentral Black Hole Singularity as both the spatial gravitational center of the 50,000-node knowledge galaxy and the physical acoustic body of the sovereign voice commander (`pt-BR`). Every agent turn, OS process signal, file diff, Second Brain memory ingestion, and multi-model LLM routing decision (`Argon`, `Claude`, `Gemini`) is governed by sub-millisecond GoRules ZEN Engine JDM graphs and persisted in a native `node:sqlite` WAL ledger.

### 1.2 North Star & Guardrail KPIs
* **WebGL & GPGPU Frame Rate:** `60 FPS` locked on desktop with `262,144` GPGPU accretion disk particles (`512x512` float RGBA buffer, automatic `65,536` fallback on mobile/low-tier viewports) + `50,000` `THREE.InstancedMesh` procedural galaxy nodes with Spatial Octree LOD culling.
* **Decision Firewall Latency:** `< 0.45ms` deterministic evaluation across all GoRules ZEN Engine graphs (`daemon-event-router.jdm.json`, `os-execution-firewall.jdm.json`, `execution-gate.jdm.json`, `voice-command-guard.jdm.json`, `llm-model-router.jdm.json`).
* **Phase 1 Voice Dispatch Ack Latency:** `< 50ms` from spoken directive classification to immediate `STATUS_DISPATCHED` feedback and HUD state update.
* **Deterministic Log Triage Overhead:** `< 150 tokens` per incident digest via the 2-stage `Stream-to-Digest` pipeline (200-entry in-memory Ring Buffer + regex/AST structural extraction before any LLM invocation).
* **Accessibility & Visual Precision:** `100% WCAG 2.2 AAA` contrast compliance ($\ge 7.0:1$ ratio across all HUD text, with `--ds-text-secondary: #9A9A9A` calibrated at `7.45:1` on `#000000`), `tabular-nums` on all numeric telemetry, and `44x44px` minimum interactive hit targets.

---

## 2. Personas & Trust Roles (`PER-01` to `PER-04`)

| Persona ID | Role Name | Core Jobs-to-be-Done (JTBD) | Interface & Runtime Context | Trust & Privilege Level |
| :--- | :--- | :--- | :--- | :--- |
| `PER-01` | **Sovereign Principal Architect (`Thiago`)** | Commands the 7-agent swarm (`@agent-orchestrator`, `@agent-software-engineer`, `@agent-design`, `@agent-content`, `@agent-data`, `@agent-cybersecurity`, `@agent-qa`) via voice (`pt-BR` sovereign Tauz-style persona) and tactile Asymmetric HUD; approves/reverts live diffs; triggers Gravitational Second Brain RAG pulls. | Single-window `100vw x 100vh` Electron Desktop OS (`#000000` void) + full-duplex voice audio (`pt-BR`) with `< 10ms` hardware kill-switch. | **Absolute Sovereign Authority** (`operator`: full OS process control, diff approval, model override, circuit reset). |
| `PER-02` | **Autonomous Dev Agent (`@agent-*`)** | Executes domain-scoped engineering, UI, data, security, QA, and content tasks through the `IKalinarAgentConnector` SDK; creates Atomic Git Checkpoints prior to file mutations; emits structured telemetry steps. | Headless Node/CLI subprocesses monitored by Chokidar and `KalinarDaemon`, routed across `Argon`, `Claude`, and `Gemini` models. | **Scoped Autonomous** (`agent`: single-writer lock `.kalinar-lock`, bounded by JDM execution gates and FIFO task queues). |
| `PER-03` | **DevSecOps & PID Gatekeeper (`@agent-cybersecurity`)** | Enforces Zero-Trust OS process boundaries (`validatePidSafety` requiring `PID > 100`), evaluates `os-execution-firewall.jdm.json` in `< 0.45ms` before shell execution, and blocks privilege escalation or destructive commands. | Embedded GoRules ZEN Engine middleware inside Electron main process (`electron/main.ts`) and `OsProcessController`. | **Zero-Trust Enforcer** (`gatekeeper`: unconditional veto and immediate `HALT` / `SIGSTOP` authority on policy violations). |
| `PER-04` | **QA & Traceability Auditor (`@agent-qa`)** | Verifies two-phase execution truths (`STATUS_DISPATCHED` vs. `STATUS_VERIFIED`), audits append-only `node:sqlite` WAL telemetry logs, inspects live unified diffs in `NodeInspectorDrawer`, and enforces E2E release gates. | Retractable Bottom IDE Dock (`TelemetryMatrixTable`, `EvolutionChartsView`, `AntigravityCliTab`) and Vitest/Playwright runners. | **Verification Gatekeeper** (`auditor`: read-only ledger verification, test suite gate enforcement, rollback validation). |

---

## 3. Functional Requirements & Traceable User Stories (`US-001` to `US-010`)

> **Traceability Invariant (`TRACE-01`):** Every User Story (`US-001` through `US-010`) maps deterministically to technical architecture in `02_TRD.md`, state machines in `03_APP_FLOW.md`, design tokens in `04_BRIEFING_AND_DESIGN_SYSTEM.md`, database/JDM schemas in `05_BACKEND_SCHEMA.md`, and automated test suites in `06_IMPLEMENTATION_PLAN.md`.

| Story ID | Priority | User Story (`As a... I want to... So that...`) | Deterministic Acceptance Criteria (Gherkin) | Adversarial Abuse Case (`@agent-cybersecurity`) |
| :--- | :---: | :--- | :--- | :--- |
| `US-001` | `P0` | **262k GPGPU Singularity & 50k Galaxy:** As `PER-01`, I want a full-viewport WebGL scene (`canvas#singularity-bg`) rendering a `262,144`-particle GPGPU Black Hole accretion disk with Navier-Stokes 2D cursor fluid turbulence and a `50,000`-node `THREE.InstancedMesh` galaxy with Octree LOD so that I have a 60 FPS spatial telemetry canvas. | **Given** desktop viewport width $\ge 768\text{px}$,<br/>**When** `KalinarSingularityCore` initializes,<br/>**Then** allocate `262,144` particles (`512x512` float RGBA buffer) with `pow(aRandom.z, 60.0)` `#AA88FF` sparks, couple cursor velocity (`256x256`) to accretion turbulence (`1.5s` decay), and cull `50,000` instanced star nodes via Octree in `< 4ms` at `60 FPS`. | Attacker triggers rapid viewport resize or cursor thrashing to exhaust GPU memory. TypedArrays are pre-allocated once on mount and WebGL context loss handler (`webglcontextlost`) restores buffers without re-querying SQLite. |
| `US-002` | `P0` | **Gravitational Second Brain RAG Pull:** As `PER-01`, I want to pull Second Brain `.md` notes into the Black Hole Event Horizon so that context is gravitationally absorbed and beamed to the active agent swarm. | **Given** an operator clicks `[ ACIONAR SECOND BRAIN ]`, issues a voice pull, or triggers Tab 3 `[PULL TO SINGULARITY]`,<br/>**When** `GravitationalRAGPull` starts,<br/>**Then** `#E879F9` Magenta particle streams spiral into the `54u` Event Horizon and fire a `#AA88FF` relativistic pulse to the target `@agent-*` orbital cluster while logging the context link in SQLite. | Unscoped query attempts full-vault recursive read flooding context window. Enforced Zero-Scan rule caps RAG ingestion to maximum 2 `[[Wikilinks]]` per handoff (`WAR_ROOM.md` contract). |
| `US-003` | `P0` | **Asymmetric HUD, 160px Preview Cards & Live Voice Transcript:** As `PER-01`, I want a Left Column (`320px`) of opaque `160px` live preview cards (`AgentLivePreviewCard`) and a Right Ethereal Column (`360px`, `mix-blend-mode: plus-lighter`) streaming character-by-character `#AA88FF` transcripts inside `[singularity_core]` so that the central Singularity remains unobstructed. | **Given** `.kalinar-hud` renders over `canvas#singularity-bg`,<br/>**When** agents emit live code diffs or KALINAR speaks,<br/>**Then** Left Column cards render a `min-h-[160px]` (`--ds-agent-card-thumb-h: 160px`) `#0a0a0a` viewport with 2-line `tabular-nums` metadata, and `[singularity_core]` streams text at `18ms/char` in `#AA88FF` with zero floating corner voice orbs. | High-frequency stream updates attempt to trigger full React tree re-renders and drop WebGL below 60 FPS. All HUD cards and terminal views are isolated via `React.memo` and surgical Zustand selectors. |
| `US-004` | `P0` | **Universal Agent SDK, Zero-Trust PID Control & 480px Diff Drawer:** As `PER-01` and `PER-03`, I want an `IKalinarAgentConnector` SDK, OS process gating (`PID > 100`), and a `480px` slide-over `NodeInspectorDrawer` so that I can pause, kill, or approve agent file diffs safely. | **Given** an active agent card is clicked,<br/>**When** `NodeInspectorDrawer` (`480px`) opens,<br/>**Then** the Right Ethereal HUD smoothly retracts (`opacity: 0`), live unified diffs are displayed, and `[PAUSE PID]` / `[KILL PID]` actions validate `validatePidSafety(pid)` (`PID > 100` integer check) before issuing `SIGSTOP`/`SIGTERM`/`taskkill`. | Spoofed payload attempts `killProcess(0)` or `killProcess(1)` to crash OS init/kernel processes. `validatePidSafety` deterministically rejects any `PID <= 100` or non-integer PID and logs a `CRITICAL` security event. |
| `US-005` | `P0` | **Retractable Bottom IDE Dock, Step Matrix & SQLite Charts:** As `PER-01` and `PER-04`, I want a retractable bottom dock (`36px` collapsed -> `350px` or `75vh` expanded) housing a Step Division Matrix (`TelemetryMatrixTable`) and `node:sqlite` historical `EvolutionChartsView` so that I can inspect granular step progress and historical velocity. | **Given** the bottom dock is expanded to Tab 1 or Tab 2,<br/>**When** `TelemetryMatrixTable` or `EvolutionChartsView` mounts,<br/>**Then** Tab 1 renders `STEP X/Y` progress bars, PID, `TOK/S`, and `ETA`, while Tab 2 hydrates from `kalinarApi.getHistoricalTelemetry(100)` and `getEvolutionSummary()` in `node:sqlite`. | SQLite lock contention during concurrent daemon writes and chart queries. `DatabaseSync` runs with `PRAGMA journal_mode = WAL` and `PRAGMA busy_timeout = 5000` ensuring non-blocking concurrent reads. |
| `US-006` | `P0` | **Real Electron IPC Shell Guarded by ZEN Firewall:** As `PER-01` and `PER-03`, I want Tab 4 (`AntigravityCliTab`) to execute real OS commands via `kalinar:execute_shell_command` (`powershell.exe -NoProfile` / `node-pty`) gated by `os-execution-firewall.jdm.json` (`< 0.45ms`) so that destructive commands are blocked before spawning a shell. | **Given** an operator submits a command in Tab 4,<br/>**When** `kalinar:execute_shell_command` is invoked,<br/>**Then** `ZenFirewall.evaluateOsFirewall` evaluates the command in `< 0.45ms`; if allowed, it spawns the shell and streams `stdout`/`stderr`; if denied, it aborts execution, logs `HALT` to `telemetry_logs`, and prints `[FIREWALL_HALT]`. | Operator or injected prompt runs `rm -rf /`, `del /f /s /q C:\`, or `Format-Volume`. `os-execution-firewall.jdm.json` blocks execution in `< 0.45ms` with `riskLevel: CRITICAL` and zero child process creation. |
| `US-007` | `P0` | **Sovereign Voice Lifecycle, Acoustic Interlock & 90s Hot Window:** As `PER-01`, I want hardware-level mic muting during TTS (`EngageMicInterlock`), a `400ms` post-TTS room reverb decay delay, a `< 10ms` `Esc`/Click kill-switch, and a `90s` continuous Hot Window with auto-hibernate so that voice control never self-triggers or leaks background audio. | **Given** KALINAR begins TTS synthesis (`[SPEAKING PT-BR]`),<br/>**When** audio plays,<br/>**Then** microphone capture is strictly muted (`EngageMicInterlock`), remains muted for `400ms` after playback ends, aborts in `< 10ms` if `Esc` or Core Click occurs, and hibernates to `[STANDBY]` after `90s` of silence. | Room speaker reverberation echoes back into microphone immediately after TTS finishes, causing a phantom voice command loop. The mandatory `400ms` post-TTS decay timer discards all trailing acoustic reflections. |
| `US-008` | `P0` | **Deterministic 2-Stage Log Triage (`Stream-to-Digest`):** As `PER-02` and `PER-04`, I want raw stdout/stderr and file watcher streams buffered in a 200-entry Ring Buffer and compressed into a `< 150 token` structured digest via regex/AST before routing through `daemon-event-router.jdm.json` so that noisy logs never burn LLM tokens. | **Given** high-volume compiler or test output from an agent process,<br/>**When** ingested by the daemon,<br/>**Then** Stage 1 stores raw lines in a 200-entry circular buffer and extracts error codes, file paths, and line numbers into a `< 150 token` digest; Stage 2 evaluates `daemon-event-router.jdm.json` in `< 0.45ms` to decide whether to wake an agent. | Infinite console.log loop or 50MB stack trace dump attempts to overflow context window and exhaust token budget. Ring buffer overwrites oldest entries in $O(1)$ memory and Stage 1 regex truncates digest strictly below `150 tokens`. |
| `US-009` | `P0` | **Two-Phase Voice Ack, Speech Arbitration Rule B & Busy Agent FIFO Queue:** As `PER-01`, I want KALINAR to distinguish `STATUS_DISPATCHED` from `STATUS_VERIFIED`, queue outbound TTS in `PendingVoiceQueue` while I am speaking (`[LISTENING PT-BR]`), and enqueue directives in a FIFO queue when target agents are `[RUNNING]` so that voice reports are 100% truthful and non-interruptive. | **Given** `PER-01` is speaking (`[LISTENING PT-BR]`) or target `@agent-*` is `[RUNNING]`,<br/>**When** an agent event or new directive arrives,<br/>**Then** Phase 1 emits `STATUS_DISPATCHED` (`< 50ms`), busy agent tasks enter the SQLite/`WAR_ROOM.md` FIFO queue, outbound speech waits in `PendingVoiceQueue` until `PER-01` finishes speaking (unless `[HALTED]`/firewall emergency), and Phase 2 emits `STATUS_VERIFIED` only after exit code `0` and SQLite confirmation. | Agent reports task completion prematurely before tests pass, or TTS interrupts the operator mid-sentence. Two-Phase Ack prohibits completion phrasing until `STATUS_VERIFIED` is committed, and Speech Arbitration Rule B holds non-emergency TTS in `PendingVoiceQueue`. |
| `US-010` | `P0` | **Multi-Model LLM Router (`Argon`, `Claude`, `Gemini`) & Atomic Git Checkpoint Rollback:** As `PER-01` and `PER-02`, I want `llm-model-router.jdm.json` to route tasks across **Argon**, **Claude**, and **Gemini** models with an Atomic Git Checkpoint prior to file edits, exponential retry, clean rollback of dirty partial files, and automatic model hot-swap on HTTP 429/timeout so that failed LLM streams never corrupt the repository. | **Given** an agent task is ready for LLM execution,<br/>**When** `llm-model-router.jdm.json` selects the optimal model (`Argon`, `Claude`, or `Gemini`),<br/>**Then** the daemon records an Atomic Git Checkpoint (`git stash create` / snapshot ref) before any file write; on stream timeout, crash, or HTTP 429, it rolls back dirty partial files to the checkpoint, applies exponential backoff, and hot-swaps to the fallback model tier automatically. | LLM provider drops connection mid-stream after writing 40% of a TypeScript file, leaving syntax errors in the workspace. Atomic Git Checkpoint immediately restores the pre-turn file tree and retries the turn on the hot-swapped backup model (`Argon` <-> `Claude` <-> `Gemini`). |

---

## 4. Non-Functional, Compliance & Security Requirements

### 4.1 Performance & Deterministic Budgets
* **WebGL & GPGPU Budget:** `262,144` accretion particles + `50,000` instanced galaxy nodes at `60 FPS` (`16.6ms` frame budget); Octree spatial query `< 4ms`.
* **GoRules ZEN Engine Evaluation:** `< 0.45ms` p99 across all 5 JDM decision graphs with pre-warmed memory buffer cache (`jdmBufferCache`).
* **SQLite WAL Persistence:** `BEGIN IMMEDIATE` transaction writes `< 12ms`; historical chart hydration queries `< 5ms`; `busy_timeout = 5000`.
* **Voice Kill-Switch & Interlock:** `< 10ms` hardware audio abort on `Esc` or Core click; `400ms` post-TTS reverb decay; `90s` Hot Window timeout.
* **Stream-to-Digest Compression:** 200-entry O(1) Ring Buffer; `< 150 tokens` maximum digest payload.

### 4.2 Zero-Trust Security & OS Isolation
* **Electron Context Hardening:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, strict URL navigation guard blocking external origins.
* **Zero-Trust PID Gate:** `validatePidSafety(pid)` enforces integer `PID > 100` before any `SIGSTOP`, `SIGCONT`, `SIGTERM`, or `taskkill` invocation.
* **Append-Only Telemetry Ledger:** SQLite triggers `trg_telemetry_no_update` and `trg_telemetry_no_delete` abort any retroactive mutation of `telemetry_logs`.
* **Atomic File Integrity:** Single-writer `.kalinar-lock` token prevents Chokidar feedback loops; Atomic Git Checkpoints prevent partial file corruption on LLM failure.

### 4.3 Accessibility & Typography (WCAG 2.2 AAA)
* **Contrast Ratios:** Pure Void (`#000000`) background with Primary Alabaster (`#F4F4F6`, `19.3:1`), Secondary Muted (`#9A9A9A`, `7.45:1`), and Event Horizon Lavender (`#AA88FF`, `8.12:1`) meeting strict WCAG 2.2 AAA ($\ge 7.0:1$).
* **Monospace Telemetry Discipline:** Uppercase monospace (`Geist Mono` / `SF Mono`, `13px`, `line-height: 1.35`, `tabular-nums`) for all HUD telemetry and `44x44px` minimum interactive hit targets.

---

## 5. Explicit Out-of-Scope Boundaries (Anti-Scope Creep)

1. **Multi-Tenant Public SaaS Hosting:** KALINAR is a sovereign single-operator local Desktop OS; multi-tenant cloud user management is out of scope.
2. **Floating Corner Voice Orbs or Butler Personas:** Legacy assistant names and corner voice widgets are strictly prohibited; the central Black Hole Singularity is KALINAR's sole body and acoustic visualizer.
3. **Unbounded Raw Log Forwarding to LLMs:** Raw terminal or compiler streams must never be sent directly to an LLM bypassing the `< 150 token` `Stream-to-Digest` stage.
4. **Decorative Emojis or Icons:** 100% zero emojis or decorative icons across all UI components, shaders, logs, and documentation.

---

## 6. Agent Review & Critique Log (`WAR_ROOM.md` Cross-Audit)

| Entry ID | Reviewing Agent | Finding / Architectural Requirement | Resolution Locked in v1.1.0 |
| :--- | :--- | :--- | :--- |
| `CRIT-01` | `@agent-design` | Ensure desktop Singularity matches full particle density and left cards preserve `160px` live preview height. | Locked `262,144` GPGPU particles (`512x512` buffer) with `pow(aRandom.z, 60.0)` `#AA88FF` sparks and `min-h-[160px]` `AgentLivePreviewCard` viewports (`US-001`, `US-003`). |
| `CRIT-02` | `@agent-cybersecurity` | Prevent shell injection in Tab 4 and protect OS system processes from accidental termination. | Wired `os-execution-firewall.jdm.json` (`< 0.45ms`) prior to `powershell.exe` spawn (`US-006`) and enforced `PID > 100` in `validatePidSafety` (`US-004`). |
| `CRIT-03` | `@agent-data` | Prevent noisy compiler logs from exhausting LLM context and ensure truthful voice status reporting. | Locked 2-stage `Stream-to-Digest` (`< 150 tokens`, 200-entry Ring Buffer) (`US-008`) and Two-Phase Voice Ack (`STATUS_DISPATCHED` vs. `STATUS_VERIFIED`) (`US-009`). |
| `CRIT-04` | `@agent-software-engineer` | Prevent mid-stream LLM timeouts or rate limits (HTTP 429) from leaving half-written broken files in the workspace. | Locked `llm-model-router.jdm.json` multi-model routing (`Argon`, `Claude`, `Gemini`) with Atomic Git Checkpoints, clean dirty-file rollback, and automatic model hot-swap (`US-010`). |
| `CRIT-05` | `@agent-qa` | Prevent TTS voice synthesis from interrupting the operator mid-sentence or echoing back into the microphone. | Locked Speech Arbitration Rule B (`PendingVoiceQueue` while `[LISTENING PT-BR]`), `EngageMicInterlock`, `400ms` post-TTS decay, and `< 10ms` `Esc`/Click kill-switch (`US-007`, `US-009`). |
