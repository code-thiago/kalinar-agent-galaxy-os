# 04_BRIEFING_AND_DESIGN_SYSTEM.md — KALINAR SINGULARITY DESIGN SYSTEM (v1.1.0 LOCK)

> **Document ID:** `DOC-04-DESIGN-SYSTEM-KALINAR-v1.1.0`  
> **Lead Agent:** `@agent-design`  
> **Co-Authors:** `@human-developer`, `@agent-software-engineer`, `@agent-cybersecurity`, `@agent-orchestrator`, `@agent-qa`  
> **Gate Status:** `APPROVED_BY_SWARM_LOCKED_V1_1_0`  
> **Visual Philosophy:** `KALINAR Singularity & Gravitational Telemetry`  
> **Visual Constraint:** `STRICT ZERO-EMOJI ENFORCEMENT — ASCII & MONOSPACE TELEMETRY ONLY`

---

## Collaborative Sign-Off Header Table

| Participant | Domain Role | Review Focus | Status | Timestamp (UTC) | Cryptographic / Msg Ref |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `@human-developer` | Sovereign Principal Architect | 3-Tier Tokens, 160px Card Viewport, Release v1.1.0 Lock | `APPROVED` | `2026-11-03T19:07:00Z` | `PO-APPROVAL-DSGN-110` |
| `@agent-design` | UI/UX & Design System Architect | `--ds-*` Taxonomy, `plus-lighter` HUD, WCAG 2.2 AAA | `APPROVED` | `2026-11-03T19:07:10Z` | `SIG-DSGN-SYS-110` |
| `@agent-software-engineer` | Full-Stack & TDD Architect | React 19 `data-slot` Contracts (No `forwardRef`) | `APPROVED` | `2026-11-03T19:07:20Z` | `SIG-ENGR-SYS-110` |
| `@agent-cybersecurity` | DevSecOps & PID Gatekeeper | Standardized ASCII Badges (`[HALTED]`, `[FIFO_QUEUED]`) | `APPROVED` | `2026-11-03T19:07:30Z` | `SIG-CSEC-SYS-110` |
| `@agent-orchestrator` | Swarm Facilitator & Product Lead | PRD & App Flow Alignment (`TRACE-02`) | `APPROVED` | `2026-11-03T19:07:40Z` | `SIG-ORCH-SYS-110` |
| `@agent-qa` | QA & Traceability Auditor | Contrast Ratio Verification ($\ge 7.0:1$), `44px` Hit Targets | `APPROVED` | `2026-11-03T19:07:50Z` | `SIG-QATE-SYS-110` |

---

## 1. Three-Tier CSS Token Taxonomy (`--ds-*`)

### 1.1 Production CSS Custom Properties (`src/styles/design-tokens.css` Contract)

```css
:root {
  /* =====================================================================
     TIER 1 & TIER 2: SURFACES, BORDERS, ACCENTS & WCAG 2.2 AAA TEXT
     ===================================================================== */
  --ds-surface-singularity-void: #000000; /* Pure Void Base (Layer 0 & Viewport) */
  --ds-surface-app-shell:        #07080a; /* Dock & Terminal Shell Surface */
  --ds-surface-card-thumb:       #0a0a0a; /* Opaque 160px Agent Live Viewport Surface */
  --ds-border-structural:        1px solid #2a2a2a;

  /* Gravitational & Knowledge Accents (Verified on #000000) */
  --ds-accent-singularity:       #aa88ff; /* 7.67:1 WCAG 2.2 AAA Contrast on #000000 */
  --ds-accent-agent:             #00f0ff; /* 15.11:1 WCAG 2.2 AAA Contrast on #000000 */
  --ds-accent-memory:            #e879f9; /* 8.65:1 WCAG 2.2 AAA Contrast on #000000 */

  /* Typography Foreground Hierarchy (Verified on #000000) */
  --ds-text-bright:              #ffffff; /* 21.00:1 WCAG 2.2 AAA Contrast on #000000 */
  --ds-text-primary:             #dddddd; /* 15.54:1 WCAG 2.2 AAA Contrast on #000000 */
  --ds-text-secondary:           #9a9a9a; /* 7.45:1 WCAG 2.2 AAA Contrast on #000000 */

  /* Operational Telemetry Status Foregrounds */
  --ds-status-active-fg:         #34d399; /* Emerald — Verified / Active */
  --ds-status-warn-fg:           #fbbf24; /* Amber — Warning / Single-Writer Lock / Retry */
  --ds-status-halt-fg:           #f87171; /* Crimson — Firewall Veto / Circuit Halted */

  /* =====================================================================
     TIER 3: COMPONENT DIMENSIONS & SPATIAL GEOMETRY
     ===================================================================== */
  --ds-left-column-width:        320px;
  --ds-agent-card-thumb-h:       160px;
  --ds-right-column-offset:      48px;
  --ds-right-column-width:       360px;
  --ds-dock-collapsed-h:         36px;
  --ds-dock-expanded-h:          350px;
  --ds-inspector-drawer-w:       480px;
  --ds-hit-target-min:           44px;
}
```

