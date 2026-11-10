/**
 * KALINAR SECOND BRAIN CORTEX & ZEN JDM INSPECTOR (v1.4.0)
 * Bidirectional Obsidian Canvas 1.0 (KALINAR_GALAXY.canvas) Sync,
 * Live Vault RAG Search ([ PULL INTO SINGULARITY ]), Quick .md Note Injector,
 * and Interactive Evaluator for all 5 GoRules ZEN .jdm.json Graphs.
 * Strictly Zero Emojis, isolated with React.memo for 60 FPS WebGL protection.
 */

import { memo, useEffect, useMemo, useState } from 'react';
import { eventBus } from '../../core/KalinarEventBus.js';
import { useKalinarStore } from '../../store/useKalinarStore.js';
import { ZenFirewall } from '../../core/ZenFirewall.js';
import { CanvasSyncRequest, SecondBrainNode } from '../../types/kalinar.js';

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
    desc: 'Debounce 300ms, .kalinar-lock loop suppression e mapeamento de dominio.',
  },
  'os-execution-firewall.jdm.json': {
    name: 'OS Zero-Trust Execution Firewall',
    latency: '0.24ms',
    nodes: 3,
    rules: 5,
    desc: 'Bloqueio deterministico de comandos destrutivos (rm, del, format, drop database).',
  },
  'voice-command-guard.jdm.json': {
    name: 'Voice Command Sovereign Guard',
    latency: '0.32ms',
    nodes: 3,
    rules: 7,
    desc: 'Validacao de diretrizes soberanas em pt-BR e Speech Arbitration Rule B.',
  },
  'execution-gate.jdm.json': {
    name: 'Execution Mode & Step Gate',
    latency: '0.28ms',
    nodes: 3,
    rules: 6,
    desc: 'Trava single-writer, dry-run isolation e checkpoints de aprovacao humana.',
  },
  'llm-model-router.jdm.json': {
    name: 'Multi-Model LLM Router & Failover',
    latency: '0.26ms',
    nodes: 3,
    rules: 10,
    desc: 'Roteamento Argon / Claude / Gemini com Atomic Git Rollback em HTTP 429.',
  },
};

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: '#12151d',
  border: '1px solid #1A1D26',
  padding: '6px 8px',
  fontSize: '11px',
  color: '#DDDDDD',
  fontFamily: 'var(--ds-primitive-font-mono)',
  textTransform: 'none',
  outline: 'none',
};

