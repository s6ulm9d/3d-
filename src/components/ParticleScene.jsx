import { Canvas } from '@react-three/fiber';
import { CameraController } from './CameraController';
import { HumanParticles } from './HumanParticles';

export function ParticleScene({ scrollProgress, onLoaded }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 190], fov: 45, near: 1, far: 600 }}
      dpr={[1, 2]} // High performance max 2x retina DPR limit to avoid GPU frame drops
      gl={{ 
        antialias: true, 
        alpha: false, 
        powerPreference: "high-performance",
        stencil: false,
        depth: true
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 70, 280]} />
      
      {/* Soft lighting */}
      <ambientLight intensity={0.15} />
      
      {/* Core human particle system and constellation segments */}
      <HumanParticles scrollProgress={scrollProgress} onLoaded={onLoaded} />
      
      {/* Scroll-driven camera sweep controller */}
      <CameraController scrollProgress={scrollProgress} />
    </Canvas>
  );
}
