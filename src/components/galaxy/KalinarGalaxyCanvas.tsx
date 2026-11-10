/**
 * KALINAR FULL-VIEWPORT WEBGL GALAXY CANVAS (v1.3.0)
 * 5-Arm Logarithmic Spiral Galaxy (50,000 InstancedMesh Nodes) + Spatial Octree LOD
 * 7 Canonical Agent Swarm Nodes in Inner Orbits (#00F0FF) + Amber Artifact Satellites (#FBBF24)
 * Magenta Crystalline Second Brain Nodes (#E879F9) in Respective Spiral Arms
 * Relativistic Synaptic Beams & Gravitational RAG Pull (FLOW-GALAXY-LOD-01)
 * Strictly Zero Emojis
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { KalinarSingularityCore } from './KalinarSingularityCore.js';
import { FluidSimulation } from '../../core/physics/FluidSimulation.js';
import { GravitationalBeamsLayer } from './GravitationalBeamsLayer.js';
import { SpatialOctreeLOD } from '../../core/physics/SpatialOctreeLOD.js';
import { useKalinarStore } from '../../store/useKalinarStore.js';
import { kalinarVoiceService } from '../../services/kalinarVoiceService.js';
import { SecondBrainNode, CanonicalAgentFilename, LlmModelId } from '../../types/kalinar.js';

export interface CanonicalAgentSwarmConfig {
  id: string;
  filename: CanonicalAgentFilename;
  role: string;
  orbitRadius: number;
  orbitSpeed: number;
  orbitPhase: number;
  tiltAngle: number;
  activeFile: string;
  pid: number;
  modelId: LlmModelId;
}

export const CANONICAL_SWARM_CONFIGS: CanonicalAgentSwarmConfig[] = [
  {
    id: 'agent-orchestrator-01',
    filename: '@agent-orchestrator',
    role: 'Project Lead & FIFO Lock Controller',
    orbitRadius: 135,
    orbitSpeed: 0.18,
    orbitPhase: (0 * Math.PI * 2) / 7,
    tiltAngle: 0.08,
    activeFile: '.antigravity/comms/WAR_ROOM.md',
    pid: 14201,
    modelId: 'argon',
  },
  {
    id: 'agent-software-engineer-01',
    filename: '@agent-software-engineer',
    role: 'Full-Stack Architect & Contract Engineer',
    orbitRadius: 160,
    orbitSpeed: 0.15,
    orbitPhase: (1 * Math.PI * 2) / 7,
    tiltAngle: -0.12,
    activeFile: 'src/components/galaxy/KalinarGalaxyCanvas.tsx',
    pid: 14202,
    modelId: 'claude-sonnet',
  },
  {
    id: 'agent-design-01',
    filename: '@agent-design',
    role: 'UI/UX & Design System Architect (WCAG AAA)',
    orbitRadius: 185,
    orbitSpeed: 0.13,
    orbitPhase: (2 * Math.PI * 2) / 7,
    tiltAngle: 0.15,
    activeFile: 'src/styles/design-tokens.css',
    pid: 14203,
    modelId: 'claude-3.7-sonnet',
  },
  {
    id: 'agent-content-01',
    filename: '@agent-content',
    role: 'Sovereign Voice & Conversion Copywriting',
    orbitRadius: 210,
    orbitSpeed: 0.11,
    orbitPhase: (3 * Math.PI * 2) / 7,
    tiltAngle: -0.09,
    activeFile: '.antigravity/blueprint/03_APP_FLOW.md',
    pid: 14204,
    modelId: 'gemini-flash',
  },
  {
    id: 'agent-data-01',
    filename: '@agent-data',
    role: 'Decision Engine Specialist (GoRules ZEN JDM)',
    orbitRadius: 145,
    orbitSpeed: 0.17,
    orbitPhase: (4 * Math.PI * 2) / 7,
    tiltAngle: 0.18,
    activeFile: 'src/rules/daemon-event-router.jdm.json',
    pid: 14205,
    modelId: 'gemini-2.5-pro',
  },
  {
    id: 'agent-cybersecurity-01',
    filename: '@agent-cybersecurity',
    role: 'DevSecOps Auditor & Zero-Trust PID Safety',
    orbitRadius: 175,
    orbitSpeed: 0.14,
    orbitPhase: (5 * Math.PI * 2) / 7,
    tiltAngle: -0.16,
    activeFile: 'src/core/ZenFirewall.ts',
    pid: 14206,
    modelId: 'argon',
  },
  {
    id: 'agent-qa-01',
    filename: '@agent-qa',
    role: 'E2E Determinism & Vitest Test Architect',
    orbitRadius: 200,
    orbitSpeed: 0.12,
    orbitPhase: (6 * Math.PI * 2) / 7,
    tiltAngle: 0.10,
    activeFile: 'tests/task-10-canvas-sync-live-cortex.test.ts',
    pid: 14207,
    modelId: 'claude-sonnet',
  },
];

/**
 * Computes exact logarithmic spiral coordinates r = a * e^(b * theta)
 * for Second Brain nodes in their respective domain spiral arms.
 */
