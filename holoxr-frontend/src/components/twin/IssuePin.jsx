import { useRef, useState } from 'react';
import { Html } from '@react-three/drei';

const SEVERITY_COLORS = {
  Critical: '#ef4444', // red-500
  Warning:  '#f59e0b', // amber-500
  Info:     '#3b82f6', // blue-500
};

/**
 * 3D Issue Pin rendered in the scene.
 *
 * Props:
 *   issue      – the full issue object from backend
 *   selected   – boolean: visually highlight this pin
 *   onClick    – called with issue when the pin is clicked
 */
export default function IssuePin({ issue, selected = false, onClick }) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();

  const { x, y, z } = issue.position;
  const color = SEVERITY_COLORS[issue.severity] ?? '#3b82f6';

  const active = hovered || selected;

  return (
    <group position={[x, y, z]}>
      {/* Selection ring — glowing torus around the base when selected */}
      {selected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.15, 0.025, 8, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.2}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}

      {/* Cone pin body */}
      <mesh
        ref={meshRef}
        rotation={[Math.PI, 0, 0]}
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerLeave={(e) => { e.stopPropagation(); setHovered(false); }}
        onPointerDown={(e) => { e.stopPropagation(); onClick?.(issue); }}
        scale={active ? 1.25 : 1}
      >
        <coneGeometry args={[0.08, 0.28, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 0.7 : 0.15}
        />
      </mesh>

      {/* Sphere at tip */}
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 0.8 : 0.3}
        />
      </mesh>

      {/* Hover/selected tooltip */}
      {active && (
        <Html position={[0, 0.5, 0]} center distanceFactor={6} zIndexRange={[10, 11]}>
          <div className="bg-black/90 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap pointer-events-none border border-white/10 shadow-lg">
            <div className="font-semibold">{issue.title}</div>
            <div className="text-white/50 mt-0.5">{issue.severity} · {issue.type}</div>
          </div>
        </Html>
      )}
    </group>
  );
}
