import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 3D Simplex Noise shader helper
const simplexNoiseGLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const vertexShader = `
${simplexNoiseGLSL}

uniform float uTime;
uniform float uProgress;

attribute vec3 aTarget;
attribute vec4 aRandom; // [pulsePhase, noiseScale, delayDissolve, normBgDist]
attribute float aDelay; // delayAssemble
attribute float aColorType; // 0.0 = Red, 1.0 = Blue

varying vec3 vPosition;
varying float vProgress;
varying float vIntensity;
varying float vYCoord;
varying float vColorType;
varying float vWave;
varying float vRandom;
varying float vNormBgDist;

void main() {
  vec3 pos = position; // startPosition / endPosition (Chaos Void)
  vRandom = aRandom.x;
  vNormBgDist = aRandom.w;
  
  // Scene 1 & 2 Morph: Void -> Spiral Assembly -> Formed
  float morphStart = 0.20 + aDelay * 0.12; 
  float morphEnd = 0.45;
  float morphProgress = smoothstep(morphStart, morphEnd, uProgress);
  
  vec3 currentPos = mix(pos, aTarget, morphProgress);
  
  // Continuous swirl assembly (completely conditional-free to avoid layout switches/snaps)
  float swirlFactor = (1.0 - morphProgress) * morphProgress * 4.0;
  float spiralAngle = swirlFactor * 4.0 * 3.14159265; 
  float cosS = cos(spiralAngle);
  float sinS = sin(spiralAngle);
  
  vec3 swirled = currentPos;
  swirled.x = currentPos.x * cosS - currentPos.z * sinS;
  swirled.z = currentPos.x * sinS + currentPos.z * cosS;
  
  currentPos = mix(currentPos, swirled, smoothstep(0.0, 0.5, swirlFactor));
  
  // Continuous floating drift orbit in Cosmic Chaos (no hard conditional)
  float chaosAngle = uTime * 0.04 + aRandom.x * 2.0;
  float cosC = cos(chaosAngle);
  float sinC = sin(chaosAngle);
  vec3 rotatedChaos = currentPos;
  rotatedChaos.x = currentPos.x * cosC - currentPos.z * sinC;
  rotatedChaos.z = currentPos.x * sinC + currentPos.z * cosC;
  
  vec3 noiseVal = vec3(
    snoise(pos * 0.008 + vec3(uTime * 0.08)),
    snoise(pos * 0.008 + vec3(uTime * 0.08 + 50.0)),
    snoise(pos * 0.008 + vec3(uTime * 0.08 + 100.0))
  );
  currentPos = mix(rotatedChaos + noiseVal * 12.0, currentPos, morphProgress);
  
  // Stationary formed entity (no breathing displacement to keep shape perfectly static)
  vec3 targetWithBreathe = aTarget;
  
  vec3 finalHumanPos = mix(pos, targetWithBreathe, morphProgress);
  
  // Vascular Circulation energy waves propagating from the Heart (Y = 10)
  float distToHeart = length(aTarget.xyz - vec3(0.0, 10.0, 0.0));
  float waveSpeed = 2.4;
  float waveFreq = 0.15;
  float wave = sin(distToHeart * waveFreq - uTime * waveSpeed) * 0.5 + 0.5;
  vWave = pow(wave, 4.5); // sharp wave pulse

  // Scene 4: Consciousness (60% -> 80% scroll progress)
  // Outer boundary particles (aRandom.y < 0.18) peel off and orbit the body, drifting upwards (branchless)
  float orbitWeight = step(aRandom.y, 0.18); 
  float orbitProgress = smoothstep(0.60, 0.80, uProgress) * orbitWeight;
  
  float orbitAngle = uTime * 1.3 + aRandom.x * 6.28;
  float r = length(aTarget.xz) + 2.0 + orbitProgress * 16.0;
  float rise = orbitProgress * 28.0;
  
  vec3 orbitPos = targetWithBreathe;
  orbitPos.x = sin(orbitAngle) * r;
  orbitPos.z = cos(orbitAngle) * r;
  orbitPos.y += rise + sin(uTime * 2.0 + aRandom.x * 12.0) * 4.0;
  
  vec3 targetWithOrbit = mix(finalHumanPos, orbitPos, orbitProgress);
  
  // Scene 5: Dissolution (80% -> 100% scroll progress)
  // Particles gently separate and drift back to their starting sphere positions (branchless)
  float tDissolve = clamp((uProgress - 0.80) / 0.20, 0.0, 1.0);
  
  // Quintic ease-in-out for ultra-smooth luxury drift transition (zero acceleration snaps)
  float tSmooth = tDissolve * tDissolve * tDissolve * (tDissolve * (tDissolve * 6.0 - 15.0) + 10.0);
  
  // Smooth transition from human target to the starting sphere coordinates
  vec3 basePos = mix(targetWithOrbit, pos, tSmooth);
  
  // Add a gentle, slow drifting noise to simulate floating back
  vec3 noiseInput = targetWithOrbit * 0.05 + vec3(0.0, uTime * 0.08, 0.0);
  vec3 drift = vec3(
    snoise(noiseInput),
    snoise(noiseInput + vec3(20.0, 40.0, 60.0)),
    snoise(noiseInput + vec3(60.0, 20.0, 40.0))
  );
  
  // Drift is active in the middle of the transition, fading to 0 at t=0 and t=1
  float driftAmp = sin(tDissolve * 3.14159265) * 6.0; 
  
  vec3 finalPos = basePos + drift * driftAmp;
  
  // Render projection
  vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  
  // 8K Crispness Edge Scaling:
  // Edge particles are sized to blend smoothly into the core, avoiding gaps
  float edgeScale = smoothstep(0.01, 0.25, aRandom.w);
  float baseSize = 4.2 * (0.65 + 0.35 * edgeScale);
  
  float stageSizeFactor = 1.0;
  
  if (uProgress > 0.60 && uProgress <= 0.80) {
    stageSizeFactor = 1.0 + smoothstep(0.60, 0.80, uProgress) * 0.3;
  } else if (uProgress > 0.80) {
    // Stage 5: Gently return to original sizes using the same quintic easing
    stageSizeFactor = mix(1.3, 1.0, tSmooth);
  }
  
  gl_PointSize = baseSize * stageSizeFactor * (320.0 / -mvPosition.z);
  
  // Send variables to fragment shader
  vPosition = finalPos;
  vProgress = uProgress;
  vIntensity = 1.0;
  if (uProgress > 0.60) {
    vIntensity *= (1.0 + smoothstep(0.60, 0.80, uProgress) * 0.8);
  }
  vYCoord = targetWithBreathe.y;
  vColorType = aColorType;
}
`;

