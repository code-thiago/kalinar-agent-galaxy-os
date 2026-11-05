import { useEffect, useState } from 'react';
import { useKalinarStore } from '../../store/useKalinarStore.js';
import { ExecutionMode, LlmModelId, StructuredDiffLine } from '../../types/kalinar.js';
import { zenFirewall } from '../../core/ZenFirewall.js';

const MODEL_SELECTOR_OPTIONS: Array<{ label: string; modelId: LlmModelId }> = [
  { label: '[ ARGON ]', modelId: 'argon' },
  { label: '[ CLAUDE-3.7-SONNET ]', modelId: 'claude-3.7-sonnet' },
  { label: '[ GEMINI-2.5-PRO ]', modelId: 'gemini-2.5-pro' },
  { label: '[ GEMINI-2.5-FLASH ]', modelId: 'gemini-2.5-flash' },
];

export function NodeInspectorDrawer() {
  const {
    isInspectorDrawerOpen,
    toggleInspectorDrawer,
    agents,
    selectedAgentId,
    inspectedFilePath,
    fifoQueueItems,
    updateAgentModel,
    updateAgentStatus,
    promoteFifoItemInStore,
    clearFifoQueueInStore,
    setFifoQueueItems,
  } = useKalinarStore();
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  const [currentMode, setCurrentMode] = useState<ExecutionMode>(
    selectedAgent?.executionMode || 'STEP_BY_STEP_GATE'
  );
  const [diffStatus, setDiffStatus] = useState<string>('PENDING_REVIEW');
  const [gateLatency, setGateLatency] = useState<number>(0.28);
  const [gateReason, setGateReason] = useState<string>('STEP_BY_STEP_GATE_LOCKED');
  const [processStatus, setProcessStatus] = useState<'RUNNING' | 'SUSPENDED' | 'TERMINATED'>('RUNNING');
  const [diffLines, setDiffLines] = useState<StructuredDiffLine[]>([
    { type: 'header', lineNumber: 1, content: `--- a/${inspectedFilePath}` },
    { type: 'header', lineNumber: 1, content: `+++ b/${inspectedFilePath}` },
    { type: '-', lineNumber: 12, content: '-  const legacyBypass = true;' },
    { type: '+', lineNumber: 12, content: '+  const isValid = zenFirewall.evaluate();' },
    { type: '+', lineNumber: 13, content: '+  return isValid;' },
  ]);
  const [lastCheckpointHash, setLastCheckpointHash] = useState<string>('HEAD-WAL-SYNC');

  const agentFifoList = fifoQueueItems.filter(
    (item) =>
      item.targetAgentId === selectedAgent?.id ||
      item.targetAgentId === selectedAgent?.filename ||
      item.targetAgentId === selectedAgent?.filename?.replace(/^@/, '')
  );

  useEffect(() => {
    const api = typeof window !== 'undefined' ? (window as any).kalinarApi : null;
    if (!api?.getLiveGitDiff || !isInspectorDrawerOpen) return;

    api
      .getLiveGitDiff({ filePath: inspectedFilePath || 'src/core/ZenFirewall.ts' })
      .then((res: any) => {
        if (res && Array.isArray(res.lines) && res.lines.length > 0) {
          setDiffLines(res.lines);
        }
      })
      .catch(() => {
        // Keep deterministic fallback diff lines in non-IPC test environment
      });
  }, [isInspectorDrawerOpen, inspectedFilePath]);

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

  const handleModelHotSwap = async (targetModel: LlmModelId) => {
    if (!selectedAgent) return;
    updateAgentModel(selectedAgent.id, targetModel, '[MODEL_HOTSWAP]');
    setDiffStatus(`HOT_SWAPPED -> ${targetModel.toUpperCase()}`);

    const api = typeof window !== 'undefined' ? (window as any).kalinarApi : null;
    if (api?.switchLlmModel) {
      const res = await api.switchLlmModel({
        agentId: selectedAgent.id,
        targetModel,
        taskId: 'INSPECTOR_HOTSWAP',
      });
      if (res?.checkpoint?.gitCommitOrStashHash) {
        setLastCheckpointHash(res.checkpoint.gitCommitOrStashHash);
      }
    }
  };

  const handlePromoteFifo = async (itemId: string) => {
    promoteFifoItemInStore(itemId);
    const api = typeof window !== 'undefined' ? (window as any).kalinarApi : null;
    if (api?.manageFifoQueue) {
      const res = await api.manageFifoQueue({
        action: 'PROMOTE',
        targetAgentId: selectedAgent?.id,
        itemId,
      });
      if (res?.items) {
        setFifoQueueItems(res.items);
      }
    }
  };

  const handleClearFifo = async () => {
    clearFifoQueueInStore(selectedAgent?.id);
    const api = typeof window !== 'undefined' ? (window as any).kalinarApi : null;
    if (api?.manageFifoQueue) {
      await api.manageFifoQueue({
        action: 'CLEAR',
        targetAgentId: selectedAgent?.id,
      });
    }
  };

  const handleProcessAction = async (action: 'SUSPEND' | 'RESUME' | 'KILL') => {
    if (action === 'SUSPEND') setProcessStatus('SUSPENDED');
    if (action === 'RESUME') setProcessStatus('RUNNING');
    if (action === 'KILL') setProcessStatus('TERMINATED');

    if (typeof window !== 'undefined' && (window as any).kalinarApi) {
      await (window as any).kalinarApi.invokeTaskAction(selectedAgent.id, `PROCESS_${action}`);
    }
  };

  const handleApproveDiff = async () => {
    setDiffStatus('APPROVED_AND_COMMITTED');
    if (selectedAgent) {
      updateAgentStatus(selectedAgent.id, '[VERIFIED]');
    }
    const api = typeof window !== 'undefined' ? (window as any).kalinarApi : null;
    if (api?.approveOrRevertDiff) {
      await api.approveOrRevertDiff({
        filePath: inspectedFilePath || 'src/core/ZenFirewall.ts',
        action: 'APPROVE',
        executionMode: currentMode,
        agentId: selectedAgent?.id,
      });
    }
  };

  const handleRevertFile = async () => {
    setDiffStatus('REVERTED_TO_BASELINE');
    if (selectedAgent) {
      updateAgentStatus(selectedAgent.id, '[WARN]');
    }
    const api = typeof window !== 'undefined' ? (window as any).kalinarApi : null;
    if (api?.approveOrRevertDiff) {
      await api.approveOrRevertDiff({
        filePath: inspectedFilePath || 'src/core/ZenFirewall.ts',
        action: 'REVERT',
        executionMode: currentMode,
        agentId: selectedAgent?.id,
      });
    }
  };

  const handleUnlockWriter = () => {
    setDiffStatus('SINGLE_WRITER_LOCK_RELEASED');
    if (selectedAgent) {
      updateAgentStatus(selectedAgent.id, '[ACTIVE]');
    }
  };

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

      {/* 4. Multi-Model Hot-Swap Selector Bar */}
      <div
        data-slot="inspector-model-selector"
        className="py-2.5 flex flex-col gap-1.5 border-b border-[var(--ds-border-subtle)] font-mono text-[10px]"
      >
        <div className="flex justify-between items-center text-[var(--ds-text-secondary)]">
          <span>LLM HOT-SWAP ROUTER (JDM &lt; 0.45MS):</span>
          <span className="text-[var(--ds-accent-memory)] tabular-nums">CHK: {lastCheckpointHash}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {MODEL_SELECTOR_OPTIONS.map((opt) => {
            const isModelActive = (selectedAgent?.activeModelId || 'argon') === opt.modelId;
            return (
              <button
                key={opt.modelId}
                onClick={() => handleModelHotSwap(opt.modelId)}
                className={`py-1 px-1.5 border text-[9.5px] font-mono uppercase transition-all cursor-pointer text-center ${
                  isModelActive
                    ? 'border-[var(--ds-accent-memory)] text-[var(--ds-accent-memory)] bg-[rgba(232,121,249,0.12)] font-semibold'
                    : 'border-[var(--ds-border-subtle)] text-[var(--ds-text-secondary)] hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Live FIFO Queue List with [ PROMOTE ] and [ CLEAR ] */}
      <div
        data-slot="inspector-fifo-queue"
        className="py-2.5 flex flex-col gap-1.5 border-b border-[var(--ds-border-subtle)] font-mono text-[10px]"
      >
        <div className="flex justify-between items-center">
          <span className="text-[var(--ds-text-secondary)] uppercase">
            FILA FIFO DO AGENTE ({agentFifoList.length}):
          </span>
          <button
            onClick={handleClearFifo}
            className="px-1.5 py-0.5 border border-[var(--ds-status-halt-border)] text-[var(--ds-status-halt-fg)] hover:bg-[rgba(248,113,113,0.15)] text-[9px] uppercase cursor-pointer"
          >
            [ CLEAR ]
          </button>
        </div>
        <div className="max-h-[84px] overflow-y-auto flex flex-col gap-1">
          {agentFifoList.length === 0 ? (
            <div className="text-[9.5px] text-[var(--ds-text-secondary)] py-1">
              [FIFO_EMPTY]: Nenhuma diretriz aguardando na fila deste agente.
            </div>
          ) : (
            agentFifoList.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 bg-[#0d1016] border border-[var(--ds-border-subtle)] px-2 py-1"
              >
                <span className="truncate text-[9.5px] text-[var(--ds-primitive-white-500)]">
                  #{idx + 1} [{item.modelId.toUpperCase()}] {item.instruction}
                </span>
                <button
                  onClick={() => handlePromoteFifo(item.id)}
                  className="shrink-0 px-1.5 py-0.5 border border-[var(--ds-accent-agent)] text-[var(--ds-accent-agent)] hover:bg-[rgba(0,240,255,0.12)] text-[9px] uppercase cursor-pointer"
                >
                  [ PROMOTE ]
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 6. Live Unified Git/File Diff Viewer */}
      <div className="flex-1 py-2.5 flex flex-col gap-1.5 overflow-hidden font-mono text-[11px]">
        <div className="flex justify-between items-center text-[10px] text-[var(--ds-text-secondary)] uppercase">
          <span>ARTEFATO: {inspectedFilePath || 'src/core/ZenFirewall.ts'}</span>
          <span className="text-[var(--ds-accent-singularity)]">DIFF: {diffStatus}</span>
        </div>

        <div
          data-slot="inspector-diff-lines"
          className="flex-1 overflow-y-auto bg-black border border-[var(--ds-border-subtle)] p-2 flex flex-col gap-0.5 font-mono text-[10px]"
        >
          {diffLines.map((line, idx) => {
            const colorClass =
              line.type === '+'
                ? 'text-[#34D399] bg-[rgba(52,211,153,0.06)]'
                : line.type === '-'
                ? 'text-[#F87171] bg-[rgba(248,113,113,0.06)]'
                : line.type === 'header'
                ? 'text-[var(--ds-accent-singularity)]'
                : 'text-[var(--ds-text-secondary)]';
            return (
              <div key={idx} className={`px-1 py-0.5 whitespace-pre-wrap ${colorClass}`}>
                <span className="inline-block w-8 text-[#555] select-none tabular-nums">
                  {line.lineNumber}
                </span>
                {line.content}
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. Approval & Single-Writer Lock Actions */}
      <div className="pt-3 border-t border-[var(--ds-border-subtle)] grid grid-cols-3 gap-2 font-mono text-[9.5px] uppercase">
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
          [ REVERT FILE (GIT ROLLBACK) ]
        </button>
        <button
          onClick={handleUnlockWriter}
          className="py-1.5 border border-[var(--ds-accent-singularity)] text-[var(--ds-accent-singularity)] bg-[rgba(170,136,255,0.08)] hover:bg-[rgba(170,136,255,0.2)] transition-colors cursor-pointer"
        >
          [ UNLOCK SINGLE-WRITER ]
        </button>
      </div>
    </aside>
  );
}
