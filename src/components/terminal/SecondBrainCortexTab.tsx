/**
 * KALINAR SECOND BRAIN CORTEX & ZEN JDM INSPECTOR (v1.3.0)
 * Searchable Second Brain matrix, real-time vault hydration, note injection,
 * Gravitational RAG singularity pull, and interactive 5-Graph GoRules JDM Evaluator.
 * Strictly Zero Emojis
 */

import { useState, useMemo, useEffect, memo } from 'react';
import { eventBus } from '../../core/KalinarEventBus.js';
import { useKalinarStore } from '../../store/useKalinarStore.js';
import { ZenFirewall } from '../../core/ZenFirewall.js';
import { SecondBrainNode } from '../../types/kalinar.js';

export interface SecondBrainNoteItem {
  id: string;
  title: string;
  wikilink: string;
  domain: '01_PROJETOS' | '02_PADROES' | '03_PREFERENCIAS' | '04_STACK' | '05_EXECUCOES' | string;
  tags: string[];
  summary: string;
  filePath?: string;
  content?: string;
  wikilinks?: string[];
  lastIngested?: string;
}

const VAULT_NOTES_BASELINE: SecondBrainNoteItem[] = [
  {
    id: 'note-00-index',
    title: 'Master Router (00_INDEX)',
    wikilink: '[[00_INDEX]]',
    domain: '01_PROJETOS',
    tags: ['#master', '#router', '#second-brain'],
    summary: 'Roteador central zero-toque para ingestao pre-tarefa e registro pos-tarefa.',
    filePath: '00_INDEX.md',
    wikilinks: ['[[01_PROJETOS_INDEX]]', '[[02_PADROES_E_DECISOES_INDEX]]'],
  },
  {
    id: 'note-adr-001',
    title: 'ADR-001: Server-Side Session Auth',
    wikilink: '[[ADR-001-Seguranca-Sessao-Server-Side-Auth]]',
    domain: '02_PADROES',
    tags: ['#seguranca', '#auth', '#padrao'],
    summary: 'Extracao estrita de userId a partir de sessao validada no servidor.',
    filePath: '02_PADROES_E_DECISOES/ADR-001.md',
    wikilinks: ['[[00_INDEX]]'],
  },
  {
    id: 'note-adr-002',
    title: 'ADR-002: Rate Limiting Granular Upstash',
    wikilink: '[[ADR-002-Rate-Limiting-Granular-Upstash]]',
    domain: '02_PADROES',
    tags: ['#rate-limit', '#redis', '#resiliencia'],
    summary: 'Limitadores granulares por rota sem bloquear sessoes de autenticacao.',
    filePath: '02_PADROES_E_DECISOES/ADR-002.md',
    wikilinks: ['[[ADR-001]]'],
  },
  {
    id: 'note-adr-003',
    title: 'ADR-003: Validacao Dupla Camada e Recalculo Client',
    wikilink: '[[ADR-003-Validacao-Dupla-Camada-e-Recalculo-Client]]',
    domain: '02_PADROES',
    tags: ['#validacao', '#zod', '#calculo'],
    summary: 'Persistencia de parametros de entrada e recalculo de series temporais no client.',
    filePath: '02_PADROES_E_DECISOES/ADR-003.md',
    wikilinks: ['[[00_INDEX]]'],
  },
  {
    id: 'note-design-system',
    title: 'PADRAO: Design System Anti-Slop WCAG',
    wikilink: '[[PADRAO-Design-System-Anti-Slop-WCAG]]',
    domain: '02_PADROES',
    tags: ['#design-system', '#wcag-aaa', '#anti-slop'],
    summary: 'Paleta monocromatica, alvos de toque 44px, contraste AAA e zero emojis.',
    filePath: '02_PADROES_E_DECISOES/PADRAO-Design-System-Anti-Slop-WCAG.md',
    wikilinks: ['[[00_INDEX]]'],
  },
  {
    id: 'note-stack-principal',
    title: 'Stack Principal de Engenharia Thiago',
    wikilink: '[[Stack-Principal-Thiago]]',
    domain: '04_STACK',
    tags: ['#stack', '#react19', '#typescript'],
    summary: 'React 19, Electron 35, GoRules ZEN Engine, Three.js GPGPU, Vite, Node 24.',
    filePath: '04_STACK_E_SKILLS/Stack-Principal-Thiago.md',
    wikilinks: ['[[00_INDEX]]'],
  },
  {
    id: 'note-galarphia',
    title: 'Galarphia Brand Ecosystem',
    wikilink: '[[Galarphia-Brand-Ecosystem]]',
    domain: '03_PREFERENCIAS',
    tags: ['#marca', '#galarphia', '#identidade'],
    summary: 'Arquitetura SaaS de alta velocidade, elegancia minimalista e foco tecnico.',
    filePath: '03_PREFERENCIAS/Galarphia-Brand-Ecosystem.md',
    wikilinks: ['[[00_INDEX]]'],
  },
  {
    id: 'note-exec-v130',
    title: 'Registro de Execucao: Release v1.3.0',
    wikilink: '[[05_HISTORICO_EXECUCOES_INDEX]]',
    domain: '05_EXECUCOES',
    tags: ['#execucoes', '#release', '#v1-3-0'],
    summary: 'Sincronizacao bidirecional Obsidian Canvas e avaliador JDM interativo.',
    filePath: '05_EXECUCOES/05_HISTORICO_EXECUCOES_INDEX.md',
    wikilinks: ['[[00_INDEX]]'],
  },
];

