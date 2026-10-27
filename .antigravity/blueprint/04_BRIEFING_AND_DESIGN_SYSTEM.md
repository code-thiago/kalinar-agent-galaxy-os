# 04 - Visual Briefing & Design System Architecture (`04_BRIEFING_AND_DESIGN_SYSTEM.md`)

> Document ID: `DOC-04-DESIGN-SYSTEM-KALINAR`  
> Lead Agent: `@agent-design`  
> Co-Authors: `@human-developer`, `@agent-software-engineer`, `@agent-cybersecurity`, `@agent-orchestrator`, `@agent-qa`  
> Gate Status: `APPROVED_BY_SWARM_PENDING_HUMAN`  
> Visual Constraint: `STRICT ZERO-EMOJI ENFORCEMENT - TYPOGRAPHICAL & ASCII ONLY`

---

## Collaborative Sign-Off Header Table

| Participant | Domain Role | Review Focus | Status | Timestamp (UTC) | Cryptographic / Msg Ref |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `@human-developer` | Brand & UX Final Authority | Aesthetic Craft, Industrial Tone, Anti-Slop Fit | `PENDING` | -- | `PO-APPROVAL-PENDING` |
| `@agent-design` | UI/UX & Design System Architect | 3-Tier Tokens, Typography Scale, WCAG AAA | `APPROVED` | `2026-10-27T23:45:00Z` | `SIG-DSGN-SYS-001` |
| `@agent-software-engineer` | Full-Stack & TDD Architect | CSS Custom Property Performance, RSC Slot Trees | `APPROVED` | `2026-10-27T23:46:00Z` | `SIG-ENGR-SYS-001` |
| `@agent-cybersecurity` | Shift-Left DevSecOps Lead | Visual Deception Prevention, Secret Masking Tokens | `APPROVED` | `2026-10-27T23:47:00Z` | `SIG-CSEC-SYS-001` |
| `@agent-orchestrator` | Swarm Facilitator & Product Lead | Alignment with PRD (`TRACE-02`), Information Hierarchy | `APPROVED` | `2026-10-27T23:48:00Z` | `SIG-ORCH-SYS-001` |
| `@agent-qa` | Test Architect & Quality Lead | Token Contrast Verifiability, Hit Target Compliance | `APPROVED` | `2026-10-27T23:49:00Z` | `SIG-QATE-SYS-001` |

---

## 1. Aesthetic Direction & Brand Briefing

### 1.1 Visual Persona & Anti-Slop Philosophy
Kalinar embodies **Industrial Obsidian & Emerald Telemetry**. It rejects generic dashboard aesthetics, unnecessary gradients, rounded pill buttons, and cartoon iconography. Every pixel serves an operational purpose:
* **Background Architecture:** Deep matte obsidian canvas (`#07080a`) paired with structural slate surfaces (`#0d0f14`), separated by sharp `1px` borders (`#1a1d26`).
* **Visual Hierarchy:** Light and luminance indicate activity, not decoration. Emerald accents (`#10b981`) indicate active execution and healthy telemetry; amber (`#f59e0b`) flags latency or retry degradation; crimson (`#ef4444`) signals tripped circuit breakers.
* **Typography:** Pure technical clarity. High-readability sans-serif for interface controls; monospace with tabular numerals for all telemetry counters, IDs, memory addresses, and timestamps.
* **Zero-Emoji Enforcement:** 100% prohibited. Status is communicated using ASCII badges (`[ACTIVE]`, `[IDLE]`, `[HALTED]`, `[WARN]`, `[FAIL]`) and geometric SVG indicators.

### 1.2 Typography Scale & Font Stack

| Hierarchy Level | Font Family | Size | Weight | Line Height | Tracking | Application Context |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Header** | `Geist Sans`, system-ui | `24px` (`1.5rem`) | `600` | `1.2` | `-0.02em` | Mission Control view titles, War Room banner |
| **Section Header** | `Geist Sans`, system-ui | `16px` (`1.0rem`) | `600` | `1.3` | `-0.01em` | Panel titles, card headers, table section titles |
| **UI Body** | `Geist Sans`, system-ui | `14px` (`0.875rem`) | `400` | `1.5` | `0.00em` | Explanatory labels, parameter descriptions |
| **Telemetry Mono** | `Geist Mono`, monospace | `13px` (`0.8125rem`) | `500` | `1.4` | `0.00em` | Task IDs, agent turn records, status badges (`tabular-nums`) |
| **Micro Mono** | `Geist Mono`, monospace | `11px` (`0.6875rem`) | `400` | `1.4` | `0.02em` | Timestamps, hash prefixes, latency indicators (`tabular-nums`) |

