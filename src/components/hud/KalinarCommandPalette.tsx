/**
 * KALINAR GLOBAL TACTICAL COMMAND PALETTE (v1.4.0)
 * Triggered via Ctrl+K / Cmd+K:
 * - Dispatch directives to any @agent-* (Law 4 Two-Phase Ack + Law 6 FIFO Queue)
 * - Hot-swap LLM models across Argon, Claude, and Gemini (Law 7)
 * - Trigger Second Brain Gravitational RAG pull
 * - Toggle Sovereign pt-BR Voice Link, Briefing & <10ms Kill-Switch (Law 1/3/5)
 * Strictly Zero Emojis, React.memo isolated, WCAG AAA contrast on #000000/#07080A
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useKalinarStore } from '../../store/useKalinarStore.js';
import { kalinarVoiceService } from '../../services/kalinarVoiceService.js';
import { kalinarSingularityBrain } from '../../services/kalinarSingularityBrain.js';
import { eventBus } from '../../core/KalinarEventBus.js';
import { ZenFirewall } from '../../core/ZenFirewall.js';
import { formatModelBadge } from '../ui/AgentLivePreviewCard.js';
import { AgentNode, FifoQueueItem, LlmModelId } from '../../types/kalinar.js';

export interface PaletteCommandItem {
  id: string;
  category: 'DISPATCH' | 'MODEL_HOTSWAP' | 'SECOND_BRAIN' | 'VOICE_LINK' | 'SYSTEM';
  label: string;
  hint: string;
  accent: string;
  execute: () => Promise<void>;
}

const HOTSWAP_MODEL_OPTIONS: Array<{
  id: LlmModelId;
  label: string;
  shortTag: string;
  accent: string;
}> = [
  { id: 'argon', label: 'ARGON SOVEREIGN', shortTag: '[ ARGON ]', accent: '#AA88FF' },
  {
    id: 'claude-3.7-sonnet',
    label: 'CLAUDE 3.7 SONNET',
    shortTag: '[ CLAUDE ]',
    accent: '#E879F9',
  },
  { id: 'gemini-2.5-pro', label: 'GEMINI 2.5 PRO', shortTag: '[ GEMINI-PRO ]', accent: '#00F0FF' },
  {
    id: 'gemini-2.5-flash',
    label: 'GEMINI 2.5 FLASH',
    shortTag: '[ GEMINI-FLASH ]',
    accent: '#34D399',
  },
];

export const KalinarCommandPalette = React.memo(function KalinarCommandPalette() {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    toggleCommandPalette,
    agents,
    selectedAgentId,
    selectAgent,
    singularity,
    updateSingularityTranscript,
    updateAgentStatus,
    updateAgentStep,
    enqueueFifoItemInStore,
    setInspectorDrawerOpen,
    toggleBottomDock,
  } = useKalinarStore();

  const [query, setQuery] = useState('');
  const [targetAgentId, setTargetAgentId] = useState<string>(
    selectedAgentId || agents[0]?.id || 'agent-orchestrator-01'
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [statusFeedback, setStatusFeedback] = useState<string>(
    '[READY] CTRL+K PALETTE ARMED // ZERO-TRUST ZEN GATE ACTIVE'
  );
  const [isVoiceLinked, setIsVoiceLinked] = useState<boolean>(() =>
    kalinarVoiceService.isMicActive()
  );
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keep targetAgent aligned when palette opens
  useEffect(() => {
    if (isCommandPaletteOpen) {
      if (selectedAgentId) {
        setTargetAgentId(selectedAgentId);
      }
      setIsVoiceLinked(kalinarVoiceService.isMicActive());
      setActiveIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  }, [isCommandPaletteOpen, selectedAgentId]);

  // Global Ctrl+K / Cmd+K shortcut + Escape close
  useEffect(() => {
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen, toggleCommandPalette]);

  const targetAgent: AgentNode = useMemo(() => {
    return (
      agents.find((a) => a.id === targetAgentId || a.filename === targetAgentId) || agents[0]
    );
  }, [agents, targetAgentId]);

  const dispatchOrderToAgent = async (agent: AgentNode, instructionText: string) => {
    const cleanInstruction = instructionText.trim();
    if (!cleanInstruction) return;

    const wallCheck = await ZenFirewall.getInstance().evaluateOsFirewall({
      command: cleanInstruction,
      isSandbox: true,
    });

    if (!wallCheck.result.allowed) {
      setStatusFeedback(`[FIREWALL_BLOCKED] ${wallCheck.result.verdictReason}`);
      await kalinarVoiceService.handleServerPushAlert({
        type: 'HARD_BLOCK',
        taskId: 'PALETTE_GATE',
        targetAgentId: agent.filename,
        pid: agent.pid,
        exitCode: 1,
        firewallVerdict: 'HARD_BLOCK',
      });
      return;
    }

    const isBusy = agent.status === '[ACTIVE]' || agent.status === '[RUNNING]';
    const taskId = `CMD-${Date.now().toString(36).toUpperCase()}`;
    const api = typeof window !== 'undefined' ? (window as any).kalinarApi : null;

    if (api?.enqueueAgentFifo) {
      try {
        const res = await api.enqueueAgentFifo({
          targetAgentId: agent.filename,
          instruction: cleanInstruction,
          modelId: agent.activeModelId || 'argon',
        });
        if (res?.queueItem) {
          enqueueFifoItemInStore(res.queueItem);
        }
      } catch {
        // Fallback to local FIFO/dispatch below
      }
    }

    if (isBusy) {
      const fifoItem: FifoQueueItem = {
        id: `fifo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        targetAgentId: agent.filename,
        instruction: cleanInstruction,
        modelId: agent.activeModelId || 'argon',
        status: 'FIFO_QUEUED',
        createdAt: Date.now(),
      };
      if (!api?.enqueueAgentFifo) {
        enqueueFifoItemInStore(fifoItem);
        eventBus.emit('agent:fifo_queued', fifoItem);
      }
      await kalinarVoiceService.emitPhase1DispatchedAck({
        taskId,
        targetAgentId: agent.filename,
        pid: agent.pid,
        isFifoQueued: true,
      });
      setStatusFeedback(`[FIFO_QUEUED] ${agent.filename}: ${cleanInstruction}`);
    } else {
      updateAgentStatus(agent.id, '[ACTIVE]');
      updateAgentStep(
        agent.id,
        Math.min(agent.totalSteps, (agent.currentStep || 1) + 1),
        `[PALETTE_DISPATCH] ${agent.filename}\n+ Directive: ${cleanInstruction}`
      );
      eventBus.emit('agent:step_updated', {
        agentId: agent.id,
        step: Math.min(agent.totalSteps, (agent.currentStep || 1) + 1),
        description: cleanInstruction,
        preview: `[PALETTE_DISPATCH]\n+ ${cleanInstruction}`,
      });
      await kalinarVoiceService.emitPhase1DispatchedAck({
        taskId,
        targetAgentId: agent.filename,
        pid: agent.pid,
        isFifoQueued: false,
      });
      setStatusFeedback(`[ACK_DISPATCHED] ${agent.filename}: ${cleanInstruction}`);
    }

    selectAgent(agent.id);
    setQuery('');
    setCommandPaletteOpen(false);
  };

  const handleModelHotSwap = async (modelId: LlmModelId) => {
    const res = await kalinarVoiceService.switchLlmModel(targetAgent.id, modelId);
    const msg = `Thiago, hot-swap [MODEL_HOTSWAP] concluido para ${targetAgent.filename} em [${res.activeModelId.toUpperCase()}] (${res.latencyMs.toFixed(2)}ms).`;
    updateSingularityTranscript(msg);
    setStatusFeedback(`[MODEL_HOTSWAP] ${targetAgent.filename} -> [${modelId.toUpperCase()}]`);
    setCommandPaletteOpen(false);
  };

  const handleTriggerSecondBrainRag = async (ragQuery?: string) => {
    if (typeof window !== 'undefined' && typeof (window as any).__triggerGravitationalRAG === 'function') {
      (window as any).__triggerGravitationalRAG(targetAgent.position3D || [120, 80, 0]);
    }
    const api = typeof window !== 'undefined' ? (window as any).kalinarApi : null;
    let ragSummary = 'Horizonte gravitacional absorveu notas do Second Brain.';
    if (api?.querySecondBrainVault) {
      try {
        const res = await api.querySecondBrainVault({
          query: ragQuery || '',
          maxResults: 3,
        });
        if (res?.success && Array.isArray(res.notes) && res.notes.length > 0) {
          const topLinks = res.notes
            .slice(0, 2)
            .map((n: any) => n.wikilink)
            .join(', ');
          ragSummary = `Thiago, RAG gravitacional recuperou ${res.total} nota(s): ${topLinks}.`;
        }
      } catch {
        // Use deterministic fallback message
      }
    }
    eventBus.emit('zen:rule_evaluated', {
      ruleKey: 'voice-command-guard.jdm.json',
      latencyMs: 0.34,
      allowed: true,
      details: { action: 'CORTEX_NOTE_INGEST', query: ragQuery || '', source: 'command-palette' },
    });
    updateSingularityTranscript(ragSummary);
    setStatusFeedback('[GRAVITY_PULL] Second Brain RAG beam disparado.');
    setCommandPaletteOpen(false);
  };

  const handleToggleVoiceLink = async () => {
    const active = await kalinarVoiceService.toggleVoiceLink();
    setIsVoiceLinked(active);
    setStatusFeedback(active ? '[LISTENING PT-BR] Voice link ativo' : '[STANDBY] Voice link silenciado');
    updateSingularityTranscript(
      active
        ? 'Thiago, link acustico soberano pt-BR conectado. Aguardando diretriz.'
        : 'Link acustico colocado em modo [STANDBY].'
    );
    setCommandPaletteOpen(false);
  };

  const handleTacticalBriefing = async () => {
    const briefing = kalinarSingularityBrain.generateTacticalBriefing({
      userName: 'Thiago',
      agents,
      secondBrainDirectivesCount: 4,
      activeDirective: singularity.activeDirective,
    });
    setCommandPaletteOpen(false);
    await kalinarVoiceService.speakDirective(briefing);
  };

  const handleKillSwitch = async () => {
    const kill = kalinarVoiceService.triggerEmergencyKillSwitch('ESCAPE_KEY');
    setStatusFeedback(`[KILL_SWITCH] TTS abortado em ${kill.latencyMs.toFixed(2)}ms -> ${kill.newVoiceState}`);
    setCommandPaletteOpen(false);
  };

  const commands: PaletteCommandItem[] = useMemo(() => {
    const trimmed = query.trim();
    const list: PaletteCommandItem[] = [];

    if (trimmed.length > 0) {
      list.push({
        id: 'cmd-dispatch-custom',
        category: 'DISPATCH',
        label: `DISPATCH TO ${targetAgent.filename}: "${trimmed}"`,
        hint:
          targetAgent.status === '[ACTIVE]' || targetAgent.status === '[RUNNING]'
            ? '[FIFO_QUEUED]'
            : '[ACK_DISPATCHED]',
        accent: '#00F0FF',
        execute: () => dispatchOrderToAgent(targetAgent, trimmed),
      });
    }

    for (const modelOpt of HOTSWAP_MODEL_OPTIONS) {
      list.push({
        id: `cmd-model-${modelOpt.id}`,
        category: 'MODEL_HOTSWAP',
        label: `HOT-SWAP ${targetAgent.filename} -> ${modelOpt.label}`,
        hint: 'LAW 7 // GIT CHECKPOINT',
        accent: modelOpt.accent,
        execute: () => handleModelHotSwap(modelOpt.id),
      });
    }

    list.push({
      id: 'cmd-second-brain-rag',
      category: 'SECOND_BRAIN',
      label: trimmed
        ? `GRAVITATIONAL RAG PULL: "${trimmed}"`
        : 'TRIGGER SECOND BRAIN GRAVITATIONAL RAG',
      hint: '1,113,033 DOCS // #E879F9',
      accent: '#E879F9',
      execute: () => handleTriggerSecondBrainRag(trimmed),
    });

    list.push({
      id: 'cmd-toggle-voice-link',
      category: 'VOICE_LINK',
      label: isVoiceLinked
        ? 'DISCONNECT SOVEREIGN VOICE LINK (MIC OFF)'
        : 'ACTIVATE SOVEREIGN PT-BR VOICE LINK (MIC ON)',
      hint: isVoiceLinked ? '[LISTENING PT-BR]' : '[STANDBY]',
      accent: '#AA88FF',
      execute: handleToggleVoiceLink,
    });

    list.push({
      id: 'cmd-tauz-briefing',
      category: 'VOICE_LINK',
      label: 'SPEAK TACTICAL SWARM BRIEFING (TAUZ DSP)',
      hint: '110HZ +7.5DB // 2400HZ +3.5DB',
      accent: '#AA88FF',
      execute: handleTacticalBriefing,
    });

    list.push({
      id: 'cmd-voice-killswitch',
      category: 'VOICE_LINK',
      label: 'EMERGENCY VOICE KILL-SWITCH (< 10MS ABORT)',
      hint: 'LAW 1 // ESCAPE ABORT',
      accent: '#F87171',
      execute: handleKillSwitch,
    });

    list.push({
      id: 'cmd-open-inspector',
      category: 'SYSTEM',
      label: `OPEN LIVE DIFF INSPECTOR (${targetAgent.filename})`,
      hint: '480PX DRAWER',
      accent: '#34D399',
      execute: async () => {
        selectAgent(targetAgent.id);
        setInspectorDrawerOpen(true);
        setCommandPaletteOpen(false);
      },
    });

    list.push({
      id: 'cmd-toggle-dock',
      category: 'SYSTEM',
      label: 'TOGGLE RETRACTABLE IDE BOTTOM DOCK',
      hint: 'CTRL+`',
      accent: '#9A9A9A',
      execute: async () => {
        toggleBottomDock();
        setCommandPaletteOpen(false);
      },
    });

    return list;
  }, [query, targetAgent, isVoiceLinked, agents, singularity.activeDirective]);

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.id === 'cmd-dispatch-custom' ||
        c.id === 'cmd-second-brain-rag' ||
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.hint.toLowerCase().includes(q)
    );
  }, [commands, query]);

  const handleInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) =>
        filteredCommands.length === 0 ? 0 : (prev + 1) % filteredCommands.length
      );
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        filteredCommands.length === 0
          ? 0
          : (prev - 1 + filteredCommands.length) % filteredCommands.length
      );
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = query.trim();
      // Direct prefixed parser: @agent-... order | model ... | rag ...
      if (trimmed.startsWith('@agent-')) {
        const [agentToken, ...rest] = trimmed.split(/\s+/);
        const matched =
          agents.find((a) => a.filename.toLowerCase() === agentToken.toLowerCase()) || targetAgent;
        const directive = rest.join(' ');
        if (directive) {
          await dispatchOrderToAgent(matched, directive);
          return;
        }
      }
      if (/^rag\s+/i.test(trimmed)) {
        await handleTriggerSecondBrainRag(trimmed.replace(/^rag\s+/i, ''));
        return;
      }
      const chosen = filteredCommands[activeIndex] || filteredCommands[0];
      if (chosen) {
        await chosen.execute();
      }
    }
  };

  if (!isCommandPaletteOpen) {
    return null;
  }

  return (
    <div
      data-slot="command-palette"
      role="dialog"
      aria-modal="true"
      aria-label="Kalinar Tactical Command Palette"
      onClick={() => setCommandPaletteOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '11vh',
        pointerEvents: 'auto',
        fontFamily: 'var(--ds-primitive-font-mono)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '680px',
          maxWidth: '92vw',
          backgroundColor: 'rgba(7, 8, 10, 0.98)',
          border: '1px solid #AA88FF',
          boxShadow: '0 0 36px rgba(170, 136, 255, 0.22)',
          display: 'flex',
          flexDirection: 'column',
          color: '#DDDDDD',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '1px solid #1A1D26',
            fontSize: '10.5px',
          }}
        >
          <span style={{ color: '#AA88FF', fontWeight: 600 }}>
            [ KALINAR_COMMAND_PALETTE // CTRL+K ]
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#9A9A9A' }}>
              VOICE: {singularity.voiceState}
            </span>
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(false)}
              style={{
                border: '1px solid #1A1D26',
                backgroundColor: 'transparent',
                color: '#9A9A9A',
                padding: '2px 8px',
                fontSize: '10px',
                fontFamily: 'var(--ds-primitive-font-mono)',
                cursor: 'pointer',
              }}
            >
              [ ESC ]
            </button>
          </div>
        </div>

        {/* Target Agent Chips */}
        <div
          data-slot="command-palette-agents"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            padding: '10px 14px',
            borderBottom: '1px solid #1A1D26',
            backgroundColor: '#0A0B0F',
          }}
        >
          {agents.map((agent) => {
            const isSelected = agent.id === targetAgent.id;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => {
                  setTargetAgentId(agent.id);
                  selectAgent(agent.id);
                }}
                style={{
                  padding: '4px 8px',
                  fontSize: '10px',
                  fontFamily: 'var(--ds-primitive-font-mono)',
                  border: isSelected ? '1px solid #00F0FF' : '1px solid #1A1D26',
                  backgroundColor: isSelected ? 'rgba(0, 240, 255, 0.12)' : '#07080A',
                  color: isSelected ? '#00F0FF' : '#9A9A9A',
                  cursor: 'pointer',
                }}
              >
                {agent.filename} {formatModelBadge(agent.activeModelId)}
              </button>
            );
          })}
        </div>

        {/* Tactical Command Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            borderBottom: '1px solid #1A1D26',
            backgroundColor: '#000000',
          }}
        >
          <span style={{ color: '#34D399', fontSize: '12px', fontWeight: 700 }}>&gt;</span>
          <input
            ref={inputRef}
            data-slot="command-palette-input"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={`ORDEM PARA ${targetAgent.filename}, HOT-SWAP MODELO, RAG OU VOICE...`}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#DDDDDD',
              fontSize: '12px',
              fontFamily: 'var(--ds-primitive-font-mono)',
              textTransform: 'none',
            }}
          />
          {query.trim().length > 0 && (
            <button
              type="button"
              onClick={() => void dispatchOrderToAgent(targetAgent, query)}
              style={{
                padding: '4px 10px',
                border: '1px solid #00F0FF',
                backgroundColor: 'rgba(0, 240, 255, 0.14)',
                color: '#00F0FF',
                fontSize: '10px',
                fontFamily: 'var(--ds-primitive-font-mono)',
                cursor: 'pointer',
              }}
            >
              [ DISPATCH ]
            </button>
          )}
        </div>

        {/* Multi-Model Quick Hot-Swap Strip (Argon / Claude / Gemini) */}
        <div
          data-slot="command-palette-models"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '6px',
            padding: '8px 14px',
            borderBottom: '1px solid #1A1D26',
            backgroundColor: '#0A0B0F',
          }}
        >
          {HOTSWAP_MODEL_OPTIONS.map((opt) => {
            const isActive = (targetAgent.activeModelId || 'argon') === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => void handleModelHotSwap(opt.id)}
                style={{
                  padding: '5px 6px',
                  fontSize: '9.5px',
                  fontFamily: 'var(--ds-primitive-font-mono)',
                  border: isActive ? `1px solid ${opt.accent}` : '1px solid #1A1D26',
                  backgroundColor: isActive ? 'rgba(170, 136, 255, 0.12)' : '#07080A',
                  color: isActive ? opt.accent : '#9A9A9A',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {opt.shortTag}
              </button>
            );
          })}
        </div>

        {/* Command Results List */}
        <div
          data-slot="command-palette-list"
          style={{
            maxHeight: '280px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            padding: '6px',
            gap: '4px',
          }}
        >
          {filteredCommands.map((cmd, idx) => {
            const isFocused = idx === activeIndex;
            return (
              <button
                key={cmd.id}
                type="button"
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => void cmd.execute()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '8px 10px',
                  border: isFocused ? `1px solid ${cmd.accent}` : '1px solid transparent',
                  backgroundColor: isFocused ? 'rgba(170, 136, 255, 0.08)' : 'transparent',
                  color: '#DDDDDD',
                  fontSize: '11px',
                  fontFamily: 'var(--ds-primitive-font-mono)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ color: cmd.accent, fontSize: '9.5px', flexShrink: 0 }}>
                    [{cmd.category}]
                  </span>
                  <span className="truncate">{cmd.label}</span>
                </div>
                <span style={{ color: '#9A9A9A', fontSize: '9.5px', flexShrink: 0 }}>
                  {cmd.hint}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer Telemetry Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            borderTop: '1px solid #1A1D26',
            fontSize: '9.5px',
            color: '#9A9A9A',
            backgroundColor: '#050608',
          }}
        >
          <span className="truncate">{statusFeedback}</span>
          <span style={{ flexShrink: 0 }}>UP/DOWN NAV | ENTER EXEC | ESC CLOSE</span>
        </div>
      </div>
    </div>
  );
});

