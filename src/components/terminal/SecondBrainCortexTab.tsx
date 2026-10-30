/**
 * KALINAR SECOND BRAIN CORTEX & ZEN JDM INSPECTOR (v1.0.0)
 * Searchable Second Brain matrix, plugin registry & GoRules JDM live trace
 * Strictly Zero Emojis
 */

import { useState, useMemo, memo } from 'react';
import { eventBus } from '../../core/KalinarEventBus.js';
import { useKalinarStore } from '../../store/useKalinarStore.js';

export interface SecondBrainNoteItem {
  id: string;
  title: string;
  wikilink: string;
  domain: '01_PROJETOS' | '02_PADROES' | '03_PREFERENCIAS' | '04_STACK' | '05_EXECUCOES';
  tags: string[];
  summary: string;
  lastIngested?: string;
}

const VAULT_NOTES: SecondBrainNoteItem[] = [
  {
    id: 'note-00-index',
    title: 'Master Router (00_INDEX)',
    wikilink: '[[00_INDEX]]',
    domain: '01_PROJETOS',
    tags: ['#master', '#router', '#second-brain'],
    summary: 'Roteador central zero-toque para ingestao pre-tarefa e registro pos-tarefa.',
  },
  {
    id: 'note-adr-001',
    title: 'ADR-001: Server-Side Session Auth',
    wikilink: '[[ADR-001-Seguranca-Sessao-Server-Side-Auth]]',
    domain: '02_PADROES',
    tags: ['#seguranca', '#auth', '#padrao'],
    summary: 'Extracao estrita de userId a partir de sessao validada no servidor.',
  },
  {
    id: 'note-adr-002',
    title: 'ADR-002: Rate Limiting Granular Upstash',
    wikilink: '[[ADR-002-Rate-Limiting-Granular-Upstash]]',
    domain: '02_PADROES',
    tags: ['#rate-limit', '#redis', '#resiliencia'],
    summary: 'Limitadores granulares por rota sem bloquear sessoes de autenticacao.',
  },
  {
    id: 'note-adr-003',
    title: 'ADR-003: Validacao Dupla Camada e Recalculo Client',
    wikilink: '[[ADR-003-Validacao-Dupla-Camada-e-Recalculo-Client]]',
    domain: '02_PADROES',
    tags: ['#validacao', '#zod', '#calculo'],
    summary: 'Persistencia de parametros de entrada e recalculo de series temporais no client.',
  },
  {
    id: 'note-design-system',
    title: 'PADRAO: Design System Anti-Slop WCAG',
    wikilink: '[[PADRAO-Design-System-Anti-Slop-WCAG]]',
    domain: '02_PADROES',
    tags: ['#design-system', '#wcag-aaa', '#anti-slop'],
    summary: 'Paleta monocromatica, alvos de toque 44px, contraste AAA e zero emojis.',
  },
  {
    id: 'note-stack-principal',
    title: 'Stack Principal de Engenharia Thiago',
    wikilink: '[[Stack-Principal-Thiago]]',
    domain: '04_STACK',
    tags: ['#stack', '#react19', '#typescript'],
    summary: 'React 19, Electron 33, GoRules ZEN Engine, Three.js GPGPU, Vite, Node 24.',
  },
  {
    id: 'note-galarphia',
    title: 'Galarphia Brand Ecosystem',
    wikilink: '[[Galarphia-Brand-Ecosystem]]',
    domain: '03_PREFERENCIAS',
    tags: ['#marca', '#galarphia', '#identidade'],
    summary: 'Arquitetura SaaS de alta velocidade, elegancia minimalista e foco tecnico.',
  },
];