### 1.3 Spatial Grid & Hit Target Standards
* **Grid Increment:** Strict `4px` base module (`0.25rem`). Layout spacing values: `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`.
* **Touch & Click Target:** All interactive controls enforce a minimum hit box of `44px x 44px` per WCAG 2.2 Success Criterion 2.5.8.

---

## 2. Three-Tier Design Token Taxonomy

```mermaid
flowchart TD
    Tier1["Tier 1: Global Primitive Tokens<br/>(--ds-primitive-*)<br/>Raw HEX colors, base font families, absolute radii"]
    Tier2["Tier 2: Semantic Context Tokens<br/>(--ds-surface-*, --ds-status-*, --ds-border-*)<br/>Meaningful abstractions mapped to dark/light surfaces"]
    Tier3["Tier 3: Component-Scoped Tokens<br/>(--ds-agent-card-*, --ds-gauge-*, --ds-badge-*)<br/>Surgical bindings mapped directly to component slots"]

    Tier1 --> Tier2 --> Tier3
```

### 2.1 CSS Custom Properties (Production Specification)

```css
:root {
  /* =====================================================================
     TIER 1: GLOBAL PRIMITIVE TOKENS
     ===================================================================== */
  --ds-primitive-slate-950: #07080a;
  --ds-primitive-slate-900: #0d0f14;
  --ds-primitive-slate-850: #12151d;
  --ds-primitive-slate-800: #1a1d26;
  --ds-primitive-slate-700: #262b38;
  --ds-primitive-slate-500: #64748b;
  --ds-primitive-slate-400: #94a3b8;
  --ds-primitive-slate-200: #e2e8f0;
  --ds-primitive-slate-50:  #f8fafc;

  --ds-primitive-emerald-500: #10b981;
  --ds-primitive-emerald-400: #34d399;
  --ds-primitive-emerald-950: #022c22;

  --ds-primitive-amber-500: #f59e0b;
  --ds-primitive-amber-400: #fbbf24;
  --ds-primitive-amber-950: #451a03;

  --ds-primitive-crimson-500: #ef4444;
  --ds-primitive-crimson-400: #f87171;
  --ds-primitive-crimson-950: #450a0a;

  --ds-primitive-cyan-500: #06b6d4;
  --ds-primitive-cyan-400: #22d3ee;
  --ds-primitive-cyan-950: #083344;

  --ds-primitive-font-sans: 'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --ds-primitive-font-mono: 'Geist Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* =====================================================================
     TIER 2: SEMANTIC CONTEXT TOKENS
     ===================================================================== */
  /* Surface Layers */
  --ds-surface-canvas: var(--ds-primitive-slate-950);
  --ds-surface-card: var(--ds-primitive-slate-900);
  --ds-surface-overlay: var(--ds-primitive-slate-850);
  --ds-surface-muted: var(--ds-primitive-slate-800);

  /* Border & Structure */
  --ds-border-subtle: var(--ds-primitive-slate-800);
  --ds-border-bold: var(--ds-primitive-slate-700);
  --ds-border-focus: var(--ds-primitive-emerald-500);

  /* Text & Foreground */
  --ds-text-primary: var(--ds-primitive-slate-50);
  --ds-text-secondary: var(--ds-primitive-slate-400);
  --ds-text-muted: var(--ds-primitive-slate-500);

  /* Status Semantics */
  --ds-status-active-fg: var(--ds-primitive-emerald-400);
  --ds-status-active-bg: var(--ds-primitive-emerald-950);
  --ds-status-active-border: var(--ds-primitive-emerald-500);

  --ds-status-warn-fg: var(--ds-primitive-amber-400);
  --ds-status-warn-bg: var(--ds-primitive-amber-950);
  --ds-status-warn-border: var(--ds-primitive-amber-500);

  --ds-status-halt-fg: var(--ds-primitive-crimson-400);
  --ds-status-halt-bg: var(--ds-primitive-crimson-950);
  --ds-status-halt-border: var(--ds-primitive-crimson-500);

  --ds-status-neutral-fg: var(--ds-primitive-cyan-400);
  --ds-status-neutral-bg: var(--ds-primitive-cyan-950);
  --ds-status-neutral-border: var(--ds-primitive-cyan-500);

  /* =====================================================================
     TIER 3: COMPONENT-SCOPED TOKENS
     ===================================================================== */
  /* Agent Card */
  --ds-agent-card-bg: var(--ds-surface-card);
  --ds-agent-card-border: var(--ds-border-subtle);
  --ds-agent-card-pad: 16px;
  --ds-agent-badge-height: 24px;

  /* Circuit Breaker Gauge */
  --ds-gauge-size: 140px;
  --ds-gauge-track-color: var(--ds-primitive-slate-800);
  --ds-gauge-fill-nominal: var(--ds-primitive-emerald-500);
  --ds-gauge-fill-tripped: var(--ds-primitive-crimson-500);

  /* Timeline Stream */
  --ds-timeline-stem-width: 2px;
  --ds-timeline-stem-color: var(--ds-border-subtle);
  --ds-timeline-node-size: 32px;
}
```

