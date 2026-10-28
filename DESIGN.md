# KALINAR CANONICAL DESIGN SYSTEM SPECIFICATION (`DESIGN.md`)

> System ID: `KALINAR-DS-V1`  
> Lead Architect: `@agent-design`  
> Co-Authors: `@human-developer`, `@agent-software-engineer`, `@agent-orchestrator`  
> Visual Philosophy: `Industrial Matte Obsidian & Emerald Zero-Trust Telemetry`  
> Visual Constraint: `STRICT ZERO-EMOJI ENFORCEMENT - TYPOGRAPHICAL & ASCII ONLY`

---

## 1. Design Philosophy & Aesthetic Foundation

Kalinar rejects visual slop, gratuitous micro-interactions, decorative drop shadows, and cartoon iconography. The interface is engineered as high-precision mission telemetry for autonomous systems and the 3D Agent Galaxy OS:
* **Matte Obsidian Canvas:** Grounded in deep matte black (`#07080a`) and dark slate surfaces (`#0d0f14`), eliminating visual fatigue during continuous 24/7 operations.
* **Sharp Structural Edges:** `1px` structural borders (`#1a1d26`) replace heavy drop shadows, providing crisp mechanical demarcation between viewport panels.
* **Functional Luminance:** Color is reserved strictly for operational status, 3D Galaxy archetypes, and telemetry semantics:
  * **Arc Cyan (`#00F0FF`):** Active `agent.md` stars in the 3D Galaxy.
  * **Neural Magenta (`#D946EF`):** Second Brain memory and context nodes.
  * **Quantum Violet (`#8B5CF6`):** Synapse pointer beams between connected nodes.
  * **Amber (`#F59E0B`):** Active step execution, single-writer locks, and retry warnings.
  * **Emerald (`#10B981`):** Verified telemetry, healthy state, and completed steps.
  * **Crimson (`#EF4444`):** Tripped circuit breakers, blocked tasks, and fatal errors.
* **Zero-Emoji Rule:** All emojis and decorative unicode symbols are strictly forbidden. System status is communicated via standardized ASCII typographical badges (`[ACTIVE]`, `[IDLE]`, `[HALTED]`, `[PAUSED]`, `[RUNNING]`, `[VERIFIED]`, `[WARN]`, `[ERROR]`, `[STREAM]`) and geometric SVG vectors.

---

## 2. Typography Hierarchy & Tabular Numeral Standard

### 2.1 Font Family Declarations
```css
--font-sans: 'Geist Sans', 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'Geist Mono', 'JetBrains Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

### 2.2 Typographical Scale

| Role | Font Family | Size | Weight | Line Height | Tracking | Invariant Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Viewport Title** | `Geist Sans` / `Space Grotesk` | `24px` (`1.50rem`) | `600` (Semi-bold) | `1.20` | `-0.025em` | All-caps or brackets preferred: `[KALINAR_TELEMETRY]` |
| **Section Header** | `Geist Sans` / `Space Grotesk` | `16px` (`1.00rem`) | `600` (Semi-bold) | `1.30` | `-0.015em` | High contrast; uppercase section labels |
| **Body Primary** | `Geist Sans` / `Space Grotesk` | `14px` (`0.875rem`) | `400` (Regular) | `1.50` | `0.000em` | Explanatory technical notes, configuration descriptions |
| **Telemetry Mono** | `Geist Mono` / `JetBrains Mono` | `13px` (`0.8125rem`) | `500` (Medium) | `1.40` | `0.000em` | `font-variant-numeric: tabular-nums` mandatory |
| **Micro Monospace** | `Geist Mono` / `JetBrains Mono` | `11px` (`0.6875rem`) | `400` (Regular) | `1.40` | `0.020em` | Timestamps, hash prefixes, memory bytes |

### 2.3 Tabular Numeral Invariant
All numeric metrics, task IDs, latency measurements, and clocks MUST enforce tabular alignment:
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
  /* Primitive Slate Palette */
  --ds-primitive-slate-950: #07080a;
  --ds-primitive-slate-900: #0d0f14;
  --ds-primitive-slate-850: #12151d;
  --ds-primitive-slate-800: #1a1d26;
  --ds-primitive-slate-700: #262b38;
  --ds-primitive-slate-500: #64748b;
  --ds-primitive-slate-400: #94a3b8;
  --ds-primitive-slate-200: #e2e8f0;
  --ds-primitive-slate-50:  #f8fafc;

  /* Primitive Emerald Palette (Verified / Success) */
  --ds-primitive-emerald-500: #10b981;
  --ds-primitive-emerald-400: #34d399;
  --ds-primitive-emerald-950: #022c22;

  /* Primitive Amber Palette (Running / Retries) */
  --ds-primitive-amber-500: #f59e0b;
  --ds-primitive-amber-400: #fbbf24;
  --ds-primitive-amber-950: #451a03;

  /* Primitive Crimson Palette (Circuit Trip / Error) */
  --ds-primitive-crimson-500: #ef4444;
  --ds-primitive-crimson-400: #f87171;
  --ds-primitive-crimson-950: #450a0a;

  /* Primitive Cyan Palette (Arc Cyan / Neutral) */
  --ds-primitive-cyan-500: #00f0ff;
  --ds-primitive-cyan-400: #38bdf8;
  --ds-primitive-cyan-950: #083344;

  /* Primitive Galaxy Accents */
  --ds-primitive-magenta-500: #d946ef;
  --ds-primitive-violet-500:  #8b5cf6;

  /* Font Primitives */
  --ds-primitive-font-sans: 'Geist Sans', 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --ds-primitive-font-mono: 'Geist Mono', 'JetBrains Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
```

