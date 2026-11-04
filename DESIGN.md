# DESIGN.md — KALINAR SINGULARITY & GRAVITATIONAL TELEMETRY DESIGN SYSTEM (v1.1.0 LOCK)

> **System ID:** `KALINAR-DS-SINGULARITY-V1.1.0`  
> **Lead Architect:** `@agent-design`  
> **Co-Authors:** `@human-developer`, `@agent-software-engineer`, `@agent-cybersecurity`, `@agent-orchestrator`, `@agent-qa`  
> **Blueprint Mirror:** `.antigravity/blueprint/04_BRIEFING_AND_DESIGN_SYSTEM.md`  
> **Visual Constraint:** `STRICT ZERO-EMOJI ENFORCEMENT — ASCII & MONOSPACE TELEMETRY ONLY`

---

## 1. Three-Tier CSS Token Taxonomy (`--ds-*`)

### 1.1 Tier 1, Tier 2 & Tier 3 Canonical Tokens

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

---

## 2. Typography & Tabular Numeral Invariant

* **Telemetry Font Stack:** Uppercase monospace (`'Geist Mono'`, `'SF Mono'`, `Menlo`, `Consolas`, `monospace`) at `13px`, `line-height: 1.35`, `letter-spacing: 0.02em` (`Geist Sans` reserved strictly for structural headers).
* **Tabular Numeral Invariant:** Mandatory `font-variant-numeric: tabular-nums slashed-zero` across all counters, token metrics (`TOK`, `TOK/S`), `PID` values, JDM latencies (`ms`), and `ETA` timers.

---

## 3. Standardized ASCII Status Badges (Zero-Emoji Mandate)

All system statuses are rendered exclusively via standardized ASCII badges (100% zero emojis or decorative icons):

* **Singularity & Voice Core:** `[SINGULARITY: STANDBY]`, `[LISTENING PT-BR]`, `[GRAVITY_INGESTION]`, `[KALINAR_SPEAKING]`, `[VOICE_HIBERNATE]`, `[ACK_DISPATCHED]`, `[ACK_VERIFIED]`.
* **Agent Swarm, Queue & Firewall:** `[ACTIVE]`, `[IDLE]`, `[PAUSED]`, `[HALTED]`, `[FIFO_QUEUED]`, `[MODEL_HOTSWAP]`, `[WARN]`, `[ERROR]`, `[STREAM]`.

---

## 4. React 19 Compound Component Slot Contracts (`data-slot`, No `forwardRef`)

* **`AgentLivePreviewCard`:**
  - `data-slot="agent-card-root"` (`width: var(--ds-left-column-width, 320px)`).
  - `data-slot="agent-card-viewport"` (strict `min-h-[160px] h-[var(--ds-agent-card-thumb-h,160px)]`, background `#0a0a0a`).
  - `data-slot="agent-card-meta"` (2-line `tabular-nums` metadata footer).
* **`SingularityHudColumn`:**
  - `data-slot="singularity-hud-root"` (`right: 48px`, `width: 360px`, `mix-blend-mode: plus-lighter`).
  - `data-slot="singularity-hud-block"` (`[singularity_core]`, `[active_directive]`, `[gravitational_rag]`, `[synaptic_feed]`).
  - `data-slot="singularity-voice-transcript"` (`18ms/char` `#aa88ff` transcript stream inside `[singularity_core]`).
* **`RetractableIdeDock` & `StepDivisionCell`:**
  - `data-slot="dock-root"`, `data-slot="dock-status-bar"` (`36px`), `data-slot="dock-viewport"` (`350px` / `75vh`).
  - `StepDivisionCell`: `data-slot="step-fraction"`, `data-slot="step-bar-track"`, `data-slot="step-label"`.