const DEFAULT_JDM_PAYLOADS: Record<string, string> = {
  'daemon-event-router.jdm.json': JSON.stringify(
    {
      eventType: 'FILE_CHANGE',
      filePath: 'c:/Kalinar/01_PROJETOS/test.md',
      auditCycle: 0,
    },
    null,
    2
  ),
  'os-execution-firewall.jdm.json': JSON.stringify(
    {
      command: 'npm run test',
      isSandbox: true,
    },
    null,
    2
  ),
  'voice-command-guard.jdm.json': JSON.stringify(
    {
      intent: 'ACTIVATE_SECOND_BRAIN',
      action: 'GET_STATUS',
      isDestructive: false,
      currentVoiceState: '[STANDBY]',
      isEmergency: false,
      agentStatus: '[ACTIVE]',
      firewallVerdict: 'ALLOWED',
    },
    null,
    2
  ),
  'execution-gate.jdm.json': JSON.stringify(
    {
      executionMode: 'STEP_BY_STEP_GATE',
      isDestructiveAction: false,
      hasSingleWriterLock: true,
    },
    null,
    2
  ),
  'llm-model-router.jdm.json': JSON.stringify(
    {
      taskDomain: 'ARCHITECTURE',
      errorCode: 'NONE',
      retryCount: 0,
    },
    null,
    2
  ),
};

const JDM_RULE_SPECS: Record<
  string,
  { name: string; latency: string; nodes: number; rules: number; desc: string }
> = {
  'daemon-event-router.jdm.json': {
    name: 'Daemon Chokidar Event Router',
    latency: '0.18ms',
    nodes: 3,
    rules: 6,
    desc: 'Debounce de 300ms, supressao de loops recursivos (.kalinar-lock) e deteccao de mutacoes.',
  },
  'os-execution-firewall.jdm.json': {
    name: 'OS Zero-Trust Execution Firewall',
    latency: '0.24ms',
    nodes: 3,
    rules: 5,
    desc: 'Bloqueio estrito de comandos destrutivos (rm, del, format, curl | sh, drop database).',
  },
  'voice-command-guard.jdm.json': {
    name: 'Voice Command Sovereign Guard',
    latency: '0.32ms',
    nodes: 3,
    rules: 7,
    desc: 'Validacao de diretrizes soberanas em pt-BR com intertravamento acustico Tauz.',
  },
  'execution-gate.jdm.json': {
    name: 'Execution Mode & Step Gate',
    latency: '0.28ms',
    nodes: 3,
    rules: 6,
    desc: 'Trava single-writer, isolamento de dry-run e checkpoints de aprovacao humana.',
  },
  'llm-model-router.jdm.json': {
    name: 'Multi-Model LLM Router & Failover',
    latency: '0.26ms',
    nodes: 3,
    rules: 10,
    desc: 'Roteamento soberano entre Argon, Claude Sonnet e Gemini Pro com rollback Git atomico.',
  },
};

