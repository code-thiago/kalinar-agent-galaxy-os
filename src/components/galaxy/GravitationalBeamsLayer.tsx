/**
 * KALINAR GRAVITATIONAL BEAMS & RAG INGESTION LAYER (v0.2.0-alpha)
 * Ingestion Particle Streams & Relativistic Lavender Pulse Beams
 * Strictly Zero Emojis
 */

import * as THREE from 'three';

export interface GravitationalBeamsConfig {
  maxBeams?: number;
}

export class GravitationalBeamsLayer {
  public group: THREE.Group;
  private pulseBeams: THREE.LineSegments;
  private ingestionParticles: THREE.Points;

  private beamGeometry: THREE.BufferGeometry;
  private beamMaterial: THREE.LineBasicMaterial;

  private ingestionGeometry: THREE.BufferGeometry;
  private ingestionMaterial: THREE.ShaderMaterial;

  private isRagPullActive: boolean = false;
  private ragProgress: number = 0;
  private targetAgentPos: THREE.Vector3 = new THREE.Vector3(120, 80, 0);

  constructor() {
    this.group = new THREE.Group();

    // 1. Relativistic Pulse Beams (Lines)
    const maxLineSegments = 64;
    this.beamGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(maxLineSegments * 2 * 3);
    this.beamGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

    this.beamMaterial = new THREE.LineBasicMaterial({
      color: 0xaa88ff, // Lavender
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      linewidth: 2,
    });
    this.pulseBeams = new THREE.LineSegments(this.beamGeometry, this.beamMaterial);
    this.group.add(this.pulseBeams);

    // 2. Gravitational Ingestion Particles (Second Brain -> Black Hole)
    const particleCount = 2048;
    this.ingestionGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleOrigins = new Float32Array(particleCount * 3);
    const particleOffsets = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Magenta constellation node origin (~r=400-600)
      const angle = Math.random() * Math.PI * 2;
      const r = 400 + Math.random() * 200;
      const x = Math.cos(angle) * r;
      const y = (Math.random() - 0.5) * 80;
      const z = Math.sin(angle) * r;

      particleOrigins[i * 3 + 0] = x;
      particleOrigins[i * 3 + 1] = y;
      particleOrigins[i * 3 + 2] = z;

      particlePositions[i * 3 + 0] = x;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = z;

      particleOffsets[i] = Math.random();
    }

    this.ingestionGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    this.ingestionGeometry.setAttribute('aOrigin', new THREE.BufferAttribute(particleOrigins, 3));
    this.ingestionGeometry.setAttribute('aOffset', new THREE.BufferAttribute(particleOffsets, 1));

    this.ingestionMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        uniform float uProgress;
        uniform float uTime;
        attribute vec3 aOrigin;
        attribute float aOffset;
        varying float vAlpha;

        void main() {
          float t = fract(uProgress + aOffset);
          // Pull smoothly from origin (Second Brain) towards (0,0,0) (Singularity)
          vec3 currentPos = mix(aOrigin, vec3(0.0), t * t);
          
          // Spiral swirl on approach
          float spiralAngle = t * 6.28 * 2.0;
          float cosA = cos(spiralAngle);
          float sinA = sin(spiralAngle);
          vec2 rotXZ = mat2(cosA, -sinA, sinA, cosA) * currentPos.xz;
          currentPos.x = rotXZ.x;
          currentPos.z = rotXZ.y;

          vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = (18.0 / -mvPosition.z) * (1.0 - t * 0.5);

          // Visible only when RAG pull active
          vAlpha = (1.0 - t) * smoothstep(0.0, 0.1, uProgress);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          if (length(coord) > 0.5) discard;
          // Neural Magenta color (#E879F9)
          vec3 magenta = vec3(0.91, 0.47, 0.98);
          gl_FragColor = vec4(magenta, vAlpha * 0.85);
        }
      `,
      uniforms: {
        uProgress: { value: 0 },
        uTime: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.ingestionParticles = new THREE.Points(this.ingestionGeometry, this.ingestionMaterial);
    this.group.add(this.ingestionParticles);
  }

  public triggerGravitationalRAG(targetAgentPosition?: [number, number, number]): void {
    this.isRagPullActive = true;
    this.ragProgress = 0.0;
    if (targetAgentPosition) {
      this.targetAgentPos.set(...targetAgentPosition);
    }
  }

  public update(time: number, dt: number): void {
    if (this.isRagPullActive) {
      this.ragProgress += dt * 0.8;
      this.ingestionMaterial.uniforms.uProgress.value = this.ragProgress;
      this.ingestionMaterial.uniforms.uTime.value = time;

      // When ingestion reaches 0.6, fire relativistic pulse beam from Singularity to Agent
      if (this.ragProgress > 0.4) {
        const beamPhase = (this.ragProgress - 0.4) / 0.6;
        const positions = this.beamGeometry.attributes.position.array as Float32Array;

        // Beam origin: Black hole center (0,0,0)
        positions[0] = 0;
        positions[1] = 0;
        positions[2] = 0;

        // Beam destination: Agent Position
        positions[3] = this.targetAgentPos.x * Math.min(1.0, beamPhase * 1.5);
        positions[4] = this.targetAgentPos.y * Math.min(1.0, beamPhase * 1.5);
        positions[5] = this.targetAgentPos.z * Math.min(1.0, beamPhase * 1.5);

        this.beamGeometry.attributes.position.needsUpdate = true;
        this.beamMaterial.opacity = (1.0 - beamPhase) * 0.95;
      }

      if (this.ragProgress >= 1.0) {
        this.isRagPullActive = false;
        this.ragProgress = 0.0;
        this.beamMaterial.opacity = 0.0;
      }
    } else {
      this.ingestionMaterial.uniforms.uProgress.value = 0;
      this.beamMaterial.opacity = 0.0;
    }
  }

  public dispose(): void {
    this.beamGeometry.dispose();
    this.beamMaterial.dispose();
    this.ingestionGeometry.dispose();
    this.ingestionMaterial.dispose();
  }
}