const particleFragmentShader = `
uniform float uTime;
varying vec3 vPosition;
varying float vProgress;
varying float vIntensity;
varying float vYCoord;
varying float vColorType;
varying float vWave;
varying float vNormBgDist;

void main() {
  float dist = distance(gl_PointCoord, vec2(0.5));
  
  if (dist > 0.5) {
    discard;
  }
  
  // Mix sharp edge contour dots with soft volumetric inner glow to ensure razor-sharp silhouette
  float edgeFactor = smoothstep(0.0, 0.25, vNormBgDist);
  float circleGlow = 0.08 / (dist + 0.045);
  
  // High-performance smooth anti-aliased edge circle (soft edge transition from 0.48 to 0.43)
  float sharpGlow = smoothstep(0.48, 0.43, dist) * 1.2;
  float glow = mix(sharpGlow, circleGlow, edgeFactor);
  glow = clamp(glow, 0.0, 1.2);
  
  // RED AND BLUE ENERGY PALETTE
  vec3 colorRed = vec3(0.72, 0.04, 0.08); 
  vec3 colorBlue = vec3(0.04, 0.32, 0.92); 
  
  vec3 baseColor = mix(colorRed, colorBlue, vColorType);
  
  // Vascular energy pulse effect (fades out in Stage 5 so they return to quiet stars)
  float waveIntensity = 1.0;
  if (vProgress > 0.80) {
    waveIntensity = smoothstep(1.0, 0.80, vProgress);
  }
  vec3 pulseColor = mix(baseColor * 2.8, vec3(1.0), 0.45);
  vec3 finalColor = mix(baseColor, pulseColor, vWave * 0.85 * waveIntensity);
  
  // Blend white center with colored glow
  vec3 shadedColor = mix(vec3(1.0), finalColor, smoothstep(0.06, 0.45, dist));
  
  // Transparency falloff
  float alpha = smoothstep(0.5, 0.08, dist) * glow * vIntensity;
  
  // Transcendence: fade density slightly
  if (vProgress > 0.90) {
    float fadeOut = smoothstep(0.90, 1.0, vProgress);
    alpha *= mix(1.0, 0.75, fadeOut);
  }
  
  gl_FragColor = vec4(shadedColor * glow, alpha);
}
`;

