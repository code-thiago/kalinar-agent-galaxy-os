---
title: "Thiago's Context - Second Brain Canonical Specification"
type: index
category: moc
tags:
  - index
  - second-brain
  - moc
updated: 2026-10-24
agents: ["[[@agent-orchestrator]]", "[[@agent-software-engineer]]"]
---

# Thiago's Context - Second Brain Canonical Specification

> Master Router: [[00_INDEX]] | Projects: [[01_PROJETOS_INDEX]] | ADRs: [[02_PADROES_E_DECISOES_INDEX]] | Preferences: [[03_PREFERENCIAS_E_PERFIL_INDEX]] | Skills: [[04_STACK_E_SKILLS_INDEX]] | Executions: [[05_HISTORICO_EXECUCOES_INDEX]]
> Runtime Contracts: [[AGENTS]] | [[CLAUDE]] | [[GEMINI]]

---

## 1. Developer Profile ([[Perfil-Thiago-Curriculo-e-Carreira]])

- Name: Thiago
- Role: Full-Stack Software Engineer
- Canonical Stack ([[Stack-Principal-Thiago]]): React, Next.js (App Router), TypeScript, Node.js, ASP.NET Core (C#), Prisma / Drizzle ORM, Tailwind CSS, Turso/SQLite, Postgres (Neon).
- Engineering Focus ([[PADRAO-Qualidade-TDD-Vitest-Playwright-Surgical]]): Test-Driven Development (Vitest/Playwright), CI/CD Automation, DevSecOps (STRIDE/GHAS), and Web Accessibility (WCAG AAA).
- Languages: Fluent in Portuguese (native) and English (professional).
- Education: Estacio.
- Software Brand / Commercial Entity: [[Galarphia-Brand-Ecosystem|Galarphia]].

---

## 2. Interaction & Scope Rules ([[Regras-Interacao-Escopo-e-Economia-Tokens]])

- Real Resume Grounding: Base technical assertions and portfolio copy strictly on verified experience; never invent qualifications.
- Terminology Preservation: Maintain industry-standard technical terms in English within software documentation.
- Tone & Demeanor: Technical, concise, analytical; avoid conversational filler or emotional narratives.
- Guided Exercises: Allow the user to attempt each implementation step before providing solutions; never dump complete answers unprompted.
- Token Economy: Enforce surgical code diffs (`surgical-patch`) and concise commits (`caveman-commit`).
- Output Language: Portuguese (pt-BR) for all conversation, explanations, and terminal outputs to Thiago.
- Zero-Emoji Policy: 100% prohibited across all files, headers, frontmatter, and responses.

---

## 3. Active Projects ([[01_PROJETOS_INDEX]])

### Project Midas - Financial Simulator ([[Project-Midas-Simulador-Financeiro]])
- Objective: Demonstrate deep financial logic and precision engineering to fintechs beyond basic API consumption.
- Core Features: Compound interest engine, multi-asset comparator (CDB vs. Selic Treasury vs. Savings), real-time Brazilian and US market quotes (Brapi for B3, Alpha Vantage for FX), authenticated user simulation history.
- Technology Stack: Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Drizzle ORM + Neon Postgres, Better Auth, Upstash Redis (rate limiting), TanStack Query, Recharts, Vitest.
- Route Hierarchy: `/` (Landing placeholder), `/app`, `/app/comparador`, `/app/minhas-simulacoes`, `/login`, `/registro`, `/sobre` (public technical documentation).
- Access Policy: Simulator and comparator are public; authentication gates saving and viewing historical simulations.
- Architectural Decisions:
  - [[ADR-001-Seguranca-Sessao-Server-Side-Auth]]: Extract `userId` strictly from server-verified session (`auth.api.getSession()`), never client payloads.
  - [[ADR-002-Rate-Limiting-Granular-Upstash]]: Granular route-based rate limiters (e.g. `/api/quote`) to prevent blocking auth sessions.
  - [[ADR-003-Validacao-Dupla-Camada-e-Recalculo-Client]]: Persist only input parameters; recalculate time-series client-side; enforce two-tier value caps (input and computed).
- Design System ([[PADRAO-Design-System-Anti-Slop-WCAG]]): Monochromatic Indigo palette (`--ring #6366F1`, charts `#EEF2FF`/`#A5B4FC`/`#6366F1`/`#4338CA`, success `#059669`/`#34D399`, destructive `#DC2626`/`#F87171`).
- Status & Pending Tasks: Calculation core 100% tested with Vitest, market API integration active, UI active, auth and rate limiting active. Pending Node.js runtime transition in middleware and final landing page polish.

### Residential Expense Tracker ([[Controle-de-Gastos-Residenciais]])
- Domain: Personal and family financial metrics, income/expense tracking, balance forecasting.
- Technology Stack: ASP.NET Core (C# In-Memory storage) + React / Next.js frontend.
- Visual Theme: JetBrains Mono typography, dark mode foundation, emerald green accents.

### Aurelia Estates ([[Aurelia-Estates]])
- Domain: Luxury real estate platform with immersive interactive media.
- Architecture: Monorepo. Client: Vite + React + TypeScript + Tailwind CSS. Backend: Node.js + Express.
- Features: Scroll-driven video scrubbing, parallax viewport choreography, luxury design system.

### Portfolio MicroSaaS & Car Showcase ([[Portfolio-MicroSaaS-e-CarShowcase]])
- Ebook Subscription MicroSaaS: Next.js, NextAuth, Turso/SQLite, Prisma ORM.
- Car Showcase: Next.js CSR-to-SSR migration showcase with high Web Vitals performance.

### V360 Cashflow Forecasting ([[V360-Cashflow-Forecasting]])
- Domain: B2B fintech cash flow forecasting and liquidity projection.
- Architecture: Python / FastAPI microservice + TimescaleDB + forecasting models (ARIMA, Prophet, LightGBM, LSTM).

---

## 4. Galarphia Brand Ecosystem ([[Galarphia-Brand-Ecosystem]])

- Brand Identity: Galarphia - Software Engineering & SaaS Architecture.
- Symbol: Full-body Harpy Eagle (Harpia harpyja) designed with minimalist geometric polygons.
- Palette: Canvas background `#f8f9fa`, Eagle `#03045e`.
- Typography: Clean sans-serif, confident, bold hierarchy.
- Positioning: High-velocity Next.js/TypeScript SaaS MVPs, legacy migrations, and zero-slop UI design systems.

---

## 5. Local Datasets & Knowledge Bases

- Brazilian Legal Markdown Corpus ([[leis-brazil]]):
  - Storage Location: `C:\Users\thiag\Downloads\leis-main\leis-main`.
  - Contents: 1,113,033 official legal documents in Markdown with standardized YAML frontmatter (Federal Constitution, federal laws, 27 state codes, municipal ordinances, regulatory agencies RFB/BCB/CVM/ANVISA/CONTRAN, and binding court precedents STF/STJ/TST/TRF4).
  - Search Strategy: Fast ripgrep regex queries targeting article chunks (`Art. X`) and specific agency subfolders.

> **Second Brain Graph:** [[00_INDEX]] | [[04_STACK_E_SKILLS_INDEX]] | [[skills]] | #skill #stack
