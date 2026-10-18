"use client";

import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Lightformer, MeshDistortMaterial, RoundedBox } from "@react-three/drei";
import type { Group, Mesh } from "three";

/**
 * Hero 3D scene: a slowly morphing "ink drop" with suggestion cards orbiting it.
 * Everything is procedural (no model or HDR downloads); lighting comes from local Lightformers.
 */

const CARDS: Array<{ pos: [number, number, number]; rot: [number, number, number]; color: string; scale: number }> = [
  { pos: [-2.15, 1.05, 0.4], rot: [0.15, 0.45, -0.12], color: "#f87171", scale: 1 },
  { pos: [2.25, 0.55, -0.2], rot: [-0.1, -0.5, 0.1], color: "#60a5fa", scale: 0.9 },
  { pos: [1.55, -1.35, 0.7], rot: [0.25, -0.3, 0.18], color: "#c084fc", scale: 0.8 },
  { pos: [-1.7, -1.2, -0.5], rot: [-0.2, 0.4, -0.08], color: "#34d399", scale: 0.75 },
];

function Card({ pos, rot, color, scale }: (typeof CARDS)[number]) {
  return (
    <Float speed={1.6} rotationIntensity={0.6} floatIntensity={0.9}>
      <group position={pos} rotation={rot} scale={scale}>
        <RoundedBox args={[1.25, 0.72, 0.08]} radius={0.08} smoothness={6}>
          <meshPhysicalMaterial color="#ffffff" roughness={0.25} metalness={0} transmission={0.6} thickness={0.4} clearcoat={1} />
        </RoundedBox>
        {/* a coloured "underline" and two text bars */}
        <mesh position={[-0.12, 0.12, 0.05]}>
          <boxGeometry args={[0.78, 0.07, 0.01]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
        <mesh position={[-0.27, -0.06, 0.05]}>
          <boxGeometry args={[0.48, 0.07, 0.01]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
        <mesh position={[-0.27, -0.13, 0.05]}>
          <boxGeometry args={[0.48, 0.02, 0.01]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0.42, -0.1, 0.05]}>
          <sphereGeometry args={[0.07, 24, 24]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
      </group>
    </Float>
  );
}

function Blob({ reduced }: { reduced: boolean }) {
  const mesh = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (!reduced && mesh.current) mesh.current.rotation.y += dt * 0.15;
  });
  return (
    <mesh ref={mesh} scale={1.35}>
      <icosahedronGeometry args={[1, 64]} />
      <MeshDistortMaterial color="#7c5cff" distort={reduced ? 0.25 : 0.38} speed={reduced ? 0 : 1.4} roughness={0.12} metalness={0.15} clearcoat={1} clearcoatRoughness={0.1} />
    </mesh>
  );
}

/** Tilts the whole scene toward the pointer, eased. */
function Rig({ children, reduced }: { children: React.ReactNode; reduced: boolean }) {
  const group = useRef<Group>(null);
  const { pointer } = useThree();
  useFrame(() => {
    if (!group.current || reduced) return;
    group.current.rotation.y += (pointer.x * 0.35 - group.current.rotation.y) * 0.05;
    group.current.rotation.x += (-pointer.y * 0.2 - group.current.rotation.x) * 0.05;
  });
  return <group ref={group}>{children}</group>;
}

export default function HeroScene({ reduced = false, paused = false }: { reduced?: boolean; paused?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6.2], fov: 42 }}
      frameloop={paused || reduced ? "demand" : "always"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      aria-hidden
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      <Rig reduced={reduced}>
        <Blob reduced={reduced} />
        {CARDS.map((c, i) => (
          <Card key={i} {...c} />
        ))}
      </Rig>
      <Environment resolution={128}>
        <Lightformer intensity={2.2} position={[0, 4, 3]} scale={[8, 2, 1]} color="#ffffff" />
        <Lightformer intensity={1.4} position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} color="#a78bfa" />
        <Lightformer intensity={1.2} position={[5, -1, 2]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} color="#60a5fa" />
        {/* rim light from behind, so the drop's silhouette glows instead of going black */}
        <Lightformer form="ring" intensity={2.5} position={[0, 0, -6]} scale={6} color="#c4b5fd" />
      </Environment>
    </Canvas>
  );
}
