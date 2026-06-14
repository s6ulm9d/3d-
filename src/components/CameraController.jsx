import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function CameraController({ scrollProgress }) {
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const targetPos = useRef(new THREE.Vector3(0, 0, 190));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state) => {
    const p = scrollProgress.current;

    if (p <= 0.20) {
      // Scene 1: The Void (0% -> 20%)
      // Camera very far away, slow drifting in darkness
      const t = p / 0.20;
      targetPos.current.set(0, 5 + 2 * t, 190 - 10 * t); // Z: 190 -> 180
      targetLookAt.current.set(0, 0, 0);
    } else if (p <= 0.40) {
      // Scene 2: Particle Convergence (20% -> 40%)
      // Slow approach to the partially visible body
      const t = (p - 0.20) / 0.20;
      targetPos.current.set(0, 7 - 2 * t, 180 - 80 * t); // Z: 180 -> 100
      targetLookAt.current.set(0, 5 * t, 0);
    } else if (p <= 0.60) {
      // Scene 3: Human Formation Complete (40% -> 60%)
      // Zoom out a little bit to see the full body in all its glory
      const t = (p - 0.40) / 0.20;
      targetPos.current.set(0, 5 + 3 * t, 100 + 25 * t); // Z zooms out: 100 -> 125
      targetLookAt.current.set(0, 5 + 7 * t, 0); // lookAt height: 5 -> 12
    } else if (p <= 0.80) {
      // Scene 4: Human Rotation (60% -> 80%)
      // Orbit camera sweep around the stationary human at the zoomed-out distance
      const t = (p - 0.60) / 0.20;
      const angle = t * 0.35; // gentle orbit sweep
      const radius = 125 + 10 * t; // Radius: 125 -> 135
      
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      
      targetPos.current.set(x, 8, z);
      targetLookAt.current.set(0, 12, 0);
    } else {
      // Stage 5: Dissolution (80% -> 100%)
      // Camera stays centered, dollys back and aligns with Stage 1
      const t = (p - 0.80) / 0.20; // 0.0 -> 1.0
      
      const startX = Math.sin(0.35) * 135.0;
      const startY = 8.0;
      const startZ = Math.cos(0.35) * 135.0;
      const startLookAtY = 12.0;
      
      const endX = 0.0;
      const endY = 5.0;
      const endZ = 190.0;
      const endLookAtY = 0.0;
      
      const targetX = THREE.MathUtils.lerp(startX, endX, t);
      const targetY = THREE.MathUtils.lerp(startY, endY, t);
      const targetZ = THREE.MathUtils.lerp(startZ, endZ, t);
      const lookY = THREE.MathUtils.lerp(startLookAtY, endLookAtY, t);
      
      targetPos.current.set(targetX, targetY, targetZ);
      targetLookAt.current.set(0, lookY, 0);
    }

    // Apply linear interpolation for smooth motion glide
    state.camera.position.lerp(targetPos.current, 0.035);
    currentLookAt.current.lerp(targetLookAt.current, 0.035);
    state.camera.lookAt(currentLookAt.current);
  });

  return null;
}
