/**
 * KALINAR FULL-VIEWPORT WEBGL GALAXY CANVAS (v1.3.0)
 * 50,000+ Node InstancedMesh + Black Hole Singularity + Navier-Stokes Fluid Cursor
 * + SecondBrainNode 3D Visualization (#AA88FF / #8B5CF6) at position3D
 * Strictly Zero Emojis
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { KalinarSingularityCore } from './KalinarSingularityCore.js';
import { FluidSimulation } from '../../core/physics/FluidSimulation.js';
import { GravitationalBeamsLayer } from './GravitationalBeamsLayer.js';
import { useKalinarStore } from '../../store/useKalinarStore.js';
import { kalinarVoiceService } from '../../services/kalinarVoiceService.js';
import { SecondBrainNode } from '../../types/kalinar.js';

const BASELINE_SECOND_BRAIN_NODES: SecondBrainNode[] = [
  {
    id: 'sb-00-index',
    wikilink: '[[00_INDEX]]',
    notePath: '00_INDEX.md',
    tagList: ['#router', '#master', '#second-brain'],
    domain: '01_PROJETOS',
    connectionCount: 4,
    summary: 'Master Router (00_INDEX)',
    position3D: [-140, 60, -90],
  },
  {
    id: 'sb-adr-001',
    wikilink: '[[ADR-001]]',
    notePath: '02_PADROES/ADR-001.md',
    tagList: ['#auth', '#padrao'],
    domain: '02_PADROES',
    connectionCount: 3,
    summary: 'Server-Side Session Auth',
    position3D: [-80, 95, 120],
  },
  {
    id: 'sb-adr-002',
    wikilink: '[[ADR-002]]',
    notePath: '02_PADROES/ADR-002.md',
    tagList: ['#rate-limit', '#redis'],
    domain: '02_PADROES',
    connectionCount: 3,
    summary: 'Rate Limiting Granular',
    position3D: [90, 70, -110],
  },
  {
    id: 'sb-adr-003',
    wikilink: '[[ADR-003]]',
    notePath: '02_PADROES/ADR-003.md',
    tagList: ['#validacao'],
    domain: '02_PADROES',
    connectionCount: 2,
    summary: 'Validacao Dupla Camada',
    position3D: [130, 45, 90],
  },
  {
    id: 'sb-design-system',
    wikilink: '[[PADRAO-Design-System]]',
    notePath: '02_PADROES/PADRAO-Design-System.md',
    tagList: ['#wcag-aaa', '#design-system'],
    domain: '02_PADROES',
    connectionCount: 5,
    summary: 'Design System Anti-Slop WCAG',
    position3D: [0, 110, 140],
  },
  {
    id: 'sb-stack',
    wikilink: '[[Stack-Principal-Thiago]]',
    notePath: '04_STACK/Stack-Principal-Thiago.md',
    tagList: ['#stack', '#react19'],
    domain: '04_STACK',
    connectionCount: 4,
    summary: 'Stack Principal',
    position3D: [-160, 40, 60],
  },
];

export function KalinarGalaxyCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { singularity, agents, selectedAgentId, isInspectorDrawerOpen } = useKalinarStore();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    // 1. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 1.0);
    renderer.domElement.id = 'singularity-bg';
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.zIndex = '0';
    renderer.domElement.style.pointerEvents = 'auto';
    container.appendChild(renderer.domElement);

    // 2. Scene & Camera with Gaze Parallax
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 10000);
    camera.position.set(0, 240, 720);
    camera.lookAt(0, 0, 0);

    const cameraTarget = new THREE.Vector3(0, 0, 0);
    const cameraDesiredPos = new THREE.Vector3(0, 240, 720);

    // 3. Fluid Simulation (256x256 velocity)
    const fluid = new FluidSimulation({
      renderer,
      velocityResolution: 256,
      densityResolution: 512,
      decayRate: 0.985,
    });

    // 4. Central Black Hole Singularity Core (Full Canonical Density: 262,144 particles)
    const singularityCore = new KalinarSingularityCore({
      coreRadius: 54,
      particleCount: 262144,
      innerDiskRadius: 72,
      outerDiskRadius: 360,
    });
    scene.add(singularityCore.group);

    // 5. Gravitational Beams & RAG Ingestion Layer
    const beamsLayer = new GravitationalBeamsLayer();
    scene.add(beamsLayer.group);

    // 6. Procedural Galaxy Constellations (50,000+ Nodes via InstancedMesh)
    const nodeCount = 50000;
    const nodeGeometry = new THREE.SphereGeometry(0.85, 4, 4);
    const nodeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const instancedMesh = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, nodeCount);

    const dummy = new THREE.Object3D();
    const nodeColor = new THREE.Color();

    // Logarithmic spiral domain constellation distribution
    // 01_PROJETOS (Cyan), 02_PADROES (Violet), 03_PREFERENCIAS (White), 04_STACK (Lavender), 05_AGENTS (Arc Cyan)
    const domainColors = [
      new THREE.Color(0x00f0ff), // 01_PROJETOS
      new THREE.Color(0x8b5cf6), // 02_PADROES
      new THREE.Color(0xdddddd), // 03_PREFERENCIAS
      new THREE.Color(0xaa88ff), // 04_STACK
      new THREE.Color(0x00f0ff), // 05_AGENTS
    ];

    for (let i = 0; i < nodeCount; i++) {
      const arm = i % 5;
      const t = i / nodeCount;
      const angle = t * 14.0 * Math.PI + (arm * (Math.PI * 2 / 5));
      const radius = 320 + Math.pow(t, 1.4) * 2400;

      const scatterX = (Math.random() - 0.5) * 60.0;
      const scatterY = (Math.random() - 0.5) * 35.0;
      const scatterZ = (Math.random() - 0.5) * 60.0;

      dummy.position.set(
        Math.cos(angle) * radius + scatterX,
        scatterY,
        Math.sin(angle) * radius + scatterZ
      );
      const scale = 0.6 + Math.random() * 1.4;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      instancedMesh.setMatrixAt(i, dummy.matrix);

      // Domain color mapping
      const baseCol = domainColors[arm];
      nodeColor.copy(baseCol);
      if (Math.random() < 0.2) {
        nodeColor.setHex(0xe879f9); // Second Brain node accent
      }
      instancedMesh.setColorAt(i, nodeColor);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }
    scene.add(instancedMesh);

    // 7. Active Agent Orbit Swarms & Artifact Satellites
    const agentGroup = new THREE.Group();
    scene.add(agentGroup);

    const activeAgentMeshes: Map<string, THREE.Group> = new Map();

    const updateAgentSwarms = () => {
      while (agentGroup.children.length > 0) {
        agentGroup.remove(agentGroup.children[0]);
      }
      activeAgentMeshes.clear();

      agents.forEach((agent, idx) => {
        const singleAgentGroup = new THREE.Group();
        const [x, y, z] = agent.position3D;
        singleAgentGroup.position.set(x || (idx + 1) * 140, y || 40, z || 0);

        // Core Agent Star: #00F0FF Arc Cyan
        const agentGeom = new THREE.SphereGeometry(6, 16, 16);
        const agentMat = new THREE.MeshBasicMaterial({
          color: 0x00f0ff,
          wireframe: true,
        });
        const star = new THREE.Mesh(agentGeom, agentMat);
        singleAgentGroup.add(star);

        // Localized Swarm Particles
        const swarmGeom = new THREE.BufferGeometry();
        const swarmCount = 128;
        const swarmPos = new Float32Array(swarmCount * 3);
        for (let s = 0; s < swarmCount; s++) {
          const sa = Math.random() * Math.PI * 2;
          const sr = 12 + Math.random() * 18;
          swarmPos[s * 3 + 0] = Math.cos(sa) * sr;
          swarmPos[s * 3 + 1] = (Math.random() - 0.5) * 10;
          swarmPos[s * 3 + 2] = Math.sin(sa) * sr;
        }
        swarmGeom.setAttribute('position', new THREE.BufferAttribute(swarmPos, 3));
        const swarmMat = new THREE.PointsMaterial({
          color: 0x00f0ff,
          size: 2.5,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
        });
        const swarmPoints = new THREE.Points(swarmGeom, swarmMat);
        singleAgentGroup.add(swarmPoints);

        // Orbiting Artifact Satellite Node (Amber shield #FBBF24)
        const satGeom = new THREE.BoxGeometry(3, 3, 3);
        const satMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
        const satellite = new THREE.Mesh(satGeom, satMat);
        satellite.position.set(24, 8, 0);
        singleAgentGroup.add(satellite);

        agentGroup.add(singleAgentGroup);
        activeAgentMeshes.set(agent.id, singleAgentGroup);
      });
    };

    updateAgentSwarms();

    // -------------------------------------------------------------
    // 8. Second Brain Nodes 3D Visualization (Magenta #AA88FF / #8B5CF6)
    // -------------------------------------------------------------
    const secondBrainGroup = new THREE.Group();
    scene.add(secondBrainGroup);

    const secondBrainNodeMeshes: Map<string, THREE.Group> = new Map();
    let currentSecondBrainNodes: SecondBrainNode[] = [...BASELINE_SECOND_BRAIN_NODES];

    const clearSecondBrainMeshes = () => {
      while (secondBrainGroup.children.length > 0) {
        const obj = secondBrainGroup.children[0];
        secondBrainGroup.remove(obj);
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material?.dispose();
            }
          }
        });
      }
      secondBrainNodeMeshes.clear();
    };

    const renderSecondBrainNodes = (nodes: SecondBrainNode[]) => {
      clearSecondBrainMeshes();

      nodes.forEach((node, idx) => {
        const nodeGroup = new THREE.Group();
        const pos = node.position3D || [
          Math.cos((idx * Math.PI * 2) / Math.max(1, nodes.length)) * 170,
          50 + (idx % 4) * 20,
          Math.sin((idx * Math.PI * 2) / Math.max(1, nodes.length)) * 170,
        ];
        nodeGroup.position.set(pos[0], pos[1], pos[2]);

        // Outer Wireframe Polyhedron (#AA88FF)
        const outerGeom = new THREE.IcosahedronGeometry(4.2, 1);
        const outerMat = new THREE.MeshBasicMaterial({
          color: 0xaa88ff,
          wireframe: true,
          transparent: true,
          opacity: 0.85,
        });
        const outerMesh = new THREE.Mesh(outerGeom, outerMat);
        nodeGroup.add(outerMesh);

        // Inner Solid Core (#8B5CF6)
        const innerGeom = new THREE.SphereGeometry(2.4, 12, 12);
        const innerMat = new THREE.MeshBasicMaterial({
          color: 0x8b5cf6,
        });
        const innerMesh = new THREE.Mesh(innerGeom, innerMat);
        nodeGroup.add(innerMesh);

        // Orbital Halo Ring (#AA88FF)
        const ringGeom = new THREE.RingGeometry(6.2, 7.0, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xaa88ff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
        });
        const ringMesh = new THREE.Mesh(ringGeom, ringMat);
        ringMesh.rotation.x = Math.PI / 3;
        nodeGroup.add(ringMesh);

        secondBrainGroup.add(nodeGroup);
        secondBrainNodeMeshes.set(node.id, nodeGroup);
      });
    };

    // Render initial baseline nodes immediately
    renderSecondBrainNodes(currentSecondBrainNodes);
    (window as any).__kalinarSecondBrainNodes = currentSecondBrainNodes;

    // Dynamic scanning from workspace if running in Electron
    if (typeof window !== 'undefined' && (window as any).kalinarApi?.scanWorkspaceNodes) {
      (window as any).kalinarApi
        .scanWorkspaceNodes()
        .then((scanRes: any) => {
          if (
            scanRes &&
            Array.isArray(scanRes.secondBrainNodes) &&
            scanRes.secondBrainNodes.length > 0
          ) {
            currentSecondBrainNodes = scanRes.secondBrainNodes;
            (window as any).__kalinarSecondBrainNodes = currentSecondBrainNodes;
            renderSecondBrainNodes(currentSecondBrainNodes);
          }
        })
        .catch(() => {
          // Keep baseline nodes on error
        });
    }

    // Dynamic listener for new injected nodes
    const handleAddSecondBrainNode = (node: SecondBrainNode) => {
      if (!node) return;
      const existingIdx = currentSecondBrainNodes.findIndex((n) => n.id === node.id);
      if (existingIdx >= 0) {
        currentSecondBrainNodes[existingIdx] = node;
      } else {
        currentSecondBrainNodes.push(node);
      }
      (window as any).__kalinarSecondBrainNodes = currentSecondBrainNodes;
      renderSecondBrainNodes(currentSecondBrainNodes);
    };

    (window as any).__addSecondBrainNode = handleAddSecondBrainNode;

    const onNodeSpawned = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        handleAddSecondBrainNode(detail);
      }
    };
    window.addEventListener('kalinar:second_brain_node_spawned', onNodeSpawned);

    // 9. Interaction & Parallax Variables
    const mouseNdc = new THREE.Vector2(0, 0);
    const mousePrevNdc = new THREE.Vector2(0, 0);
    let isReducedMotion = false;
    if (window.matchMedia) {
      isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    const onPointerMove = (e: MouseEvent) => {
      mousePrevNdc.copy(mouseNdc);
      mouseNdc.x = (e.clientX / width) * 2 - 1;
      mouseNdc.y = -(e.clientY / height) * 2 + 1;

      // Inject fluid velocity
      const delta = new THREE.Vector2().subVectors(mouseNdc, mousePrevNdc);
      fluid.injectSplats(mouseNdc, delta);
    };

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const onPointerDown = (e: MouseEvent) => {
      const clickX = (e.clientX / width) * 2 - 1;
      const clickY = -(e.clientY / height) * 2 + 1;
      // Clicking the Black Hole Singularity center triggers Law 1 < 10ms TTS kill-switch
      if (Math.hypot(clickX, clickY) < 0.28) {
        kalinarVoiceService.triggerEmergencyKillSwitch('SINGULARITY_CLICK');
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', onResize);

    // 10. Main Render Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();

      // Fluid Simulation Step
      fluid.step(dt);

      // Acoustic coupling: Sample real-time Tauz frequency bands at 60 FPS
      const bands =
        singularity.voiceState === '[SPEAKING]' || singularity.voiceState === '[LISTENING]'
          ? kalinarVoiceService.getRealtimeFrequencyBands()
          : { subBass: 0, lowMid: 0, highPresence: 0, compositePulse: 0 };
      const voicePulse =
        singularity.voiceState === '[SPEAKING]'
          ? 1.0 + bands.compositePulse * 0.85 + bands.subBass * 0.45
          : singularity.voiceState === '[LISTENING]'
          ? 0.35 + bands.compositePulse * 0.35 + bands.subBass * 0.25
          : 0.08 + Math.sin(elapsedTime * 2.0) * 0.02;

      // Update Black Hole Singularity Core
      singularityCore.update(
        elapsedTime,
        voicePulse,
        fluid.getVelocityTexture(),
        isReducedMotion,
        bands
      );

      // Rotate domain constellations slowly
      if (!isReducedMotion) {
        instancedMesh.rotation.y = elapsedTime * 0.015;
      }

      // Rotate local agent swarms
      agentGroup.children.forEach((ag, idx) => {
        if (!isReducedMotion) {
          ag.rotation.y = elapsedTime * (0.4 + idx * 0.1);
        }
      });

      // Rotate Second Brain 3D nodes (Magenta #AA88FF / #8B5CF6)
      secondBrainNodeMeshes.forEach((mesh, idx) => {
        if (!isReducedMotion) {
          mesh.rotation.y = elapsedTime * (0.35 + (idx.length % 3) * 0.1);
          mesh.rotation.x = elapsedTime * 0.18;
        }
      });

      // Update Gravitational Beams & Ingestion
      beamsLayer.update(elapsedTime, dt);

      // Camera Gaze Parallax (lerp 0.05) & Smooth Flight to Selected Agent
      const targetAgent = agents.find((a) => a.id === selectedAgentId);
      if (targetAgent && activeAgentMeshes.has(targetAgent.id)) {
        const agentMesh = activeAgentMeshes.get(targetAgent.id)!;
        cameraDesiredPos.set(
          agentMesh.position.x * 0.6,
          agentMesh.position.y + 120,
          agentMesh.position.z + 380
        );
        cameraTarget.lerp(agentMesh.position, 0.05);
      } else {
        cameraDesiredPos.set(0, 240, 720);
        cameraTarget.lerp(new THREE.Vector3(0, 0, 0), 0.05);
      }

      // Apply subtle mouse parallax
      const parallaxX = mouseNdc.x * 40.0;
      const parallaxY = mouseNdc.y * 30.0;
      camera.position.x += (cameraDesiredPos.x + parallaxX - camera.position.x) * 0.05;
      camera.position.y += (cameraDesiredPos.y + parallaxY - camera.position.y) * 0.05;
      camera.position.z += (cameraDesiredPos.z - camera.position.z) * 0.05;
      camera.lookAt(cameraTarget);

      renderer.setRenderTarget(null);
      renderer.render(scene, camera);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Expose RAG trigger to global window for HUD button connection
    (window as any).__triggerGravitationalRAG = (targetPos?: [number, number, number]) => {
      beamsLayer.triggerGravitationalRAG(targetPos);
    };

    // 11. Cleanup & Resource Disposal
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('kalinar:second_brain_node_spawned', onNodeSpawned);

      delete (window as any).__triggerGravitationalRAG;
      delete (window as any).__addSecondBrainNode;
      delete (window as any).__kalinarSecondBrainNodes;

      clearSecondBrainMeshes();
      fluid.dispose();
      singularityCore.dispose();
      beamsLayer.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      instancedMesh.dispose();

      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [agents, selectedAgentId, singularity.voiceState]);

  // When drawer opens or RAG button is clicked, trigger ingestion
  useEffect(() => {
    if (isInspectorDrawerOpen && typeof (window as any).__triggerGravitationalRAG === 'function') {
      const selectedAgent = agents.find((a) => a.id === selectedAgentId);
      (window as any).__triggerGravitationalRAG(selectedAgent?.position3D || [120, 80, 0]);
    }
  }, [isInspectorDrawerOpen, agents, selectedAgentId]);

  return <div ref={containerRef} className="fixed inset-0 w-full h-full z-0 overflow-hidden" />;
}
