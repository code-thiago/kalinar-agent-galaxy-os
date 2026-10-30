/**
 * KALINAR CENTRAL BLACK HOLE SINGULARITY (v0.2.0-alpha)
 * Event Horizon Void + Pulsating Photon Ring + GPGPU Particle Accretion Disk
 * Strictly Zero Emojis
 */

import * as THREE from 'three';
import { photonRingShader, accretionDiskShader } from '../../core/shaders/singularityShaders.js';

export interface SingularityCoreConfig {
  coreRadius?: number;
  particleCount?: number;
  innerDiskRadius?: number;
  outerDiskRadius?: number;
}

export class KalinarSingularityCore {
  public group: THREE.Group;
  private coreSphere: THREE.Mesh;
  private photonRing: THREE.Mesh;
  private accretionParticles: THREE.Points;

  private photonRingMaterial: THREE.ShaderMaterial;
  private accretionMaterial: THREE.ShaderMaterial;
  private particleGeometry: THREE.BufferGeometry;

  constructor(config?: SingularityCoreConfig) {
    this.group = new THREE.Group();
    const coreRadius = config?.coreRadius || 54;
    // Canonical desktop density: 262,144 particles (512x512 buffer), fallback to 65,536 on mobile/low-tier
    const defaultCount =
      typeof window !== 'undefined' && window.innerWidth < 768 ? 65536 : 262144;
    const particleCount = config?.particleCount || defaultCount;
    const innerRadius = config?.innerDiskRadius || 72;
    const outerRadius = config?.outerDiskRadius || 360;

    // 1. Central Event Horizon (Pitch-Black Spherical Void)
    const sphereGeometry = new THREE.SphereGeometry(coreRadius, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      depthTest: true,
      depthWrite: true,
    });
    this.coreSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.group.add(this.coreSphere);

    // 2. Event Horizon Photon Ring
    const ringGeometry = new THREE.SphereGeometry(coreRadius * 1.08, 32, 32);
    this.photonRingMaterial = new THREE.ShaderMaterial({
      vertexShader: photonRingShader.vertexShader,
      fragmentShader: photonRingShader.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uVoicePulse: { value: 0 },
        uColorInner: { value: new THREE.Color(0xaa88ff) },
        uColorOuter: { value: new THREE.Color(0xdddddd) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.photonRing = new THREE.Mesh(ringGeometry, this.photonRingMaterial);
    this.group.add(this.photonRing);

    // 3. GPGPU Accretion Disk Particle Cloud (65,536 Particles)
    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const randoms = new Float32Array(particleCount * 3);
    const orbitRadii = new Float32Array(particleCount);
    const initialAngles = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Exponential distribution towards the inner Event Horizon
      const t = Math.pow(Math.random(), 1.6);
      const r = innerRadius + t * (outerRadius - innerRadius);
      const theta = Math.random() * Math.PI * 2;

      orbitRadii[i] = r;
      initialAngles[i] = theta;

      // Seed vector for Bridson curl & sparkles
      randoms[i * 3 + 0] = Math.random(); // seed
      randoms[i * 3 + 1] = 0.5 + Math.random() * 0.5; // orbital speed variance
      randoms[i * 3 + 2] = Math.random(); // size and sparkle seed

      positions[i * 3 + 0] = Math.cos(theta) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 16.0;
      positions[i * 3 + 2] = Math.sin(theta) * r;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3));
    this.particleGeometry.setAttribute('aOrbitRadius', new THREE.BufferAttribute(orbitRadii, 1));
    this.particleGeometry.setAttribute('aInitialAngle', new THREE.BufferAttribute(initialAngles, 1));

    this.accretionMaterial = new THREE.ShaderMaterial({
      vertexShader: accretionDiskShader.vertexShader,
      fragmentShader: accretionDiskShader.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uVoicePulse: { value: 0 },
        uFluidVelocity: { value: null },
        uReducedMotion: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.accretionParticles = new THREE.Points(this.particleGeometry, this.accretionMaterial);
    this.group.add(this.accretionParticles);
  }

  public update(time: number, voicePulse: number, fluidVelocityTexture: THREE.Texture | null, isReducedMotion: boolean): void {
    // 1. Update Photon Ring
    this.photonRingMaterial.uniforms.uTime.value = time;
    this.photonRingMaterial.uniforms.uVoicePulse.value = voicePulse;

    // 2. Update Accretion Disk Shaders
    this.accretionMaterial.uniforms.uTime.value = time;
    this.accretionMaterial.uniforms.uVoicePulse.value = voicePulse;
    this.accretionMaterial.uniforms.uFluidVelocity.value = fluidVelocityTexture;
    this.accretionMaterial.uniforms.uReducedMotion.value = isReducedMotion ? 1.0 : 0.0;
  }

  public dispose(): void {
    this.coreSphere.geometry.dispose();
    (this.coreSphere.material as THREE.Material).dispose();

    this.photonRing.geometry.dispose();
    this.photonRingMaterial.dispose();

    this.particleGeometry.dispose();
    this.accretionMaterial.dispose();
  }
}