### 1.2 WCAG 2.2 Level AAA Contrast Verification Matrix

| Semantic Token | HEX Value | Background Base | Measured Ratio | WCAG 2.2 AAA Target | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `--ds-text-bright` | `#ffffff` | `#000000` | `21.00 : 1` | $\ge 7.0 : 1$ | `PASS (AAA)` |
| `--ds-text-primary` | `#dddddd` | `#000000` | `15.54 : 1` | $\ge 7.0 : 1$ | `PASS (AAA)` |
| `--ds-accent-agent` | `#00f0ff` | `#000000` | `15.11 : 1` | $\ge 7.0 : 1$ | `PASS (AAA)` |
| `--ds-accent-memory` | `#e879f9` | `#000000` | `8.65 : 1` | $\ge 7.0 : 1$ | `PASS (AAA)` |
| `--ds-accent-singularity` | `#aa88ff` | `#000000` | `7.67 : 1` | $\ge 7.0 : 1$ | `PASS (AAA)` |
| `--ds-text-secondary` | `#9a9a9a` | `#000000` | `7.45 : 1` | $\ge 7.0 : 1$ | `PASS (AAA)` |

---

## 2. Typography & Tabular Numeral Invariant

* **Telemetry Font Stack:** Uppercase monospace (`'Geist Mono'`, `'SF Mono'`, `Menlo`, `Consolas`, `monospace`) at `13px` (`0.8125rem`), `line-height: 1.35`, `letter-spacing: 0.02em` (`Geist Sans` reserved strictly for structural display headers).
* **Tabular Numeral & Slashed-Zero Invariant:** All counters, step fractions (`STEP X/Y`), token metrics (`TOK`, `TOK/S`), OS process IDs (`PID`), JDM latencies (`ms`), and `ETA` timers must enforce fixed-width numeric alignment to prevent horizontal layout jitter during 60 FPS updates:

```css
.kalinar-telemetry-mono {
  font-family: 'Geist Mono', 'SF Mono', monospace;
  font-size: 13px;
  line-height: 1.35;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums slashed-zero;
  font-feature-settings: 'tnum' 1, 'zero' 1;
}
```

---

## 3. Standardized ASCII Status Badges (Zero-Emoji Mandate)

Decorative emojis and graphical icons are 100% prohibited across all UI components, 3D WebGL labels, terminal streams, and logs. System states are represented exclusively via standardized uppercase ASCII badges:

