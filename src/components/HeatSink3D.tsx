import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

interface HeatSink3DProps {
  width: number;
  length: number;
  height: number;
  finThickness: number;
  baseThickness: number;
  numberOfFins: number;
  spacing: number;
}

function HeatSinkMesh({
  width,
  length,
  height,
  finThickness,
  baseThickness,
  numberOfFins,
  spacing,
}: HeatSink3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    }
  });

  // Convert mm to scene units (scale down)
  const scale = 0.01;
  const scaledWidth = width * scale;
  const scaledLength = length * scale;
  const scaledHeight = height * scale;
  const scaledFinThickness = finThickness * scale;
  const scaledBaseThickness = baseThickness * scale;
  const scaledSpacing = spacing * scale;

  return (
    <group ref={groupRef}>
      <mesh position={[0, -scaledBaseThickness / 2, 0]}>
        <boxGeometry
          args={[
            Math.max(0.1, scaledWidth),
            Math.max(0.01, scaledBaseThickness),
            Math.max(0.1, scaledLength),
          ]}
        />
        <meshPhongMaterial color="#ff6b35" />
      </mesh>

      {Array.from({ length: Math.max(1, numberOfFins) }, (_, i) => {
        const totalFinWidth = numberOfFins * scaledFinThickness;
        const totalSpacing = (numberOfFins + 1) * scaledSpacing;
        const actualWidth = Math.max(scaledWidth, totalFinWidth + totalSpacing);

        const finPosition =
          -actualWidth / 2 +
          scaledSpacing +
          scaledFinThickness / 2 +
          i * (scaledFinThickness + scaledSpacing);

        return (
          <mesh key={i} position={[finPosition, scaledHeight / 2, 0]}>
            <boxGeometry
              args={[
                Math.max(0.01, scaledFinThickness),
                Math.max(0.1, scaledHeight),
                Math.max(0.1, scaledLength),
              ]}
            />
            <meshPhongMaterial color="#ffa500" />
          </mesh>
        );
      })}

      <Text
        position={[0, scaledHeight + 0.5, 0]}
        fontSize={0.2}
        color="#4A90E2"
        anchorX="center"
        anchorY="middle"
      >
        {`${width.toFixed(1)}mm × ${length}mm`}
      </Text>

      <Text
        position={[scaledWidth / 2 + 0.5, scaledHeight / 2, 0]}
        fontSize={0.15}
        color="#4A90E2"
        anchorX="left"
        anchorY="middle"
      >
        {`${numberOfFins} fins`}
      </Text>
    </group>
  );
}

const HeatSink3D: React.FC<HeatSink3DProps> = (props) => {
  return (
    <div className="w-full h-full min-h-[400px] rounded-lg overflow-hidden bg-gradient-to-br from-accent to-muted">
      <Canvas camera={{ position: [3, 2, 3], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.3} />

        <HeatSinkMesh {...props} />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={8}
        />

        <gridHelper
          args={[10, 20, "#4A90E2", "#888888"]}
          position={[0, -1, 0]}
        />
      </Canvas>
    </div>
  );
};

export default HeatSink3D;
