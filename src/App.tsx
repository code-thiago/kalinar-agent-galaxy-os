import { useEffect } from 'react';
import { KalinarGalaxyCanvas } from './components/galaxy/KalinarGalaxyCanvas.js';
import { LeftAgentCardsColumn } from './components/hud/LeftAgentCardsColumn.js';
import { RightSingularityColumn } from './components/hud/RightSingularityColumn.js';
import { TopRightTrigger } from './components/hud/TopRightTrigger.js';
import { NodeInspectorDrawer } from './components/hud/NodeInspectorDrawer.js';
import { RetractableIdeDock } from './components/ui/RetractableIdeDock.js';
import { useKalinarStore } from './store/useKalinarStore.js';

export function App() {
  const {
    isBottomDockExpanded,
    toggleBottomDock,
    agents,
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
      return () => {
        cleanupVoice();
      };
    }
  }, [updateSingularityTranscript]);

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden font-mono uppercase-telemetry">
      {/* LAYER 0: CENTRAL KALINAR BLACK HOLE SINGULARITY BACKGROUND (GPGPU ACCRETION DISK + 50K INSTANCED GALAXY) */}
      <KalinarGalaxyCanvas />

      {/* LAYER 1: ASYMMETRIC SINGULARITY HUD */}
      <div className="kalinar-hud relative inset-0 w-full h-full pointer-events-none z-10">
        {/* Left Dynamic Column */}
        <LeftAgentCardsColumn />

        {/* Top-Right Trigger */}
        <TopRightTrigger />

        {/* Right Ethereal Column */}
        <RightSingularityColumn />

        {/* Second Brain Inspector Drawer */}
        <NodeInspectorDrawer />

        {/* Retractable Bottom IDE Dock */}
        <RetractableIdeDock.Root
          isExpanded={isBottomDockExpanded}
          onToggleExpand={toggleBottomDock}
        >
          <RetractableIdeDock.TacticalBar
            isExpanded={isBottomDockExpanded}
            activeAgentsCount={agents.length}
            circuitState="CLOSED"
          />
          <RetractableIdeDock.Workspace isExpanded={isBottomDockExpanded} />
        </RetractableIdeDock.Root>
      </div>
    </main>
  );
}

export default App;