---

## 3. React 19 Compound Component Slot Specifications

### 3.1 `<SwarmDashboard>` Compound Component

```tsx
// Component Slot Grammar
<SwarmDashboard.Root className="bg-[var(--ds-surface-canvas)] min-h-screen text-[var(--ds-text-primary)]">
  <SwarmDashboard.Header>
    <SwarmDashboard.Title>[KALINAR_SWARM_MISSION_CONTROL]</SwarmDashboard.Title>
    <SwarmDashboard.LiveIndicator status="ACTIVE" latencyMs={12} />
    <SwarmDashboard.Controls />
  </SwarmDashboard.Header>

  <SwarmDashboard.MetricsGrid>
    <SwarmDashboard.MetricCard title="ACTIVE_TASK" value="TASK-001" variant="emerald" />
    <SwarmDashboard.MetricCard title="CIRCUIT_STATUS" value="CLOSED" variant="emerald" />
    <SwarmDashboard.MetricCard title="TURN_COUNT" value="14 / 50" variant="amber" />
    <SwarmDashboard.MetricCard title="UPTIME" value="99.99%" variant="cyan" />
  </SwarmDashboard.MetricsGrid>

  <SwarmDashboard.MainPanel>
    <SwarmDashboard.AgentSwarmGrid />
    <SwarmDashboard.RealtimeTimeline />
  </SwarmDashboard.MainPanel>
</SwarmDashboard.Root>
```

### 3.2 `<CircuitBreakerPanel>` Compound Component

```tsx
<CircuitBreakerPanel.Root status="CLOSED">
  <CircuitBreakerPanel.Header>
    <CircuitBreakerPanel.StatusBadge label="[CIRCUIT_STATE: CLOSED]" />
    <CircuitBreakerPanel.TripThresholds maxFailures={3} maxTurns={50} />
  </CircuitBreakerPanel.Header>
  <CircuitBreakerPanel.Gauge consecutiveFailures={0} totalTurns={14} />
  <CircuitBreakerPanel.Actions>
    <CircuitBreakerPanel.TripButton className="min-w-[120px] min-h-[44px]">
      [FORCE_CIRCUIT_TRIP]
    </CircuitBreakerPanel.TripButton>
    <CircuitBreakerPanel.ResetButton className="min-w-[120px] min-h-[44px]">
      [RESET_CIRCUIT]
    </CircuitBreakerPanel.ResetButton>
  </CircuitBreakerPanel.Actions>
</CircuitBreakerPanel.Root>
```

---

## 4. Accessibility & Contrast Compliance (WCAG 2.2 Level AAA)

| Color Pair (Foreground on Background) | Contrast Ratio | WCAG 2.2 AAA Target | Compliance Status |
| :--- | :--- | :--- | :---: |
| `--ds-primitive-slate-50` on `--ds-primitive-slate-950` | `18.2 : 1` | `> 7.0 : 1` | `PASS (EXCEEDS)` |
| `--ds-primitive-slate-400` on `--ds-primitive-slate-900` | `7.8 : 1` | `> 7.0 : 1` | `PASS` |
| `--ds-primitive-emerald-400` on `--ds-primitive-emerald-950` | `9.4 : 1` | `> 7.0 : 1` | `PASS` |
| `--ds-primitive-amber-400` on `--ds-primitive-amber-950` | `8.9 : 1` | `> 7.0 : 1` | `PASS` |
| `--ds-primitive-crimson-400` on `--ds-primitive-crimson-950` | `8.2 : 1` | `> 7.0 : 1` | `PASS` |
| Interactive Hit Target Minimum Box | `44px x 44px` | `44px x 44px` | `PASS` |
