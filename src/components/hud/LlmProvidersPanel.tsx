/**
 * KALINAR LLM PROVIDERS HUB PANEL (v2.2.0-workspace - Order 4)
 * Rendered inside Left Sidebar Tab 03 // MODELOS LLM & CUSTO.
 * Strict Zero Emojis, Tabular Monospace, Ground-Truth SQLite Cost/Token Telemetry.
 */

import React, { useState } from 'react';
import { useKalinarStore } from '../../store/useKalinarStore.js';
import { DiscoveredLlmProvider, LlmProviderId } from '../../types/kalinar.js';

const DETERMINISTIC_ROLE_ROUTES: Array<{ role: string; model: string }> = [
  { role: 'ARQUITETURA', model: 'gemini-4-pro' },
  { role: 'CODIGO / UI', model: 'claude-sonnet-4' },
  { role: 'VOZ / TRIAGEM', model: 'gemini-4-flash' },
  { role: 'LOCAL / PRIVADO', model: 'argon' },
];

const INLINE_BYOK_PROVIDERS: LlmProviderId[] = [
  'gemini',
  'anthropic',
  'deepseek',
  'nvidia',
  'openai',
  'openrouter',
];

function formatProviderOrigin(source: DiscoveredLlmProvider['source']): string {
  if (source === 'OLLAMA_LOCAL' || source === 'LM_STUDIO_LOCAL') {
    return '[LOCAL ZERO-COST]';
  }
  return '[BYOK / ENV]';
}

