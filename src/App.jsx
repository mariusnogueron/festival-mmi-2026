import { OrbitControls, Environment } from "@react-three/drei";
import Scene from "./Scene";
import { Canvas } from "@react-three/fiber";
import { Perf } from "r3f-perf";

function App() {
  return (
    <Canvas className="!w-svw !h-svh">
      <Scene />
      {/* <color attach="background" args={["black"]} /> */}

      <OrbitControls />
      <Environment preset="studio" />

      <Perf />
    </Canvas>
  );
}

export default App;
