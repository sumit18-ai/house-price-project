import { Canvas } from "@react-three/fiber";
import { Float, Environment, PresentationControls, Text } from "@react-three/drei";

function ModelOption({ position, rotation, label, type, dark }) {
  const primaryColor = dark ? "#a855f7" : "#6366f1";
  const accentColor = dark ? "#d946ef" : "#818cf8";
  
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5}>
      <group position={position} rotation={rotation}>
        {type === "urban" && (
          <group position={[0, 0, 0]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[1, 3, 1]} />
              <meshPhysicalMaterial color={primaryColor} metalness={0.2} roughness={0.1} transmission={0.9} ior={1.5} thickness={2} />
            </mesh>
          </group>
        )}
        
        {type === "suburban" && (
          <group position={[0, 0, 0]}>
            <mesh position={[0, -0.6, 0]}>
              <boxGeometry args={[1.4, 1.2, 1.2]} />
              <meshPhysicalMaterial color={primaryColor} metalness={0.1} roughness={0.2} transmission={0.9} />
            </mesh>
            <mesh position={[0, 0.5, 0]} rotation={[0, Math.PI / 4, 0]}>
              <coneGeometry args={[1.2, 1.2, 4]} />
              <meshPhysicalMaterial color={accentColor} metalness={0.1} roughness={0.3} />
            </mesh>
          </group>
        )}
        
        {type === "rural" && (
          <group position={[0, 0, 0]}>
            <mesh position={[0, -0.5, 0]}>
              <cylinderGeometry args={[0.2, 0.3, 1.5, 8]} />
              <meshPhysicalMaterial color="#c28e5c" metalness={0.1} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.8, 0]}>
              <sphereGeometry args={[1.1, 32, 32]} />
              <meshPhysicalMaterial color={dark ? "#10b981" : "#34d399"} metalness={0.1} roughness={0.5} transmission={0.6} ior={1.2} />
            </mesh>
          </group>
        )}
        
        {/* Floating Text Label */}
        <Text
          position={[0, type === 'urban' ? 2 : 1.8, 0]}
          fontSize={0.4}
          color={dark ? "#ffffff" : "#1d1d1f"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor={dark ? "#000000" : "#ffffff"}
          fontWeight="bold"
        >
          {label}
        </Text>
      </group>
    </Float>
  );
}

export default function Scene({ dark }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", zIndex: 0 }}>
      <Canvas camera={{ position: [0, 0, 9], fov: 45 }}>
        <ambientLight intensity={dark ? 0.3 : 0.8} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} color={dark ? "#a855f7" : "#ffffff"} />
        <directionalLight position={[-10, -10, -10]} intensity={0.5} color="#6366f1" />
        
        <PresentationControls 
          global 
          config={{ mass: 2, tension: 500 }} 
          snap={{ mass: 4, tension: 1500 }} 
          rotation={[0, 0, 0]} 
          polar={[-Math.PI / 4, Math.PI / 4]} 
          azimuth={[-Math.PI / 3, Math.PI / 3]}
        >
          {/* Models representing the options */}
          <ModelOption position={[-4.5, 0, -2]} rotation={[0.2, 0.5, 0]} type="urban" label="Urban" dark={dark} />
          <ModelOption position={[4.5, -1.5, -1]} rotation={[-0.1, -0.6, 0]} type="suburban" label="Suburban" dark={dark} />
          <ModelOption position={[-1.5, -2.5, -4]} rotation={[0, 0.2, 0]} type="rural" label="Rural" dark={dark} />
        </PresentationControls>
        
        <Environment preset={dark ? "sunset" : "city"} />
      </Canvas>
    </div>
  );
}