const lineFragmentShader = `
uniform float uTime;
varying vec3 vPosition;
varying float vProgress;
varying float vIntensity;
varying float vYCoord;
varying float vColorType;
varying float vWave;

void main() {
  // RED AND BLUE ENERGY PALETTE (same as particles)
  vec3 colorRed = vec3(0.72, 0.04, 0.08); 
  vec3 colorBlue = vec3(0.04, 0.32, 0.92); 
  
  vec3 baseColor = mix(colorRed, colorBlue, vColorType);
  
  // Vascular energy pulse
  vec3 pulseColor = mix(baseColor * 2.8, vec3(1.0), 0.45);
  vec3 finalColor = mix(baseColor, pulseColor, vWave * 0.85);
  
  // Extremely thin, low opacity additive lines for constellation segments
  float lineAlpha = 0.075 * vIntensity;
  
  // Snaps lines instantly during the early dissolution stage (first 8% of transition)
  if (vProgress > 0.80) {
    float lineFade = smoothstep(0.80, 0.88, vProgress);
    lineAlpha *= mix(1.0, 0.0, lineFade); 
  }
  
  gl_FragColor = vec4(finalColor * 1.6, lineAlpha);
}
`;

// Helper for generating uniform spherical coordinates
function getRandomSpherePoint(minR = 40, maxR = 180) {
  const r = minR + Math.random() * (maxR - minR);
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos((Math.random() * 2) - 1);
  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi)
  };
}

// Concentric ring search for Distance Transform in pixel space
function getDistanceToBackground(startX, startY, pixels, width, height) {
  for (let r = 1; r < 30; r++) {
    for (let dy = -r; dy <= r; dy++) {
      const y = startY + dy;
      if (y < 0 || y >= height) return r;
      
      const isEdge = (dy === -r || dy === r);
      if (isEdge) {
        for (let dx = -r; dx <= r; dx++) {
          const x = startX + dx;
          if (x < 0 || x >= width) return r;
          const idx = (y * width + x) * 4;
          const isBg = (pixels[idx] >= 150 && pixels[idx+1] >= 150 && pixels[idx+2] >= 150) || pixels[idx+3] < 50;
          if (isBg) return Math.sqrt(dx*dx + dy*dy);
        }
      } else {
        for (let dx of [-r, r]) {
          const x = startX + dx;
          if (x < 0 || x >= width) return r;
          const idx = (y * width + x) * 4;
          const isBg = (pixels[idx] >= 150 && pixels[idx+1] >= 150 && pixels[idx+2] >= 150) || pixels[idx+3] < 50;
          if (isBg) return Math.sqrt(dx*dx + dy*dy);
        }
      }
    }
  }
  return 30;
}