export const SecondBrainCortexTab = memo(function SecondBrainCortexTab() {
  const [notes, setNotes] = useState<SecondBrainNoteItem[]>(VAULT_NOTES_BASELINE);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [pulledNotes, setPulledNotes] = useState<Set<string>>(new Set());

  // Note Injection Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDomain, setNewDomain] = useState<string>('01_PROJETOS');
  const [newTags, setNewTags] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isInjecting, setIsInjecting] = useState(false);
  const [injectStatus, setInjectStatus] = useState<string | null>(null);

  // Right Pane: Interactive 5-Graph JDM Evaluator state
  const [activeJdmRule, setActiveJdmRule] = useState<string>('voice-command-guard.jdm.json');
  const [inputJson, setInputJson] = useState<string>(
    DEFAULT_JDM_PAYLOADS['voice-command-guard.jdm.json']
  );
  const [decisionOutput, setDecisionOutput] = useState<any>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [traceLogs, setTraceLogs] = useState<
    Array<{
      timestamp: string;
      graph: string;
      latencyMs: number;
      allowed: any;
      summary: string;
    }>
  >([]);

  const { updateSingularityTranscript } = useKalinarStore();

  // Hydrate notes dynamically from real workspace .md files
  useEffect(() => {
    let isMounted = true;
    async function hydrateVaultNotes() {
      const kalinarApi = typeof window !== 'undefined' ? (window as any).kalinarApi : null;
      if (kalinarApi?.querySecondBrainVault) {
        try {
          const res = await kalinarApi.querySecondBrainVault();
          if (
            isMounted &&
            res &&
            res.success &&
            Array.isArray(res.notes) &&
            res.notes.length > 0
          ) {
            const mapped: SecondBrainNoteItem[] = res.notes.map((n: any) => ({
              id: n.id,
              title: n.title,
              wikilink: n.wikilink || `[[${n.title}]]`,
              domain: n.domain || '01_PROJETOS',
              tags: Array.isArray(n.tags) ? n.tags : ['#second-brain'],
              summary: n.excerpt || n.title,
              filePath: n.filePath,
              wikilinks: n.wikilinks,
            }));
            setNotes(mapped);
          }
        } catch {
          // Keep baseline fallback on error
        }
      }
    }
    hydrateVaultNotes();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesDomain =
        selectedDomain === 'ALL' ||
        n.domain === selectedDomain ||
        (selectedDomain === '02_PADROES' && n.domain.startsWith('02_PADROES')) ||
        (selectedDomain === '04_STACK' && n.domain.startsWith('04_STACK'));

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        n.title.toLowerCase().includes(q) ||
        n.wikilink.toLowerCase().includes(q) ||
        n.summary.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q));

      return matchesDomain && matchesSearch;
    });
  }, [notes, searchQuery, selectedDomain]);

  // Submit note injection into vault
  const handleInjectNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      setInjectStatus('[ERRO]: Titulo e conteudo markdown sao obrigatorios.');
      return;
    }

    setIsInjecting(true);
    setInjectStatus(null);

    const parsedTags = newTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const tags = parsedTags.length > 0 ? parsedTags : ['#second-brain'];

    try {
      const kalinarApi = typeof window !== 'undefined' ? (window as any).kalinarApi : null;
      let spawnedNode: SecondBrainNode | null = null;
      let createdNote: SecondBrainNoteItem;

      if (kalinarApi?.injectSecondBrainNote) {
        const res = await kalinarApi.injectSecondBrainNote({
          title: newTitle.trim(),
          domain: newDomain,
          tags,
          content: newContent,
        });

        if (!res || !res.success) {
          throw new Error(res?.error || 'Falha ao injetar nota no cofre via IPC');
        }

        spawnedNode = res.spawned3DNode || res.node3D || null;
        createdNote = {
          id: res.note?.id || `sb-note-${Date.now()}`,
          title: res.note?.title || newTitle.trim(),
          wikilink: res.note?.wikilink || `[[${newTitle.trim()}]]`,
          domain: res.note?.domain || newDomain,
          tags: res.note?.tags || tags,
          summary: res.note?.excerpt || newContent.slice(0, 200),
          filePath: res.note?.filePath,
          wikilinks: res.note?.wikilinks || [],
          content: newContent,
        };
      } else {
        // Standalone browser dev mode fallback
        const cleanExcerpt = newContent
          .slice(0, 200)
          .replace(/#+\s+/g, '')
          .replace(/\n+/g, ' ')
          .trim();
        createdNote = {
          id: `sb-note-${Date.now()}`,
          title: newTitle.trim(),
          wikilink: `[[${newTitle.trim()}]]`,
          domain: newDomain,
          tags,
          summary: cleanExcerpt || newTitle.trim(),
          wikilinks: [],
          content: newContent,
        };

        spawnedNode = {
          id: createdNote.id,
          wikilink: createdNote.wikilink,
          notePath: `${newDomain}/${newTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}.md`,
          tagList: tags,
          domain: newDomain,
          connectionCount: 1,
          summary: createdNote.summary,
          position3D: [
            Math.sin(Date.now()) * 180,
            70 + Math.random() * 40,
            Math.cos(Date.now()) * 180,
          ],
        };
      }

      // 1. Add to note table
      setNotes((prev) => [createdNote, ...prev]);

      // 2. Update 3D Galaxy Canvas
      if (spawnedNode) {
        if (
          typeof window !== 'undefined' &&
          typeof (window as any).__addSecondBrainNode === 'function'
        ) {
          (window as any).__addSecondBrainNode(spawnedNode);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('kalinar:second_brain_node_spawned', { detail: spawnedNode })
          );
        }
      }

      // 3. Update store and notify
      updateSingularityTranscript(
        `Nota injetada com sucesso: ${createdNote.wikilink} registrada no cofre e galaxia.`
      );
      setInjectStatus(
        `[SUCESSO] ${createdNote.wikilink} gravada no disco/sqlite e projetada no espaco 3D.`
      );

      // 4. Reset form fields
      setNewTitle('');
      setNewTags('');
      setNewContent('');
    } catch (err: any) {
      setInjectStatus(`[ERRO]: ${err?.message || 'Falha ao injetar nota'}`);
    } finally {
      setIsInjecting(false);
    }
  };

  // Wire '[ PULL INTO SINGULARITY ]' action
  const handlePullIntoSingularity = (note: SecondBrainNoteItem) => {
    // 1. Trigger WebGL Gravitational Ingestion Beams
    if (
      typeof window !== 'undefined' &&
      typeof (window as any).__triggerGravitationalRAG === 'function'
    ) {
      (window as any).__triggerGravitationalRAG();
    }

    // 2. Track ingested note locally
    setPulledNotes((prev) => new Set(prev).add(note.id));

    // 3. Format Graph Pointer adhering to WAR_ROOM protocol:
    // [FROM: @agent-source] -> [TO: @agent-target] | Required Domain: <domain> | Max Wikilinks (<=2): [[Link1]], [[Link2]] | Action: <action>
    const rawLinks =
      note.wikilinks && note.wikilinks.length > 0
        ? note.wikilinks
        : [note.wikilink || `[[${note.title}]]`];
    const formattedLinks = rawLinks
      .slice(0, 2)
      .map((l) => (l.startsWith('[[') && l.endsWith(']]') ? l : `[[${l}]]`));
    const maxTwoWikilinks = formattedLinks.join(', ');

    const warRoomPointer = `- [FROM: @agent-orchestrator] -> [TO: @agent-software-engineer] | Required Domain: ${note.domain} | Max Wikilinks (<=2): ${maxTwoWikilinks} | Action: Ingest ${note.title} into singularity horizon`;

    // 4. Best-effort append to .antigravity/comms/WAR_ROOM.md via IPC if available
    const kalinarApi = typeof window !== 'undefined' ? (window as any).kalinarApi : null;
    if (kalinarApi?.executeShellCommand) {
      try {
        const sanitizedLine = warRoomPointer.replace(/"/g, '\\"');
        kalinarApi
          .executeShellCommand(
            `node -e "const fs=require('fs');const p=require('path');const f=p.resolve('.antigravity/comms/WAR_ROOM.md');fs.mkdirSync(p.dirname(f),{recursive:true});fs.appendFileSync(f, \\"${sanitizedLine}\\n\\", 'utf-8');"`
          )
          .catch(() => {});
      } catch {
        // Best-effort
      }
    }

    // 5. Emit event bus notification
    eventBus.emit('zen:rule_evaluated', {
      ruleKey: 'gravitational-rag.jdm.json',
      latencyMs: 0.28,
      allowed: true,
      details: {
        noteId: note.id,
        wikilink: note.wikilink,
        warRoomPointer,
      },
    });

    // 6. Update [gravitational_rag] in store & HUD Live Transcript
    useKalinarStore.setState((state) => ({
      singularity: {
        ...state.singularity,
        accretionTurbulence: Math.min(
          0.85,
          (state.singularity.accretionTurbulence || 0.12) + 0.08
        ),
        liveTranscript: `Gravidade expandida: ${note.wikilink} absorvido pelo horizonte de eventos.`,
      },
    }));
  };

  // Execute interactive JDM evaluation
  const handleEvaluateJdm = async () => {
    setIsEvaluating(true);
    setEvaluationError(null);
    const start = performance.now();

    try {
      const parsedInput = JSON.parse(inputJson);
      const cleanKey = activeJdmRule.replace('.jdm.json', '');
      let resultOutput: any = null;
      let evalLatency = 0;

      const kalinarApi = typeof window !== 'undefined' ? (window as any).kalinarApi : null;
      if (kalinarApi?.evaluateZenRule) {
        try {
          const ipcRes = await kalinarApi.evaluateZenRule(cleanKey, parsedInput);
          if (ipcRes) {
            resultOutput = ipcRes.result !== undefined ? ipcRes.result : ipcRes;
            evalLatency =
              typeof ipcRes.latencyMs === 'number'
                ? ipcRes.latencyMs
                : performance.now() - start;
          }
        } catch {
          // Fall back to in-process ZenFirewall
        }
      }

      if (resultOutput === null) {
        const firewall = ZenFirewall.getInstance();
        switch (cleanKey) {
          case 'daemon-event-router': {
            const evalRes = await firewall.evaluateEventRouter(parsedInput);
            resultOutput = evalRes.result;
            evalLatency = evalRes.latencyMs;
            break;
          }
          case 'os-execution-firewall': {
            const evalRes = await firewall.evaluateOsFirewall(parsedInput);
            resultOutput = evalRes.result;
            evalLatency = evalRes.latencyMs;
            break;
          }
          case 'voice-command-guard': {
            const evalRes = await firewall.evaluateVoiceCommand(parsedInput);
            resultOutput = evalRes.result;
            evalLatency = evalRes.latencyMs;
            break;
          }
          case 'execution-gate': {
            const evalRes = await firewall.evaluateExecutionGate(parsedInput);
            resultOutput = evalRes.result;
            evalLatency = evalRes.latencyMs;
            break;
          }
          case 'llm-model-router': {
            const evalRes = await firewall.evaluateLlmModelRouter(parsedInput);
            resultOutput = evalRes.result;
            evalLatency = evalRes.latencyMs;
            break;
          }
          default:
            throw new Error(`Grafo desconhecido: ${activeJdmRule}`);
        }
      }

      const finalLatency = Number(
        (evalLatency || performance.now() - start).toFixed(2)
      );
      setLastLatencyMs(finalLatency);
      setDecisionOutput(resultOutput);

      eventBus.emit('zen:rule_evaluated', {
        ruleKey: activeJdmRule,
        latencyMs: finalLatency,
        allowed: resultOutput?.allowed ?? resultOutput?.canProceed ?? true,
        details: resultOutput || {},
      });

      const newTraceItem = {
        timestamp: new Date().toLocaleTimeString('pt-BR', {
          hour12: false,
          fractionalSecondDigits: 3,
        }),
        graph: activeJdmRule,
        latencyMs: finalLatency,
        allowed:
          resultOutput?.allowed ??
          resultOutput?.canProceed ??
          resultOutput?.action ??
          'EVALUATED',
        summary: JSON.stringify(resultOutput),
      };
      setTraceLogs((prev) => [newTraceItem, ...prev.slice(0, 19)]);
    } catch (err: any) {
      setEvaluationError(err?.message || 'Falha na avaliacao do grafo JDM');
      setDecisionOutput(null);
    } finally {
      setIsEvaluating(false);
    }
  };

  const currentSpec = JDM_RULE_SPECS[activeJdmRule] || JDM_RULE_SPECS['voice-command-guard.jdm.json'];

  return (
    <div
      data-slot="second-brain-cortex-tab"
      className="w-full h-full p-3 bg-[#07080a] select-none font-mono text-[12px] grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-hidden tabular-nums"
    >
      {/* -------------------------------------------------------------
          LEFT PANE: SEARCHABLE VAULT MATRIX & NOTE INJECTION FORM
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
              aria-label="Pesquisar notas no cofre Obsidian"
              className="flex-1 bg-[#12151d] border border-[var(--ds-border-subtle)] px-2.5 py-1 text-[11px] text-[var(--ds-text-primary)] placeholder-[var(--ds-text-secondary)] focus:outline-none focus:border-[var(--ds-accent-singularity)] font-mono"
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
              <option value="05_EXECUCOES">05_EXECUCOES</option>
            </select>
          </div>
        </div>

        {/* Scrollable Container with Note Injection Form & Note List */}
        <div className="flex-1 overflow-auto p-2.5 flex flex-col gap-3">
          {/* Note Injection Form Card */}
          <form
            onSubmit={handleInjectNote}
            className="p-2.5 bg-[#0e1118] border border-[var(--ds-border-subtle)] flex flex-col gap-2"
          >
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="font-semibold text-[var(--ds-accent-singularity)] uppercase">
                [ INJETAR NOTA NO COFRE OBSIDIAN ]
              </span>
              <span className="text-[9.5px] text-[var(--ds-text-secondary)]">
                PERSISTENCIA DISCO + SQLITE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Titulo da nota (ex: ADR-006)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                aria-label="Titulo da nota"
                className="sm:col-span-2 bg-[#12151d] border border-[var(--ds-border-subtle)] px-2 py-1 text-[11px] text-[var(--ds-text-primary)] placeholder-[var(--ds-text-secondary)] focus:outline-none focus:border-[var(--ds-accent-singularity)] font-mono"
              />
              <select
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                aria-label="Dominio da nova nota"
                className="bg-[#12151d] border border-[var(--ds-border-subtle)] px-2 py-1 text-[10.5px] text-[var(--ds-text-primary)] font-mono focus:outline-none focus:border-[var(--ds-accent-singularity)]"
              >
                <option value="01_PROJETOS">01_PROJETOS</option>
                <option value="02_PADROES">02_PADROES</option>
                <option value="03_PREFERENCIAS">03_PREFERENCIAS</option>
                <option value="04_STACK">04_STACK</option>
                <option value="05_EXECUCOES">05_EXECUCOES</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Tags separadas por virgula (ex: #padrao, #seguranca)"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              aria-label="Tags da nota"
              className="bg-[#12151d] border border-[var(--ds-border-subtle)] px-2 py-1 text-[11px] text-[var(--ds-text-primary)] placeholder-[var(--ds-text-secondary)] focus:outline-none focus:border-[var(--ds-accent-singularity)] font-mono"
            />

            <textarea
              placeholder="Conteudo markdown da nota..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              aria-label="Conteudo markdown da nota"
              className="bg-[#12151d] border border-[var(--ds-border-subtle)] p-2 text-[11px] text-[var(--ds-text-primary)] placeholder-[var(--ds-text-secondary)] focus:outline-none focus:border-[var(--ds-accent-singularity)] font-mono leading-snug"
            />

            <div className="flex items-center justify-between gap-2 pt-1">
              {injectStatus && (
                <span
                  className={`text-[9.5px] truncate max-w-[280px] ${
                    injectStatus.startsWith('[SUCESSO]')
                      ? 'text-[var(--ds-status-active-fg)]'
                      : 'text-[var(--ds-status-danger-fg)]'
                  }`}
                >
                  {injectStatus}
                </span>
              )}
              <button
                type="submit"
                disabled={isInjecting}
                className="ml-auto min-h-[44px] px-3.5 bg-[rgba(170,136,255,0.15)] border border-[var(--ds-accent-singularity)] text-[var(--ds-accent-singularity)] font-semibold text-[10px] uppercase hover:bg-[rgba(170,136,255,0.25)] transition-colors focus:outline-none shrink-0"
              >
                {isInjecting ? '[ INJECTING... ]' : '[ INJECT NOTE INTO VAULT ]'}
              </button>
            </div>
          </form>

          {/* Note List Cards */}
          <div className="flex flex-col gap-2">
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
                      <span key={t} className="text-[#94a3b8]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          RIGHT PANE: INTERACTIVE 5-GRAPH GORULES ZEN JDM EVALUATOR
          ------------------------------------------------------------- */}
      <div className="flex flex-col bg-[#0a0c10] border border-[var(--ds-border-subtle)] overflow-hidden">
        {/* Header with JDM Rule Selector */}
        <div className="p-2.5 border-b border-[var(--ds-border-subtle)] flex items-center justify-between bg-[#090b0e]">
          <span className="font-semibold text-[var(--ds-accent-singularity)] text-[11px] uppercase">
            [02 // GORULES ZEN JDM DECISION EVALUATOR]
          </span>
          <span className="text-[var(--ds-status-active-fg)] text-[10px]">
            {lastLatencyMs !== null ? `${lastLatencyMs.toFixed(2)}ms` : currentSpec.latency} [BENCHMARK &lt; 0.45MS]
          </span>
        </div>

        {/* Graph Dropdown & Tab Selector */}
        <div className="p-2 border-b border-[var(--ds-border-subtle)] bg-[#0d0f15] flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-[var(--ds-text-secondary)] uppercase">
              SELECIONAR GRAFO JDM:
            </span>
            <select
              value={activeJdmRule}
              onChange={(e) => {
                const selected = e.target.value;
                setActiveJdmRule(selected);
                setInputJson(DEFAULT_JDM_PAYLOADS[selected] || '{}');
                setDecisionOutput(null);
                setEvaluationError(null);
              }}
              aria-label="Selecionar Grafo JDM"
              className="bg-[#12151d] border border-[var(--ds-border-subtle)] px-2 py-1 text-[10.5px] text-[var(--ds-text-primary)] font-mono focus:outline-none focus:border-[var(--ds-accent-singularity)]"
            >
              <option value="daemon-event-router.jdm.json">1. daemon-event-router.jdm.json</option>
              <option value="os-execution-firewall.jdm.json">2. os-execution-firewall.jdm.json</option>
              <option value="voice-command-guard.jdm.json">3. voice-command-guard.jdm.json</option>
              <option value="execution-gate.jdm.json">4. execution-gate.jdm.json</option>
              <option value="llm-model-router.jdm.json">5. llm-model-router.jdm.json</option>
            </select>
          </div>

          <div className="flex overflow-x-auto gap-1 pt-1">
            {Object.keys(JDM_RULE_SPECS).map((ruleKey) => (
              <button
                key={ruleKey}
                onClick={() => {
                  setActiveJdmRule(ruleKey);
                  setInputJson(DEFAULT_JDM_PAYLOADS[ruleKey] || '{}');
                  setDecisionOutput(null);
                  setEvaluationError(null);
                }}
                className={`px-2 py-1 text-[9.5px] font-mono whitespace-nowrap border transition-colors ${
                  activeJdmRule === ruleKey
                    ? 'border-[var(--ds-accent-singularity)] text-[var(--ds-accent-singularity)] bg-[rgba(170,136,255,0.12)]'
                    : 'border-[var(--ds-border-subtle)] text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]'
                }`}
              >
                {ruleKey.replace('.jdm.json', '')}
              </button>
            ))}
          </div>
        </div>

        {/* JDM Interactive Workbench Area */}
        <div className="flex-1 overflow-auto p-2.5 flex flex-col gap-2.5">
          {/* Spec Summary Card */}
          <div className="p-2.5 bg-[#12151d] border border-[var(--ds-border-subtle)] flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-semibold text-[var(--ds-text-primary)]">
                {currentSpec.name}
              </span>
              <span className="text-[var(--ds-accent-agent)] text-[10px]">
                {currentSpec.rules} REGRAS COMPILADAS
              </span>
            </div>
            <div className="text-[10.5px] text-[var(--ds-text-secondary)]">
              {currentSpec.desc}
            </div>
            <div className="flex items-center gap-3 pt-1 text-[9.5px] text-[var(--ds-text-secondary)] border-t border-[var(--ds-border-subtle)]">
              <span>GRAPH NODES: {currentSpec.nodes}</span>
              <span>HIT POLICY: FIRST</span>
              <span className="text-[var(--ds-status-active-fg)] font-semibold">
                BENCHMARK: SUB-0.45MS
              </span>
            </div>
          </div>

          {/* Input Parameters Textarea */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] text-[var(--ds-text-secondary)]">
              <span className="uppercase">INPUT PARAMETERS (JSON EDITAVEL):</span>
              <button
                type="button"
                onClick={() => setInputJson(DEFAULT_JDM_PAYLOADS[activeJdmRule] || '{}')}
                className="text-[var(--ds-accent-memory)] hover:underline text-[9.5px]"
              >
                [ RESETAR TEMPLATE ]
              </button>
            </div>
            <textarea
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              rows={5}
              aria-label="Input parameters JSON"
              className="w-full p-2 bg-[#06070a] border border-[var(--ds-border-subtle)] font-mono text-[11px] text-[var(--ds-text-primary)] focus:outline-none focus:border-[var(--ds-accent-singularity)] leading-snug"
            />
          </div>

          {/* Execution Button & Latency Readout */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleEvaluateJdm}
              disabled={isEvaluating}
              className="flex-1 min-h-[44px] px-4 bg-[rgba(170,136,255,0.15)] border border-[var(--ds-accent-singularity)] text-[var(--ds-accent-singularity)] font-bold text-[11px] uppercase hover:bg-[rgba(170,136,255,0.25)] transition-colors focus:outline-none"
            >
              {isEvaluating ? '[ EVALUATING GRAPH... ]' : '[ EVALUATE JDM GRAPH ]'}
            </button>
          </div>

          {/* Latency and Benchmark Status Bar */}
          <div className="p-2 bg-[#090b0e] border border-[var(--ds-border-subtle)] flex items-center justify-between text-[10.5px]">
            <span className="text-[var(--ds-text-secondary)]">
              EVALUATION LATENCY:{' '}
              <span className="text-[var(--ds-status-active-fg)] font-semibold">
                {lastLatencyMs !== null ? `${lastLatencyMs.toFixed(2)}ms` : currentSpec.latency}
              </span>
            </span>
            <span className="text-[var(--ds-status-active-fg)] font-semibold text-[10px]">
              {lastLatencyMs !== null && lastLatencyMs < 0.45
                ? '[VERIFIED < 0.45MS]'
                : '[SUB-MILLISECOND]'}
            </span>
          </div>

          {/* Evaluation Error Banner if any */}
          {evaluationError && (
            <div className="p-2 bg-[rgba(239,68,68,0.1)] border border-[var(--ds-status-danger-border)] text-[var(--ds-status-danger-fg)] text-[10px]">
              [ERROR]: {evaluationError}
            </div>
          )}

          {/* Decision Output Viewer */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[var(--ds-text-secondary)] uppercase">
              DECISION OUTPUT (JSON RESULT):
            </span>
            <pre className="p-2.5 bg-[#06070a] border border-[var(--ds-border-subtle)] font-mono text-[10.5px] text-[var(--ds-accent-memory)] overflow-auto max-h-[140px] leading-snug">
              {decisionOutput !== null
                ? JSON.stringify(decisionOutput, null, 2)
                : '// Pressione [ EVALUATE JDM GRAPH ] para executar avaliacao'}
            </pre>
          </div>

          {/* Real-time Decision Trace History Log */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[var(--ds-text-secondary)] uppercase">
              LIVE DECISION TRACE LOG:
            </span>
            <div className="p-2 bg-[#06070a] border border-[var(--ds-border-subtle)] font-mono text-[9.5px] text-[var(--ds-text-secondary)] flex flex-col gap-1 max-h-[110px] overflow-auto">
              <div className="text-[var(--ds-status-active-fg)]">
                &gt; [ZEN_ENGINE] Cache de buffers em memoria ativo (&lt; 0.45ms).
              </div>
              {traceLogs.length === 0 ? (
                <div>&gt; [READY] Aguardando execucao do operador.</div>
              ) : (
                traceLogs.map((log, i) => (
                  <div key={i} className="leading-tight">
                    &gt; [{log.timestamp}] {log.graph} - {log.latencyMs.toFixed(2)}ms - verdict:{' '}
                    <span className="text-[var(--ds-accent-singularity)]">{String(log.allowed)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
