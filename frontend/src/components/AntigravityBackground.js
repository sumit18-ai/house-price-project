import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ParticleVortex = () => {
  const pointsRef = useRef();
  const mouse = useRef(new THREE.Vector2(-1000, -1000)); // Offscreen initially
  
  const count = 5000;
  
  // Track base positions to spring back to, and current mutating positions
  const { basePositions, currentPositions, colors } = useMemo(() => {
    const basePositions = new Float32Array(count * 3);
    const currentPositions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    const palette = [
      new THREE.Color('#4285F4'), 
      new THREE.Color('#EA4335'), 
      new THREE.Color('#FBBC04'), 
      new THREE.Color('#34A853'), 
      new THREE.Color('#00f0ff'), 
      new THREE.Color('#8a2be2'), 
    ];

    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(i) * 0.45;
      const theta = i * 2.3999632;
      
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      const z = (Math.random() - 0.5) * 3; 

      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;
      
      currentPositions[i * 3] = x;
      currentPositions[i * 3 + 1] = y;
      currentPositions[i * 3 + 2] = z;

      const color = palette[i % palette.length];
      const distanceFade = Math.max(0.1, 1 - (r / 30));
      
      colors[i * 3] = color.r * distanceFade;
      colors[i * 3 + 1] = color.g * distanceFade;
      colors[i * 3 + 2] = color.b * distanceFade;
    }
    return { basePositions, currentPositions, colors };
  }, [count]);

  // Listen to window mouse movements since the canvas is pointerEvents: none
  useEffect(() => {
    const updateMouse = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', updateMouse);
    return () => window.removeEventListener('mousemove', updateMouse);
  }, []);

  // Pre-allocate to avoid GC thrashing in useFrame
  const mouseWorld = useMemo(() => new THREE.Vector3(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    
    // Constant slow environmental rotation
    pointsRef.current.rotation.z -= delta * 0.05;
    
    // Unproject 2D mouse into 3D plane intersecting our particle system
    raycaster.setFromCamera(mouse.current, state.camera);
    raycaster.ray.intersectPlane(plane, mouseWorld);
    
    // Convert generic 3D world intersection point to local coordinates of our rotated group
    pointsRef.current.worldToLocal(mouseWorld);

    // Get the raw array of vertices
    const positions = pointsRef.current.geometry.attributes.position.array;
    
    // Physics parameters
    const interactRadius = 3.5;
    const repelStrength = 0.8;
    const returnSpeed = 0.12;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      
      const baseX = basePositions[idx];
      const baseY = basePositions[idx + 1];
      const baseZ = basePositions[idx + 2];
      
      let currX = positions[idx];
      let currY = positions[idx + 1];
      let currZ = positions[idx + 2];
      
      // Compute distance to mouse
      const dx = mouseWorld.x - currX;
      const dy = mouseWorld.y - currY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < interactRadius) {
        // Strong repulsion force scattering the particles away from the cursor
        const force = (interactRadius - dist) / interactRadius;
        const pushX = (dx / dist) * force * repelStrength;
        const pushY = (dy / dist) * force * repelStrength;
        
        currX -= pushX;
        currY -= pushY;
      }
      
      // Calculate spring forces back to the original spiral coordinate
      currX += (baseX - currX) * returnSpeed;
      currY += (baseY - currY) * returnSpeed;
      currZ += (baseZ - currZ) * returnSpeed;
      
      positions[idx] = currX;
      positions[idx + 1] = currY;
      positions[idx + 2] = currZ;
    }
    
    // Flag React-Three-Fiber to update the GPU buffer
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={currentPositions.length / 3}
          array={currentPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        vertexColors={true}
        transparent={true}
        opacity={0.8}
        sizeAttenuation={true}
      />
    </points>
  );
};

export default function AntigravityBackground() {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, pointerEvents: 'none' }}>
      <Canvas camera={{ position: [0, 0, 22], fov: 60 }} gl={{ antialias: true, alpha: true }}>
        <group position={[-5, 0, 0]}>
          <ParticleVortex />
        </group>
      </Canvas>
    </div>
  );
}
