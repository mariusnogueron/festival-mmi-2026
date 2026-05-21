import { Suspense, useEffect } from "react";
import Scene from "./Scene";
import { Canvas } from "@react-three/fiber";
import { Perf } from "r3f-perf";
import { useControls } from "leva";
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
  const { aoIntensity, aoRadius, bloomIntensity } = useControls(
    "Post-processing",
    {
      aoIntensity: {
        label: "AO intensité",
        value: 6,
        min: 0,
        max: 20,
        step: 0.5,
      },
      aoRadius: { label: "AO rayon", value: 0.9, min: 0.1, max: 5, step: 0.1 },
      bloomIntensity: {
        label: "Bloom",
        value: 0.25,
        min: 0,
        max: 3,
        step: 0.05,
      },
    }
  );

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
        <Perf position="top-left" />
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