| ASCII Status Badge | Domain / Subsystem | Bound Color Token | Operational Meaning |
| :--- | :--- | :--- | :--- |
| `[SINGULARITY: STANDBY]` | Voice & Core | `--ds-text-secondary` (`#9a9a9a`) | Singularity in orbital standby; local zero-cost `pt-BR` wake listener armed. |
| `[LISTENING PT-BR]` | Voice Core | `--ds-accent-singularity` (`#aa88ff`) | Capturing operator `pt-BR` voice directive; Speech Arbitration Rule B active. |
| `[GRAVITY_INGESTION]` | Second Brain RAG | `--ds-accent-memory` (`#e879f9`) | Absorbing Second Brain `.md` notes into the `54u` Event Horizon. |
| `[KALINAR_SPEAKING]` | Voice Core | `--ds-accent-singularity` (`#aa88ff`) | Synthesizing sovereign `pt-BR` speech; `EngageMicInterlock` engaged; driving `uVoicePulse`. |
| `[VOICE_HIBERNATE]` | Voice Core | `--ds-text-secondary` (`#9a9a9a`) | Remote WebSocket closed after `90s` continuous silence; local wake listener active. |
| `[ACK_DISPATCHED]` | Two-Phase Ack | `--ds-accent-agent` (`#00f0ff`) | Phase 1 Ack (`< 50ms`): directive validated by JDM and dispatched to daemon/queue. |
| `[ACK_VERIFIED]` | Two-Phase Ack | `--ds-status-active-fg` (`#34d399`) | Phase 2 Ack: OS process exit code `0` and `node:sqlite` WAL commit verified. |
| `[ACTIVE]` | Agent Swarm | `--ds-status-active-fg` (`#34d399`) | Agent actively executing turn with `.kalinar-lock` Single-Writer Lock. |
| `[IDLE]` | Agent Swarm | `--ds-text-secondary` (`#9a9a9a`) | Agent in orbital standby awaiting task assignment. |
| `[PAUSED]` | OS Process Gate | `--ds-status-warn-fg` (`#fbbf24`) | Agent process suspended via `SIGSTOP` or awaiting human diff approval. |
| `[HALTED]` | ZEN Firewall / Circuit | `--ds-status-halt-fg` (`#f87171`) | Circuit breaker tripped or destructive command vetoed; preempts voice queue. |
| `[FIFO_QUEUED]` | Busy Agent Queue | `--ds-accent-singularity` (`#aa88ff`) | Task enqueued in `agent_task_fifo_queue` and `WAR_ROOM.md` awaiting lock release. |
| `[MODEL_HOTSWAP]` | Multi-Model Router | `--ds-accent-agent` (`#00f0ff`) | Atomic Git Rollback completed; hot-swapping across **Argon**, **Claude**, and **Gemini**. |
| `[WARN]` | Telemetry / Daemon | `--ds-status-warn-fg` (`#fbbf24`) | Retry backoff active or threshold approaching guardrail limit. |
| `[ERROR]` | Telemetry / Daemon | `--ds-status-halt-fg` (`#f87171`) | Non-zero exit code captured in `< 150 token` `Stream-to-Digest` payload. |
| `[STREAM]` | IPC / Ring Buffer | `--ds-accent-agent` (`#00f0ff`) | Live 200-entry Ring Buffer and IPC telemetry channel streaming. |

---

## 4. React 19 Compound Component Slot Contracts (`data-slot`, No `forwardRef`)

All KALINAR UI primitives follow React 19 direct ref/prop composition (zero `React.forwardRef` wrappers), isolated with `React.memo`, and expose deterministic `data-slot` attributes for E2E verification:

### 4.1 `AgentLivePreviewCard` (`src/components/ui/AgentLivePreviewCard.tsx`)
* `data-slot="agent-card-root"`: Outer `320px`-wide industrial card container (`border: var(--ds-border-structural)`).
* `data-slot="agent-card-viewport"`: Opaque `#0a0a0a` (`--ds-surface-card-thumb`) live code diff / terminal preview surface enforcing strict `min-h-[160px] h-[var(--ds-agent-card-thumb-h,160px)]`.
* `data-slot="agent-card-meta"`: Two-line `tabular-nums` footer displaying `STEP X/Y`, token burn, `TOK/S` velocity, and `ETA`.

### 4.2 `SingularityHudColumn` (`src/components/hud/RightSingularityHudColumn.tsx`)
* `data-slot="singularity-hud-root"`: Right ethereal container (`right: 48px`, `width: 360px`, `mix-blend-mode: plus-lighter`) that smoothly retracts (`opacity: 0`) when the `480px` `NodeInspectorDrawer` opens.
* `data-slot="singularity-hud-block"`: Individual telemetry block wrapper (`[singularity_core]`, `[active_directive]`, `[gravitational_rag]`, `[synaptic_feed]`).
* `data-slot="singularity-voice-transcript"`: Live character-by-character (`18ms/char`) `#aa88ff` transcript stream rendered directly inside `[singularity_core]`.

### 4.3 `RetractableIdeDock` (`src/components/terminal/KalinarBottomDock.tsx`) & `StepDivisionCell` (`src/components/terminal/TelemetryMatrixTable.tsx`)
* `data-slot="dock-root"`: Bottom IDE dock container anchored at `bottom: 0`.
* `data-slot="dock-status-bar"`: Collapsed `36px` (`--ds-dock-collapsed-h`) tactical status bar with `44px` minimum interactive hit targets.
* `data-slot="dock-viewport"`: Expanded `350px` (`--ds-dock-expanded-h`) or `75vh` (`max-h-[75vh]`) 4-tab workspace.
* `StepDivisionCell` slots:
  - `data-slot="step-fraction"`: Tabular step ratio (`STEP 04/06`).
  - `data-slot="step-bar-track"`: Segmented progress bar track colored by `--ds-accent-singularity` / `--ds-status-active-fg`.
  - `data-slot="step-label"`: Truncated monospace description of the active subtask.
