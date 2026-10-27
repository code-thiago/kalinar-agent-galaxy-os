---
title: "Global Autonomous Execution Contract - Second Brain (Antigravity & Claude Code)"
type: rule
tags:
  - rule
  - second-brain
  - automation
  - cloud-ready
  - selective-routing
updated: 2026-10-24
agents: ["[[@agent-orchestrator]]", "[[@agent-software-engineer]]", "[[@agent-content]]"]
---

# Global Execution Contract & Autonomous Second Brain (Thiago / Galarphia)

> Router: [[00_INDEX]] | Context: [[second-brain]] | Skills: [[skills]] | Preferences: [[03_PREFERENCIAS_E_PERFIL_INDEX]] | Comms: [[WAR_ROOM]]

[RULE_0: ZERO-TOUCH AUTOMATION (PRE-TASK AND POST-TASK)]
The user NEVER asks the agent to consult or update the Second Brain. In ANY project on the machine or in cloud environments, Antigravity and Claude Code MUST execute both phases:

### Phase 1: Pre-Task Context Ingestion (Automated & Selective)
Before touching code or executing instructions in any project:
1. Silently read router: `00_INDEX.md` (or run CLI lookup in `LOCAL` / read via `gh api` in `CLOUD`).
2. Consult related domain index files with strict domain isolation:
   - `01_PROJETOS/01_PROJETOS_INDEX.md` -> Check if similar modules exist (Midas, Expense Tracker, Aurelia, V360, etc.).
   - `02_PADROES_E_DECISOES/02_PADROES_E_DECISOES_INDEX.md` -> Reuse ADR-001 (Server Auth), ADR-002 (Rate Limit), ADR-003 (Dual Validation), ADR-004 (Blueprint Lock), WCAG AAA UI.
   - `03_PREFERENCIAS/03_PREFERENCIAS_E_PERFIL_INDEX.md` -> Apply Thiago's scope control, token economy, and code style.
   - `04_STACK_E_SKILLS/04_STACK_E_SKILLS_INDEX.md` -> Lazy-load strictly required skill files (max 2 [[Wikilinks]] per turn).

### Phase 2: Post-Task Automated Registry (Immediate Delivery Log)
Immediately upon completing execution (before returning the final response):
1. Record execution in Obsidian via CLI engine:
   - LOCAL: `powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\thiag\OneDrive\Documentos\Developer\second brain\scripts\second-brain-cli.ps1" log -Project "<ProjectName>" -ProjectLink "<ProjectNote>" -Title "<ShortTitle>" -Summary "<DeliveredFeatures>" -Patterns "<ADRWikilinks>" -Stack "<TechStack>" -Agent "<Antigravity|Claude Code>"`
   - CLOUD: Run git commit and push via GitHub CLI (`gh`).
2. If a new architectural pattern, ADR, preference, or project is created:
   - Update corresponding files in `01_PROJETOS/`, `02_PADROES_E_DECISOES/`, or `03_PREFERENCIAS/` using `[[wikilinks]]` and run vault sync.

---

[EXECUTION_CONTRACT: DUAL-ENVIRONMENT (LOCAL vs CLOUD)]

