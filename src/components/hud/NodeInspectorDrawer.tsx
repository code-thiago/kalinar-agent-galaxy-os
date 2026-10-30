import { useState } from 'react';
import { useKalinarStore } from '../../store/useKalinarStore.js';
import { ExecutionMode } from '../../types/kalinar.js';
import { zenFirewall } from '../../core/ZenFirewall.js';

export function NodeInspectorDrawer() {
  const { isInspectorDrawerOpen, toggleInspectorDrawer, agents, selectedAgentId } = useKalinarStore();
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  const [currentMode, setCurrentMode] = useState<ExecutionMode>(selectedAgent?.executionMode || 'AUTO_PILOT');
  const [diffStatus, setDiffStatus] = useState<string>('PENDING_REVIEW');
  const [gateLatency, setGateLatency] = useState<number>(0.28);
  const [gateReason, setGateReason] = useState<string>('AUTO_PILOT_LOCKED_EXECUTION');
  const [processStatus, setProcessStatus] = useState<'RUNNING' | 'SUSPENDED' | 'TERMINATED'>('RUNNING');

  const handleModeChange = async (mode: ExecutionMode) => {
    setCurrentMode(mode);
    const evaluation = await zenFirewall.evaluateExecutionGate({
      executionMode: mode,
      isDestructiveAction: false,
      hasSingleWriterLock: true,
    });
    setGateLatency(evaluation.latencyMs);
    setGateReason(evaluation.result.gateReason);
  };

  const handleProcessAction = async (action: 'SUSPEND' | 'RESUME' | 'KILL') => {
    if (action === 'SUSPEND') setProcessStatus('SUSPENDED');
    if (action === 'RESUME') setProcessStatus('RUNNING');
    if (action === 'KILL') setProcessStatus('TERMINATED');

    if (typeof window !== 'undefined' && (window as any).kalinarApi) {
      await (window as any).kalinarApi.invokeTaskAction(selectedAgent.id, `PROCESS_${action}`);
    }
  };

  const handleApproveDiff = () => {
    setDiffStatus('APPROVED_AND_COMMITTED');
  };

  const handleRevertFile = () => {
    setDiffStatus('REVERTED_TO_BASELINE');
  };

  const handleUnlockWriter = () => {
    setDiffStatus('SINGLE_WRITER_LOCK_RELEASED');
  };

  // Sample AST live diff comparison
  const sampleOriginal = `// Baseline state\nexport function verifyGate() {\n  return false;\n}`;
  const sampleModified = `// Modified AST by @${selectedAgent?.filename || 'agent'}\nexport function verifyGate() {\n  const isValid = zenFirewall.evaluate();\n  return isValid;\n}`;

  return (
    <aside
      data-slot="node-inspector-drawer"
      data-open={isInspectorDrawerOpen}
      className={`fixed top-0 bottom-[36px] right-0 w-[480px] bg-[rgba(10,12,16,0.98)] border-l border-[var(--ds-border-subtle)] z-30 transition-transform duration-300 flex flex-col p-5 pointer-events-auto select-none ${
        isInspectorDrawerOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* 1. Header with Mode Selector */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--ds-border-subtle)]">
        <div className="flex flex-col">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ds-accent-singularity)]">
            [LIVE_DIFF_INSPECTOR]
          </span>
          <span className="font-sans font-semibold text-[15px] text-[var(--ds-primitive-white-500)] truncate">
            {selectedAgent?.filename || 'NÓ SELECIONADO'}
          </span>
        </div>
        <button
          onClick={toggleInspectorDrawer}
          className="px-2 py-1 text-[10.5px] font-mono uppercase border border-[var(--ds-border-subtle)] hover:border-[var(--ds-status-halt-border)] hover:text-[var(--ds-status-halt-fg)] text-[var(--ds-text-secondary)] transition-colors cursor-pointer"
        >
          [ FECHAR ]
        </button>
      </div>

      {/* 2. Execution Mode Segmented Control */}
      <div className="py-3 flex flex-col gap-1.5 border-b border-[var(--ds-border-subtle)] font-mono text-[11px]">
        <span className="text-[10px] text-[var(--ds-text-secondary)] uppercase">
          MODO DE EXECUCAO JDM:
        </span>
        <div className="grid grid-cols-3 gap-1">
          {(['AUTO_PILOT', 'STEP_BY_STEP_GATE', 'SANDBOX_DRY_RUN'] as ExecutionMode[]).map((mode) => {
            const isSelected = currentMode === mode;
            return (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`py-1 px-1.5 border text-[9.5px] font-mono uppercase transition-all cursor-pointer text-center ${
                  isSelected
                    ? 'border-[var(--ds-accent-singularity)] text-[var(--ds-accent-singularity)] bg-[rgba(170,136,255,0.1)]'
                    : 'border-[var(--ds-border-subtle)] text-[var(--ds-text-secondary)] hover:text-white'
                }`}
              >
                [{mode.replace(/_/g, ' ')}]
              </button>
            );
          })}
        </div>
        <div className="flex justify-between items-center text-[10px] text-[var(--ds-text-secondary)] pt-1 tabular-nums">
          <span>GATE VERDICT: {gateReason}</span>
          <span className="text-[var(--ds-status-active-fg)]">LATENCY: {gateLatency.toFixed(2)}MS</span>
        </div>
      </div>

      {/* 3. OS Process Control (PID Ownership, SIGSTOP, SIGTERM) */}
      <div className="py-3 flex flex-col gap-2 border-b border-[var(--ds-border-subtle)] font-mono text-[11px]">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-[var(--ds-text-secondary)] uppercase">
            CONTROLE DE PROCESSO OS:
          </span>
          <span className="text-[10px] text-[var(--ds-primitive-white-500)] tabular-nums">
            PID: {selectedAgent?.pid || 14201} · [{processStatus}]
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleProcessAction('SUSPEND')}
            className="py-1 border border-[var(--ds-status-warn-border)] text-[var(--ds-status-warn-fg)] bg-[rgba(251,191,36,0.06)] hover:bg-[rgba(251,191,36,0.15)] text-[10px] uppercase font-mono cursor-pointer transition-colors"
          >
            [ SUSPEND ]
          </button>
          <button
            onClick={() => handleProcessAction('RESUME')}
            className="py-1 border border-[var(--ds-status-active-border)] text-[var(--ds-status-active-fg)] bg-[rgba(52,211,153,0.06)] hover:bg-[rgba(52,211,153,0.15)] text-[10px] uppercase font-mono cursor-pointer transition-colors"
          >
            [ RESUME ]
          </button>
          <button
            onClick={() => handleProcessAction('KILL')}
            className="py-1 border border-[var(--ds-status-halt-border)] text-[var(--ds-status-halt-fg)] bg-[rgba(248,113,113,0.06)] hover:bg-[rgba(248,113,113,0.15)] text-[10px] uppercase font-mono cursor-pointer transition-colors"
          >
            [ KILL PID ]
          </button>
        </div>
      </div>

      {/* 4. Side-by-Side Live Artifact Diff Viewer */}
      <div className="flex-1 py-3 flex flex-col gap-2 overflow-hidden font-mono text-[11px]">
        <div className="flex justify-between items-center text-[10px] text-[var(--ds-text-secondary)] uppercase">
          <span>ARTEFATO: src/core/ZenFirewall.ts</span>
          <span className="text-[var(--ds-accent-singularity)]">DIFF: {diffStatus}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 flex-1 overflow-hidden bg-black border border-[var(--ds-border-subtle)] p-2">
          {/* Original (Removals) */}
          <div className="flex flex-col gap-1 overflow-y-auto pr-1 border-r border-[var(--ds-border-subtle)]">
            <span className="text-[9.5px] text-[var(--ds-status-halt-fg)] uppercase border-b border-[var(--ds-border-subtle)] pb-1">
              [-] BASELINE ORIGINAL
            </span>
            <pre className="text-[10px] text-[var(--ds-status-halt-fg)] leading-relaxed whitespace-pre-wrap">
              {sampleOriginal}
            </pre>
          </div>

          {/* Modified (Additions) */}
          <div className="flex flex-col gap-1 overflow-y-auto pl-1">
            <span className="text-[9.5px] text-[var(--ds-status-active-fg)] uppercase border-b border-[var(--ds-border-subtle)] pb-1">
              [+] AST MODIFICADO
            </span>
            <pre className="text-[10px] text-[var(--ds-status-active-fg)] leading-relaxed whitespace-pre-wrap">
              {sampleModified}
            </pre>
          </div>
        </div>
      </div>

      {/* 5. Approval & Single-Writer Lock Actions */}
      <div className="pt-3 border-t border-[var(--ds-border-subtle)] grid grid-cols-3 gap-2 font-mono text-[10px] uppercase">
        <button
          onClick={handleApproveDiff}
          className="py-1.5 border border-[var(--ds-status-active-border)] text-[var(--ds-status-active-fg)] bg-[rgba(52,211,153,0.08)] hover:bg-[rgba(52,211,153,0.2)] font-semibold transition-colors cursor-pointer"
        >
          [ APPROVE DIFF ]
        </button>
        <button
          onClick={handleRevertFile}
          className="py-1.5 border border-[var(--ds-status-halt-border)] text-[var(--ds-status-halt-fg)] bg-[rgba(248,113,113,0.08)] hover:bg-[rgba(248,113,113,0.2)] transition-colors cursor-pointer"
        >
          [ REVERT FILE ]
        </button>
        <button
          onClick={handleUnlockWriter}
          className="py-1.5 border border-[var(--ds-accent-singularity)] text-[var(--ds-accent-singularity)] bg-[rgba(170,136,255,0.08)] hover:bg-[rgba(170,136,255,0.2)] transition-colors cursor-pointer"
        >
          [ UNLOCK WRITER ]
        </button>
      </div>
    </aside>
  );
}
