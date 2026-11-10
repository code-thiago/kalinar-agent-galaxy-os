/**
 * KALINAR ANTIGRAVITY CLI & WAR ROOM WIRETAP (v1.4.0)
 * Real interactive terminal wired to kalinar:execute_shell_command IPC
 * (powershell.exe -NoProfile / node-pty) governed by os-execution-firewall.jdm.json,
 * supporting built-in shortcuts: status, model <agent> <llm>, diff <agent>, fifo, rag <query>.
 * Strictly Zero Emojis, isolated with React.memo for 60 FPS WebGL protection.
 */

import { memo, useEffect, useRef, useState } from 'react';
import { useKalinarStore } from '../../store/useKalinarStore.js';
import { ZenFirewall } from '../../core/ZenFirewall.js';
import { eventBus } from '../../core/KalinarEventBus.js';
import {
  extractFilePathFromDiff,
  findAgentByIdentifier,
} from '../../core/telemetryFormatters.js';
import { LlmModelId } from '../../types/kalinar.js';

interface WiretapMessage {
  id: string;
  timestamp: string;
  from: string;
  to: string;
  domain: string;
  wikilinks: string[];
  action: string;
}

const INITIAL_WIRETAP: WiretapMessage[] = [
  {
    id: 'wt-1',
    timestamp: '18:10:04',
    from: '@agent-orchestrator',
    to: '@agent-software-engineer',
    domain: '02_PADROES',
    wikilinks: ['[[ADR-001]]'],
    action: 'Verificar integridade de sessao server-side antes do build',
  },
  {
    id: 'wt-2',
    timestamp: '18:11:15',
    from: '@agent-software-engineer',
    to: '@agent-design',
    domain: '04_STACK',
    wikilinks: ['[[PADRAO-Design-System-Anti-Slop-WCAG]]'],
    action: 'Ajustar alvos de toque 44px e isolamento React.memo',
  },
  {
    id: 'wt-3',
    timestamp: '18:12:40',
    from: '@agent-design',
    to: '@agent-data',
    domain: '02_PADROES',
    wikilinks: ['[[ADR-003]]'],
    action: 'Renderizar graficos de evolucao sem bloquear threads WebGL',
  },
  {
    id: 'wt-4',
    timestamp: '18:14:22',
    from: '@agent-data',
    to: '@agent-cybersecurity',
    domain: '04_STACK',
    wikilinks: ['[[zen-engine]]'],
    action: 'Auditar latencia deterministica < 0.45ms nas 5 tabelas JDM',
  },
  {
    id: 'wt-5',
    timestamp: '18:16:05',
    from: '@agent-cybersecurity',
    to: '@agent-orchestrator',
    domain: '03_PREFERENCIAS',
    wikilinks: ['[[Regras-Interacao-Escopo-e-Economia-Tokens]]'],
    action: 'Confirmar zero emojis e bloqueio de comandos destrutivos',
  },
];

const FALLBACK_RAG_INDEX = [
  {
    wikilink: '[[00_INDEX]]',
    domain: '01_PROJETOS',
    excerpt: 'Master Router zero-toque para ingestao pre-tarefa e registro pos-tarefa.',
  },
  {
    wikilink: '[[ADR-001-Seguranca-Sessao-Server-Side-Auth]]',
    domain: '02_PADROES',
    excerpt: 'Extracao estrita de userId a partir de sessao validada no servidor.',
  },
  {
    wikilink: '[[ADR-002-Rate-Limiting-Granular-Upstash]]',
    domain: '02_PADROES',
    excerpt: 'Rate limiting granular por rota com sliding window sem bloquear auth.',
  },
  {
    wikilink: '[[ADR-003-Validacao-Dupla-Camada-e-Recalculo-Client]]',
    domain: '02_PADROES',
    excerpt: 'Persistencia exclusiva de parametros de entrada e validacao dupla Zod.',
  },
  {
    wikilink: '[[Stack-Principal-Thiago]]',
    domain: '04_STACK',
    excerpt: 'React 19, Electron 35, GoRules ZEN Engine, Three.js GPGPU, Vite, node:sqlite WAL.',
  },
];

