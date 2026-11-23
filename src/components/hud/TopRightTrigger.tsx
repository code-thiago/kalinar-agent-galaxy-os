import { useKalinarStore } from '../../store/useKalinarStore.js';

export function TopRightTrigger() {
  const { agents, toggleInspectorDrawer, isInspectorDrawerOpen, toggleCommandPalette } =
    useKalinarStore();

  const handleSecondBrainTrigger = () => {
    toggleInspectorDrawer();
  };

  return (
    <div
      data-slot="top-right-trigger"
      className="fixed top-[44px] right-[24px] flex items-center gap-3 z-30 select-none pointer-events-auto"
      style={{
        top: '44px',
        right: '24px',
        pointerEvents: 'auto',
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
    >
      {/* 44x44px circular counter showing active agent count */}
      <div
        className="w-[44px] h-[44px] rounded-full border border-[#AA88FF] bg-[rgba(13,15,20,0.88)] flex items-center justify-center font-mono text-[13px] font-bold text-[#AA88FF] tabular-nums shadow-sm"
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '9999px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(13, 15, 20, 0.88)',
          color: '#AA88FF',
          border: '1px solid #AA88FF',
        }}
        title="Agentes Ativos"
      >
        {agents.length}
      </div>

      {/* Global Command Palette Shortcut Trigger (Ctrl+K) */}
      <button
        type="button"
        data-slot="command-palette-trigger"
        onClick={toggleCommandPalette}
        className="h-[44px] px-3 border border-[#2A2A2A] hover:border-[#AA88FF] bg-[rgba(13,15,20,0.88)] text-[#DDDDDD] hover:text-[#AA88FF] font-mono text-[11px] uppercase tracking-wider transition-all cursor-pointer flex items-center"
        style={{
          height: '44px',
          padding: '0 12px',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(13, 15, 20, 0.88)',
          color: '#DDDDDD',
          border: '1px solid #2A2A2A',
        }}
        title="Abrir Paleta de Comando Tatica (Ctrl+K)"
      >
        [ CTRL+K ]
      </button>

      {/* [ ACIONAR SECOND BRAIN ] trigger */}
      <button
        type="button"
        onClick={handleSecondBrainTrigger}
        className="h-[44px] px-4 border border-[#2A2A2A] hover:border-[#AA88FF] bg-[rgba(13,15,20,0.88)] text-[#DDDDDD] hover:text-[#AA88FF] font-mono text-[11px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
        style={{
          height: '44px',
          padding: '0 14px',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(13, 15, 20, 0.88)',
          color: '#DDDDDD',
          border: '1px solid #2A2A2A',
        }}
      >
        <span>[ {isInspectorDrawerOpen ? 'FECHAR GAVETA' : 'ACIONAR SECOND BRAIN'} ]</span>
        <span className="w-2 h-2 rounded-full bg-[var(--ds-status-active-fg)] animate-pulse" />
      </button>
    </div>
  );
}
