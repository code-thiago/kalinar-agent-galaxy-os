/**
 * KALINAR SECOND BRAIN & ZEN JDM CORTEX VIEW (v0.5.0-rc1)
 * Obsidian Vault Integration & Decision Matrix Telemetry
 * Strictly Zero Emojis
 */

import { memo } from 'react';

export const CortexSecondBrainView = memo(function CortexSecondBrainView() {
  const vaultDomains = [
    { name: '01_PROJETOS', docs: 14, tag: '#projeto', status: 'SYNCHRONIZED', desc: 'Midas, Controle Gastos, Aurelia, V360' },
    { name: '02_PADROES_E_DECISOES', docs: 18, tag: '#padrao #decisao', status: 'ENFORCED', desc: 'ADR-001 (Auth), ADR-002 (Rate Limit), ADR-003 (Validation)' },
    { name: '03_PREFERENCIAS', docs: 8, tag: '#preferencia', status: 'ACTIVE', desc: 'Surgical patch, caveman commit, zero emojis, PT-BR output' },
    { name: '04_STACK_E_SKILLS', docs: 267, tag: '#stack #skills', status: 'INDEXED', desc: 'React 19, GoRules ZEN Engine, Three.js GPGPU, Vite, Electron' },
    { name: '05_EXECUCOES', docs: 5, tag: '#execucao', status: 'LOGGED_LIVE', desc: 'Ledger de execucoes registradas via second-brain-cli.ps1' },
  ];

  const zenRules = [
    { key: 'daemon-event-router.jdm.json', latency: '0.18ms', verdict: 'DROP_LOOP_SUPPRESSED', desc: 'Debounce de 300ms e supressao de loops recursivos' },
    { key: 'os-execution-firewall.jdm.json', latency: '0.24ms', verdict: 'ALLOWED_SANDBOXED', desc: 'Bloqueio de comandos destrutivos e verificacao zero-trust' },
    { key: 'execution-gate.jdm.json', latency: '0.28ms', verdict: 'AUTO_PILOT_LOCKED', desc: 'Trava single-writer e checkpoints de aprovacao humana' },
    { key: 'voice-command-guard.jdm.json', latency: '0.32ms', verdict: 'SOVEREIGN_VETTED', desc: 'Validacao de diretrizes de voz soberanas em pt-BR' },
  ];

  return (
    <div
      data-slot="cortex-second-brain-view"
      className="w-full h-full p-3 bg-[#07080a] select-none font-mono text-[12px] grid grid-cols-1 md:grid-cols-2 gap-3 overflow-auto tabular-nums"
    >
      {/* 1. OBSIDIAN SECOND BRAIN CANONICAL VAULT */}
      <div className="p-3 bg-[#0a0c10] border border-[var(--ds-border-subtle)] flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] uppercase border-b border-[var(--ds-border-subtle)] pb-1.5">
          <span className="font-semibold text-[var(--ds-accent-memory)]">
            [OBSIDIAN CANONICAL VAULT MATRIX]
          </span>
          <span className="text-[var(--ds-status-active-fg)] text-[10px]">100% ZERO-TOUCH SYNC</span>
        </div>

        <div className="flex flex-col gap-2 overflow-auto flex-1">
          {vaultDomains.map((dom) => (
            <div
              key={dom.name}
              className="p-2 bg-[#12151d] border border-[var(--ds-border-subtle)] flex flex-col gap-1"
            >
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[var(--ds-text-primary)] font-semibold">[[{dom.name}]]</span>
                <span className="px-1.5 py-0.2 border border-[var(--ds-status-active-border)] text-[var(--ds-status-active-fg)] text-[9.5px]">
                  {dom.status}
                </span>
              </div>
              <div className="text-[10px] text-[var(--ds-text-secondary)]">{dom.desc}</div>
              <div className="flex justify-between items-center text-[9.5px] text-[var(--ds-accent-memory)] pt-0.5">
                <span>{dom.docs} NOTAS INDEXADAS</span>
                <span>{dom.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. GORULES ZEN ENGINE CORTEX DECISION MATRIX */}
      <div className="p-3 bg-[#0a0c10] border border-[var(--ds-border-subtle)] flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] uppercase border-b border-[var(--ds-border-subtle)] pb-1.5">
          <span className="font-semibold text-[var(--ds-accent-singularity)]">
            [GORULES ZEN JDM DECISION MATRIX]
          </span>
          <span className="text-[var(--ds-status-active-fg)] text-[10px]">LATENCY &lt; 1MS</span>
        </div>

        <div className="flex flex-col gap-2 overflow-auto flex-1">
          {zenRules.map((rule) => (
            <div
              key={rule.key}
              className="p-2 bg-[#12151d] border border-[var(--ds-border-subtle)] flex flex-col gap-1"
            >
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[var(--ds-accent-singularity)] font-semibold">{rule.key}</span>
                <span className="text-[var(--ds-status-active-fg)] text-[10px]">
                  {rule.latency}
                </span>
              </div>
              <div className="text-[10px] text-[var(--ds-text-secondary)]">{rule.desc}</div>
              <div className="flex justify-between items-center text-[9.5px] text-[var(--ds-text-secondary)] pt-0.5">
                <span>DECISION: {rule.verdict}</span>
                <span className="text-[var(--ds-status-active-fg)]">DETERMINISTIC EVAL</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
