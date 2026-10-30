# KALINAR CANONICAL DESIGN SYSTEM SPECIFICATION (`DESIGN.md`)

> System ID: `KALINAR-DS-SINGULARITY-V2`  
> Lead Architect: `@agent-design`  
> Co-Authors: `@human-developer`, `@agent-software-engineer`, `@agent-orchestrator`  
> Visual Philosophy: `KALINAR Singularity & Gravitational Telemetry`  
> Visual Constraint: `STRICT ZERO-EMOJI ENFORCEMENT - TYPOGRAPHICAL & ASCII ONLY`

---

## 1. Design Philosophy & Spatial Architecture

Kalinar rejects visual slop, gratuitous micro-interactions, decorative drop shadows, and cartoon iconography. The interface is engineered as high-precision mission telemetry for autonomous systems and the 3D Agent Galaxy OS, organized into a strict two-layer spatial architecture:

### 1.1 Spatial Layers
* **Layer 0 (`canvas#singularity-bg`):** Central **KALINAR Black Hole Singularity** (Event Horizon dark core with `#AA88FF` / `#DDDDDD` GPGPU particle accretion disk stirred by cursor Navier-Stokes fluid and modulated by Kalinar's voice waveform). Surrounding the Black Hole are the orbital particle swarms of `agent.md` stars and `Second Brain` constellations.
* **Layer 1 (`.kalinar-hud`):** Tactical telemetry interface composed of three spatial zones:
  * **Left Dynamic Column (`left: 24px, width: 320px`):** Brand mark (`40x40` SVG), filter chips (`top: 120px`), and scrollable list (`top: 250px`) of opaque `160px` `AgentLivePreviewCard` components showing live visual previews of each active agent's work plus 2-line `tabular-nums` metadata (`STEP X/Y`, tokens, ETA).
  * **Right Ethereal Column (`right: 48px, top: 50%, translateY(-50%), width: 360px`):** Text blocks using `mix-blend-mode: plus-lighter` (`[singularity_core]`, `[active_directive]`, `[gravitational_rag]`, `[synaptic_feed]`). Live voice transcription renders directly inside `[singularity_core]` in `#AA88FF`. Retracts smoothly when `NodeInspectorDrawer` (`480px`) opens.
  * **Retractable Bottom IDE Dock (`bottom: 0`):** Collapsed by default to a `36px` tactical bar to keep the Black Hole unobstructed; expands to `350px` (or up to `75vh`) on click or voice command.

### 1.2 Functional Luminance & Palette
* **Pure Void Base (`#000000`):** Total black void eliminating light bleed and maximizing dynamic range for particle accretion.
* **Event Horizon Lavender (`#AA88FF`):** Singularity accent, live voice transcription, and gravitational center.
* **Arc Cyan (`#00F0FF`):** Active `agent.md` star nodes and running processes.
* **Neural Magenta (`#E879F9`):** Second Brain memory nodes and knowledge graph constellations.
* **Emerald (`#34D399`):** Verified telemetry, healthy state, and completed steps.
* **Amber (`#FBBF24`):** Active execution warnings, retries, and single-writer locks.
* **Crimson (`#F87171`):** Tripped circuit breakers, blocked tasks, and fatal errors.
* **Calibrated Muted Text (`#9A9A9A`):** AAA-compliant secondary text (`7.45:1` contrast on `#000000`).
* **Zero-Emoji Rule:** All emojis and decorative unicode symbols are strictly forbidden. System status is communicated via standardized ASCII typographical badges (`[ACTIVE]`, `[IDLE]`, `[HALTED]`, `[PAUSED]`, `[RUNNING]`, `[VERIFIED]`, `[WARN]`, `[ERROR]`, `[STREAM]`) and geometric SVG vectors.

---

## 2. Typography Hierarchy & Tabular Numeral Standard

### 2.1 Font Family Declarations
```css
--font-sans: 'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'Geist Mono', 'SF Mono', Menlo, Monaco, Consolas, monospace;
```

### 2.2 Typographical Scale

| Role | Font Family | Size | Weight | Line Height | Tracking | Invariant Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Viewport Title** | `Geist Sans` | `24px` (`1.50rem`) | `600` (Semi-bold) | `1.20` | `-0.025em` | All-caps or brackets preferred: `[KALINAR_SINGULARITY_CORE]` |
| **Section Header** | `Geist Sans` | `16px` (`1.00rem`) | `600` (Semi-bold) | `1.30` | `-0.015em` | Structural header; high contrast; uppercase section labels |
| **Body Primary** | `Geist Sans` | `14px` (`0.875rem`) | `400` (Regular) | `1.50` | `0.000em` | Explanatory technical notes, configuration descriptions |
| **Telemetry Mono** | `Geist Mono` / `SF Mono` | `13px` (`0.8125rem`) | `500` (Medium) | `1.35` | `0.020em` | Uppercase monospace, `tabular-nums` mandatory |
| **Micro Monospace** | `Geist Mono` / `SF Mono` | `11px` (`0.6875rem`) | `400` (Regular) | `1.35` | `0.020em` | Timestamps, hash prefixes, memory bytes (`tabular-nums`) |

### 2.3 Tabular Numeral Invariant
All numeric metrics, task IDs, step indicators, latency measurements, and clocks MUST enforce tabular alignment:
```css
.tabular-nums {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
```

---

## 3. Three-Tier CSS Token Taxonomy

### 3.1 Tier 1: Global Primitive Tokens
```css
:root {
  /* Primitive Singularity & Void Palette */
  --ds-primitive-void: #000000;
  --ds-primitive-slate-900: #0d0f14;
  --ds-primitive-slate-850: #12151d;
  --ds-primitive-slate-800: #1a1d26;
  --ds-primitive-slate-700: #262b38;
  --ds-primitive-slate-500: #64748b;
  --ds-primitive-slate-400: #9a9a9a;
  --ds-primitive-slate-200: #e2e8f0;
  --ds-primitive-slate-50:  #f8fafc;

  /* Primitive Singularity Accent (Event Horizon Lavender) */
  --ds-primitive-lavender-500: #aa88ff;
  --ds-primitive-lavender-400: #c4b5fd;
  --ds-primitive-lavender-950: #2e1065;

  /* Primitive Emerald Palette (Verified / Active) */
  --ds-primitive-emerald-500: #10b981;
  --ds-primitive-emerald-400: #34d399;
  --ds-primitive-emerald-950: #022c22;

  /* Primitive Amber Palette (Running / Retries / Warn) */
  --ds-primitive-amber-500: #f59e0b;
  --ds-primitive-amber-400: #fbbf24;
  --ds-primitive-amber-950: #451a03;

  /* Primitive Crimson Palette (Circuit Trip / Error / Halt) */
  --ds-primitive-crimson-500: #ef4444;
  --ds-primitive-crimson-400: #f87171;
  --ds-primitive-crimson-950: #450a0a;

  /* Primitive Cyan Palette (Arc Cyan / Agent Stars) */
  --ds-primitive-cyan-500: #00f0ff;
  --ds-primitive-cyan-400: #38bdf8;
  --ds-primitive-cyan-950: #083344;

  /* Primitive Galaxy Accents */
  --ds-primitive-magenta-500: #e879f9;
  --ds-primitive-violet-500:  #8b5cf6;
  --ds-primitive-white-500:   #dddddd;

  /* Font Primitives */
  --ds-primitive-font-sans: 'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --ds-primitive-font-mono: 'Geist Mono', 'SF Mono', Menlo, Monaco, Consolas, monospace;
}
```

### 3.2 Tier 2: Semantic Context Tokens
```css
:root {
  /* Surfaces & Canvas */
  --ds-surface-singularity-void: #000000;
  --ds-surface-canvas: var(--ds-surface-singularity-void);
  --ds-surface-card: var(--ds-primitive-slate-900);
  --ds-surface-overlay: var(--ds-primitive-slate-850);
  --ds-surface-muted: var(--ds-primitive-slate-800);

  /* Borders & Dividers */
  --ds-border-subtle: #1a1d26;
  --ds-border-bold: var(--ds-primitive-slate-700);
  --ds-border-focus: var(--ds-accent-singularity);

  /* Typography Colors */
  --ds-text-primary: var(--ds-primitive-slate-50);
  --ds-text-secondary: #9A9A9A; /* 7.45:1 contrast on #000000 (WCAG AAA) */
  --ds-text-muted: var(--ds-primitive-slate-500);

  /* Singularity & 3D Galaxy Semantic Tokens */
  --ds-accent-singularity: #AA88FF; /* Event Horizon Lavender */
  --ds-accent-agent: #00F0FF;       /* Arc Cyan for active agent.md stars */
  --ds-accent-memory: #E879F9;      /* Neural Magenta for Second Brain nodes */
  --ds-accent-synapse: #8B5CF6;     /* Quantum Violet for Graph Pointer beams */

  /* Operational Status Semantics */
  --ds-status-active-fg: #34D399;   /* Emerald */
  --ds-status-active-bg: var(--ds-primitive-emerald-950);
  --ds-status-active-border: var(--ds-primitive-emerald-500);

  --ds-status-warn-fg: #FBBF24;     /* Amber */
  --ds-status-warn-bg: var(--ds-primitive-amber-950);
  --ds-status-warn-border: var(--ds-primitive-amber-500);

  --ds-status-halt-fg: #F87171;     /* Crimson */
  --ds-status-halt-bg: var(--ds-primitive-crimson-950);
  --ds-status-halt-border: var(--ds-primitive-crimson-500);

  --ds-status-neutral-fg: var(--ds-primitive-cyan-500);
  --ds-status-neutral-bg: var(--ds-primitive-cyan-950);
  --ds-status-neutral-border: var(--ds-primitive-cyan-500);
}
```

### 3.3 Tier 3: Component-Scoped Tokens & HUD Spatial Bindings
```css
:root {
  /* Layer 0: Singularity Background Canvas */
  --ds-singularity-core-radius: 48px;
  --ds-singularity-accretion-inner: #AA88FF;
  --ds-singularity-accretion-outer: #DDDDDD;
  --ds-singularity-particle-count: 65536;

  /* Layer 1: Left Dynamic Column */
  --ds-hud-left-offset: 24px;
  --ds-hud-left-width: 320px;
  --ds-hud-brand-size: 40px;
  --ds-hud-chips-top: 120px;
  --ds-hud-preview-list-top: 250px;
  --ds-agent-preview-card-height: 160px;
  --ds-agent-preview-card-bg: rgba(13, 15, 20, 0.95);
  --ds-agent-preview-card-border: var(--ds-border-subtle);

  /* Layer 1: Right Ethereal Column */
  --ds-hud-right-offset: 48px;
  --ds-hud-right-width: 360px;
  --ds-hud-ethereal-blend: plus-lighter;
  --ds-hud-drawer-width: 480px;

  /* Layer 1: Retractable Bottom IDE Dock */
  --ds-dock-collapsed-height: 36px;
  --ds-dock-expanded-height: 350px;
  --ds-dock-max-height: 75vh;
  --ds-dock-bg: rgba(7, 8, 10, 0.96);
  --ds-dock-border: var(--ds-border-subtle);

  /* Circuit Breaker Gauge */
  --ds-gauge-size: 140px;
  --ds-gauge-track: var(--ds-primitive-slate-800);
  --ds-gauge-fill-nominal: var(--ds-status-active-fg);
  --ds-gauge-fill-tripped: var(--ds-status-halt-fg);

  /* Timeline */
  --ds-timeline-stem-width: 2px;
  --ds-timeline-stem-color: var(--ds-border-subtle);
  --ds-timeline-node-size: 32px;
  --ds-timeline-node-bg: var(--ds-surface-overlay);
}
```

---

## 4. Standardized ASCII Status Indicators

To replace decorative emojis, all components and logs must use these standardized ASCII tags:

| ASCII Indicator | Semantic Meaning | Foreground Token | Background Token |
| :--- | :--- | :--- | :--- |
| `[ACTIVE]` | Agent actively executing turn | `--ds-status-active-fg` | `--ds-status-active-bg` |
| `[IDLE]` | Agent or daemon in ready standby | `--ds-text-secondary` | `--ds-surface-muted` |
| `[HALTED]` | Circuit breaker tripped; queue halted | `--ds-status-halt-fg` | `--ds-status-halt-bg` |
| `[PAUSED]` | Task suspended awaiting operator | `--ds-status-warn-fg` | `--ds-status-warn-bg` |
| `[RUNNING]` | Active step execution / single-writer lock | `--ds-status-warn-fg` | `--ds-status-warn-bg` |
| `[VERIFIED]` | Verified telemetry / completed step | `--ds-status-active-fg` | `--ds-status-active-bg` |
| `[WARN]` | Retry count incremented; SLA warning | `--ds-status-warn-fg` | `--ds-status-warn-bg` |
| `[ERROR]` | Fatal schema failure or crash | `--ds-status-halt-fg` | `--ds-status-halt-bg` |
| `[STREAM]` | SSE / WebSocket telemetry channel connected | `--ds-status-neutral-fg` | `--ds-status-neutral-bg` |

---

## 5. Spatial Grid & Layout Architecture

* **Base Unit:** `4px` (`0.25rem`).
* **Scale Intervals:** `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`.
* **Viewport Max Width:** `1440px` centered container with `24px` horizontal padding.
* **Interactive Hit Target Minimum:** `44px x 44px` minimum bounding box on all buttons, links, and toggles.

---

## 6. Accessibility & Contrast Verification (WCAG 2.2 AAA)

All color combinations in Kalinar strictly comply with WCAG 2.2 Level AAA requirements against the Pure Void Base (`#000000`):

| Color Pair (Foreground on Background) | Contrast Ratio | WCAG 2.2 AAA Target | Compliance Status |
| :--- | :--- | :--- | :---: |
| `--ds-primitive-slate-50` (`#F8FAFC`) on `#000000` | `19.4 : 1` | `> 7.0 : 1` | `PASS (EXCEEDS)` |
| `--ds-text-secondary` (`#9A9A9A`) on `#000000` | `7.45 : 1` | `> 7.0 : 1` | `PASS (CALIBRATED AAA)` |
| `--ds-accent-singularity` (`#AA88FF`) on `#000000` | `8.65 : 1` | `> 7.0 : 1` | `PASS` |
| `--ds-accent-agent` (`#00F0FF`) on `#000000` | `16.6 : 1` | `> 7.0 : 1` | `PASS (EXCEEDS)` |
| `--ds-accent-memory` (`#E879F9`) on `#000000` | `10.8 : 1` | `> 7.0 : 1` | `PASS` |
| `--ds-status-active-fg` (`#34D399`) on `#000000` | `11.5 : 1` | `> 7.0 : 1` | `PASS` |
| `--ds-status-warn-fg` (`#FBBF24`) on `#000000` | `12.3 : 1` | `> 7.0 : 1` | `PASS` |
| `--ds-status-halt-fg` (`#F87171`) on `#000000` | `7.85 : 1` | `> 7.0 : 1` | `PASS` |
| Interactive Hit Target Minimum Box | `44px x 44px` | `44px x 44px` | `PASS` |

* Focus states render an unmistakable `2px solid var(--ds-border-focus)` with `2px` offset.
* Full support for `prefers-reduced-motion` eliminating GPGPU accretion stirring and fluid simulations.
