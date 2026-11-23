/**
 * KALINAR HYBRID SIDEBAR MINI-CLI (v2.2.0-workspace - Order 6)
 * Anchored at the bottom of the Left Sidebar (190px expanded / 34px collapsed).
 * Routes @agent-* to enqueueAgentFifo and shell commands to executeShellCommand (ZEN Firewall).
 * Strict Zero Emojis.
 */

import React, { useState } from 'react';
import { useKalinarStore } from '../../store/useKalinarStore.js';

const MINI_CLI_CHIPS = ['status', 'ollama list', 'git status -s', 'sync'] as const;

export const SidebarMiniCli = React.memo(function SidebarMiniCli() {
  const { activeCliPid, cliHistory, dispatchMiniCliInput, killActiveCliProcess } =
    useKalinarStore();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [historyCursor, setHistoryCursor] = useState<number>(-1);

  const submittedInputs = cliHistory.map((h) => h.input);

  const handleSubmit = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setInputValue('');
    setHistoryCursor(-1);
    await dispatchMiniCliInput(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSubmit(inputValue);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (submittedInputs.length === 0) return;
      const nextIdx =
        historyCursor < 0 ? 0 : Math.min(historyCursor + 1, submittedInputs.length - 1);
      setHistoryCursor(nextIdx);
      setInputValue(submittedInputs[nextIdx]);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyCursor <= 0) {
        setHistoryCursor(-1);
        setInputValue('');
        return;
      }
      const nextIdx = historyCursor - 1;
      setHistoryCursor(nextIdx);
      setInputValue(submittedInputs[nextIdx]);
    }
  };

  return (
    <section
      data-slot="sidebar-mini-cli"
      style={{
        height: isCollapsed ? '34px' : '190px',
        minHeight: isCollapsed ? '34px' : '190px',
        backgroundColor: '#07080A',
        borderTop: '1px solid #1F232E',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
        fontSize: '12px',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {/* Header (34px) */}
      <div
        style={{
          height: '34px',
          minHeight: '34px',
          padding: '0 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: isCollapsed ? 'none' : '1px solid #1F232E',
        }}
      >
        <span style={{ color: '#AA88FF', fontWeight: 700, fontSize: '11px' }}>
          MINI-CLI // PTY
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {activeCliPid !== null && (
            <button
              type="button"
              data-slot="mini-cli-kill-pid"
              onClick={() => void killActiveCliProcess()}
              style={{
                backgroundColor: 'rgba(248, 113, 113, 0.12)',
                color: '#F87171',
                border: '1px solid #F87171',
                padding: '2px 6px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              [ KILL PID ]
            </button>
          )}
          <button
            type="button"
            data-slot="mini-cli-toggle"
            onClick={() => setIsCollapsed((prev) => !prev)}
            style={{
              backgroundColor: '#0D0F14',
              color: '#DDDDDD',
              border: '1px solid #1F232E',
              padding: '2px 6px',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            {isCollapsed ? '[ + ]' : '[ - ]'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '6px 8px',
            gap: '6px',
          }}
        >
          {/* 1-Click Quick Shortcut Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flexShrink: 0 }}>
            {MINI_CLI_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                data-slot={`mini-cli-chip-${chip.replace(/\s+/g, '-')}`}
                onClick={() => void handleSubmit(chip)}
                style={{
                  backgroundColor: '#000000',
                  color: '#9A9A9A',
                  border: '1px solid #1F232E',
                  padding: '2px 6px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  textTransform: 'none',
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Scrollable Output (max-height: 96px) */}
          <div
            data-slot="mini-cli-output"
            style={{
              flex: 1,
              maxHeight: '96px',
              overflowY: 'auto',
              backgroundColor: '#000000',
              border: '1px solid #1F232E',
              padding: '4px 6px',
              fontSize: '10.5px',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              textTransform: 'none',
            }}
          >
            {cliHistory.length === 0 ? (
              <span style={{ color: '#9A9A9A' }}>
                [STANDBY] Digite comando shell ou @agent-&lt;nome&gt; &lt;tarefa&gt;
              </span>
            ) : (
              cliHistory.slice(0, 20).map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    color: entry.blockedByFirewall ? '#F87171' : '#DDDDDD',
                    overflowWrap: 'break-word',
                  }}
                >
                  <span style={{ color: '#AA88FF' }}>&gt; {entry.input}</span>
                  <div style={{ color: entry.blockedByFirewall ? '#F87171' : '#9A9A9A' }}>
                    {entry.output}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Command Input */}
          <input
            data-slot="mini-cli-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="cmd ou @agent-software-engineer ..."
            style={{
              width: '100%',
              backgroundColor: '#000000',
              color: '#DDDDDD',
              border: '1px solid #1F232E',
              padding: '5px 8px',
              fontSize: '11px',
              fontFamily: 'inherit',
              textTransform: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}
    </section>
  );
});