function computeDomainSpiralPosition(armIndex: number, orderIndex: number): [number, number, number] {
  const thetaBase = (armIndex * Math.PI * 2) / 5;
  const radius = 380 + orderIndex * 150;
  const a = 130;
  const b = 0.135;
  const deltaTheta = Math.log(radius / a) / b;
  const theta = thetaBase + deltaTheta;

  const x = Math.round(Math.cos(theta) * radius);
  const z = Math.round(Math.sin(theta) * radius);
  const y = Math.round(Math.sin(orderIndex * 2.2 + armIndex) * 40);
  return [x, y, z];
}

const BASELINE_SECOND_BRAIN_NODES: SecondBrainNode[] = [
  // Arm 0: 01_PROJETOS
  {
    id: 'sb-01-prd',
    wikilink: '[[01_PRD]]',
    notePath: '.antigravity/blueprint/01_PRD.md',
    tagList: ['#prd', '#blueprint', '#projetos'],
    domain: '01_PROJETOS',
    connectionCount: 5,
    summary: 'Product Requirements Document & Telemetry Architecture',
    position3D: computeDomainSpiralPosition(0, 0),
  },
  {
    id: 'sb-midas',
    wikilink: '[[Project-Midas-Simulador-Financeiro]]',
    notePath: '01_PROJETOS/Project-Midas-Simulador-Financeiro.md',
    tagList: ['#fintech', '#midas', '#projetos'],
    domain: '01_PROJETOS',
    connectionCount: 4,
    summary: 'Midas Fintech Simulator & Compound Interest Engine',
    position3D: computeDomainSpiralPosition(0, 1),
  },
  {
    id: 'sb-06-plan',
    wikilink: '[[06_IMPLEMENTATION_PLAN]]',
    notePath: '.antigravity/blueprint/06_IMPLEMENTATION_PLAN.md',
    tagList: ['#plan', '#roadmap', '#projetos'],
    domain: '01_PROJETOS',
    connectionCount: 6,
    summary: 'Implementation Plan & Sequential Phase Rollout',
    position3D: computeDomainSpiralPosition(0, 2),
  },

  // Arm 1: 02_PADROES_E_DECISOES
  {
    id: 'sb-adr-001',
    wikilink: '[[ADR-001-Seguranca-Sessao-Server-Side-Auth]]',
    notePath: '02_PADROES_E_DECISOES/ADR-001-Seguranca-Sessao-Server-Side-Auth.md',
    tagList: ['#auth', '#adr', '#padroes'],
    domain: '02_PADROES',
    connectionCount: 4,
    summary: 'Server-Side Session Validation & Auth Zero Trust',
    position3D: computeDomainSpiralPosition(1, 0),
  },
  {
    id: 'sb-adr-002',
    wikilink: '[[ADR-002-Rate-Limiting-Granular-Upstash]]',
    notePath: '02_PADROES_E_DECISOES/ADR-002-Rate-Limiting-Granular-Upstash.md',
    tagList: ['#rate-limit', '#redis', '#adr'],
    domain: '02_PADROES',
    connectionCount: 3,
    summary: 'Granular Route-Based Rate Limiting & Sliding Windows',
    position3D: computeDomainSpiralPosition(1, 1),
  },
  {
    id: 'sb-adr-003',
    wikilink: '[[ADR-003-Validacao-Dupla-Camada-e-Recalculo-Client]]',
    notePath: '02_PADROES_E_DECISOES/ADR-003-Validacao-Dupla-Camada-e-Recalculo-Client.md',
    tagList: ['#validacao', '#dupla-camada', '#adr'],
    domain: '02_PADROES',
    connectionCount: 3,
    summary: 'Two-Tier Input Validation & Client-Side Recalculation',
    position3D: computeDomainSpiralPosition(1, 2),
  },
  {
    id: 'sb-design-system',
    wikilink: '[[PADRAO-Design-System-Anti-Slop-WCAG]]',
    notePath: '02_PADROES_E_DECISOES/PADRAO-Design-System-Anti-Slop-WCAG.md',
    tagList: ['#wcag-aaa', '#design-system', '#tokens'],
    domain: '02_PADROES',
    connectionCount: 7,
    summary: 'Design System Anti-Slop WCAG AAA Monochromatic Indigo',
    position3D: computeDomainSpiralPosition(1, 3),
  },

  // Arm 2: 03_PREFERENCIAS
  {
    id: 'sb-preferencias-index',
    wikilink: '[[03_PREFERENCIAS_E_PERFIL_INDEX]]',
    notePath: '03_PREFERENCIAS/03_PREFERENCIAS_E_PERFIL_INDEX.md',
    tagList: ['#preferencias', '#perfil', '#scope-lock'],
    domain: '03_PREFERENCIAS',
    connectionCount: 5,
    summary: 'Developer Profile, Galarphia Brand & Strict Scope Boundaries',
    position3D: computeDomainSpiralPosition(2, 0),
  },
  {
    id: 'sb-regras-interacao',
    wikilink: '[[Regras-Interacao-Escopo-e-Economia-Tokens]]',
    notePath: '03_PREFERENCIAS/Regras-Interacao-Escopo-e-Economia-Tokens.md',
    tagList: ['#token-economy', '#caveman', '#surgical-patch'],
    domain: '03_PREFERENCIAS',
    connectionCount: 4,
    summary: 'Surgical Patch, Caveman Commit & Zero Emoji Rules',
    position3D: computeDomainSpiralPosition(2, 1),
  },

  // Arm 3: 04_STACK_E_SKILLS
  {
    id: 'sb-stack-principal',
    wikilink: '[[Stack-Principal-Thiago]]',
    notePath: '04_STACK_E_SKILLS/Stack-Principal-Thiago.md',
    tagList: ['#stack', '#react19', '#nextjs', '#typescript'],
    domain: '04_STACK',
    connectionCount: 6,
    summary: 'Canonical Full-Stack: React 19, Next.js, C#, SQLite WAL',
    position3D: computeDomainSpiralPosition(3, 0),
  },
  {
    id: 'sb-app-flow',
    wikilink: '[[03_APP_FLOW]]',
    notePath: '.antigravity/blueprint/03_APP_FLOW.md',
    tagList: ['#app-flow', '#state-machines', '#flow-galaxy-lod-01'],
    domain: '04_STACK',
    connectionCount: 8,
    summary: 'App Flow & 5 Canonical State Machines (v1.1.0 Lock)',
    position3D: computeDomainSpiralPosition(3, 1),
  },

  // Arm 4: 05_AGENTS
  {
    id: 'sb-00-index',
    wikilink: '[[00_INDEX]]',
    notePath: '00_INDEX.md',
    tagList: ['#router', '#master', '#second-brain'],
    domain: '05_AGENTS',
    connectionCount: 9,
    summary: 'Master Router & Autonomous Dispatch Hub (00_INDEX)',
    position3D: computeDomainSpiralPosition(4, 0),
  },
  {
    id: 'sb-agents-governance',
    wikilink: '[[AGENTS]]',
    notePath: 'AGENTS.md',
    tagList: ['#agents', '#swarm', '#governance'],
    domain: '05_AGENTS',
    connectionCount: 7,
    summary: 'Global Autonomous Execution Contract & 7 Swarm Hubs',
    position3D: computeDomainSpiralPosition(4, 1),
  },
  {
    id: 'sb-war-room',
    wikilink: '[[WAR_ROOM]]',
    notePath: '.antigravity/comms/WAR_ROOM.md',
    tagList: ['#war-room', '#handoff', '#coordination'],
    domain: '05_AGENTS',
    connectionCount: 6,
    summary: 'War Room Swarm Coordination Ledger & Sequential Queue',
    position3D: computeDomainSpiralPosition(4, 2),
  },
];