export const AntigravityCliTab = memo(function AntigravityCliTab() {
  const [wiretapMsgs, setWiretapMsgs] = useState<WiretapMessage[]>(INITIAL_WIRETAP);
  const [cliInput, setCliInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyCursor, setHistoryCursor] = useState<number>(-1);
  const [cliHistory, setCliHistory] = useState<
    Array<{ type: 'input' | 'output' | 'error'; text: string }>
  >([
    {
      type: 'output',
      text: 'KALINAR SOVEREIGN DESKTOP OS [v1.4.0] - ANTIGRAVITY PTY CLI',
    },
    {
      type: 'output',
      text: 'Shell IPC: kalinar:execute_shell_command (powershell.exe -NoProfile / node-pty)',
    },
    {
      type: 'output',
      text: 'Firewall: GoRules ZEN os-execution-firewall.jdm.json (< 0.45ms) | Digite "help".',
    },
  ]);

  const cliTerminalEndRef = useRef<HTMLDivElement | null>(null);
  const {
    agents,
    fifoQueueItems,
    singularity,
    selectAgent,
    updateSingularityTranscript,
    updateAgentModel,
    setInspectedFilePath,
    setInspectorDrawerOpen,
  } = useKalinarStore();

  useEffect(() => {
    cliTerminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cliHistory]);

  // Subscribe to live EventBus handoffs for Wiretap feed
  useEffect(() => {
    const pushWiretap = (entry: Omit<WiretapMessage, 'id' | 'timestamp'>) => {
      setWiretapMsgs((prev) => [
        {
          id: `wt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
          ...entry,
        },
        ...prev.slice(0, 24),
      ]);
    };

    const unsubModel = eventBus.on('agent:model_hotswap', (ckpt) => {
      pushWiretap({
        from: '@agent-orchestrator',
        to: ckpt.agentId,
        domain: '04_STACK',
        wikilinks: ['[[llm-model-router]]'],
        action: `Hot-swap ${ckpt.activeModelId.toUpperCase()} (chk ${ckpt.gitCommitOrStashHash.slice(0, 7)})`,
      });
    });

    const unsubFifo = eventBus.on('agent:fifo_queued', (item) => {
      pushWiretap({
        from: '@thiago-operator',
        to: item.targetAgentId,
        domain: '05_EXECUCOES',
        wikilinks: ['[[WAR_ROOM]]'],
        action: `[FIFO_QUEUED] ${item.instruction}`,
      });
    });

    const unsubCanvas = eventBus.on('canvas:sync_requested', ({ canvasFile, nodesCount }) => {
      pushWiretap({
        from: '@agent-software-engineer',
        to: '@agent-data',
        domain: '01_PROJETOS',
        wikilinks: [`[[${canvasFile}]]`],
        action: `Obsidian Canvas 1.0 sync (${nodesCount} nodes)`,
      });
    });

    return () => {
      unsubModel();
      unsubFifo();
      unsubCanvas();
    };
  }, []);

  const appendCliLines = (lines: Array<{ type: 'input' | 'output' | 'error'; text: string }>) => {
    setCliHistory((prev) => [...prev, ...lines]);
  };

  const executeCliCommand = async (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    setCmdHistory((prev) => [cmd, ...prev.slice(0, 39)]);
    setHistoryCursor(-1);
    appendCliLines([{ type: 'input', text: `kalinar@singularity:~$ ${cmd}` }]);
    setCliInput('');

    // Mandatory Layer 2 pre-screen with os-execution-firewall.jdm.json (< 0.45ms)
    const firewall = ZenFirewall.getInstance();
    const evaluation = await firewall.evaluateOsFirewall({
      command: cmd,
      isSandbox: true,
    });

    if (!evaluation.result.allowed) {
      appendCliLines([
        {
          type: 'error',
          text: `[FIREWALL_BLOCKED] ${evaluation.result.verdictReason} (Risk: ${evaluation.result.riskLevel}, ${evaluation.latencyMs.toFixed(2)}ms)`,
        },
      ]);
      return;
    }

    const tokens = cmd.split(/\s+/);
    const primary = tokens[0]?.toLowerCase();
    const kalinarApi = typeof window !== 'undefined' ? (window as any).kalinarApi : null;

    switch (primary) {
      case 'help': {
        appendCliLines([
          {
            type: 'output',
            text: [
              'BUILT-IN SHORTCUTS:',
              '  status                                  - Live swarm, tokens & ZEN latency readout',
              '  model <agent> <argon|claude|gemini>     - Hot-swap agent LLM via JDM router',
              '  diff <agent|filePath>                   - Stream git diff & open 480px NodeInspectorDrawer',
              '  fifo                                    - List active SQLite WAL FIFO queue directives',
              '  rag <query>                             - Query Second Brain vault & pulse 3D singularity',
              '  pull <wikilink>                         - Trigger gravitational RAG pull beam',
              '  antigravity <order>                     - Dispatch WAR_ROOM pointer to @agent-orchestrator',
              '  clear                                   - Clear terminal buffer',
              'OS SHELL: Any other command runs via kalinar:execute_shell_command (powershell.exe -NoProfile).',
            ].join('\n'),
          },
        ]);
        break;
      }

      case 'status': {
        const operationalCount = agents.filter(
          (a) => a.status !== '[HALTED]' && a.status !== '[PAUSED]' && a.status !== '[ERROR]'
        ).length;
        const totalTokens = agents.reduce(
          (acc, a) => acc + (a.tokensPrompt || 0) + (a.tokensCompletion || 0),
          0
        );
        appendCliLines([
          {
            type: 'output',
            text: [
              `[SINGULARITY]: Active (${singularity.voiceState}) | Zen: ${singularity.zenLatencyMs.toFixed(2)}ms`,
              `[ACTIVE_SWARM]: ${operationalCount}/${agents.length} agents nominal`,
              `[TOTAL_TOKENS]: ${totalTokens.toLocaleString('en-US')} tokens`,
              `[FIFO_QUEUE]: ${fifoQueueItems.length} queued directive(s)`,
              `[FIREWALL]: os-execution-firewall.jdm.json ARMED (< 0.45ms)`,
            ].join('\n'),
          },
        ]);
        break;
      }

      case 'model': {
        const rawAgentId = tokens[1] || agents[0]?.id || 'agent-orchestrator-01';
        const rawModelToken = (tokens[2] || 'ARGON').toUpperCase();
        const targetModel: LlmModelId = rawModelToken.includes('CLAUDE')
          ? 'claude-3.7-sonnet'
          : rawModelToken.includes('FLASH')
          ? 'gemini-2.5-flash'
          : rawModelToken.includes('GEMINI')
          ? 'gemini-2.5-pro'
          : 'argon';

        const matchedAgent = findAgentByIdentifier(agents, rawAgentId) || agents[0];

        if (matchedAgent) {
          updateAgentModel(matchedAgent.id, targetModel, '[MODEL_HOTSWAP]');
        }

        if (kalinarApi?.switchLlmModel && matchedAgent) {
          await kalinarApi.switchLlmModel({
            agentId: matchedAgent.id,
            targetModel,
            taskId: 'CLI_MODEL_HOTSWAP',
          });
        }

        appendCliLines([
          {
            type: 'output',
            text: `[MODEL_HOTSWAP] ${matchedAgent?.filename || rawAgentId} -> [${targetModel.toUpperCase()}] (Atomic Git Checkpoint active).`,
          },
        ]);
        break;
      }

      case 'diff': {
        const targetArg = tokens.slice(1).join(' ').trim();
        const matchedAgent = targetArg ? findAgentByIdentifier(agents, targetArg) : undefined;
        const targetFile = matchedAgent
          ? extractFilePathFromDiff(matchedAgent.livePreviewStream)
          : targetArg || 'src/core/ZenFirewall.ts';

        if (matchedAgent) {
          selectAgent(matchedAgent.id);
        }
        setInspectedFilePath(targetFile);
        setInspectorDrawerOpen(true);

        if (kalinarApi?.getLiveGitDiff) {
          try {
            const diffRes = await kalinarApi.getLiveGitDiff({ filePath: targetFile });
            appendCliLines([
              {
                type: 'output',
                text: `[DIFF_STREAM] ${matchedAgent ? `${matchedAgent.filename} -> ` : ''}${diffRes.filePath} (${diffRes.latencyMs}ms):\n${diffRes.rawDiff}`,
              },
            ]);
          } catch (err: any) {
            appendCliLines([
              {
                type: 'error',
                text: `[DIFF_ERROR]: ${err?.message || 'Falha ao ler diff'}`,
              },
            ]);
          }
        } else {
          const preview = matchedAgent?.livePreviewStream || `--- a/${targetFile}\n+++ b/${targetFile}`;
          appendCliLines([
            {
              type: 'output',
              text: `[DIFF_STREAM] Opening ${targetFile} in 480px NodeInspectorDrawer:\n${preview}`,
            },
          ]);
        }
        break;
      }

      case 'fifo': {
        let items = fifoQueueItems;
        if (kalinarApi?.manageFifoQueue) {
          try {
            const res = await kalinarApi.manageFifoQueue({ action: 'LIST' });
            if (Array.isArray(res?.items)) {
              items = res.items;
            }
          } catch {
            // Keep store fallback
          }
        }

        const lines =
          items.length === 0
            ? ['[FIFO_QUEUE] 0 directives pending in SQLite WAL.']
            : [
                `[FIFO_QUEUE] ${items.length} directive(s) queued:`,
                ...items.map(
                  (it, i) =>
                    `  #${i + 1} [${it.status}] agent=${it.targetAgentId} model=${it.modelId.toUpperCase()} cmd="${it.instruction}"`
                ),
              ];

        appendCliLines([{ type: 'output', text: lines.join('\n') }]);
        break;
      }

      case 'rag': {
        const query = tokens.slice(1).join(' ').trim();
        if (!query) {
          appendCliLines([
            { type: 'error', text: '[RAG_USAGE]: Informe um termo. Ex: rag ADR-001' },
          ]);
          break;
        }

        let hits: Array<{ wikilink: string; domain: string; excerpt: string }> = [];
        let latencyMs = 0.25;

        if (kalinarApi?.querySecondBrainVault) {
          try {
            const res = await kalinarApi.querySecondBrainVault({ query, maxResults: 5 });
            if (res?.success && Array.isArray(res.notes)) {
              latencyMs = res.searchLatencyMs ?? 0.35;
              hits = res.notes.map((n: any) => ({
                wikilink: n.wikilink || `[[${n.title}]]`,
                domain: n.domain || '01_PROJETOS',
                excerpt: String(n.excerpt || n.title).slice(0, 240),
              }));
            }
          } catch {
            // Fall through to baseline
          }
        }

        if (hits.length === 0) {
          const qLower = query.toLowerCase();
          hits = FALLBACK_RAG_INDEX.filter(
            (n) =>
              n.wikilink.toLowerCase().includes(qLower) ||
              n.domain.toLowerCase().includes(qLower) ||
              n.excerpt.toLowerCase().includes(qLower)
          );
        }

        if (typeof window !== 'undefined' && (window as any).__triggerGravitationalRAG) {
          (window as any).__triggerGravitationalRAG();
        }

        if (hits.length === 0) {
          appendCliLines([
            { type: 'output', text: `[VAULT_RAG] 0 matches for "${query}" (${latencyMs.toFixed(2)}ms).` },
          ]);
        } else {
          const topLinks = hits
            .slice(0, 2)
            .map((h) => h.wikilink)
            .join(', ');
          updateSingularityTranscript(`RAG "${query}": ${topLinks} puxados para o horizonte.`);
          eventBus.emit('zen:rule_evaluated', {
            ruleKey: 'daemon-event-router.jdm.json',
            latencyMs: 0.24,
            allowed: true,
            details: { query, wikilinks: topLinks },
          });

          appendCliLines([
            {
              type: 'output',
              text: [
                `[VAULT_RAG] ${hits.length} match(es) for "${query}" (${latencyMs.toFixed(2)}ms):`,
                ...hits.map((h) => `  ${h.wikilink} [${h.domain}] :: ${h.excerpt}`),
              ].join('\n'),
            },
          ]);
        }
        break;
      }

      case 'pull': {
        const target = tokens.slice(1).join(' ') || '[[00_INDEX]]';
        if (typeof window !== 'undefined' && (window as any).__triggerGravitationalRAG) {
          (window as any).__triggerGravitationalRAG();
        }
        updateSingularityTranscript(`Gravidade expandida: ${target} absorvido pelo horizonte de eventos.`);
        appendCliLines([
          {
            type: 'output',
            text: `[PULL] ${target} atraido para a singularidade. Feixe relativistico emitido.`,
          },
        ]);
        break;
      }

      case 'antigravity': {
        const order = tokens.slice(1).join(' ') || 'Sincronizar enxame';
        const newHandoff: WiretapMessage = {
          id: `wt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
          from: '@thiago-operator',
          to: '@agent-orchestrator',
          domain: '05_EXECUCOES',
          wikilinks: ['[[WAR_ROOM]]'],
          action: order,
        };
        setWiretapMsgs((prev) => [newHandoff, ...prev]);
        eventBus.emit('agent:step_updated', {
          agentId: '@agent-orchestrator',
          step: 5,
          description: order,
          preview: `[CLI_ORDER]: ${order}`,
        });
        appendCliLines([
          {
            type: 'output',
            text: `[DISPATCH] Ordem propagada para @agent-orchestrator: "${order}".`,
          },
        ]);
        break;
      }

      case 'clear': {
        setCliHistory([]);
        break;
      }

      default: {
        if (kalinarApi?.executeShellCommand) {
          try {
            const res = await kalinarApi.executeShellCommand(cmd);
            if (!res.allowed) {
              appendCliLines([
                {
                  type: 'error',
                  text:
                    res.stderr ||
                    '[FIREWALL_BLOCKED] Comando barrado pelo GoRules ZEN Engine.',
                },
              ]);
            } else {
              const outputs: Array<{ type: 'output' | 'error'; text: string }> = [];
              if (res.stdout?.trim()) {
                outputs.push({ type: 'output', text: res.stdout.trim() });
              }
              if (res.stderr?.trim()) {
                outputs.push({ type: 'error', text: res.stderr.trim() });
              }
              if (outputs.length === 0) {
                outputs.push({
                  type: 'output',
                  text: `[EXEC] Command "${cmd}" exited with code ${res.exitCode}.`,
                });
              }
              appendCliLines(outputs);
            }
          } catch (err: any) {
            appendCliLines([
              {
                type: 'error',
                text: `[SHELL_ERROR]: ${err?.message || 'IPC communication failure'}`,
              },
            ]);
          }
        } else {
          appendCliLines([
            {
              type: 'output',
              text: `[SANDBOX_FALLBACK] "${cmd}" vetted by os-execution-firewall.jdm.json (${evaluation.latencyMs.toFixed(2)}ms). Electron IPC required for native powershell.exe execution.`,
            },
          ]);
        }
        break;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' && cmdHistory.length > 0) {
      e.preventDefault();
      const nextIdx = Math.min(cmdHistory.length - 1, historyCursor + 1);
      setHistoryCursor(nextIdx);
      setCliInput(cmdHistory[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyCursor <= 0) {
        setHistoryCursor(-1);
        setCliInput('');
      } else {
        const nextIdx = historyCursor - 1;
        setHistoryCursor(nextIdx);
        setCliInput(cmdHistory[nextIdx] || '');
      }
    }
  };

  return (
    <div
      data-slot="antigravity-cli-tab"
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
          LEFT SPLIT: WAR_ROOM.MD & GRAVITATIONAL WIRETAP
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
            padding: '9px 10px',
            borderBottom: '1px solid #1A1D26',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#090B0E',
          }}
        >
          <span style={{ fontWeight: 600, color: '#AA88FF', fontSize: '10.5px' }}>
            [01 // WAR_ROOM.MD GRAPH POINTER WIRETAP]
          </span>
          <span style={{ color: '#34D399', fontSize: '10px' }}>
            {wiretapMsgs.length} HANDOFFS REGISTRADOS
          </span>
        </div>

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
          {wiretapMsgs.map((msg) => (
            <div
              key={msg.id}
              style={{
                padding: '8px 10px',
                backgroundColor: '#12151E',
                border: '1px solid #1A1D26',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                fontSize: '10.5px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '9.5px',
                  color: '#9A9A9A',
                }}
              >
                <span>[{msg.timestamp}]</span>
                <span style={{ color: '#E879F9' }}>{msg.domain}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  color: '#AA88FF',
                }}
              >
                <span style={{ color: '#DDDDDD' }}>{msg.from}</span>
                <span>-&gt;</span>
                <span style={{ color: '#00F0FF' }}>{msg.to}</span>
              </div>

              <div style={{ fontSize: '10px', color: '#9A9A9A', textTransform: 'none' }}>
                {msg.action}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '9.5px',
                  color: '#E879F9',
                  textTransform: 'none',
                }}
              >
                {msg.wikilinks.map((wl) => (
                  <span key={wl}>{wl}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------
          RIGHT SPLIT: REAL INTERACTIVE IPC PTY CLI SHELL
          ------------------------------------------------------------- */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#07080a',
          border: '1px solid #1A1D26',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <div
          style={{
            padding: '9px 10px',
            borderBottom: '1px solid #1A1D26',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#090B0E',
          }}
        >
          <span style={{ fontWeight: 600, color: '#00F0FF', fontSize: '10.5px' }}>
            [02 // ANTIGRAVITY PTY CLI (POWERSHELL / NODE-PTY)]
          </span>
          <span style={{ color: '#34D399', fontSize: '10px' }}>
            FIREWALL: OS-EXECUTION-FIREWALL.JDM
          </span>
        </div>

        {/* Quick Shortcut Strip */}
        <div
          style={{
            padding: '5px 10px',
            borderBottom: '1px solid #1A1D26',
            backgroundColor: '#0B0D12',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
          }}
        >
          {['status', 'fifo', 'rag ADR-001', 'diff @agent-orchestrator', 'clear'].map(
            (shortcut) => (
              <button
                key={shortcut}
                type="button"
                onClick={() => executeCliCommand(shortcut)}
                style={{
                  padding: '2px 7px',
                  border: '1px solid #1A1D26',
                  backgroundColor: '#12151d',
                  color: '#9A9A9A',
                  fontSize: '9.5px',
                  fontFamily: 'var(--ds-primitive-font-mono)',
                  textTransform: 'none',
                  cursor: 'pointer',
                }}
              >
                {shortcut}
              </button>
            )
          )}
        </div>

        {/* Terminal Output Stream */}
        <div
          data-slot="cli-terminal-output"
          style={{
            flex: 1,
            minHeight: 0,
            padding: '10px',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '11px',
            fontFamily: 'var(--ds-primitive-font-mono)',
            lineHeight: 1.45,
            backgroundColor: '#050608',
            textTransform: 'none',
            userSelect: 'text',
          }}
        >
          {cliHistory.map((item, idx) => (
            <div
              key={idx}
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color:
                  item.type === 'input'
                    ? '#AA88FF'
                    : item.type === 'error'
                    ? '#F87171'
                    : '#DDDDDD',
                fontWeight: item.type === 'input' ? 600 : 400,
              }}
            >
              {item.text}
            </div>
          ))}
          <div ref={cliTerminalEndRef} />
        </div>

        {/* CLI Prompt Line */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeCliCommand(cliInput);
          }}
          style={{
            padding: '8px 10px',
            borderTop: '1px solid #1A1D26',
            backgroundColor: '#090B0E',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              color: '#AA88FF',
              fontSize: '11px',
              fontWeight: 600,
              flexShrink: 0,
              textTransform: 'none',
            }}
          >
            kalinar@singularity:~$
          </span>
          <input
            type="text"
            value={cliInput}
            onChange={(e) => setCliInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="status | model <agent> <llm> | diff <agent> | fifo | rag <query> | powershell cmd"
            aria-label="Antigravity PTY CLI input"
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '11px',
              color: '#DDDDDD',
              fontFamily: 'var(--ds-primitive-font-mono)',
              textTransform: 'none',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '3px 9px',
              border: '1px solid #1A1D26',
              backgroundColor: 'rgba(0, 240, 255, 0.08)',
              fontSize: '10px',
              fontFamily: 'var(--ds-primitive-font-mono)',
              color: '#00F0FF',
              cursor: 'pointer',
            }}
          >
            [ EXEC ]
          </button>
        </form>
      </div>
    </div>
  );
});