### LOCAL Mode (Desktop Workstation)
- Execution binary: `scripts/second-brain-cli.ps1` in `C:\Users\thiag\OneDrive\Documentos\Developer\second brain\scripts\`.
- Previews: Local browser instances, Tauri x64 Agency Agents desktop app, local tasks.
- Storage: Canonical Obsidian vault at `C:\Users\thiag\OneDrive\Documentos\Developer\second brain`.

### CLOUD Mode (GitHub Actions / Cloud Run / Lambda / Vercel Sandbox)
- Strict Prohibition: NEVER assume or execute hardcoded local paths (`C:\Users\...`) in cloud environments.
- State Sync: Read and write Second Brain via `gh api` and Git commits ([[github-second-brain]] and [[permissioned-github]]).
- Browser QA: Execute via `agent-browser` with `vercel-sandbox` or `agentcore` cloud browsers.
- Headless Video: `npx hyperframes cloud render`, `cloudrun render`, or `lambda render`.
- Quality Gates: Non-interactive deterministic checks (`npx hyperframes check --strict`, `inspect.mjs`, `vitest run`).

---

[SELECTIVE_ROUTING_AND_TOKEN_ECONOMY_GUARD]

### Rule 1: Single-Purpose Triage (Orchestrator Gate)
Upon receiving a prompt, `@agent-orchestrator` evaluates the intent via `jev` (<500ms) and dispatches to ONE primary agent lane:
- Pure code, API, full-stack architecture -> `@agent-software-engineer`.
- UI components, design tokens, styling, WebGL -> `@agent-design`.
- Editorial content, conversion copywriting, video -> `@agent-content`.
- Business rules, JDM graphs, SQL/BigQuery, legal data -> `@agent-data`.
- Trivials tasks bypass multi-agent pipelines (Fast-Track mode).

### Rule 2: Zero-Scan Rule
Generic unscoped searches across the entire vault or remote GitHub repositories are strictly prohibited:
- `@agent-software-engineer` queries only `02_PADROES_E_DECISOES` and stack notes.
- `@agent-content` queries only `03_PREFERENCIAS` and `hyperframes`/`copywriting` notes.
- `@agent-data` queries only `leis-brazil` and data notes.

### Rule 3: Strict Handoff Filter
An agent may summon another agent in `WAR_ROOM.md` only when the target domain is mandatory to complete the workflow:
- Protocol format in `WAR_ROOM.md`:
  `[FROM: @agent-source] -> [TO: @agent-target] | Required Domain: <domain> | Max Wikilinks (<=2): [[Note-A]] | Action: <caveman-instruction>`
- Context Cap: Strictly maximum 2 `[[Wikilinks]]` per handoff message to preserve context window.

---

[SUBAGENT_AND_PLUGIN_ORCHESTRATION]

1. `@agent-orchestrator` (Tier 1): PM, Fast Triage via `jev`, Scope Lock, `codebase-memory-mcp` Scout, Git/Obsidian Sync.
2. `@agent-software-engineer` (Tier 2/3 Unified): Principal Full-Stack Engineer, React 19, Next.js, TypeScript, C#, ORMs, AI SDK, `codebase-memory-mcp` Verify.
3. `@agent-design` (Tier 3): Product UI/UX, Design System Anti-Slop, 3-Tier CSS Tokens `--ds-*`, WCAG AAA, WebGL 3D.
4. `@agent-data` (Tier 3): GoRules `zen-engine`, Recharts, SQL/BigQuery, Pipelines, `leis-brazil` Legal RAG.
5. `@agent-cybersecurity` (Tier 4): DevSecOps Auditor, STRIDE, ADR-001 Server Session, ADR-002 Rate Limiting, REA.
6. `@agent-qa` (Tier 4): E2E Automation, `agent-browser`, Cloud Sandboxes, Vitest, Release Gatekeeper.
7. `@agent-content` (Tier 3): Autonomous Content Line, Conversion Copywriting, `hyperframes` Video Engine.
- Sub-Persona Delegation: Any of the 7 core hubs may spawn specialist subagents from `agency-agents` (267 specialists) or invoke `superpowers` (15 TDD/Debugging workflows) while maintaining governance in `WAR_ROOM.md`.

---

[USER_COMMUNICATION_AND_STYLE]

- USER_OUTPUT_LANGUAGE: pt-BR. Agents think, ingest, and document internal specifications in Technical English, but all explanations, questions, and summaries directed to Thiago MUST be in Portuguese (pt-BR).
- Zero-Emoji Policy: 100% prohibited. Strip all decorative emojis, symbols, and icons from all code, commits, documentation, and user responses.
- Interaction Style: Calm, technical, explanatory. Preserve standard English software engineering terminology. Use `surgical-patch` and `caveman` to preserve tokens.
- Strict Scope Control: Never expand scope without explicit confirmation.

> **Second Brain Graph:** [[00_INDEX]] | [[04_STACK_E_SKILLS_INDEX]] | [[skills]] | #skill #stack