export const LlmProvidersPanel = React.memo(function LlmProvidersPanel() {
  const {
    discoveredProviders,
    isDiscoveringLlms,
    sessionTokens,
    refreshLlmDiscovery,
    saveProviderCredential,
    removeProviderCredential,
  } = useKalinarStore();

  const [editingProviderId, setEditingProviderId] = useState<LlmProviderId | null>(null);
  const [inlineApiKey, setInlineApiKey] = useState<string>('');
  const [vaultFeedback, setVaultFeedback] = useState<string | null>(null);

  const estimatedSessionUsd =
    sessionTokens > 0 ? ((sessionTokens / 1_000_000) * 1.5).toFixed(2) : '0.00';

  const handleSaveInlineKey = async (providerId: LlmProviderId) => {
    const trimmed = inlineApiKey.trim();
    if (!trimmed) {
      setVaultFeedback('[ERRO] Chave API vazia.');
      return;
    }
    const res = await saveProviderCredential({ providerId, apiKey: trimmed });
    if (res.success) {
      setVaultFeedback(`[BYOK SALVO] ${providerId}`);
      setEditingProviderId(null);
      setInlineApiKey('');
    } else {
      setVaultFeedback(res.error || '[ERRO] Falha ao salvar no cofre.');
    }
  };

  const handleRemoveKey = async (providerId: string) => {
    const cleanId = providerId.replace(/^byok:/i, '') as LlmProviderId;
    const res = await removeProviderCredential(cleanId);
    if (res.success) {
      setVaultFeedback(`[REMOVIDO] ${cleanId}`);
    } else {
      setVaultFeedback(res.error || '[ERRO] Falha ao remover chave.');
    }
  };

  return (
    <div
      data-slot="llm-providers-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        fontSize: '12px',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {/* Header + Rescan */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          paddingBottom: '6px',
          borderBottom: '1px solid #1F232E',
        }}
      >
        <span style={{ color: '#AA88FF', fontWeight: 700, fontSize: '11px' }}>
          [ HUB LLM // DESCOBERTA ]
        </span>
        <button
          type="button"
          data-slot="llm-rescan-btn"
          onClick={() => void refreshLlmDiscovery()}
          disabled={isDiscoveringLlms}
          style={{
            backgroundColor: '#0D0F14',
            color: '#DDDDDD',
            border: '1px solid #1F232E',
            padding: '4px 8px',
            fontSize: '10.5px',
            cursor: isDiscoveringLlms ? 'wait' : 'pointer',
          }}
        >
          {isDiscoveringLlms ? '[ ESCANEANDO... ]' : '[ REESCANEAR ]'}
        </button>
      </div>

      {/* Session SQLite Telemetry */}
      <div
        data-slot="llm-session-telemetry"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 8px',
          backgroundColor: '#000000',
          border: '1px solid #1F232E',
          fontSize: '11px',
        }}
      >
        <span style={{ color: '#9A9A9A' }}>SESSAO SQLITE:</span>
        <span style={{ color: '#34D399', fontWeight: 700 }}>
          ${estimatedSessionUsd} / {sessionTokens.toLocaleString('en-US')} TOK
        </span>
      </div>

      {/* Discovered Providers List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {discoveredProviders.length === 0 ? (
          <div
            style={{
              padding: '8px',
              border: '1px solid #1F232E',
              backgroundColor: '#000000',
              color: '#9A9A9A',
              fontSize: '11px',
            }}
          >
            [STANDBY] Nenhum provedor escaneado. Clique em [ REESCANEAR ].
          </div>
        ) : (
          discoveredProviders.map((provider) => {
            const isOnline = provider.available;
            const isByok = provider.source === 'SAFE_STORAGE_BYOK';
            return (
              <div
                key={provider.providerId}
                data-slot={`llm-provider-${provider.providerId}`}
                style={{
                  padding: '8px',
                  border: '1px solid #1F232E',
                  backgroundColor: '#000000',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      color: '#DDDDDD',
                      fontWeight: 600,
                      fontSize: '11px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {provider.label}
                  </span>
                  <span
                    style={{
                      color: isOnline ? '#34D399' : '#9A9A9A',
                      fontWeight: 700,
                      fontSize: '10px',
                      flexShrink: 0,
                    }}
                  >
                    {isOnline ? '[ONLINE]' : '[OFFLINE]'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                  <span style={{ color: '#AA88FF' }}>{formatProviderOrigin(provider.source)}</span>
                  {isByok && (
                    <button
                      type="button"
                      onClick={() => void handleRemoveKey(provider.providerId)}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#F87171',
                        border: '1px solid #1F232E',
                        padding: '2px 6px',
                        fontSize: '9.5px',
                        cursor: 'pointer',
                      }}
                    >
                      [ REMOVER ]
                    </button>
                  )}
                </div>

                {provider.models.length > 0 && (
                  <div
                    style={{
                      color: '#9A9A9A',
                      fontSize: '10px',
                      overflowWrap: 'break-word',
                      textTransform: 'none',
                    }}
                  >
                    {provider.models.join(', ')}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Inline BYOK Add Key */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {INLINE_BYOK_PROVIDERS.map((pid) => (
            <button
              key={pid}
              type="button"
              onClick={() => {
                setEditingProviderId(editingProviderId === pid ? null : pid);
                setInlineApiKey('');
                setVaultFeedback(null);
              }}
              style={{
                backgroundColor: editingProviderId === pid ? '#AA88FF' : '#0D0F14',
                color: editingProviderId === pid ? '#000000' : '#DDDDDD',
                border: '1px solid #1F232E',
                padding: '3px 6px',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              [ + CHAVE API {pid.toUpperCase()} ]
            </button>
          ))}
        </div>

        {editingProviderId && (
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type="password"
              value={inlineApiKey}
              onChange={(e) => setInlineApiKey(e.target.value)}
              placeholder={`Chave ${editingProviderId}...`}
              style={{
                flex: 1,
                minWidth: 0,
                backgroundColor: '#000000',
                color: '#DDDDDD',
                border: '1px solid #1F232E',
                padding: '5px 8px',
                fontSize: '11px',
                textTransform: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => void handleSaveInlineKey(editingProviderId)}
              style={{
                backgroundColor: '#AA88FF',
                color: '#000000',
                border: '1px solid #AA88FF',
                padding: '5px 8px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              [ SALVAR ]
            </button>
          </div>
        )}

        {vaultFeedback && (
          <span
            style={{
              color: vaultFeedback.startsWith('[ERRO]') ? '#F87171' : '#34D399',
              fontSize: '10px',
            }}
          >
            {vaultFeedback}
          </span>
        )}
      </div>

      {/* Deterministic Role Routing Table */}
      <div
        data-slot="llm-deterministic-routing"
        style={{
          borderTop: '1px solid #1F232E',
          paddingTop: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          fontSize: '10.5px',
        }}
      >
        <span style={{ color: '#9A9A9A', fontWeight: 700 }}>[ ROTEAMENTO DETERMINISTICO ]</span>
        {DETERMINISTIC_ROLE_ROUTES.map((row) => (
          <div
            key={row.role}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: '#DDDDDD',
            }}
          >
            <span style={{ color: '#9A9A9A' }}>{row.role}</span>
            <span style={{ color: '#AA88FF', textTransform: 'none' }}>{row.model}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