export function KalinarGalaxyCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { agents, selectedAgentId, selectAgent, isInspectorDrawerOpen } = useKalinarStore();

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

    // 2. Scene & Smooth Gaze PerspectiveCamera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 12000);
    camera.position.set(0, 240, 720);
    camera.lookAt(0, 0, 0);

    const cameraTarget = new THREE.Vector3(0, 0, 0);
    const cameraDesiredPos = new THREE.Vector3(0, 240, 720);
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 8 };

    // 3. Navier-Stokes 2D Fluid Simulation
    const fluid = new FluidSimulation({
      renderer,
      velocityResolution: 256,
      densityResolution: 512,
      decayRate: 0.985,
    });

    // 4. Central Black Hole Singularity Core (262,144 particles)
    const singularityCore = new KalinarSingularityCore({
      coreRadius: 54,
      particleCount: 262144,
      innerDiskRadius: 72,
      outerDiskRadius: 360,
    });
    scene.add(singularityCore.group);

    // 5. Relativistic Gravitational Beams & Synaptic Layer
    const beamsLayer = new GravitationalBeamsLayer();
    scene.add(beamsLayer.group);

    // 6. 50,000-Node Logarithmic Spiral Galaxy (InstancedMesh + Circular Radial-Gradient Shaders)
    const nodeCount = 50000;
    const starGeometry = new THREE.PlaneGeometry(1.6, 1.6);

    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute vec3 instanceColor;
        varying vec3 vColor;
        varying vec2 vUv;
        varying float vViewDist;

        void main() {
          vUv = uv;
          vColor = instanceColor;

          // Transform instance origin to view space
          vec4 instancePos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          vec4 mvPosition = modelViewMatrix * instancePos;
          
          // Spherical billboard quad facing camera
          mvPosition.xy += position.xy;
          vViewDist = -mvPosition.z;

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying vec2 vUv;
        varying float vViewDist;

        void main() {
          vec2 coord = vUv - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;

          // Crisp circular radial gradient with bright pinpoint core
          float core = smoothstep(0.12, 0.0, dist);
          float halo = smoothstep(0.5, 0.0, dist);
          float alpha = halo * 0.75 + core * 0.65;

          // Distance attenuation: distant stars remain crisp cosmic pinpoints
          float distFactor = clamp(1300.0 / max(vViewDist, 100.0), 0.45, 1.9);
          vec3 finalColor = mix(vColor, vec3(1.0), core * 0.75) * distFactor;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const instancedMesh = new THREE.InstancedMesh(starGeometry, starMaterial, nodeCount);
    const dummy = new THREE.Object3D();
    const nodeColor = new THREE.Color();

    // 5 Domains color mapping for the 5 logarithmic spiral arms:
    // 0: 01_PROJETOS (Arc Cyan)
    // 1: 02_PADROES_E_DECISOES (Electric Violet)
    // 2: 03_PREFERENCIAS (Platinum White)
    // 3: 04_STACK_E_SKILLS (Event Horizon Lavender)
    // 4: 05_AGENTS (Cosmic Neon Cyan)
    const domainNames = [
      '01_PROJETOS',
      '02_PADROES_E_DECISOES',
      '03_PREFERENCIAS',
      '04_STACK_E_SKILLS',
      '05_AGENTS',
    ];

    const domainColors = [
      new THREE.Color(0x00f0ff), // 01_PROJETOS
      new THREE.Color(0x8b5cf6), // 02_PADROES_E_DECISOES
      new THREE.Color(0xe2e8f0), // 03_PREFERENCIAS
      new THREE.Color(0xaa88ff), // 04_STACK_E_SKILLS
      new THREE.Color(0x00f0ff), // 05_AGENTS
    ];

    const starPositionsArray = new Float32Array(nodeCount * 3);
    const starDomainsArray: string[] = new Array(nodeCount);

    const aLog = 130;
    const bLog = 0.135;
    const armStarsCount = 40000;

    // 6.1 Populate 5 Logarithmic Spiral Arms (40,000 stars)
    for (let i = 0; i < armStarsCount; i++) {
      const arm = i % 5;
      const armFraction = Math.floor(i / 5) / (armStarsCount / 5);
      // Power distribution: denser inner arms transitioning smoothly to outer rim
      const u = Math.pow(armFraction, 1.25);
      const thetaBase = (arm * Math.PI * 2) / 5;
      const windingAngle = u * (3.4 * Math.PI * 2);
      const theta = thetaBase + windingAngle;

      const baseRadius = aLog * Math.exp(bLog * (windingAngle * 0.45));
      const radius = Math.min(2750, Math.max(140, baseRadius));

      // Gaussian dispersion across spiral arm thickness
      const spreadRadial = (Math.random() - 0.5 + (Math.random() - 0.5)) * (20 + u * 75);
      const spreadTangential = (Math.random() - 0.5) * (15 + u * 45);
      const spreadVertical = (Math.random() - 0.5 + (Math.random() - 0.5)) * (10 + u * 28);

      const rEff = radius + spreadRadial;
      const x = Math.cos(theta) * rEff - Math.sin(theta) * spreadTangential;
      const z = Math.sin(theta) * rEff + Math.cos(theta) * spreadTangential;
      const y = spreadVertical;

      dummy.position.set(x, y, z);
      const scale = 0.7 + Math.random() * 1.3;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      instancedMesh.setMatrixAt(i, dummy.matrix);

      // Color mapping
      const baseCol = domainColors[arm];
      nodeColor.copy(baseCol);

      // 12% probability of Magenta Second Brain crystalline accent node along arm
      if (Math.random() < 0.12) {
        nodeColor.setHex(0xe879f9);
      }
      instancedMesh.setColorAt(i, nodeColor);

      starPositionsArray[i * 3 + 0] = x;
      starPositionsArray[i * 3 + 1] = y;
      starPositionsArray[i * 3 + 2] = z;
      starDomainsArray[i] = domainNames[arm];
    }

    // 6.2 Populate Central Galactic Bulge (10,000 stars)
    for (let i = armStarsCount; i < nodeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 68 + Math.pow(Math.random(), 1.6) * 240;
      const height = (Math.random() - 0.5) * 36 * (1.0 - r / 320);

      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = height;

      dummy.position.set(x, y, z);
      const scale = 0.6 + Math.random() * 1.1;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      instancedMesh.setMatrixAt(i, dummy.matrix);

      // Bulge transitions from Event Horizon Lavender to Platinum
      if (Math.random() < 0.6) {
        nodeColor.setHex(0xaa88ff);
      } else {
        nodeColor.setHex(0xdddddd);
      }
      instancedMesh.setColorAt(i, nodeColor);

      starPositionsArray[i * 3 + 0] = x;
      starPositionsArray[i * 3 + 1] = y;
      starPositionsArray[i * 3 + 2] = z;
      starDomainsArray[i] = '04_STACK_E_SKILLS';
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }
    scene.add(instancedMesh);

    // 6.3 Spatial Octree LOD (FLOW-GALAXY-LOD-01)
    const octreeLOD = new SpatialOctreeLOD({ maxDepth: 4, maxPerLeaf: 1024 });
    octreeLOD.build(starPositionsArray, starDomainsArray);
    (window as any).__kalinarGalaxyOctree = octreeLOD;

    // 7. 7 Canonical Agent Swarm Nodes & Orbiting Artifact Satellites
    const agentGroup = new THREE.Group();
    scene.add(agentGroup);

    const activeAgentMeshes: Map<string, THREE.Group> = new Map();
    const satelliteMeshes: Map<string, THREE.Mesh> = new Map();
    const orbitGuideRings: THREE.LineLoop[] = [];

    // Create orbital guide rings and swarm entities for the 7 canonical agents
    CANONICAL_SWARM_CONFIGS.forEach((cfg) => {
      // Orbital Guide Ring in Arc Cyan (#00F0FF)
      const ringSegments = 64;
      const ringGeom = new THREE.BufferGeometry();
      const ringPositions = new Float32Array((ringSegments + 1) * 3);
      for (let r = 0; r <= ringSegments; r++) {
        const a = (r / ringSegments) * Math.PI * 2;
        ringPositions[r * 3 + 0] = Math.cos(a) * cfg.orbitRadius;
        ringPositions[r * 3 + 1] = Math.sin(a * 2) * (cfg.tiltAngle * 18);
        ringPositions[r * 3 + 2] = Math.sin(a) * cfg.orbitRadius;
      }
      ringGeom.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
      const ringMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
      });
      const orbitRing = new THREE.LineLoop(ringGeom, ringMat);
      scene.add(orbitRing);
      orbitGuideRings.push(orbitRing);

      // Agent Swarm Group
      const singleAgentGroup = new THREE.Group();
      singleAgentGroup.userData = { agentId: cfg.id, filename: cfg.filename, config: cfg };

      // Core Agent Star: #00F0FF Arc Cyan glowing polyhedron
      const agentGeom = new THREE.IcosahedronGeometry(5.2, 1);
      const agentMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        wireframe: true,
        transparent: true,
        opacity: 0.9,
      });
      const star = new THREE.Mesh(agentGeom, agentMat);
      singleAgentGroup.add(star);

      // Inner glowing core
      const coreGeom = new THREE.SphereGeometry(2.6, 12, 12);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
      });
      const coreMesh = new THREE.Mesh(coreGeom, coreMat);
      singleAgentGroup.add(coreMesh);

      // Localized Swarm Particles (128 Arc Cyan micro-particles)
      const swarmGeom = new THREE.BufferGeometry();
      const swarmCount = 128;
      const swarmPos = new Float32Array(swarmCount * 3);
      for (let s = 0; s < swarmCount; s++) {
        const sa = Math.random() * Math.PI * 2;
        const sr = 10 + Math.random() * 16;
        swarmPos[s * 3 + 0] = Math.cos(sa) * sr;
        swarmPos[s * 3 + 1] = (Math.random() - 0.5) * 8;
        swarmPos[s * 3 + 2] = Math.sin(sa) * sr;
      }
      swarmGeom.setAttribute('position', new THREE.BufferAttribute(swarmPos, 3));
      const swarmMat = new THREE.PointsMaterial({
        color: 0x00f0ff,
        size: 2.4,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });
      const swarmPoints = new THREE.Points(swarmGeom, swarmMat);
      singleAgentGroup.add(swarmPoints);

      // Orbiting Amber Artifact Satellite (#FBBF24)
      const satGeom = new THREE.OctahedronGeometry(2.8, 0);
      const satMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.95,
      });
      const satellite = new THREE.Mesh(satGeom, satMat);
      satellite.userData = { activeFile: cfg.activeFile, agentId: cfg.id };
      singleAgentGroup.add(satellite);
      satelliteMeshes.set(cfg.id, satellite);

      // Faint Amber Satellite orbital path
      const satRingGeom = new THREE.BufferGeometry();
      const satRingPts = new Float32Array(33 * 3);
      const satRadius = 24;
      for (let s = 0; s <= 32; s++) {
        const sa = (s / 32) * Math.PI * 2;
        satRingPts[s * 3 + 0] = Math.cos(sa) * satRadius;
        satRingPts[s * 3 + 1] = 0;
        satRingPts[s * 3 + 2] = Math.sin(sa) * satRadius;
      }
      satRingGeom.setAttribute('position', new THREE.BufferAttribute(satRingPts, 3));
      const satRingMat = new THREE.LineBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.22,
      });
      const satOrbit = new THREE.LineLoop(satRingGeom, satRingMat);
      singleAgentGroup.add(satOrbit);

      agentGroup.add(singleAgentGroup);
      activeAgentMeshes.set(cfg.id, singleAgentGroup);
      activeAgentMeshes.set(cfg.filename, singleAgentGroup);
    });

    // 8. Second Brain Crystalline Nodes (#E879F9 Magenta) in Respective Spiral Arms
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
        nodeGroup.userData = { secondBrainId: node.id, wikilink: node.wikilink, domain: node.domain };

        const pos = node.position3D || computeDomainSpiralPosition(idx % 5, Math.floor(idx / 5));
        nodeGroup.position.set(pos[0], pos[1], pos[2]);

        // Outer Wireframe Polyhedron: Magenta (#E879F9)
        const outerGeom = new THREE.IcosahedronGeometry(4.4, 1);
        const outerMat = new THREE.MeshBasicMaterial({
          color: 0xe879f9,
          wireframe: true,
          transparent: true,
          opacity: 0.9,
        });
        const outerMesh = new THREE.Mesh(outerGeom, outerMat);
        nodeGroup.add(outerMesh);

        // Inner Solid Crystalline Core (#E879F9 / Deep Violet #C026D3)
        const innerGeom = new THREE.OctahedronGeometry(2.5, 0);
        const innerMat = new THREE.MeshBasicMaterial({
          color: 0xe879f9,
          transparent: true,
          opacity: 0.95,
        });
        const innerMesh = new THREE.Mesh(innerGeom, innerMat);
        nodeGroup.add(innerMesh);

        // Orbital Halo Ring (#E879F9)
        const ringGeom = new THREE.RingGeometry(6.5, 7.4, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xe879f9,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
        });
        const ringMesh = new THREE.Mesh(ringGeom, ringMat);
        ringMesh.rotation.x = Math.PI / 3;
        nodeGroup.add(ringMesh);

        secondBrainGroup.add(nodeGroup);
        secondBrainNodeMeshes.set(node.id, nodeGroup);
      });

      // Synchronize positions with beams layer
      beamsLayer.setSecondBrainNodes(
        nodes.map((n) => ({
          position: (n.position3D || [0, 0, 0]) as [number, number, number],
          wikilink: n.wikilink,
        }))
      );
    };

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
        .catch(() => {});
    }

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

    // 9. Interaction, Gaze Parallax & Click-To-Fly Transitions
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
      const targetEl = e.target as HTMLElement | null;
      if (
        targetEl &&
        targetEl !== renderer.domElement &&
        targetEl.closest(
          '[data-slot="command-palette"], [data-slot="dock-root"], [data-slot="node-inspector-drawer"], [data-slot="left-agent-cards-column"], [data-slot="top-right-trigger"], button, input, select, textarea'
        )
      ) {
        return;
      }

      const clickX = (e.clientX / width) * 2 - 1;
      const clickY = -(e.clientY / height) * 2 + 1;

      // Emergency kill-switch on Singularity click (< 10ms)
      if (Math.hypot(clickX, clickY) < 0.25) {
        kalinarVoiceService.triggerEmergencyKillSwitch('SINGULARITY_CLICK');
        return;
      }

      // Raycasting for agent / second brain node selection
      raycaster.setFromCamera(new THREE.Vector2(clickX, clickY), camera);

      // Check agent stars
      const agentIntersects = raycaster.intersectObjects(agentGroup.children, true);
      if (agentIntersects.length > 0) {
        let parentGroup: THREE.Object3D | null = agentIntersects[0].object;
        while (parentGroup && !parentGroup.userData?.agentId && parentGroup.parent) {
          parentGroup = parentGroup.parent;
        }
        if (parentGroup?.userData?.agentId) {
          selectAgent(parentGroup.userData.agentId);
          return;
        }
      }

      // Check second brain nodes
      const sbIntersects = raycaster.intersectObjects(secondBrainGroup.children, true);
      if (sbIntersects.length > 0) {
        let parentGroup: THREE.Object3D | null = sbIntersects[0].object;
        while (parentGroup && !parentGroup.userData?.secondBrainId && parentGroup.parent) {
          parentGroup = parentGroup.parent;
        }
        if (parentGroup?.userData?.secondBrainId) {
          const targetPos = parentGroup.position;
          beamsLayer.triggerGravitationalRAG([targetPos.x, targetPos.y, targetPos.z]);
          return;
        }
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', onResize);

    // 10. Main Animation Render Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();

      // Step fluid simulation
      fluid.step(dt);

      // Acoustic coupling: Sample real-time Tauz frequency bands at 60 FPS
      const storeSnapshot = useKalinarStore.getState();
      const liveVoiceState = storeSnapshot.singularity.voiceState;
      const isSpeakingState =
        liveVoiceState === '[SPEAKING]' || liveVoiceState === '[KALINAR_SPEAKING]';
      const isListeningState =
        liveVoiceState === '[LISTENING]' || liveVoiceState === '[LISTENING PT-BR]';
      const bands =
        isSpeakingState || isListeningState
          ? kalinarVoiceService.getRealtimeFrequencyBands()
          : { subBass: 0, lowMid: 0, highPresence: 0, compositePulse: 0 };
      const voicePulse = isSpeakingState
        ? 1.0 + bands.compositePulse * 0.85 + bands.subBass * 0.45
        : isListeningState
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

      // Rotate galaxy instanced stars
      if (!isReducedMotion) {
        instancedMesh.rotation.y = elapsedTime * 0.012;
      }

      // Update 7 Canonical Agent Swarm Orbit Positions
      const updatedAgentPositions: Array<{
        id: string;
        filename: string;
        position: [number, number, number];
        status: string;
      }> = [];

      CANONICAL_SWARM_CONFIGS.forEach((cfg) => {
        const group = activeAgentMeshes.get(cfg.id);
        if (!group) return;

        const orbitAngle = cfg.orbitPhase + elapsedTime * cfg.orbitSpeed;
        const ox = Math.cos(orbitAngle) * cfg.orbitRadius;
        const oz = Math.sin(orbitAngle) * cfg.orbitRadius;
        const oy = Math.sin(orbitAngle * 2.0) * (cfg.tiltAngle * 18);

        group.position.set(ox, oy, oz);
        if (!isReducedMotion) {
          group.rotation.y = elapsedTime * 0.45;
        }

        // Orbiting Amber Artifact Satellite (#FBBF24) around agent star
        const satellite = satelliteMeshes.get(cfg.id);
        if (satellite) {
          const satRadius = 24;
          const satAngle = elapsedTime * 1.8 + cfg.orbitPhase * 2;
          satellite.position.set(
            Math.cos(satAngle) * satRadius,
            Math.sin(satAngle * 1.5) * 6,
            Math.sin(satAngle) * satRadius
          );
          if (!isReducedMotion) {
            satellite.rotation.x = elapsedTime * 1.2;
            satellite.rotation.y = elapsedTime * 1.4;
          }
        }

        updatedAgentPositions.push({
          id: cfg.id,
          filename: cfg.filename,
          position: [ox, oy, oz],
          status: '[ACTIVE]',
        });
      });

      // Synchronize agent positions with beams layer
      beamsLayer.setSwarmAgents(updatedAgentPositions);

      // Rotate Second Brain 3D Crystalline Nodes
      secondBrainNodeMeshes.forEach((mesh, idx) => {
        if (!isReducedMotion) {
          mesh.rotation.y = elapsedTime * (0.35 + (idx.length % 3) * 0.1);
          mesh.rotation.x = elapsedTime * 0.18;
        }
      });

      // Update Relativistic Gravitational Beams & Synaptic Layer
      beamsLayer.update(elapsedTime, dt);

      // Evaluate Spatial Octree LOD culling (FLOW-GALAXY-LOD-01, < 4ms)
      octreeLOD.evaluateLOD(camera);

      // Camera Gaze Parallax (lerp 0.05) & Smooth Flight to Focused Target
      const liveAgents = storeSnapshot.agents;
      const liveSelectedAgentId = storeSnapshot.selectedAgentId;
      const targetAgent = liveAgents.find(
        (a) => a.id === liveSelectedAgentId || a.filename === liveSelectedAgentId
      );
      if (targetAgent && activeAgentMeshes.has(targetAgent.id)) {
        const agentGroupMesh = activeAgentMeshes.get(targetAgent.id)!;
        cameraDesiredPos.set(
          agentGroupMesh.position.x * 0.65,
          agentGroupMesh.position.y + 110,
          agentGroupMesh.position.z + 320
        );
        cameraTarget.lerp(agentGroupMesh.position, 0.05);
      } else {
        cameraDesiredPos.set(0, 240, 720);
        cameraTarget.lerp(new THREE.Vector3(0, 0, 0), 0.05);
      }

      // Subtle mouse parallax
      const parallaxX = mouseNdc.x * 35.0;
      const parallaxY = mouseNdc.y * 25.0;
      camera.position.x += (cameraDesiredPos.x + parallaxX - camera.position.x) * 0.05;
      camera.position.y += (cameraDesiredPos.y + parallaxY - camera.position.y) * 0.05;
      camera.position.z += (cameraDesiredPos.z - camera.position.z) * 0.05;
      camera.lookAt(cameraTarget);

      renderer.setRenderTarget(null);
      renderer.render(scene, camera);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Global hook for HUD button and event triggers
    (window as any).__triggerGravitationalRAG = (targetPos?: [number, number, number]) => {
      beamsLayer.triggerGravitationalRAG(targetPos);
    };
    (window as any).__kalinarBeamsLayer = beamsLayer;
    (window as any).__kalinarActiveBeams = () => beamsLayer.getActiveBeams();

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
      delete (window as any).__kalinarGalaxyOctree;
      delete (window as any).__kalinarBeamsLayer;
      delete (window as any).__kalinarActiveBeams;

      clearSecondBrainMeshes();
      orbitGuideRings.forEach((r) => {
        r.geometry.dispose();
        (r.material as THREE.Material).dispose();
      });
      fluid.dispose();
      singularityCore.dispose();
      beamsLayer.dispose();
      octreeLOD.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      instancedMesh.dispose();

      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [selectAgent]);

  // When drawer opens or RAG button is clicked, trigger ingestion
  useEffect(() => {
    if (isInspectorDrawerOpen && typeof (window as any).__triggerGravitationalRAG === 'function') {
      const selectedAgent = agents.find((a) => a.id === selectedAgentId);
      (window as any).__triggerGravitationalRAG(selectedAgent?.position3D || [120, 80, 0]);
    }
  }, [isInspectorDrawerOpen, agents, selectedAgentId]);

  return <div ref={containerRef} className="fixed inset-0 w-full h-full z-0 overflow-hidden" />;
}
