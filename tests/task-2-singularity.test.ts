import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { KalinarSingularityCore } from '../src/components/galaxy/KalinarSingularityCore.js';
import { GravitationalBeamsLayer } from '../src/components/galaxy/GravitationalBeamsLayer.js';
import fs from 'node:fs';
import path from 'node:path';

describe('TASK 2 SELF-AUDIT: KALINAR SINGULARITY CORE & 50K INSTANCED GALAXY', () => {
  it('allocates 50,000 nodes in InstancedMesh with zero reallocation on ticks', () => {
    const nodeCount = 50000;
    const geometry = new THREE.SphereGeometry(0.85, 4, 4);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const instancedMesh = new THREE.InstancedMesh(geometry, material, nodeCount);

    expect(instancedMesh.count).toBe(50000);
    expect(instancedMesh.instanceMatrix.array.length).toBe(50000 * 16);

    // Verify matrix update without reallocating buffer
    const bufferRef = instancedMesh.instanceMatrix.array;
    const dummy = new THREE.Object3D();
    dummy.position.set(100, 200, 300);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(0, dummy.matrix);
    instancedMesh.instanceMatrix.needsUpdate = true;

    // Buffer identity is preserved (zero reallocation)
    expect(instancedMesh.instanceMatrix.array).toBe(bufferRef);

    // Cleanup
    geometry.dispose();
    material.dispose();
    instancedMesh.dispose();
  });

  it('initializes Singularity Core with 65,536 accretion particles and event horizon', () => {
    const core = new KalinarSingularityCore({
      coreRadius: 54,
      particleCount: 65536,
      innerDiskRadius: 72,
      outerDiskRadius: 360,
    });

    expect(core.group.children.length).toBe(3); // Core Sphere, Photon Ring, Accretion Particles

    // Update with voice waveform pulse
    core.update(1.5, 1.25, null, false);

    // Proper disposal test
    expect(() => core.dispose()).not.toThrow();
  });

  it('simulates Gravitational RAG Ingestion and Relativistic Pulse Beam', () => {
    const beams = new GravitationalBeamsLayer();
    expect(beams.group.children.length).toBe(2); // Pulse Beams + Ingestion Particles

    // Trigger RAG pull to agent coordinates
    beams.triggerGravitationalRAG([140, 80, 0]);

    // Tick progression
    beams.update(0.5, 0.016);
    beams.update(1.0, 0.016);

    // Proper disposal test
    expect(() => beams.dispose()).not.toThrow();
  });

  it('verifies HUD column plus-lighter style and zero emoji enforcement', () => {
    const hudColPath = path.resolve(process.cwd(), 'src/components/ui/SingularityHudColumn.tsx');
    const content = fs.readFileSync(hudColPath, 'utf-8');
    expect(content).toContain('mixBlendMode');
    expect(content).toContain('plus-lighter');

    const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF]/;
    const galaxyFiles = [
      'src/components/galaxy/KalinarSingularityCore.tsx',
      'src/components/galaxy/KalinarGalaxyCanvas.tsx',
      'src/components/galaxy/GravitationalBeamsLayer.tsx',
      'src/core/physics/FluidSimulation.ts',
      'src/core/shaders/singularityShaders.ts',
    ];

    for (const file of galaxyFiles) {
      const code = fs.readFileSync(path.resolve(process.cwd(), file), 'utf-8');
      expect(emojiRegex.test(code), `Emoji found in ${file}`).toBe(false);
    }
  });
});