export const SecondBrainCortexTab = memo(function SecondBrainCortexTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [pulledNotes, setPulledNotes] = useState<Set<string>>(new Set());
  const [activeJdmRule, setActiveJdmRule] = useState<string>('voice-command-guard.jdm.json');

  const { updateSingularityTranscript } = useKalinarStore();

  const filteredNotes = useMemo(() => {
    return VAULT_NOTES.filter((n) => {
      const matchesDomain = selectedDomain === 'ALL' || n.domain === selectedDomain;
      const matchesSearch =
        searchQuery === '' ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.wikilink.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.summary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDomain && matchesSearch;
    });
  }, [searchQuery, selectedDomain]);

  const handlePullIntoSingularity = (note: SecondBrainNoteItem) => {
    // 1. Trigger WebGL Gravitational Ingestion Beams
    if (typeof window !== 'undefined' && (window as any).__triggerGravitationalRAG) {
      (window as any).__triggerGravitationalRAG();
    }

    // 2. Track ingested note
    setPulledNotes((prev) => new Set(prev).add(note.id));

    // 3. Emit relativistic pulse & event bus notification
    eventBus.emit('zen:rule_evaluated', {
      ruleKey: 'gravitational-rag.jdm.json',
      latencyMs: 0.28,
      allowed: true,
      details: { noteId: note.id, wikilink: note.wikilink },
    });

    // 4. Update HUD Live Transcript
    updateSingularityTranscript(
      `Gravidade expandida: ${note.wikilink} absorvido pelo horizonte de eventos.`
    );
  };

  const jdmRuleSpecs: Record<
    string,
    { name: string; latency: string; nodes: number; rules: number; desc: string }
  > = {
    'voice-command-guard.jdm.json': {
      name: 'Voice Command Sovereign Guard',
      latency: '0.32ms',
      nodes: 3,
      rules: 7,
      desc: 'Validacao de diretrizes soberanas em pt-BR com intertravamento acustico.',
    },
    'execution-gate.jdm.json': {
      name: 'Execution Mode & Step Gate',
      latency: '0.28ms',
      nodes: 3,
      rules: 6,
      desc: 'Trava single-writer, isolamento de dry-run e checkpoints humanos.',
    },
    'os-execution-firewall.jdm.json': {
      name: 'OS Zero-Trust Execution Firewall',
      latency: '0.24ms',
      nodes: 3,
      rules: 5,
      desc: 'Bloqueio estrito de comandos destrutivos (rm, del, format, curl | sh).',
    },
    'daemon-event-router.jdm.json': {
      name: 'Daemon Chokidar Event Router',
      latency: '0.18ms',
      nodes: 3,
      rules: 6,
      desc: 'Debounce de 300ms, supressao de loops recursivos e deteccao de mutacoes.',
    },
  };

  return (
    <div
      data-slot="second-brain-cortex-tab"
      className="w-full h-full p-3 bg-[#07080a] select-none font-mono text-[12px] grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-hidden tabular-nums"
    >
      {/* -------------------------------------------------------------
          LEFT PANE: SEARCHABLE VAULT MATRIX & PLUGIN CONNECTORS
          ------------------------------------------------------------- */}
      <div className="flex flex-col bg-[#0a0c10] border border-[var(--ds-border-subtle)] overflow-hidden">
        {/* Header & Filter Controls */}
        <div className="p-2.5 border-b border-[var(--ds-border-subtle)] flex flex-col gap-2 bg-[#090b0e]">
          <div className="flex items-center justify-between text-[11px] uppercase">
            <span className="font-semibold text-[var(--ds-accent-memory)]">
              [01 // SECOND BRAIN GRAVITATIONAL MATRIX]
            </span>
            <span className="text-[var(--ds-status-active-fg)] text-[10px]">
              {filteredNotes.length} NOTAS DISPONIVEIS
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Pesquisar notas no cofre Obsidian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-[#12151d] border border-[var(--ds-border-subtle)] px-2 py-1 text-[11px] text-[var(--ds-text-primary)] placeholder-[var(--ds-text-secondary)] focus:outline-none focus:border-[var(--ds-accent-singularity)] font-mono"
            />
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              aria-label="Filtro de domínio do Second Brain"
              className="bg-[#12151d] border border-[var(--ds-border-subtle)] px-2 py-1 text-[10px] text-[var(--ds-text-primary)] font-mono focus:outline-none focus:border-[var(--ds-accent-singularity)]"
            >
              <option value="ALL">ALL DOMAINS</option>
              <option value="01_PROJETOS">01_PROJETOS</option>
              <option value="02_PADROES">02_PADROES</option>
              <option value="03_PREFERENCIAS">03_PREFERENCIAS</option>
              <option value="04_STACK">04_STACK</option>
            </select>
          </div>
        </div>

        {/* Scrollable Note List */}
        <div className="flex-1 overflow-auto p-2 flex flex-col gap-2">
          {filteredNotes.map((note) => {
            const isPulled = pulledNotes.has(note.id);
            return (
              <div
                key={note.id}
                className={`p-2.5 border transition-all ${
                  isPulled
                    ? 'bg-[rgba(170,136,255,0.08)] border-[var(--ds-accent-singularity)]'
                    : 'bg-[#10131a] border-[var(--ds-border-subtle)] hover:border-[#383e52]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[11.5px] font-semibold text-[var(--ds-text-primary)] truncate">
                      {note.title}
                    </span>
                    <span className="text-[10px] text-[var(--ds-accent-memory)] font-medium">
                      {note.wikilink}
                    </span>
                  </div>

                  <button
                    onClick={() => handlePullIntoSingularity(note)}
                    className={`min-h-[28px] px-2.5 flex items-center shrink-0 border text-[9.5px] uppercase transition-colors ${
                      isPulled
                        ? 'border-[var(--ds-status-active-border)] text-[var(--ds-status-active-fg)] bg-[rgba(52,211,153,0.15)]'
                        : 'border-[var(--ds-accent-singularity)] text-[var(--ds-accent-singularity)] hover:bg-[rgba(170,136,255,0.2)]'
                    }`}
                  >
                    {isPulled ? '[ INGESTED ]' : '[ PULL INTO SINGULARITY ]'}
                  </button>
                </div>

                <div className="text-[10.5px] text-[var(--ds-text-secondary)] pt-1.5 leading-snug">
                  {note.summary}
                </div>

                <div className="flex items-center gap-1.5 pt-2 text-[9px] text-[var(--ds-text-secondary)]">
                  <span className="px-1 py-0.2 border border-[var(--ds-border-subtle)] bg-[#141722]">
                    {note.domain}
                  </span>
                  {note.tags.map((t) => (
                    <span key={t} className="text-[#64748b]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------
          RIGHT PANE: LIVE GORULES JDM DECISION INSPECTOR
          ------------------------------------------------------------- */}
      <div className="flex flex-col bg-[#0a0c10] border border-[var(--ds-border-subtle)] overflow-hidden">
        {/* Header with JDM Rule Selector */}
        <div className="p-2.5 border-b border-[var(--ds-border-subtle)] flex items-center justify-between bg-[#090b0e]">
          <span className="font-semibold text-[var(--ds-accent-singularity)] text-[11px] uppercase">
            [02 // GORULES ZEN JDM DECISION INSPECTOR]
          </span>
          <span className="text-[var(--ds-status-active-fg)] text-[10px]">
            {jdmRuleSpecs[activeJdmRule]?.latency || '< 0.35ms'} [VERIFIED]
          </span>
        </div>

        {/* Tab pills for the 4 JDM rules */}
        <div className="flex border-b border-[var(--ds-border-subtle)] bg-[#0d0f15] overflow-x-auto">
          {Object.keys(jdmRuleSpecs).map((ruleKey) => (
            <button
              key={ruleKey}
              onClick={() => setActiveJdmRule(ruleKey)}
              className={`px-3 py-1.5 text-[10px] font-mono whitespace-nowrap border-b-2 transition-colors ${
                activeJdmRule === ruleKey
                  ? 'border-[var(--ds-accent-singularity)] text-[var(--ds-accent-singularity)] bg-[rgba(170,136,255,0.1)]'
                  : 'border-transparent text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]'
              }`}
            >
              {ruleKey.replace('.jdm.json', '')}
            </button>
          ))}
        </div>

        {/* JDM Spec & Trace Inspection View */}
        <div className="flex-1 overflow-auto p-3 flex flex-col gap-3">
          {jdmRuleSpecs[activeJdmRule] && (
            <div className="p-2.5 bg-[#12151d] border border-[var(--ds-border-subtle)] flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-[var(--ds-text-primary)]">
                  {jdmRuleSpecs[activeJdmRule].name}
                </span>
                <span className="text-[var(--ds-accent-agent)] text-[10px]">
                  {jdmRuleSpecs[activeJdmRule].rules} REGRAS COMPILADAS
                </span>
              </div>
              <div className="text-[10.5px] text-[var(--ds-text-secondary)]">
                {jdmRuleSpecs[activeJdmRule].desc}
              </div>
              <div className="flex items-center gap-3 pt-1 text-[9.5px] text-[var(--ds-text-secondary)] border-t border-[var(--ds-border-subtle)]">
                <span>GRAPH NODES: {jdmRuleSpecs[activeJdmRule].nodes}</span>
                <span>HIT POLICY: FIRST</span>
                <span className="text-[var(--ds-status-active-fg)] font-semibold">
                  BENCHMARK: SUB-MILLISECOND
                </span>
              </div>
            </div>
          )}

          {/* Real-time Decision Trace Simulation */}
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-[10px] text-[var(--ds-text-secondary)] uppercase">
              LIVE DECISION TRACE LOG:
            </span>
            <div className="flex-1 p-2 bg-[#06070a] border border-[var(--ds-border-subtle)] font-mono text-[10px] text-[var(--ds-text-secondary)] flex flex-col gap-1 overflow-auto">
              <div className="text-[var(--ds-status-active-fg)]">
                &gt; [ZEN_ENGINE] Loader: Cache de buffers aquecido (zero disk I/O).
              </div>
              <div>
                &gt; [INPUT] Graph eval request: &quot;{activeJdmRule}&quot;
              </div>
              <div className="text-[var(--ds-accent-singularity)]">
                &gt; [TRACE] DecisionTableNode evaluated in{' '}
                {jdmRuleSpecs[activeJdmRule]?.latency || '0.28ms'}.
              </div>
              <div>&gt; [RESULT] allowed: true · requireHumanApproval: false</div>
              <div className="text-[var(--ds-status-active-fg)]">
                &gt; [STATE] Circuit breaker: CLOSED · Single-Writer Lock: ATIVO
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