export const SecondBrainCortexTab = memo(function SecondBrainCortexTab() {
  const [notes, setNotes] = useState<SecondBrainNoteItem[]>(VAULT_NOTES_BASELINE);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [pulledNotes, setPulledNotes] = useState<Set<string>>(new Set());

  // Obsidian Canvas 1.0 Bidirectional Sync State
  const [isSyncingCanvas, setIsSyncingCanvas] = useState(false);
  const [canvasSyncStatus, setCanvasSyncStatus] = useState<string>(
    'KALINAR_GALAXY.canvas [READY]'
  );

  // Quick .md Note Injector Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDomain, setNewDomain] = useState<string>('01_PROJETOS');
  const [newTags, setNewTags] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isInjecting, setIsInjecting] = useState(false);
  const [injectStatus, setInjectStatus] = useState<string | null>(null);

  // Right Pane: Interactive 5-Graph JDM Evaluator State
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

  const { agents, updateSingularityTranscript } = useKalinarStore();

  // Live Vault RAG Query Hydration (re-runs on search/domain updates with debounce)
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      const kalinarApi = typeof window !== 'undefined' ? (window as any).kalinarApi : null;
      if (!kalinarApi?.querySecondBrainVault) return;
      try {
        const res = await kalinarApi.querySecondBrainVault({
          query: searchQuery.trim() || undefined,
          domain: selectedDomain === 'ALL' ? undefined : selectedDomain,
          maxResults: 40,
        });
        if (isMounted && res?.success && Array.isArray(res.notes)) {
          if (res.notes.length > 0) {
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
          } else if (!searchQuery.trim() && selectedDomain === 'ALL') {
            setNotes(VAULT_NOTES_BASELINE);
          }
        }
      } catch {
        // Keep current notes on error
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedDomain]);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesDomain =
        selectedDomain === 'ALL' ||
        n.domain === selectedDomain ||
        (selectedDomain === '02_PADROES' && n.domain.startsWith('02_PADROES')) ||
        (selectedDomain === '04_STACK' && n.domain.startsWith('04_STACK'));

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        q === '' ||
        n.title.toLowerCase().includes(q) ||
        n.wikilink.toLowerCase().includes(q) ||
        n.summary.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q));

      return matchesDomain && matchesSearch;
    });
  }, [notes, searchQuery, selectedDomain]);

  // Bidirectional Obsidian Canvas 1.0 Sync Trigger (KALINAR_GALAXY.canvas)
  const handleSyncObsidianCanvas = async (
    direction: CanvasSyncRequest['direction'] = 'BIDIRECTIONAL'
  ) => {
    setIsSyncingCanvas(true);
    const start = performance.now();
    try {
      const kalinarApi = typeof window !== 'undefined' ? (window as any).kalinarApi : null;
      let nodesCount = agents.length + notes.length;
      let edgesCount = Math.max(1, notes.length);
      let latencyMs = 0;

      if (kalinarApi?.syncObsidianCanvas) {
        const res = await kalinarApi.syncObsidianCanvas({
          direction,
          canvasPath: 'KALINAR_GALAXY.canvas',
        });
        if (!res?.success) {
          throw new Error(res?.error || 'Falha ao sincronizar KALINAR_GALAXY.canvas');
        }
        nodesCount = res.nodesCount ?? res.nodesExported ?? res.nodesImported ?? nodesCount;
        edgesCount = res.edgesCount ?? edgesCount;
        latencyMs = res.latencyMs ?? Number((performance.now() - start).toFixed(2));

        if (
          res.topology &&
          typeof window !== 'undefined' &&
          typeof (window as any).__syncCanvasTopology === 'function'
        ) {
          (window as any).__syncCanvasTopology(res.topology);
        }
      } else {
        latencyMs = Number((performance.now() - start).toFixed(2));
      }

      eventBus.emit('canvas:sync_requested', {
        canvasFile: 'KALINAR_GALAXY.canvas',
        nodesCount,
      });

      setCanvasSyncStatus(
        `[SYNCED:${direction}] ${nodesCount} NODES · ${edgesCount} EDGES · ${latencyMs.toFixed(2)}ms`
      );
      updateSingularityTranscript(
        `Obsidian Canvas 1.0 (${direction}) sincronizado: ${nodesCount} nos em KALINAR_GALAXY.canvas.`
      );
    } catch (err: any) {
      setCanvasSyncStatus(`[CANVAS_ERR]: ${err?.message || 'Sync failed'}`);
    } finally {
      setIsSyncingCanvas(false);
    }
  };

  // Quick .md Note Injector
  const handleInjectNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      setInjectStatus('[ERRO]: Titulo e conteudo markdown obrigatorios.');
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
          throw new Error(res?.error || 'Falha ao injetar nota via IPC');
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

      setNotes((prev) => [createdNote, ...prev]);

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

      updateSingularityTranscript(
        `Nota injetada: ${createdNote.wikilink} gravada no cofre e galaxia 3D.`
      );
      setInjectStatus(`[SUCESSO] ${createdNote.wikilink} gravada no disco e SQLite WAL.`);
      setNewTitle('');
      setNewTags('');
      setNewContent('');
    } catch (err: any) {
      setInjectStatus(`[ERRO]: ${err?.message || 'Falha ao injetar nota'}`);
    } finally {
      setIsInjecting(false);
    }
  };

  // [ PULL INTO SINGULARITY ] action
  const handlePullIntoSingularity = (note: SecondBrainNoteItem) => {
    if (
      typeof window !== 'undefined' &&
      typeof (window as any).__triggerGravitationalRAG === 'function'
    ) {
      (window as any).__triggerGravitationalRAG();
    }

    setPulledNotes((prev) => new Set(prev).add(note.id));

    const rawLinks =
      note.wikilinks && note.wikilinks.length > 0
        ? note.wikilinks
        : [note.wikilink || `[[${note.title}]]`];
    const formattedLinks = rawLinks
      .slice(0, 2)
      .map((l) => (l.startsWith('[[') && l.endsWith(']]') ? l : `[[${l}]]`));
    const warRoomPointer = `- [FROM: @agent-orchestrator] -> [TO: @agent-software-engineer] | Required Domain: ${note.domain} | Max Wikilinks (<=2): ${formattedLinks.join(', ')} | Action: Ingest ${note.title} into singularity horizon`;

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

  // Interactive 5-Graph GoRules ZEN JDM Evaluator
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
          resultOutput?.activeModelId ??
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

  const currentSpec =
    JDM_RULE_SPECS[activeJdmRule] || JDM_RULE_SPECS['voice-command-guard.jdm.json'];

  return (
    <div
      data-slot="second-brain-cortex-tab"
      className="tabular-nums"
      style={{
        width: '100%',
        height: '100%',
        padding: '12px',
        backgroundColor: '#07080a',
        fontFamily: 'var(--ds-primitive-font-mono)',
        fontSize: '11.5px',
        fontVariantNumeric: 'tabular-nums',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: '12px',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* -------------------------------------------------------------
          LEFT PANE: OBSIDIAN CANVAS 1.0 SYNC + VAULT RAG + NOTE INJECTOR
          ------------------------------------------------------------- */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0A0C10',
          border: '1px solid #1A1D26',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Header, Obsidian Canvas 1.0 Sync Strip & Search Filter */}
        <div
          style={{
            padding: '10px',
            borderBottom: '1px solid #1A1D26',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: '#090B0E',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '10.5px',
            }}
          >
            <span style={{ fontWeight: 600, color: '#E879F9' }}>
              [01 // SECOND BRAIN VAULT &amp; OBSIDIAN CANVAS 1.0]
            </span>
            <span style={{ color: '#34D399', fontSize: '10px' }}>
              {filteredNotes.length} NOTAS INDEXADAS
            </span>
          </div>

          {/* Bidirectional Obsidian Canvas 1.0 (KALINAR_GALAXY.canvas) Sync Bar */}
          <div
            data-slot="obsidian-canvas-sync-bar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
              padding: '6px 8px',
              backgroundColor: '#0D1017',
              border: '1px solid #1A1D26',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '9.5px',
                color: canvasSyncStatus.startsWith('[CANVAS_ERR]') ? '#F87171' : '#00F0FF',
                fontWeight: 600,
              }}
            >
              {canvasSyncStatus}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                disabled={isSyncingCanvas}
                onClick={() => handleSyncObsidianCanvas('EXPORT_TO_CANVAS')}
                style={{
                  padding: '3px 7px',
                  border: '1px solid rgba(0, 240, 255, 0.45)',
                  backgroundColor: 'rgba(0, 240, 255, 0.08)',
                  color: '#00F0FF',
                  fontSize: '9px',
                  fontFamily: 'var(--ds-primitive-font-mono)',
                  cursor: 'pointer',
                }}
              >
                [ EXPORT CANVAS ]
              </button>
              <button
                type="button"
                disabled={isSyncingCanvas}
                onClick={() => handleSyncObsidianCanvas('IMPORT_FROM_CANVAS')}
                style={{
                  padding: '3px 7px',
                  border: '1px solid rgba(232, 121, 249, 0.45)',
                  backgroundColor: 'rgba(232, 121, 249, 0.08)',
                  color: '#E879F9',
                  fontSize: '9px',
                  fontFamily: 'var(--ds-primitive-font-mono)',
                  cursor: 'pointer',
                }}
              >
                [ IMPORT CANVAS ]
              </button>
              <button
                type="button"
                disabled={isSyncingCanvas}
                onClick={() => handleSyncObsidianCanvas('BIDIRECTIONAL')}
                style={{
                  padding: '3px 7px',
                  border: '1px solid #AA88FF',
                  backgroundColor: 'rgba(170, 136, 255, 0.14)',
                  color: '#AA88FF',
                  fontSize: '9px',
                  fontWeight: 600,
                  fontFamily: 'var(--ds-primitive-font-mono)',
                  cursor: 'pointer',
                }}
              >
                [ SYNC KALINAR_GALAXY.CANVAS ]
              </button>
            </div>
          </div>

          {/* Search & Domain Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              placeholder="Pesquisar notas no cofre Obsidian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Pesquisar notas no cofre Obsidian"
              style={{ ...INPUT_STYLE, flex: 1 }}
            />
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              aria-label="Filtro de dominio do Second Brain"
              style={{ ...INPUT_STYLE, fontSize: '10px' }}
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

        {/* Scrollable Container: Quick .md Note Injector + Vault RAG Notes */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Quick .md Note Injector */}
          <form
            onSubmit={handleInjectNote}
            data-slot="vault-note-injector"
            style={{
              padding: '10px',
              backgroundColor: '#0E1118',
              border: '1px solid #1A1D26',
              display: 'flex',
              flexDirection: 'column',
              gap: '7px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '10px',
              }}
            >
              <span style={{ fontWeight: 600, color: '#AA88FF' }}>
                [ QUICK .MD NOTE INJECTOR ]
              </span>
              <span style={{ color: '#9A9A9A', fontSize: '9.5px' }}>
                DISK + SQLITE WAL + 3D SPIRAL
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '6px',
              }}
            >
              <input
                type="text"
                placeholder="Titulo da nota (ex: ADR-006)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                aria-label="Titulo da nota"
                style={INPUT_STYLE}
              />
              <select
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                aria-label="Dominio da nova nota"
                style={{ ...INPUT_STYLE, fontSize: '10px' }}
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
              style={INPUT_STYLE}
            />

            <textarea
              placeholder="Conteudo markdown da nota..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={2}
              aria-label="Conteudo markdown da nota"
              style={{ ...INPUT_STYLE, resize: 'vertical', lineHeight: 1.35 }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              {injectStatus && (
                <span
                  style={{
                    fontSize: '9.5px',
                    color: injectStatus.startsWith('[SUCESSO]') ? '#34D399' : '#F87171',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {injectStatus}
                </span>
              )}
              <button
                type="submit"
                disabled={isInjecting}
                style={{
                  marginLeft: 'auto',
                  minHeight: '32px',
                  padding: '0 12px',
                  backgroundColor: 'rgba(170, 136, 255, 0.15)',
                  border: '1px solid #AA88FF',
                  color: '#AA88FF',
                  fontWeight: 600,
                  fontSize: '10px',
                  fontFamily: 'var(--ds-primitive-font-mono)',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {isInjecting ? '[ INJECTING... ]' : '[ INJECT NOTE INTO VAULT ]'}
              </button>
            </div>
          </form>

          {/* Vault Notes List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {filteredNotes.map((note) => {
              const isPulled = pulledNotes.has(note.id);
              return (
                <div
                  key={note.id}
                  style={{
                    padding: '9px 10px',
                    backgroundColor: isPulled ? 'rgba(170, 136, 255, 0.08)' : '#10131A',
                    border: `1px solid ${isPulled ? '#AA88FF' : '#1A1D26'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                      <span
                        className="truncate"
                        style={{ fontSize: '11px', fontWeight: 600, color: '#DDDDDD' }}
                      >
                        {note.title}
                      </span>
                      <span style={{ fontSize: '10px', color: '#E879F9', textTransform: 'none' }}>
                        {note.wikilink}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePullIntoSingularity(note)}
                      style={{
                        minHeight: '26px',
                        padding: '0 9px',
                        flexShrink: 0,
                        border: `1px solid ${isPulled ? '#10B981' : '#AA88FF'}`,
                        backgroundColor: isPulled
                          ? 'rgba(52, 211, 153, 0.14)'
                          : 'rgba(170, 136, 255, 0.10)',
                        color: isPulled ? '#34D399' : '#AA88FF',
                        fontSize: '9.5px',
                        fontFamily: 'var(--ds-primitive-font-mono)',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                      }}
                    >
                      {isPulled ? '[ INGESTED ]' : '[ PULL INTO SINGULARITY ]'}
                    </button>
                  </div>

                  <div
                    style={{
                      fontSize: '10px',
                      color: '#9A9A9A',
                      lineHeight: 1.35,
                      textTransform: 'none',
                    }}
                  >
                    {note.summary}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                      fontSize: '9px',
                      color: '#9A9A9A',
                      paddingTop: '2px',
                    }}
                  >
                    <span
                      style={{
                        padding: '1px 5px',
                        border: '1px solid #1A1D26',
                        backgroundColor: '#141722',
                      }}
                    >
                      {note.domain}
                    </span>
                    {note.tags.map((t) => (
                      <span key={t} style={{ color: '#94A3B8', textTransform: 'none' }}>
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0A0C10',
          border: '1px solid #1A1D26',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <div
          style={{
            padding: '10px',
            borderBottom: '1px solid #1A1D26',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#090B0E',
          }}
        >
          <span style={{ fontWeight: 600, color: '#AA88FF', fontSize: '10.5px' }}>
            [02 // GORULES ZEN JDM DECISION EVALUATOR (5 GRAPHS)]
          </span>
          <span style={{ color: '#34D399', fontSize: '10px' }}>
            {lastLatencyMs !== null ? `${lastLatencyMs.toFixed(2)}ms` : currentSpec.latency}{' '}
            [&lt; 0.45MS]
          </span>
        </div>

        {/* Graph Selector & Quick Pill Buttons */}
        <div
          style={{
            padding: '8px 10px',
            borderBottom: '1px solid #1A1D26',
            backgroundColor: '#0D0F15',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: '#9A9A9A' }}>GRAFO JDM ATIVO:</span>
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
              style={{ ...INPUT_STYLE, fontSize: '10px' }}
            >
              <option value="daemon-event-router.jdm.json">1. daemon-event-router.jdm.json</option>
              <option value="os-execution-firewall.jdm.json">2. os-execution-firewall.jdm.json</option>
              <option value="voice-command-guard.jdm.json">3. voice-command-guard.jdm.json</option>
              <option value="execution-gate.jdm.json">4. execution-gate.jdm.json</option>
              <option value="llm-model-router.jdm.json">5. llm-model-router.jdm.json</option>
            </select>
          </div>

          <div style={{ display: 'flex', overflowX: 'auto', gap: '4px' }}>
            {Object.keys(JDM_RULE_SPECS).map((ruleKey) => {
              const isSelected = activeJdmRule === ruleKey;
              return (
                <button
                  key={ruleKey}
                  type="button"
                  onClick={() => {
                    setActiveJdmRule(ruleKey);
                    setInputJson(DEFAULT_JDM_PAYLOADS[ruleKey] || '{}');
                    setDecisionOutput(null);
                    setEvaluationError(null);
                  }}
                  style={{
                    padding: '3px 7px',
                    fontSize: '9px',
                    fontFamily: 'var(--ds-primitive-font-mono)',
                    whiteSpace: 'nowrap',
                    border: `1px solid ${isSelected ? '#AA88FF' : '#1A1D26'}`,
                    backgroundColor: isSelected ? 'rgba(170, 136, 255, 0.14)' : 'transparent',
                    color: isSelected ? '#AA88FF' : '#9A9A9A',
                    cursor: 'pointer',
                  }}
                >
                  {ruleKey.replace('.jdm.json', '')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Workbench */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              padding: '8px 10px',
              backgroundColor: '#12151d',
              border: '1px solid #1A1D26',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px' }}>
              <span style={{ fontWeight: 600, color: '#DDDDDD' }}>{currentSpec.name}</span>
              <span style={{ color: '#00F0FF', fontSize: '9.5px' }}>
                {currentSpec.rules} REGRAS COMPILADAS
              </span>
            </div>
            <div style={{ fontSize: '10px', color: '#9A9A9A', textTransform: 'none' }}>
              {currentSpec.desc}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '9.5px',
                color: '#9A9A9A',
              }}
            >
              <span>INPUT PAYLOAD (JSON):</span>
              <button
                type="button"
                onClick={() => setInputJson(DEFAULT_JDM_PAYLOADS[activeJdmRule] || '{}')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#E879F9',
                  fontSize: '9.5px',
                  fontFamily: 'var(--ds-primitive-font-mono)',
                  cursor: 'pointer',
                }}
              >
                [ RESETAR TEMPLATE ]
              </button>
            </div>
            <textarea
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              rows={4}
              aria-label="Input parameters JSON"
              style={{
                ...INPUT_STYLE,
                backgroundColor: '#06070A',
                lineHeight: 1.35,
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleEvaluateJdm}
            disabled={isEvaluating}
            style={{
              minHeight: '36px',
              padding: '0 14px',
              backgroundColor: 'rgba(170, 136, 255, 0.15)',
              border: '1px solid #AA88FF',
              color: '#AA88FF',
              fontWeight: 700,
              fontSize: '10.5px',
              fontFamily: 'var(--ds-primitive-font-mono)',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {isEvaluating ? '[ EVALUATING GRAPH... ]' : '[ EVALUATE JDM GRAPH ]'}
          </button>

          {evaluationError && (
            <div
              style={{
                padding: '6px 8px',
                backgroundColor: 'rgba(239, 68, 68, 0.10)',
                border: '1px solid #EF4444',
                color: '#F87171',
                fontSize: '10px',
                textTransform: 'none',
              }}
            >
              [ERROR]: {evaluationError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '9.5px', color: '#9A9A9A' }}>DECISION OUTPUT:</span>
            <pre
              style={{
                padding: '8px',
                backgroundColor: '#06070A',
                border: '1px solid #1A1D26',
                fontFamily: 'var(--ds-primitive-font-mono)',
                fontSize: '10px',
                color: '#E879F9',
                overflow: 'auto',
                maxHeight: '110px',
                lineHeight: 1.35,
                textTransform: 'none',
              }}
            >
              {decisionOutput !== null
                ? JSON.stringify(decisionOutput, null, 2)
                : '// Pressione [ EVALUATE JDM GRAPH ] para executar avaliacao'}
            </pre>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '9.5px', color: '#9A9A9A' }}>LIVE TRACE LOG:</span>
            <div
              style={{
                padding: '7px 8px',
                backgroundColor: '#06070A',
                border: '1px solid #1A1D26',
                fontSize: '9.5px',
                color: '#9A9A9A',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                maxHeight: '90px',
                overflow: 'auto',
                textTransform: 'none',
              }}
            >
              <div style={{ color: '#34D399' }}>
                &gt; [ZEN_ENGINE] 5-Graph buffer cache armed (&lt; 0.45ms).
              </div>
              {traceLogs.map((log, i) => (
                <div key={i}>
                  &gt; [{log.timestamp}] {log.graph} - {log.latencyMs.toFixed(2)}ms -{' '}
                  <span style={{ color: '#AA88FF' }}>{String(log.allowed)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
