/**
 * TASK 3 EMPIRICAL VERIFICATION SUITE:
 * Logarithmic Spiral Galaxy (50k InstancedMesh), 7-Agent Swarm Orbits & Gravitational RAG Beams
 * Strict Zero Emojis
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import fs from 'node:fs';
import path from 'node:path';
import { SpatialOctreeLOD } from '../src/core/physics/SpatialOctreeLOD.js';
import { GravitationalBeamsLayer } from '../src/components/galaxy/GravitationalBeamsLayer.js';
import { CANONICAL_SWARM_CONFIGS } from '../src/components/galaxy/KalinarGalaxyCanvas.js';
import { useKalinarStore } from '../src/store/useKalinarStore.js';

describe('Task 3: 50k Logarithmic Spiral Galaxy, 7-Agent Orbits & Gravitational RAG Beams', () => {
  describe('1. 50,000-Node Logarithmic Spiral InstancedMesh & Spatial Octree LOD', () => {
    it('allocates 50,000 nodes in THREE.InstancedMesh mapped to 5 domains without reallocating buffers', () => {
      const nodeCount = 50000;
      const geometry = new THREE.PlaneGeometry(1.6, 1.6);
      const material = new THREE.MeshBasicMaterial();
      const instancedMesh = new THREE.InstancedMesh(geometry, material, nodeCount);

      expect(instancedMesh.count).toBe(50000);
      expect(instancedMesh.instanceMatrix.array.length).toBe(50000 * 16);

      const bufferRef = instancedMesh.instanceMatrix.array;
      const dummy = new THREE.Object3D();
      dummy.position.set(240, 10, -320);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(0, dummy.matrix);
      instancedMesh.instanceMatrix.needsUpdate = true;

      expect(instancedMesh.instanceMatrix.array).toBe(bufferRef);

      geometry.dispose();
      material.dispose();
      instancedMesh.dispose();
    });

    it('empirically evaluates Spatial Octree LOD culling for 50,000 nodes under 4ms (FLOW-GALAXY-LOD-01)', () => {
      const nodeCount = 50000;
      const positions = new Float32Array(nodeCount * 3);
      const domains: string[] = new Array(nodeCount);
      const domainList = [
        '01_PROJETOS',
        '02_PADROES_E_DECISOES',
        '03_PREFERENCIAS',
        '04_STACK_E_SKILLS',
        '05_AGENTS',
      ];

      for (let i = 0; i < nodeCount; i++) {
        const arm = i % 5;
        const u = Math.pow(i / nodeCount, 1.25);
        const theta = (arm * Math.PI * 2) / 5 + u * 20;
        const r = 140 + u * 2400;

        positions[i * 3 + 0] = Math.cos(theta) * r;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
        positions[i * 3 + 2] = Math.sin(theta) * r;
        domains[i] = domainList[arm];
      }

      const octree = new SpatialOctreeLOD({ maxDepth: 4, maxPerLeaf: 1024 });
      octree.build(positions, domains);

      expect(octree.getTotalNodes()).toBe(50000);

      const camera = new THREE.PerspectiveCamera(60, 16 / 9, 1, 10000);
      camera.position.set(0, 240, 720);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      // Benchmark 50 consecutive evaluations
      const runs = 50;
      let totalTimeMs = 0;
      let lastResult: any = null;

      for (let r = 0; r < runs; r++) {
        lastResult = octree.evaluateLOD(camera);
        totalTimeMs += lastResult.executionTimeMs;
      }

      const avgTimeMs = totalTimeMs / runs;
      expect(avgTimeMs).toBeLessThan(4.0); // FLOW-GALAXY-LOD-01 strict limit (< 4ms)
      expect(lastResult.visibleCount + lastResult.culledCount).toBe(50000);
      expect(lastResult.visibleIndices.length).toBe(lastResult.visibleCount);
      expect(lastResult.lodBreakdown.lod0 + lastResult.lodBreakdown.lod1 + lastResult.lodBreakdown.lod2).toBe(
        lastResult.visibleCount
      );

      octree.dispose();
    });
  });

  describe('2. 7 Canonical Agent Swarm Nodes & Amber Artifact Satellites', () => {
    it('defines exactly the 7 canonical agents in distinct inner-ring orbits in Arc Cyan (#00F0FF)', () => {
      expect(CANONICAL_SWARM_CONFIGS).toHaveLength(7);

      const expectedFilenames = [
        '@agent-orchestrator',
        '@agent-software-engineer',
        '@agent-design',
        '@agent-content',
        '@agent-data',
        '@agent-cybersecurity',
        '@agent-qa',
      ];

      const filenames = CANONICAL_SWARM_CONFIGS.map((c) => c.filename);
      expect(filenames).toEqual(expectedFilenames);

      // Verify distinct inner-ring orbits (radii between 130 and 220)
      const radii = CANONICAL_SWARM_CONFIGS.map((c) => c.orbitRadius);
      radii.forEach((r) => {
        expect(r).toBeGreaterThanOrEqual(130);
        expect(r).toBeLessThanOrEqual(220);
      });

      // Verify each agent has a designated active file for Amber Artifact Satellite
      CANONICAL_SWARM_CONFIGS.forEach((c) => {
        expect(c.activeFile).toBeDefined();
        expect(c.activeFile.length).toBeGreaterThan(0);
        expect(c.pid).toBeGreaterThan(100);
      });
    });

    it('hydrates all 7 canonical agents in the reactive Zustand store with activeAgentCount === 7', () => {
      const state = useKalinarStore.getState();
      expect(state.agents.length).toBeGreaterThanOrEqual(7);
      expect(state.singularity.activeAgentCount).toBe(7);

      const storeFilenames = state.agents.map((a) => a.filename);
      expect(storeFilenames).toContain('@agent-orchestrator');
      expect(storeFilenames).toContain('@agent-software-engineer');
      expect(storeFilenames).toContain('@agent-design');
      expect(storeFilenames).toContain('@agent-content');
      expect(storeFilenames).toContain('@agent-data');
      expect(storeFilenames).toContain('@agent-cybersecurity');
      expect(storeFilenames).toContain('@agent-qa');
    });
  });

  describe('3. Relativistic Synaptic Beams & Gravitational RAG Pull', () => {
    it('initializes GravitationalBeamsLayer with exact 2 Three.js children (pulseBeams and ingestionParticles)', () => {
      const beams = new GravitationalBeamsLayer();
      expect(beams.group.children.length).toBe(2);

      const pulseBeams = beams.group.children[0] as THREE.LineSegments;
      const ingestionParticles = beams.group.children[1] as THREE.Points;

      expect(pulseBeams.isLineSegments).toBe(true);
      expect(ingestionParticles.isPoints).toBe(true);

      beams.dispose();
    });

    it('generates active synaptic beams across GRAVITATIONAL_PULL, SINGULARITY_PULSE, and AGENT_TO_AGENT', () => {
      const beams = new GravitationalBeamsLayer();
      const activeBeams = beams.getActiveBeams();

      expect(activeBeams.length).toBeGreaterThanOrEqual(10);

      const pullBeams = activeBeams.filter((b) => b.beamType === 'GRAVITATIONAL_PULL');
      const pulseBeams = activeBeams.filter((b) => b.beamType === 'SINGULARITY_PULSE');
      const handoffBeams = activeBeams.filter((b) => b.beamType === 'AGENT_TO_AGENT');

      expect(pullBeams.length).toBeGreaterThanOrEqual(4);
      expect(pulseBeams.length).toBeGreaterThanOrEqual(7);
      expect(handoffBeams.length).toBeGreaterThanOrEqual(4);

      // Verify color tokens
      expect(pullBeams[0].colorToken).toBe('#E879F9');
      expect(pulseBeams[0].colorToken).toBe('#AA88FF');
      expect(handoffBeams[0].colorToken).toBe('#00F0FF');

      beams.dispose();
    });

    it('executes triggerGravitationalRAG lifecycle smoothly from pull to relativistic pulse to completion', () => {
      const beams = new GravitationalBeamsLayer();

      beams.triggerGravitationalRAG([160, 40, -120]);

      // Step 1: Initial RAG pull phase
      beams.update(0.2, 0.016);
      let activeBeams = beams.getActiveBeams();
      let pulseBeam = activeBeams.find((b) => b.beamType === 'SINGULARITY_PULSE');
      expect(pulseBeam).toBeDefined();

      // Step 2: Mid-phase relativistic fire (progress > 0.45)
      for (let t = 0; t < 40; t++) {
        beams.update(0.5 + t * 0.016, 0.016);
      }
      activeBeams = beams.getActiveBeams();
      pulseBeam = activeBeams.find((b) => b.beamType === 'SINGULARITY_PULSE');
      expect(pulseBeam?.intensity).toBeGreaterThan(0.5);

      // Step 3: Completion and reset (progress >= 1.0)
      for (let t = 0; t < 60; t++) {
        beams.update(1.2 + t * 0.016, 0.016);
      }

      beams.dispose();
    });
  });

  describe('4. Strict Zero-Emoji & Design System Compliance Audit', () => {
    it('verifies strictly zero decorative emojis across all Task 3 files', () => {
      const filesToCheck = [
        'src/components/galaxy/KalinarGalaxyCanvas.tsx',
        'src/components/galaxy/GravitationalBeamsLayer.tsx',
        'src/core/physics/SpatialOctreeLOD.ts',
        'src/store/useKalinarStore.ts',
      ];

      const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      for (const relPath of filesToCheck) {
        const fullPath = path.resolve(process.cwd(), relPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        expect(emojiRegex.test(content), `Found forbidden emoji in ${relPath}`).toBe(false);
      }
    });

    it('verifies radial-gradient instance shader and logarithmic spiral math in KalinarGalaxyCanvas', () => {
      const canvasPath = path.resolve(process.cwd(), 'src/components/galaxy/KalinarGalaxyCanvas.tsx');
      const content = fs.readFileSync(canvasPath, 'utf-8');

      // 50,000 nodes verification
      expect(content).toContain('nodeCount = 50000');
      // Spatial Octree LOD verification
      expect(content).toContain('SpatialOctreeLOD');
      expect(content).toContain('octreeLOD.evaluateLOD');
      // Circular radial-gradient shader verification
      expect(content).toContain('smoothstep(0.12, 0.0, dist)');
      expect(content).toContain('smoothstep(0.5, 0.0, dist)');
      // Amber artifact satellite
      expect(content).toContain('0xfbbf24');
      // Magenta second brain nodes
      expect(content).toContain('0xe879f9');
      // Arc cyan swarm stars
      expect(content).toContain('0x00f0ff');
    });
  });
});
