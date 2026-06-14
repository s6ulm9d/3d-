import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ParticleScene } from './components/ParticleScene';

export default function App() {
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(0);
  const smoothProgress = useRef(0);
  
  // DOM references for high-performance updates without React re-renders
  const progressIndicatorRef = useRef(null);
  const stageTrackers = useRef([]);
  const textRefs = useRef([]);

  // Callback from HumanParticles when image loading & sampling completes
  const handleLoaded = useCallback(() => {
    // Artificial delay to make loading feel premium
    setTimeout(() => {
      setLoading(false);
    }, 1400);
  }, []);

  // Track window scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        scrollRef.current = window.scrollY / scrollHeight;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // High-performance animation loop for DOM overlays
  useEffect(() => {
    let animId;
    
    const updateHUD = (p) => {
      // 1. Progress Bar
      if (progressIndicatorRef.current) {
        progressIndicatorRef.current.style.width = `${p * 100}%`;
      }
      
      // 2. Scene definitions (5 Scenes from Master Rebuild Prompt)
      const stages = [
        { start: 0.0, end: 0.20, title: "THE VOID", sub: "Drifting slowly through infinite darkness" },
        { start: 0.20, end: 0.45, title: "CONVERGENCE", sub: "Consciousness slowly emerging into form" },
        { start: 0.45, end: 0.60, title: "MANIFESTATION", sub: "A volumetric energy being breathes and pulses" },
        { start: 0.60, end: 0.80, title: "CELESTIAL ROTATION", sub: "Revealing the volumetric stardust outline" },
        { start: 0.80, end: 1.00, title: "DISSOLUTION", sub: "Gently returning exactly to the infinite void" }
      ];
      
      let currentStageIndex = 0;
      
      stages.forEach((stage, index) => {
        const textNode = textRefs.current[index];
        const dotNode = stageTrackers.current[index];
        
        let opacity = 0;
        
        if (p >= stage.start && p <= stage.end) {
          currentStageIndex = index;
          
          // Calculate triangular symmetric fade
          const center = (stage.start + stage.end) / 2;
          const halfWidth = (stage.end - stage.start) / 2;
          opacity = 1 - Math.abs(p - center) / halfWidth;
          opacity = Math.pow(opacity, 1.5); // smooth curve profile
        }
        
        // Update Narrative typography using GPU-composited translate3d to avoid layout reflows
        if (textNode) {
          textNode.style.opacity = opacity;
          textNode.style.pointerEvents = opacity > 0.005 ? 'auto' : 'none';
          const translateOffset = (1.0 - opacity) * 20; // float up on enter
          textNode.style.transform = `translate3d(-50%, calc(-50% + ${translateOffset}px), 0)`;
        }
        
        // Update Stage dot classes
        if (dotNode) {
          if (p >= stage.start && p <= stage.end) {
            dotNode.classList.add('active');
          } else {
            dotNode.classList.remove('active');
          }
        }
      });
      
      // Update footer stage details
      const stageNumNode = document.getElementById('hud-stage-num');
      const stageNameNode = document.getElementById('hud-stage-name');
      if (stageNumNode) stageNumNode.innerText = `STAGE 0${currentStageIndex + 1}`;
      if (stageNameNode) stageNameNode.innerText = stages[currentStageIndex].title;
    };

    let velocity = 0;
    const stiffness = 0.06; // spring stiffness
    const damping = 0.75;    // spring damping (higher = smoother, less oscillation)

    const animLoop = () => {
      // Spring physics simulation for organic, ultra-smooth scrolling
      const diff = scrollRef.current - smoothProgress.current;
      const force = diff * stiffness;
      velocity += force;
      velocity *= damping;
      
      smoothProgress.current += velocity;
      
      // Clamp value strictly inside [0, 1] bounds
      smoothProgress.current = Math.max(0.0, Math.min(1.0, smoothProgress.current));
      
      updateHUD(smoothProgress.current);
      
      animId = requestAnimationFrame(animLoop);
    };
    
    animLoop();
    
    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="app">
      {/* Scrollable container that drives scrollY */}
      <div className="scroll-container">
        <div className="scroll-section" />
        <div className="scroll-section" />
        <div className="scroll-section" />
        <div className="scroll-section" />
        <div className="scroll-section" />
        <div className="scroll-section" />
        <div className="scroll-section" />
      </div>

      {/* Cinematic HUD Overlay */}
      <div className="hud-container">
        {/* Header */}
        <header className="hud-header">
          <div className="brand-title">
            <div className="brand-dot" />
            <span>COSMIC ENTITY REBUILD</span>
          </div>
          <div className="scroll-indicator-text">
            <span>SCROLL TO AWAKEN</span>
          </div>
        </header>

        {/* Narrative typography block */}
        <div className="narrative-container">
          <div ref={el => textRefs.current[0] = el} className="narrative-text">
            THE VOID
            <span className="narrative-subtext">Drifting slowly through infinite darkness</span>
          </div>
          <div ref={el => textRefs.current[1] = el} className="narrative-text">
            CONVERGENCE
            <span className="narrative-subtext">Consciousness slowly emerging into form</span>
          </div>
          <div ref={el => textRefs.current[2] = el} className="narrative-text">
            MANIFESTATION
            <span className="narrative-subtext">A volumetric energy being breathes and pulses</span>
          </div>
          <div ref={el => textRefs.current[3] = el} className="narrative-text">
            CELESTIAL ROTATION
            <span className="narrative-subtext">Revealing the volumetric stardust outline</span>
          </div>
          <div ref={el => textRefs.current[4] = el} className="narrative-text">
            DISSOLUTION
            <span className="narrative-subtext">Gently returning exactly to the infinite void</span>
          </div>
        </div>

        {/* Footer info panels */}
        <footer className="hud-footer">
          <div className="stage-tracker">
            <div ref={el => stageTrackers.current[0] = el} className="stage-dot active" />
            <div ref={el => stageTrackers.current[1] = el} className="stage-dot" />
            <div ref={el => stageTrackers.current[2] = el} className="stage-dot" />
            <div ref={el => stageTrackers.current[3] = el} className="stage-dot" />
            <div ref={el => stageTrackers.current[4] = el} className="stage-dot" />
          </div>
          <div className="stage-info">
            <div id="hud-stage-num" className="stage-num">STAGE 01</div>
            <div id="hud-stage-name" className="stage-name">THE VOID</div>
          </div>
        </footer>
      </div>

      {/* fixed 3D Canvas WebGL wrapper */}
      <div className="canvas-container">
        <ParticleScene scrollProgress={smoothProgress} onLoaded={handleLoaded} />
      </div>

      {/* High-performance CSS Vignette Overlay */}
      <div className="vignette-overlay" />

      {/* Progress indicators */}
      <div className="progress-bar-container">
        <div ref={progressIndicatorRef} className="progress-bar" />
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay" style={{ opacity: loading ? 1 : 0 }}>
          <div className="loading-spinner" />
          <div className="loading-text">Calibrating Consciousness...</div>
        </div>
      )}
    </div>
  );
}