export function HumanParticles({ scrollProgress, onLoaded }) {
  const pointsRef = useRef();
  const linesRef = useRef();
  const pointsMatRef = useRef();
  const linesMatRef = useRef();
  const [particlesData, setParticlesData] = useState(null);

  // Load and sample the image silhouette
  useEffect(() => {
    const img = new Image();
    img.src = '/images.png';
    img.onload = () => {
      // 1. A 128x128 canvas for fast distance transform (thickness map)
      const canvas128 = document.createElement('canvas');
      const ctx128 = canvas128.getContext('2d');
      canvas128.width = 128;
      canvas128.height = 128;
      ctx128.drawImage(img, 0, 0, 128, 128);
      const pixels128 = ctx128.getImageData(0, 0, 128, 128).data;

      const depthMap = new Float32Array(128 * 128);
      for (let y = 0; y < 128; y++) {
        for (let x = 0; x < 128; x++) {
          const idx = (y * 128 + x) * 4;
          const r = pixels128[idx];
          const g = pixels128[idx + 1];
          const b = pixels128[idx + 2];
          const a = pixels128[idx + 3];
          
          const isTransparent = a < 125; // moderate threshold for smooth antialiased edges without fuzziness
          const isWhite = r > 180 && g > 180 && b > 180;
          const isSilhouette = !isTransparent && !isWhite && (r < 120 && g < 120 && b < 120);
          
          if (isSilhouette) {
            depthMap[y * 128 + x] = getDistanceToBackground(x, y, pixels128, 128, 128);
          } else {
            depthMap[y * 128 + x] = 0;
          }
        }
      }

      // 2. A high resolution 512x512 canvas for pixel-perfect coordinates
      const canvas512 = document.createElement('canvas');
      const ctx512 = canvas512.getContext('2d');
      canvas512.width = 512;
      canvas512.height = 512;
      ctx512.drawImage(img, 0, 0, 512, 512);
      const pixels512 = ctx512.getImageData(0, 0, 512, 512).data;
      
      const rawPoints = [];
      let minX = 512;
      let maxX = 0;
      let minY = 512;
      let maxY = 0;

      for (let y = 0; y < 512; y++) {
        for (let x = 0; x < 512; x++) {
          const idx = (y * 512 + x) * 4;
          const r = pixels512[idx];
          const g = pixels512[idx + 1];
          const b = pixels512[idx + 2];
          const a = pixels512[idx + 3];
          
          const isTransparent = a < 125; // moderate threshold for smooth antialiased edges without fuzziness
          const isWhite = r > 180 && g > 180 && b > 180;
          const isSilhouette = !isTransparent && !isWhite && (r < 120 && g < 120 && b < 120);
          
          if (isSilhouette) {
            rawPoints.push({ px: x, py: y });
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (rawPoints.length === 0) {
        console.warn("Could not find any silhouette points in images.png.");
        for (let i = 0; i < 1000; i++) {
          rawPoints.push({ px: 256 + (Math.random() - 0.5) * 80, py: 256 + (Math.random() - 0.5) * 320 });
        }
        minX = 216;
        maxX = 296;
        minY = 96;
        maxY = 416;
      }

      const bodyWidth = maxX - minX;
      const bodyHeight = maxY - minY;
      
      const scaleY = 70; 
      const aspectRatio = bodyWidth / bodyHeight;
      const scaleX = scaleY * aspectRatio;

      // Desktop: 250k particles
      // Mobile: 30k particles
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const count = isMobile ? 30000 : 250000;
      
      const startPositions = new Float32Array(count * 3);
      const targetPositions = new Float32Array(count * 3);
      const randoms = new Float32Array(count * 4); // [pulseSpeed, noiseScale, delayDissolve, normBgDist]
      const delays = new Float32Array(count); // delayAssemble
      const colorTypes = new Float32Array(count);
      
      const processedPoints = rawPoints.map(pt => {
        const nx = ((pt.px - minX) / bodyWidth) - 0.5;
        const ny = 0.5 - ((pt.py - minY) / bodyHeight);
        const sx = nx * scaleX;
        const sy = ny * scaleY;
        const dist = Math.sqrt(sx * sx + sy * sy);
        
        const mapX = Math.min(127, Math.max(0, Math.floor(pt.px * (128 / 512))));
        const mapY = Math.min(127, Math.max(0, Math.floor(pt.py * (128 / 512))));
        const bgDist = depthMap[mapY * 128 + mapX];
        
        return { sx, sy, dist, bgDist };
      });
      
      let maxDist = 0;
      processedPoints.forEach(p => {
        if (p.dist > maxDist) maxDist = p.dist;
      });
      
      let maxBgDist = 0;
      processedPoints.forEach(p => {
        if (p.bgDist > maxBgDist) maxBgDist = p.bgDist;
      });

      for (let i = 0; i < count; i++) {
        const pt = processedPoints[i % processedPoints.length];
        
        const x = pt.sx;
        const y = pt.sy;
        
        const depthRadius = pt.bgDist * (scaleY / 128) * 1.55; 
        const theta = Math.random() * Math.PI * 2;
        const radialScale = Math.sqrt(Math.random());
        const z = Math.sin(theta) * radialScale * depthRadius;

        targetPositions[i * 3] = x;
        targetPositions[i * 3 + 1] = y;
        targetPositions[i * 3 + 2] = z;
        
        const spherePt = getRandomSpherePoint(40, 180);
        startPositions[i * 3] = spherePt.x;
        startPositions[i * 3 + 1] = spherePt.y;
        startPositions[i * 3 + 2] = spherePt.z;
        
        const normalizedDistance = pt.dist / maxDist;
        const delayAssemble = (1.0 - normalizedDistance) * 0.55 + Math.random() * 0.08;
        const delayDissolve = (35.0 - y) / 70.0; 
        
        delays[i] = delayAssemble;
        
        const normBgDist = maxBgDist > 0 ? pt.bgDist / maxBgDist : 0;
        
        randoms[i * 4] = Math.random(); 
        randoms[i * 4 + 1] = 0.5 + Math.random() * 1.5; 
        randoms[i * 4 + 2] = delayDissolve; 
        randoms[i * 4 + 3] = normBgDist; 
        
        colorTypes[i] = Math.random() < 0.5 ? 0.0 : 1.0;
      }

      // Procedural Constellation web mapping
      const numLines = isMobile ? 1000 : 4000;
      const lineStartPositions = new Float32Array(numLines * 2 * 3);
      const lineTargetPositions = new Float32Array(numLines * 2 * 3);
      const lineRandoms = new Float32Array(numLines * 2 * 4);
      const lineDelays = new Float32Array(numLines * 2);
      const lineColorTypes = new Float32Array(numLines * 2);

      const nodes = [];
      for (let i = 0; i < numLines; i++) {
        nodes.push(processedPoints[Math.floor(Math.random() * processedPoints.length)]);
      }

      let lineVertIdx = 0;
      for (let i = 0; i < numLines; i++) {
        const p1 = nodes[i];
        
        let minDist = Infinity;
        let p2 = null;
        for (let j = 0; j < numLines; j++) {
          if (i === j) continue;
          const dx = nodes[j].sx - p1.sx;
          const dy = nodes[j].sy - p1.sy;
          const d2 = dx*dx + dy*dy;
          if (d2 < minDist) {
            minDist = d2;
            p2 = nodes[j];
          }
        }

        if (p2) {
          const depthRad1 = p1.bgDist * (scaleY / 128) * 1.55;
          const z1 = Math.sin(Math.random() * Math.PI * 2) * Math.sqrt(Math.random()) * depthRad1;

          const depthRad2 = p2.bgDist * (scaleY / 128) * 1.55;
          const z2 = Math.sin(Math.random() * Math.PI * 2) * Math.sqrt(Math.random()) * depthRad2;

          // endpoint 1:
          lineTargetPositions[lineVertIdx * 3] = p1.sx;
          lineTargetPositions[lineVertIdx * 3 + 1] = p1.sy;
          lineTargetPositions[lineVertIdx * 3 + 2] = z1;

          const spherePt1 = getRandomSpherePoint(40, 180);
          lineStartPositions[lineVertIdx * 3] = spherePt1.x;
          lineStartPositions[lineVertIdx * 3 + 1] = spherePt1.y;
          lineStartPositions[lineVertIdx * 3 + 2] = spherePt1.z;

          const normDist1 = p1.dist / maxDist;
          lineDelays[lineVertIdx] = (1.0 - normDist1) * 0.55 + Math.random() * 0.08;

          const normBgDist1 = maxBgDist > 0 ? p1.bgDist / maxBgDist : 0;
          const delayDiss1 = (35.0 - p1.sy) / 70.0;
          lineRandoms[lineVertIdx * 4] = Math.random();
          lineRandoms[lineVertIdx * 4 + 1] = 0.5 + Math.random() * 1.5;
          lineRandoms[lineVertIdx * 4 + 2] = delayDiss1;
          lineRandoms[lineVertIdx * 4 + 3] = normBgDist1;
          
          lineColorTypes[lineVertIdx] = Math.random() < 0.5 ? 0.0 : 1.0;
          lineVertIdx++;

          // endpoint 2:
          lineTargetPositions[lineVertIdx * 3] = p2.sx;
          lineTargetPositions[lineVertIdx * 3 + 1] = p2.sy;
          lineTargetPositions[lineVertIdx * 3 + 2] = z2;

          const spherePt2 = getRandomSpherePoint(40, 180);
          lineStartPositions[lineVertIdx * 3] = spherePt2.x;
          lineStartPositions[lineVertIdx * 3 + 1] = spherePt2.y;
          lineStartPositions[lineVertIdx * 3 + 2] = spherePt2.z;

          const normDist2 = p2.dist / maxDist;
          lineDelays[lineVertIdx] = (1.0 - normDist2) * 0.55 + Math.random() * 0.08;

          const normBgDist2 = maxBgDist > 0 ? p2.bgDist / maxBgDist : 0;
          const delayDiss2 = (35.0 - p2.sy) / 70.0;
          lineRandoms[lineVertIdx * 4] = Math.random();
          lineRandoms[lineVertIdx * 4 + 1] = 0.5 + Math.random() * 1.5;
          lineRandoms[lineVertIdx * 4 + 2] = delayDiss2;
          lineRandoms[lineVertIdx * 4 + 3] = normBgDist2;

          lineColorTypes[lineVertIdx] = Math.random() < 0.5 ? 0.0 : 1.0;
          lineVertIdx++;
        }
      }
      
      setParticlesData({
        points: {
          count,
          startPositions,
          targetPositions,
          randoms,
          delays,
          colorTypes
        },
        lines: {
          count: numLines * 2,
          startPositions: lineStartPositions,
          targetPositions: lineTargetPositions,
          randoms: lineRandoms,
          delays: lineDelays,
          colorTypes: lineColorTypes
        }
      });
      
      onLoaded();
    };
    img.onerror = (err) => {
      console.error("Failed to load images.png", err);
    };
  }, [onLoaded]);

  // Update uniform values inside the render loop
  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    const progress = scrollProgress.current;

    if (pointsMatRef.current) {
      pointsMatRef.current.uniforms.uTime.value = elapsed;
      pointsMatRef.current.uniforms.uProgress.value = progress;
    }
    if (linesMatRef.current) {
      linesMatRef.current.uniforms.uTime.value = elapsed;
      linesMatRef.current.uniforms.uProgress.value = progress;
    }
  });

  if (!particlesData) return null;

  return (
    <group>
      {/* 1. Point Cloud Particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlesData.points.count}
            array={particlesData.points.startPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aTarget"
            count={particlesData.points.count}
            array={particlesData.points.targetPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aRandom"
            count={particlesData.points.count}
            array={particlesData.points.randoms}
            itemSize={4}
          />
          <bufferAttribute
            attach="attributes-aDelay"
            count={particlesData.points.count}
            array={particlesData.points.delays}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aColorType"
            count={particlesData.points.count}
            array={particlesData.points.colorTypes}
            itemSize={1}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={pointsMatRef}
          vertexShader={vertexShader}
          fragmentShader={particleFragmentShader}
          transparent={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            uTime: { value: 0 },
            uProgress: { value: 0 }
          }}
        />
      </points>

      {/* 2. Constellation Lines */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlesData.lines.count}
            array={particlesData.lines.startPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aTarget"
            count={particlesData.lines.count}
            array={particlesData.lines.targetPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aRandom"
            count={particlesData.lines.count}
            array={particlesData.lines.randoms}
            itemSize={4}
          />
          <bufferAttribute
            attach="attributes-aDelay"
            count={particlesData.lines.count}
            array={particlesData.lines.delays}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aColorType"
            count={particlesData.lines.count}
            array={particlesData.lines.colorTypes}
            itemSize={1}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={linesMatRef}
          vertexShader={vertexShader}
          fragmentShader={lineFragmentShader}
          transparent={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            uTime: { value: 0 },
            uProgress: { value: 0 }
          }}
        />
      </lineSegments>
    </group>
  );
}
