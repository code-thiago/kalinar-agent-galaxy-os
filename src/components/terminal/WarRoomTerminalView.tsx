/**
 * KALINAR WAR ROOM & NATIVE PTY CLI VIEW (v0.5.0-rc1)
 * Multi-Agent Swarm Dispatcher & Terminal Log Stream
 * Strictly Zero Emojis
 */

import { memo } from 'react';

export const WarRoomTerminalView = memo(function WarRoomTerminalView() {
  const terminalLines = [
    { timestamp: '17:45:01', source: '@agent-orchestrator', msg: '[FAST_TRIAGE] Intencao avaliada via jev (<500ms). Rota atribuida a @agent-software-engineer.' },
    { timestamp: '17:46:12', source: '@agent-software-engineer', msg: '[BUILD] Compilando TypeScript e vinculando adaptadores IPC do Electron.' },
    { timestamp: '17:47:33', source: '@agent-cybersecurity', msg: '[ZEN_FIREWALL] os-execution-firewall avaliado em 0.22ms. Veredito: ALLOWED_SANDBOXED.' },
    { timestamp: '17:49:15', source: '@agent-data', msg: '[WAL_STORE] Banco node:sqlite com WAL pragma operando em modo nominal. 14 snapshots persistidos.' },
    { timestamp: '17:52:40', source: '@agent-design', msg: '[SHADERS] AnalyserNode Web Audio acoplado ao photon ring do Buraco Negro a 60 FPS.' },
    { timestamp: '17:56:02', source: 'KALINAR_CORE', msg: '[SINGULARITY] "Thiago, singularidade estabilizada. O enxame avanca com 40.840 tokens."' },
    { timestamp: '18:04:18', source: '@agent-orchestrator', msg: '[DOCK_TELEMETRY] Terminal retratil 36px <-> 350px montado com step matrix e evolution charts.' },
  ];

  return (
    <div
      data-slot="war-room-terminal-view"
      className="w-full h-full p-3 bg-[#07080a] select-none font-mono text-[12px] flex flex-col gap-2 overflow-auto"
    >
      <div className="flex items-center justify-between text-[11px] uppercase border-b border-[var(--ds-border-subtle)] pb-1.5 bg-[#0a0c10] px-2 py-1">
        <span className="font-semibold text-[var(--ds-accent-singularity)]">
          [WAR_ROOM.MD MULTI-AGENT SWARM DISPATCHER]
        </span>
        <span className="text-[var(--ds-status-active-fg)] text-[10px]">PTY ATIVO · 60 FPS NOMINAL</span>
      </div>

      <div className="flex-1 overflow-auto bg-[#090b0e] border border-[var(--ds-border-subtle)] p-2.5 flex flex-col gap-1.5 tabular-nums">
        {terminalLines.map((line, idx) => (
          <div key={idx} className="flex items-start gap-2 text-[11px] leading-relaxed">
            <span className="text-[var(--ds-text-secondary)] shrink-0">[{line.timestamp}]</span>
            <span className="text-[var(--ds-accent-singularity)] font-semibold shrink-0">
              {line.source}:
            </span>
            <span className="text-[var(--ds-text-primary)]">{line.msg}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-[11px] text-[var(--ds-status-active-fg)] pt-2 animate-pulse">
          <span>&gt;</span>
          <span>Aguardando proxima diretriz tica de Thiago...</span>
        </div>
      </div>
    </div>
  );
});