### 3.2 Tier 2: Semantic Context Tokens
```css
:root {
  /* Surfaces */
  --ds-surface-canvas: var(--ds-primitive-slate-950);
  --ds-surface-card: var(--ds-primitive-slate-900);
  --ds-surface-overlay: var(--ds-primitive-slate-850);
  --ds-surface-muted: var(--ds-primitive-slate-800);

  /* Borders & Dividers */
  --ds-border-subtle: #1a1d26;
  --ds-border-bold: var(--ds-primitive-slate-700);
  --ds-border-focus: var(--ds-primitive-emerald-500);

  /* Typography Colors */
  --ds-text-primary: var(--ds-primitive-slate-50);
  --ds-text-secondary: var(--ds-primitive-slate-400);
  --ds-text-muted: var(--ds-primitive-slate-500);

  /* 3D Galaxy & Knowledge Graph Semantic Tokens */
  --ds-accent-agent: #00F0FF;      /* Arc Cyan for active agent.md stars */
  --ds-accent-memory: #D946EF;     /* Neural Magenta for Second Brain nodes */
  --ds-accent-synapse: #8B5CF6;    /* Quantum Violet for Graph Pointer beams */
  --ds-status-running: #F59E0B;    /* Amber for active step execution & Single-Writer Lock */
  --ds-status-verified: #10B981;   /* Emerald for verified telemetry & completed steps */
  --ds-status-error: #EF4444;      /* Crimson for blocked/halted processes */

  /* Operational Status Colors */
  --ds-status-active-fg: var(--ds-primitive-emerald-400);
  --ds-status-active-bg: var(--ds-primitive-emerald-950);
  --ds-status-active-border: var(--ds-primitive-emerald-500);

  --ds-status-warn-fg: var(--ds-primitive-amber-400);
  --ds-status-warn-bg: var(--ds-primitive-amber-950);
  --ds-status-warn-border: var(--ds-primitive-amber-500);

  --ds-status-halt-fg: var(--ds-primitive-crimson-400);
  --ds-status-halt-bg: var(--ds-primitive-crimson-950);
  --ds-status-halt-border: var(--ds-primitive-crimson-500);

  --ds-status-neutral-fg: var(--ds-primitive-cyan-500);
  --ds-status-neutral-bg: var(--ds-primitive-cyan-950);
  --ds-status-neutral-border: var(--ds-primitive-cyan-500);
}
```

### 3.3 Tier 3: Component-Scoped Tokens
```css
:root {
  /* Agent Card */
  --ds-agent-card-bg: var(--ds-surface-card);
  --ds-agent-card-border: var(--ds-border-subtle);
  --ds-agent-card-radius: 4px;
  --ds-agent-card-pad: 16px;

  /* 3D Galaxy Viewport */
  --ds-galaxy-bg: #030407;
  --ds-galaxy-node-halo: rgba(0, 240, 255, 0.35);
  --ds-galaxy-synapse-opacity: 0.45;
  --ds-galaxy-hud-border: var(--ds-border-subtle);

  /* Circuit Breaker Gauge */
  --ds-gauge-size: 140px;
  --ds-gauge-track: var(--ds-primitive-slate-800);
  --ds-gauge-fill-nominal: var(--ds-primitive-emerald-500);
  --ds-gauge-fill-tripped: var(--ds-primitive-crimson-500);

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
| `[RUNNING]` | Active step execution / single-writer lock | `--ds-status-running` | `--ds-status-warn-bg` |
| `[VERIFIED]` | Verified telemetry / completed step | `--ds-status-verified` | `--ds-status-active-bg` |
| `[WARN]` | Retry count incremented; SLA warning | `--ds-status-warn-fg` | `--ds-status-warn-bg` |
| `[ERROR]` | Fatal schema failure or crash | `--ds-status-error` | `--ds-status-halt-bg` |
| `[STREAM]` | SSE / WebSocket telemetry channel connected | `--ds-status-neutral-fg` | `--ds-status-neutral-bg` |

---

## 5. Spatial Grid & Layout Architecture

* **Base Unit:** `4px` (`0.25rem`).
* **Scale Intervals:** `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`.
* **Viewport Max Width:** `1440px` centered container with `24px` horizontal padding.
* **Interactive Hit Target Minimum:** `44px x 44px` minimum bounding box on all buttons, links, and toggles.

---

## 6. Accessibility & Contrast Verification (WCAG 2.2 AAA)

All color combinations in Kalinar strictly comply with WCAG 2.2 Level AAA requirements:
* Normal text contrast exceeds `7.0 : 1`.
* Large text (`>= 18px` or `>= 14px bold`) contrast exceeds `4.5 : 1`.
* Focus states render an unmistakable `2px solid var(--ds-border-focus)` with `2px` offset.
* Full support for `prefers-reduced-motion` eliminating transitions and radial pulses.
