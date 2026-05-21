import { Suspense, useEffect } from "react";
import Scene from "./Scene";
import { Canvas } from "@react-three/fiber";
import {
  EffectComposer,
  N8AO,
  Bloom,
  ToneMapping,
  SMAA,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { PCFShadowMap } from "three";
import { HoverTooltipOverlay, SceneMessageOverlay } from "./hover-ui-context.jsx";
import { useTerminal } from "./terminal-context.jsx";
import TerminalOverlay from "./components/TerminalOverlay.jsx";
import InspectHint from "./components/InspectHint.jsx";
import { useHub } from "./hub-context.jsx";
import WelcomeHub from "./WelcomeHub.jsx";
import EndingScene from "./components/EndingScene.jsx";
import { setSceneAmbientActive } from "./audio.js";
import { POST_PROCESSING } from "./scene-config.js";

function TerminalUI() {
  const { screenRect } = useTerminal();

  return (
    <TerminalOverlay
      screenPos={screenRect ? { x: screenRect.x, y: screenRect.y } : null}
      screenSize={
        screenRect
          ? { width: screenRect.width, height: screenRect.height }
          : null
      }
    />
  );
}

function App() {
  const { started, exiting, soundEnabled } = useHub();
  const { screenMeshRef } = useTerminal();

  useEffect(() => {
    setSceneAmbientActive(started && !exiting && soundEnabled);
    return () => setSceneAmbientActive(false);
  }, [started, exiting, soundEnabled]);
  const { aoIntensity, aoRadius, bloomIntensity } = POST_PROCESSING;

  return (
    <>
      <Canvas
        flat
        dpr={[1, 1.5]}
        shadows={{ type: PCFShadowMap }}
        className="w-svw! h-svh!"
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>

        <Suspense fallback={null}>
          <EndingScene minitelScreenRef={screenMeshRef} />
        </Suspense>

        <EffectComposer multisampling={0}>
          <N8AO
            aoRadius={aoRadius}
            intensity={aoIntensity}
            aoSamples={8}
            denoiseSamples={4}
            screenSpaceRadius
          />
          <Bloom
            luminanceThreshold={0.9}
            intensity={bloomIntensity}
            mipmapBlur
          />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <SMAA />
        </EffectComposer>
      </Canvas>
      <WelcomeHub />
      {started && !exiting && (
        <>
          <TerminalUI />
          <InspectHint />
          <HoverTooltipOverlay />
          <SceneMessageOverlay />
        </>
      )}
    </>
  );
}

export default App;
