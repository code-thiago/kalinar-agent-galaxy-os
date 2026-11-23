/**
 * KALINAR 1-STEP LLM ONBOARDING MODAL (v2.2.0-workspace - Order 4)
 * Shown ONLY when hasAnyConfiguredEngine === false && !isOnboardingDismissed.
 * Strict Zero Emojis, WCAG AAA Obsidian #07080A, Tabular Monospace.
 */

import React, { useState } from 'react';
import { useKalinarStore } from '../../store/useKalinarStore.js';
import { LlmProviderId } from '../../types/kalinar.js';

const ONBOARDING_PROVIDERS: Array<{ id: LlmProviderId; label: string; placeholder: string }> = [
  { id: 'gemini', label: 'GOOGLE GEMINI (gemini-4-pro / flash)', placeholder: 'AIza...' },
  { id: 'anthropic', label: 'ANTHROPIC CLAUDE (claude-sonnet-4)', placeholder: 'sk-ant-...' },
  { id: 'deepseek', label: 'DEEPSEEK (deepseek-r1 / chat)', placeholder: 'sk-...' },
  { id: 'nvidia', label: 'NVIDIA NIM (llama-3.3-70b)', placeholder: 'nvapi-...' },
  { id: 'openai', label: 'OPENAI (gpt-4o / o3-mini)', placeholder: 'sk-...' },
  { id: 'openrouter', label: 'OPENROUTER (multi-model)', placeholder: 'sk-or-...' },
  { id: 'ollama', label: 'OLLAMA LOCAL (127.0.0.1:11434)', placeholder: 'http://127.0.0.1:11434' },
];

export const LlmOnboardingModal = React.memo(function LlmOnboardingModal() {
  const {
    hasAnyConfiguredEngine,
    isOnboardingDismissed,
    dismissOnboarding,
    saveProviderCredential,
    refreshLlmDiscovery,
  } = useKalinarStore();

  const [providerId, setProviderId] = useState<LlmProviderId>('gemini');
  const [credentialValue, setCredentialValue] = useState<string>('');
  const [ollamaUrl, setOllamaUrl] = useState<string>('http://127.0.0.1:11434');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (hasAnyConfiguredEngine || isOnboardingDismissed) {
    return null;
  }

  const isOllama = providerId === 'ollama';

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const payloadValue = isOllama ? ollamaUrl.trim() : credentialValue.trim();
    if (!payloadValue) {
      setErrorMsg(
        isOllama
          ? '[ERRO] Informe a URL do servidor Ollama local.'
          : '[ERRO] Informe a chave API do provedor selecionado.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await saveProviderCredential({
        providerId,
        apiKey: payloadValue,
        ...(isOllama ? { baseUrl: payloadValue } : {}),
      });

      if (!result.success) {
        setErrorMsg(result.error || '[ERRO] Falha ao salvar credencial no cofre safeStorage.');
        return;
      }

      await refreshLlmDiscovery();
      const updated = useKalinarStore.getState();
      if (!updated.hasAnyConfiguredEngine) {
        setErrorMsg('[AVISO] Credencial salva, mas nenhum motor ativo foi confirmado.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : '[ERRO] Falha ao conectar motor LLM.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-slot="llm-onboarding-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Configuracao Inicial de Motor LLM"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        backgroundColor: 'rgba(0, 0, 0, 0.84)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#07080A',
          border: '1px solid #1F232E',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
          fontSize: '13px',
          color: '#DDDDDD',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#AA88FF', fontWeight: 700, fontSize: '12px' }}>
            [ ONBOARDING 1-PASSO // HUB LLM ]
          </span>
          <span style={{ color: '#9A9A9A', fontSize: '11px' }}>[STANDBY]</span>
        </div>

        <p style={{ margin: 0, color: '#9A9A9A', fontSize: '12px', lineHeight: 1.45, textTransform: 'none' }}>
          Nenhum modelo local (Ollama/LM Studio) ou chave BYOK/ENV foi detectado. Conecte um motor LLM criptografado via OS safeStorage ou entre em modo STANDBY_READY.
        </p>

        <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ color: '#9A9A9A', fontSize: '11px' }}>PROVEDOR LLM</span>
            <select
              data-slot="onboarding-provider-select"
              value={providerId}
              onChange={(e) => {
                setProviderId(e.target.value as LlmProviderId);
                setErrorMsg(null);
              }}
              style={{
                backgroundColor: '#000000',
                color: '#DDDDDD',
                border: '1px solid #1F232E',
                padding: '8px 10px',
                fontSize: '12px',
                fontFamily: 'inherit',
              }}
            >
              {ONBOARDING_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          {isOllama ? (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ color: '#9A9A9A', fontSize: '11px' }}>URL DO SERVIDOR OLLAMA</span>
              <input
                data-slot="onboarding-ollama-url"
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://127.0.0.1:11434"
                style={{
                  backgroundColor: '#000000',
                  color: '#DDDDDD',
                  border: '1px solid #1F232E',
                  padding: '8px 10px',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  textTransform: 'none',
                }}
              />
            </label>
          ) : (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ color: '#9A9A9A', fontSize: '11px' }}>CHAVE API (SAFE_STORAGE_BYOK)</span>
              <input
                data-slot="onboarding-api-key"
                type="password"
                value={credentialValue}
                onChange={(e) => setCredentialValue(e.target.value)}
                placeholder={
                  ONBOARDING_PROVIDERS.find((p) => p.id === providerId)?.placeholder || 'sk-...'
                }
                style={{
                  backgroundColor: '#000000',
                  color: '#DDDDDD',
                  border: '1px solid #1F232E',
                  padding: '8px 10px',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  textTransform: 'none',
                }}
              />
            </label>
          )}

          {errorMsg && (
            <div
              data-slot="onboarding-error"
              style={{
                color: '#F87171',
                border: '1px solid #F87171',
                backgroundColor: 'rgba(248, 113, 113, 0.08)',
                padding: '8px 10px',
                fontSize: '11px',
                textTransform: 'none',
                overflowWrap: 'break-word',
              }}
            >
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <button
              type="submit"
              data-slot="onboarding-connect-btn"
              disabled={isSubmitting}
              style={{
                backgroundColor: '#AA88FF',
                color: '#000000',
                border: '1px solid #AA88FF',
                padding: '10px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: isSubmitting ? 'wait' : 'pointer',
              }}
            >
              {isSubmitting ? '[ CONECTANDO... ]' : '[ CONECTAR MOTOR LLM ]'}
            </button>

            <button
              type="button"
              data-slot="onboarding-skip-btn"
              onClick={dismissOnboarding}
              style={{
                backgroundColor: '#0D0F14',
                color: '#9A9A9A',
                border: '1px solid #1F232E',
                padding: '8px 12px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              [ PULAR E ENTRAR EM STANDBY ]
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
