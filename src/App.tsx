import { useEffect } from 'react';
import { KalinarGalaxyCanvas } from './components/galaxy/KalinarGalaxyCanvas.js';
import { LeftAgentCardsColumn } from './components/hud/LeftAgentCardsColumn.js';
import { RightSingularityColumn } from './components/hud/RightSingularityColumn.js';
import { TopRightTrigger } from './components/hud/TopRightTrigger.js';
import { NodeInspectorDrawer } from './components/hud/NodeInspectorDrawer.js';
import { KalinarBottomDock } from './components/dock/KalinarBottomDock.js';
import { KalinarCommandPalette } from './components/hud/KalinarCommandPalette.js';
import { kalinarVoiceService } from './services/kalinarVoiceService.js';
import { useKalinarStore } from './store/useKalinarStore.js';

export function App() {
  const {
    updateSingularityTranscript,
  } = useKalinarStore();

  useEffect(() => {
    // Connect IPC listeners if running in Electron
    if (typeof window !== 'undefined' && (window as any).kalinarApi) {
      const api = (window as any).kalinarApi;
      const cleanupVoice = api.onVoiceStateChange((state: any) => {
        if (state?.transcript) {
          updateSingularityTranscript(state.transcript);
        }
      });
      const cleanupTelemetry =
        typeof api.onTelemetryStream === 'function'
          ? api.onTelemetryStream((payload: any) => {
              if (
                payload &&
                (payload.type === 'STEP_COMPLETED' ||
                  payload.type === 'AGENT_HALTED' ||
                  payload.type === 'HARD_BLOCK')
              ) {
                void kalinarVoiceService.handleServerPushAlert(payload);
              }
            })
          : () => {};
      return () => {
        cleanupVoice();
        cleanupTelemetry();
      };
    }
  }, [updateSingularityTranscript]);

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden font-mono uppercase-telemetry">
      {/* LAYER 0: CENTRAL KALINAR BLACK HOLE SINGULARITY BACKGROUND (GPGPU ACCRETION DISK + 50K INSTANCED GALAXY) */}
      <KalinarGalaxyCanvas />

      {/* LAYER 1: ASYMMETRIC SINGULARITY HUD */}
      <div className="kalinar-hud">
        {/* Left Dynamic Column */}
        <LeftAgentCardsColumn />

        {/* Right Ethereal Column */}
        <RightSingularityColumn />

        {/* Top-Right 44x44px Second Brain Trigger */}
        <TopRightTrigger />

        {/* Second Brain Inspector Drawer */}
        <NodeInspectorDrawer />

        {/* Retractable Bottom IDE Dock */}
        <KalinarBottomDock />

        {/* Global Tactical Command Palette (Ctrl+K / Cmd+K) */}
        <KalinarCommandPalette />
      </div>
    </main>
  );
}

export default App;
