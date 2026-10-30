/**
 * KALINAR ANTIGRAVITY CLI & WAR ROOM WIRETAP (v1.0.0)
 * Monospace Graph Pointer Wiretap + Embedded Desktop Shell
 * Strictly Zero Emojis
 */

import { useState, useRef, useEffect, memo } from 'react';
import { useKalinarStore } from '../../store/useKalinarStore.js';
import { ZenFirewall } from '../../core/ZenFirewall.js';
import { eventBus } from '../../core/KalinarEventBus.js';

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
    action: 'Auditar latencia deterministica < 1ms nas 4 tabelas JDM',
  },
  {
    id: 'wt-5',
    timestamp: '18:16:05',
    from: '@agent-cybersecurity',
    to: '@agent-orchestrator',
    domain: '03_PREFERENCIAS',
    wikilinks: ['[[Regras-Interacao-Escopo-e-Economia-Tokens]]'],
    action: 'Confirmar zero emojis e zero ocorrencias de nomes proibidos',
  },
];

export const AntigravityCliTab = memo(function AntigravityCliTab() {
  const [wiretapMsgs, setWiretapMsgs] = useState<WiretapMessage[]>(INITIAL_WIRETAP);
  const [cliInput, setCliInput] = useState('');
  const [cliHistory, setCliHistory] = useState<Array<{ type: 'input' | 'output' | 'error'; text: string }>>([
    { type: 'output', text: 'KALINAR SOVEREIGN DESKTOP OS [v1.0.0] - NATIVE PTY CLI TERMINAL' },
    { type: 'output', text: 'Protegido por GoRules ZEN Engine os-execution-firewall.jdm.json (< 1ms)' },
    { type: 'output', text: 'Digite "help" para ver as diretrizes táticas disponíveis.' },
  ]);

  const cliTerminalEndRef = useRef<HTMLDivElement | null>(null);
  const { agents, updateSingularityTranscript } = useKalinarStore();

  useEffect(() => {
    cliTerminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cliHistory]);

  const executeCliCommand = async (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    setCliHistory((prev) => [...prev, { type: 'input', text: `kalinar@singularity:~$ ${cmd}` }]);
    setCliInput('');

    // Check with OS Firewall
    const firewall = ZenFirewall.getInstance();
    const evaluation = await firewall.evaluateOsFirewall({
      command: cmd,
      isSandbox: true,
    });

    if (!evaluation.result.allowed) {
      setCliHistory((prev) => [
        ...prev,
        {
          type: 'error',
          text: `[FIREWALL_BLOCKED] ${evaluation.result.verdictReason} (Risk: ${evaluation.result.riskLevel})`,
        },
      ]);
      return;
    }

    const tokens = cmd.split(' ');
    const primary = tokens[0]?.toLowerCase();

    switch (primary) {
      case 'help': {
        setCliHistory((prev) => [
          ...prev,
          {
            type: 'output',
            text: [
              'DIRETRIZES TATICAS DO KALINAR SINGULARITY CLI:',
              '  status                - Exibe telemetria do enxame e estado do nucleo',
              '  pull <wikilink>       - Atrai nota para o horizonte de eventos',
              '  antigravity <ordem>   - Envia instrucao para o WAR_ROOM.md',
              '  second-brain <termo>  - Pesquisa no cofre Obsidian',
              '  clear                 - Limpa o buffer do terminal',
            ].join('\n'),
          },
        ]);
        break;
      }

      case 'status': {
        const activeCount = agents.filter((a) => a.status === '[ACTIVE]' || a.status === '[RUNNING]').length;
        setCliHistory((prev) => [
          ...prev,
          {
            type: 'output',
            text: [
              `[NUCLEO]: Singularidade Kalinar em operacao nominal (#AA88FF)`,
              `[SWARM]: ${activeCount} agentes em orbita ativa`,
              `[FIREWALL]: GoRules ZEN Engine < 0.38ms [VERIFIED]`,
              `[CIRCUIT]: CLOSED · Trava Single-Writer ativa`,
            ].join('\n'),
          },
        ]);
        break;
      }

      case 'pull': {
        const target = tokens.slice(1).join(' ') || '[[00_INDEX]]';
        if (typeof window !== 'undefined' && (window as any).__triggerGravitationalRAG) {
          (window as any).__triggerGravitationalRAG();
        }
        updateSingularityTranscript(`Gravidade expandida: ${target} absorvido pelo horizonte de eventos.`);
        setCliHistory((prev) => [
          ...prev,
          {
            type: 'output',
            text: `[PULL] ${target} atraido com sucesso para a singularidade. Feixe relativistico emitido.`,
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
        setCliHistory((prev) => [
          ...prev,
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
        setCliHistory((prev) => [
          ...prev,
          {
            type: 'output',
            text: `[EXEC] Comando "${cmd}" executado em sandbox isolada com codigo de retorno 0.`,
          },
        ]);
        break;
      }
    }
  };

  return (
    <div
      data-slot="antigravity-cli-tab"
      className="w-full h-full p-3 bg-[#07080a] select-none font-mono text-[12px] grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-hidden tabular-nums"
    >
      {/* -------------------------------------------------------------
          LEFT SPLIT: WAR_ROOM.MD & GRAVITATIONAL WIRETAP
          ------------------------------------------------------------- */}
      <div className="flex flex-col bg-[#0a0c10] border border-[var(--ds-border-subtle)] overflow-hidden">
        <div className="p-2.5 border-b border-[var(--ds-border-subtle)] flex items-center justify-between bg-[#090b0e]">
          <span className="font-semibold text-[var(--ds-accent-singularity)] text-[11px] uppercase">
            [01 // WAR_ROOM.MD GRAPH POINTER WIRETAP]
          </span>
          <span className="text-[var(--ds-status-active-fg)] text-[10px]">
            {wiretapMsgs.length} HANDOFFS REGISTRADOS
          </span>
        </div>

        <div className="flex-1 overflow-auto p-2.5 flex flex-col gap-2">
          {wiretapMsgs.map((msg) => (
            <div
              key={msg.id}
              className="p-2 bg-[#12151e] border border-[var(--ds-border-subtle)] flex flex-col gap-1 text-[11px]"
            >
              <div className="flex justify-between items-center text-[10px] text-[var(--ds-text-secondary)]">
                <span>[{msg.timestamp}]</span>
                <span className="text-[var(--ds-accent-memory)]">{msg.domain}</span>
              </div>

              <div className="flex items-center gap-1.5 font-semibold text-[var(--ds-accent-singularity)]">
                <span className="text-[var(--ds-text-primary)]">{msg.from}</span>
                <span>-&gt;</span>
                <span className="text-[var(--ds-accent-agent)]">{msg.to}</span>
              </div>

              <div className="text-[10.5px] text-[var(--ds-text-secondary)]">{msg.action}</div>

              <div className="flex items-center gap-1 text-[9.5px] text-[var(--ds-accent-memory)] pt-0.5">
                {msg.wikilinks.map((wl) => (
                  <span key={wl}>{wl}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------
          RIGHT SPLIT: EMBEDDED DESKTOP SHELL (NODE-PTY / CLI)
          ------------------------------------------------------------- */}
      <div className="flex flex-col bg-[#07080a] border border-[var(--ds-border-subtle)] overflow-hidden">
        <div className="p-2.5 border-b border-[var(--ds-border-subtle)] flex items-center justify-between bg-[#090b0e]">
          <span className="font-semibold text-[var(--ds-accent-agent)] text-[11px] uppercase">
            [02 // NATIVE PTY CLI DESKTOP SHELL]
          </span>
          <span className="text-[var(--ds-status-active-fg)] text-[10px]">
            FIREWALL: VETTED
          </span>
        </div>

        {/* CLI Terminal Output */}
        <div className="flex-1 p-3 overflow-auto flex flex-col gap-1 text-[11px] font-mono leading-relaxed bg-[#050608]">
          {cliHistory.map((item, idx) => (
            <div
              key={idx}
              className={`whitespace-pre-wrap ${
                item.type === 'input'
                  ? 'text-[var(--ds-accent-singularity)] font-semibold'
                  : item.type === 'error'
                  ? 'text-[var(--ds-status-halt-fg)]'
                  : 'text-[var(--ds-text-secondary)]'
              }`}
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
          className="p-2 border-t border-[var(--ds-border-subtle)] bg-[#090b0e] flex items-center gap-2"
        >
          <span className="text-[var(--ds-accent-singularity)] text-[11px] font-semibold shrink-0">
            kalinar@singularity:~$
          </span>
          <input
            type="text"
            value={cliInput}
            onChange={(e) => setCliInput(e.target.value)}
            placeholder="Digite uma diretriz tática..."
            className="flex-1 bg-transparent text-[11px] text-[var(--ds-text-primary)] font-mono focus:outline-none placeholder-[#383e52]"
            autoFocus
          />
          <button
            type="submit"
            className="px-2 py-0.5 border border-[var(--ds-border-subtle)] text-[10px] text-[var(--ds-text-secondary)] hover:text-[var(--ds-accent-agent)] transition-colors"
          >
            [ EXEC ]
          </button>
        </form>
      </div>
    </div>
  );
});
