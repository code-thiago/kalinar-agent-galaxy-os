/**
 * KALINAR GRAVITATIONAL BEAMS & RELATIVISTIC RAG SYNAPTIC LAYER (v1.3.0)
 * Quadratic and Cubic Bezier Energy Tethers:
 * 1. GRAVITATIONAL_PULL: Second Brain (#E879F9) -> Singularity Event Horizon (#AA88FF)
 * 2. SINGULARITY_PULSE: Singularity (#AA88FF) -> Canonical Swarm Agents (#00F0FF)
 * 3. AGENT_TO_AGENT: Cyan/Violet Bezier arcs reflecting WAR_ROOM.md handoffs
 * Strict Three.js Scene Contract: exactly 2 children in this.group (pulseBeams + ingestionParticles)
 * Strictly Zero Emojis
 */

import * as THREE from 'three';
import { SynapticBeam } from '../../types/kalinar.js';

export interface GravitationalBeamsConfig {
  maxSegmentsPerCurve?: number;
}

export interface SwarmAgentPosition {
  id: string;
  filename: string;
  position: [number, number, number];
  status?: string;
}

export interface SecondBrainNodePosition {
  id?: string;
  wikilink?: string;
  position: [number, number, number];
}

export interface WarRoomHandoffRef {
  from: string;
  to: string;
}

const DEFAULT_SECOND_BRAIN_POSITIONS: Array<[number, number, number]> = [
  [-140, 60, -90],  // 00_INDEX (01_PROJETOS)
  [-80, 95, 120],   // ADR-001 (02_PADROES)
  [90, 70, -110],   // ADR-002 (02_PADROES)
  [130, 45, 90],    // ADR-003 (02_PADROES)
  [0, 110, 140],    // PADRAO-Design-System (02_PADROES)
  [-160, 40, 60],   // Stack-Principal (04_STACK)
];

const DEFAULT_CANONICAL_AGENT_POSITIONS: SwarmAgentPosition[] = [
  { id: 'agent-orchestrator-01', filename: '@agent-orchestrator', position: [0, 120, 0], status: '[ACTIVE]' },
  { id: 'agent-software-engineer-01', filename: '@agent-software-engineer', position: [120, 80, 0], status: '[RUNNING]' },
  { id: 'agent-design-01', filename: '@agent-design', position: [-120, 60, 90], status: '[ACTIVE]' },
  { id: 'agent-content-01', filename: '@agent-content', position: [140, 50, -80], status: '[IDLE]' },
  { id: 'agent-data-01', filename: '@agent-data', position: [-100, 70, -110], status: '[IDLE]' },
  { id: 'agent-cybersecurity-01', filename: '@agent-cybersecurity', position: [90, 90, 110], status: '[IDLE]' },
  { id: 'agent-qa-01', filename: '@agent-qa', position: [-60, 100, 120], status: '[IDLE]' },
];

const DEFAULT_WAR_ROOM_HANDOFFS: WarRoomHandoffRef[] = [
  { from: '@agent-orchestrator', to: '@agent-software-engineer' },
  { from: '@agent-software-engineer', to: '@agent-qa' },
  { from: '@agent-qa', to: '@agent-orchestrator' },
  { from: '@agent-software-engineer', to: '@agent-orchestrator' },
  { from: '@agent-orchestrator', to: '@agent-design' },
];

export class GravitationalBeamsLayer {
  public group: THREE.Group;

  // Exact 2 children for contract compatibility with task-2-singularity.test.ts
  private pulseBeams: THREE.LineSegments;
  private ingestionParticles: THREE.Points;

  private beamGeometry: THREE.BufferGeometry;
  private beamMaterial: THREE.LineBasicMaterial;

  private ingestionGeometry: THREE.BufferGeometry;
  private ingestionMaterial: THREE.ShaderMaterial;

  private isRagPullActive: boolean = false;
  private ragProgress: number = 0;
  private targetAgentPos: THREE.Vector3 = new THREE.Vector3(120, 80, 0);

  private secondBrainPositions: THREE.Vector3[] = [];
  private agentPositions: Map<string, THREE.Vector3> = new Map();
  private warRoomHandoffs: WarRoomHandoffRef[] = [...DEFAULT_WAR_ROOM_HANDOFFS];

  private maxLineSegments: number = 2048;
  private segmentsPerCurve: number = 24;

  constructor(_config?: GravitationalBeamsConfig) {
    this.group = new THREE.Group();

    // Initialize baseline positions
    this.secondBrainPositions = DEFAULT_SECOND_BRAIN_POSITIONS.map((p) => new THREE.Vector3(...p));
    DEFAULT_CANONICAL_AGENT_POSITIONS.forEach((ag) => {
      this.agentPositions.set(ag.filename, new THREE.Vector3(...ag.position));
      this.agentPositions.set(ag.id, new THREE.Vector3(...ag.position));
    });

    // 1. Relativistic Pulse Beams & Synaptic Tethers (LineSegments)
    this.beamGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(this.maxLineSegments * 2 * 3);
    const lineColors = new Float32Array(this.maxLineSegments * 2 * 3);
    this.beamGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    this.beamGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    this.beamMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.pulseBeams = new THREE.LineSegments(this.beamGeometry, this.beamMaterial);
    this.group.add(this.pulseBeams);

    // 2. Gravitational Ingestion Particles (Second Brain -> Event Horizon & Relativistic Pulses)
    const particleCount = 2048;
    this.ingestionGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleOrigins = new Float32Array(particleCount * 3);
    const particleControls1 = new Float32Array(particleCount * 3);
    const particleControls2 = new Float32Array(particleCount * 3);
    const particleTargets = new Float32Array(particleCount * 3);
    const particleOffsets = new Float32Array(particleCount);
    const particleTypes = new Float32Array(particleCount); // 0 = RAG Pull, 1 = Singularity Pulse, 2 = Agent-to-Agent

    for (let i = 0; i < particleCount; i++) {
      const type = i < 1200 ? 0 : i < 1600 ? 1 : 2;
      particleTypes[i] = type;
      particleOffsets[i] = Math.random();

      if (type === 0) {
        // GRAVITATIONAL_PULL: Origin = random Second Brain position
        const originRef = this.secondBrainPositions[i % this.secondBrainPositions.length];
        const ox = originRef.x + (Math.random() - 0.5) * 15;
        const oy = originRef.y + (Math.random() - 0.5) * 15;
        const oz = originRef.z + (Math.random() - 0.5) * 15;

        particleOrigins[i * 3 + 0] = ox;
        particleOrigins[i * 3 + 1] = oy;
        particleOrigins[i * 3 + 2] = oz;

        // Spiral control points inwards
        particleControls1[i * 3 + 0] = ox * 0.65 - oz * 0.35;
        particleControls1[i * 3 + 1] = oy * 0.6;
        particleControls1[i * 3 + 2] = oz * 0.65 + ox * 0.35;

        particleControls2[i * 3 + 0] = ox * 0.25 - oz * 0.2;
        particleControls2[i * 3 + 1] = oy * 0.2;
        particleControls2[i * 3 + 2] = oz * 0.25 + ox * 0.2;

        // Target: Event Horizon core (0,0,0)
        particleTargets[i * 3 + 0] = 0;
        particleTargets[i * 3 + 1] = 0;
        particleTargets[i * 3 + 2] = 0;

        particlePositions[i * 3 + 0] = ox;
        particlePositions[i * 3 + 1] = oy;
        particlePositions[i * 3 + 2] = oz;
      } else if (type === 1) {
        // SINGULARITY_PULSE: Origin = Singularity Event Horizon (0,0,0)
        particleOrigins[i * 3 + 0] = 0;
        particleOrigins[i * 3 + 1] = 0;
        particleOrigins[i * 3 + 2] = 0;

        // Target: random agent
        const agentArr = Array.from(this.agentPositions.values());
        const ag = agentArr[(i - 1200) % Math.max(1, agentArr.length)] || new THREE.Vector3(120, 80, 0);

        particleControls1[i * 3 + 0] = ag.x * 0.35;
        particleControls1[i * 3 + 1] = ag.y * 0.35 + 25;
        particleControls1[i * 3 + 2] = ag.z * 0.35;

        particleControls2[i * 3 + 0] = ag.x * 0.7;
        particleControls2[i * 3 + 1] = ag.y * 0.7 + 15;
        particleControls2[i * 3 + 2] = ag.z * 0.7;

        particleTargets[i * 3 + 0] = ag.x;
        particleTargets[i * 3 + 1] = ag.y;
        particleTargets[i * 3 + 2] = ag.z;

        particlePositions[i * 3 + 0] = 0;
        particlePositions[i * 3 + 1] = 0;
        particlePositions[i * 3 + 2] = 0;
      } else {
        // AGENT_TO_AGENT: Origin = Agent A, Target = Agent B
        const handoff = this.warRoomHandoffs[(i - 1600) % this.warRoomHandoffs.length];
        const pFrom = this.agentPositions.get(handoff?.from) || new THREE.Vector3(0, 120, 0);
        const pTo = this.agentPositions.get(handoff?.to) || new THREE.Vector3(120, 80, 0);

        particleOrigins[i * 3 + 0] = pFrom.x;
        particleOrigins[i * 3 + 1] = pFrom.y;
        particleOrigins[i * 3 + 2] = pFrom.z;

        particleControls1[i * 3 + 0] = pFrom.x * 0.65 + pTo.x * 0.35;
        particleControls1[i * 3 + 1] = Math.max(pFrom.y, pTo.y) + 40;
        particleControls1[i * 3 + 2] = pFrom.z * 0.65 + pTo.z * 0.35;

        particleControls2[i * 3 + 0] = pFrom.x * 0.35 + pTo.x * 0.65;
        particleControls2[i * 3 + 1] = Math.max(pFrom.y, pTo.y) + 40;
        particleControls2[i * 3 + 2] = pFrom.z * 0.35 + pTo.z * 0.65;

        particleTargets[i * 3 + 0] = pTo.x;
        particleTargets[i * 3 + 1] = pTo.y;
        particleTargets[i * 3 + 2] = pTo.z;

        particlePositions[i * 3 + 0] = pFrom.x;
        particlePositions[i * 3 + 1] = pFrom.y;
        particlePositions[i * 3 + 2] = pFrom.z;
      }
    }

    this.ingestionGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    this.ingestionGeometry.setAttribute('aOrigin', new THREE.BufferAttribute(particleOrigins, 3));
    this.ingestionGeometry.setAttribute('aControl1', new THREE.BufferAttribute(particleControls1, 3));
    this.ingestionGeometry.setAttribute('aControl2', new THREE.BufferAttribute(particleControls2, 3));
    this.ingestionGeometry.setAttribute('aTarget', new THREE.BufferAttribute(particleTargets, 3));
    this.ingestionGeometry.setAttribute('aOffset', new THREE.BufferAttribute(particleOffsets, 1));
    this.ingestionGeometry.setAttribute('aType', new THREE.BufferAttribute(particleTypes, 1));

    this.ingestionMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        uniform float uProgress;
        uniform float uTime;
        attribute vec3 aOrigin;
        attribute vec3 aControl1;
        attribute vec3 aControl2;
        attribute vec3 aTarget;
        attribute float aOffset;
        attribute float aType;
        varying float vAlpha;
        varying float vType;

        // Cubic Bezier interpolation
        vec3 cubicBezier(vec3 p0, vec3 p1, vec3 p2, vec3 p3, float t) {
          float u = 1.0 - t;
          float tt = t * t;
          float uu = u * u;
          float uuu = uu * u;
          float ttt = tt * t;
          return uuu * p0 + 3.0 * uu * t * p1 + 3.0 * u * tt * p2 + ttt * p3;
        }

        void main() {
          vType = aType;
          vec3 currentPos = aOrigin;
          float alpha = 0.0;

          if (aType < 0.5) {
            // 0: GRAVITATIONAL_PULL
            float t = fract(uProgress + aOffset);
            currentPos = cubicBezier(aOrigin, aControl1, aControl2, aTarget, t);
            
            // Spiral swirl around singularity
            float spiral = t * 6.28 * 2.5;
            float cosS = cos(spiral);
            float sinS = sin(spiral);
            vec2 xz = mat2(cosS, -sinS, sinS, cosS) * currentPos.xz;
            currentPos.x = xz.x;
            currentPos.z = xz.y;

            alpha = (1.0 - t) * smoothstep(0.0, 0.08, uProgress);
          } else if (aType < 1.5) {
            // 1: SINGULARITY_PULSE
            float t = fract(uTime * 0.75 + aOffset);
            currentPos = cubicBezier(aOrigin, aControl1, aControl2, aTarget, t);
            alpha = (1.0 - t) * (0.3 + 0.7 * smoothstep(0.4, 0.9, uProgress));
          } else {
            // 2: AGENT_TO_AGENT handoff
            float t = fract(uTime * 0.45 + aOffset);
            currentPos = cubicBezier(aOrigin, aControl1, aControl2, aTarget, t);
            alpha = sin(t * 3.14159) * 0.85;
          }

          vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = clamp(24.0 / -mvPosition.z, 2.0, 16.0);
          vAlpha = alpha;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying float vType;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;

          vec3 color = vec3(0.91, 0.47, 0.98); // #E879F9 Magenta (RAG Pull)
          if (vType > 0.5 && vType < 1.5) {
            color = vec3(0.67, 0.53, 1.0); // #AA88FF Lavender (Singularity Pulse)
          } else if (vType >= 1.5) {
            color = vec3(0.0, 0.94, 1.0); // #00F0FF Arc Cyan (Agent Handoff)
          }

          float core = smoothstep(0.15, 0.0, dist);
          float halo = smoothstep(0.5, 0.0, dist);
          gl_FragColor = vec4(mix(color, vec3(1.0), core * 0.6), (halo * 0.75 + core * 0.25) * vAlpha);
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

    // Initial render of Bezier tethers
    this.rebuildBezierTethers(0);
  }

  public setSecondBrainNodes(nodes: SecondBrainNodePosition[]): void {
    if (!nodes || nodes.length === 0) return;
    this.secondBrainPositions = nodes.map((n) => new THREE.Vector3(...n.position));
    this.rebuildBezierTethers(0);
  }

  public setSwarmAgents(agents: SwarmAgentPosition[]): void {
    if (!agents || agents.length === 0) return;
    agents.forEach((ag) => {
      this.agentPositions.set(ag.filename, new THREE.Vector3(...ag.position));
      this.agentPositions.set(ag.id, new THREE.Vector3(...ag.position));
    });
    this.rebuildBezierTethers(0);
  }

  public setWarRoomHandoffs(handoffs: WarRoomHandoffRef[]): void {
    if (!handoffs || handoffs.length === 0) return;
    this.warRoomHandoffs = handoffs;
    this.rebuildBezierTethers(0);
  }

  public triggerGravitationalRAG(targetAgentPosition?: [number, number, number]): void {
    this.isRagPullActive = true;
    this.ragProgress = 0.0;
    if (targetAgentPosition) {
      this.targetAgentPos.set(...targetAgentPosition);
    }
  }

  public getActiveBeams(): SynapticBeam[] {
    const beams: SynapticBeam[] = [];

    // 1. Gravitational pull beams from Second Brain nodes
    this.secondBrainPositions.forEach((_pos, idx) => {
      beams.push({
        id: `beam-rag-${idx}`,
        sourceId: `second-brain-node-${idx}`,
        targetId: 'singularity-event-horizon',
        beamType: 'GRAVITATIONAL_PULL',
        intensity: this.isRagPullActive ? 1.0 - this.ragProgress * 0.5 : 0.2,
        colorToken: '#E879F9',
      });
    });

    // 2. Singularity pulse beams to agents
    this.agentPositions.forEach((_pos, agentKey) => {
      if (agentKey.startsWith('@')) {
        beams.push({
          id: `beam-pulse-${agentKey}`,
          sourceId: 'singularity-event-horizon',
          targetId: agentKey,
          beamType: 'SINGULARITY_PULSE',
          intensity: this.isRagPullActive && this.ragProgress > 0.45 ? 0.95 : 0.35,
          colorToken: '#AA88FF',
        });
      }
    });

    // 3. Agent-to-Agent synaptic handoff beams
    this.warRoomHandoffs.forEach((handoff, idx) => {
      beams.push({
        id: `beam-handoff-${idx}`,
        sourceId: handoff.from,
        targetId: handoff.to,
        beamType: 'AGENT_TO_AGENT',
        intensity: 0.8,
        colorToken: '#00F0FF',
      });
    });

    return beams;
  }

  private rebuildBezierTethers(time: number): void {
    const posAttr = this.beamGeometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.beamGeometry.attributes.color as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    const colArray = colAttr.array as Float32Array;

    let vertexIndex = 0;

    const addSegment = (
      p0: THREE.Vector3,
      p1: THREE.Vector3,
      c0: [number, number, number],
      c1: [number, number, number]
    ) => {
      if (vertexIndex + 6 > posArray.length) return;
      posArray[vertexIndex + 0] = p0.x;
      posArray[vertexIndex + 1] = p0.y;
      posArray[vertexIndex + 2] = p0.z;
      colArray[vertexIndex + 0] = c0[0];
      colArray[vertexIndex + 1] = c0[1];
      colArray[vertexIndex + 2] = c0[2];

      posArray[vertexIndex + 3] = p1.x;
      posArray[vertexIndex + 4] = p1.y;
      posArray[vertexIndex + 5] = p1.z;
      colArray[vertexIndex + 3] = c1[0];
      colArray[vertexIndex + 4] = c1[1];
      colArray[vertexIndex + 5] = c1[2];

      vertexIndex += 6;
    };

    const sampleCubicBezier = (
      p0: THREE.Vector3,
      p1: THREE.Vector3,
      p2: THREE.Vector3,
      p3: THREE.Vector3,
      cStart: [number, number, number],
      cEnd: [number, number, number],
      steps: number,
      pulsePhase: number
    ) => {
      let prevPoint = p0.clone();
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const u = 1.0 - t;
        const tt = t * t;
        const uu = u * u;

        const curr = new THREE.Vector3()
          .addScaledVector(p0, uu * u)
          .addScaledVector(p1, 3 * uu * t)
          .addScaledVector(p2, 3 * u * tt)
          .addScaledVector(p3, tt * t);

        // Modulate color intensity along path with traveling pulse wave
        const wave = Math.sin((t * 4.0 - pulsePhase) * Math.PI) * 0.5 + 0.5;
        const col0: [number, number, number] = [
          (cStart[0] * (1 - t) + cEnd[0] * t) * (0.6 + wave * 0.4),
          (cStart[1] * (1 - t) + cEnd[1] * t) * (0.6 + wave * 0.4),
          (cStart[2] * (1 - t) + cEnd[2] * t) * (0.6 + wave * 0.4),
        ];
        const col1: [number, number, number] = [
          (cStart[0] * (1 - t) + cEnd[0] * t) * (0.7 + wave * 0.3),
          (cStart[1] * (1 - t) + cEnd[1] * t) * (0.7 + wave * 0.3),
          (cStart[2] * (1 - t) + cEnd[2] * t) * (0.7 + wave * 0.3),
        ];

        addSegment(prevPoint, curr, col0, col1);
        prevPoint = curr;
      }
    };

    // 1. Second Brain Ingestion Tethers (Magenta #E879F9 -> Lavender #AA88FF)
    const ragAlpha = this.isRagPullActive ? 1.0 : 0.25;
    const cMagenta: [number, number, number] = [0.91 * ragAlpha, 0.47 * ragAlpha, 0.98 * ragAlpha];
    const cLavender: [number, number, number] = [0.67 * ragAlpha, 0.53 * ragAlpha, 1.0 * ragAlpha];

    this.secondBrainPositions.forEach((sbPos, idx) => {
      const p0 = sbPos;
      const p3 = new THREE.Vector3(0, 0, 0); // Singularity core

      // Spiral control points
      const p1 = new THREE.Vector3(
        p0.x * 0.65 - p0.z * 0.35,
        p0.y * 0.6,
        p0.z * 0.65 + p0.x * 0.35
      );
      const p2 = new THREE.Vector3(
        p0.x * 0.25 - p0.z * 0.2,
        p0.y * 0.25,
        p0.z * 0.25 + p0.x * 0.2
      );

      sampleCubicBezier(p0, p1, p2, p3, cMagenta, cLavender, this.segmentsPerCurve, time * 1.5 + idx);
    });

    // 2. Relativistic Singularity Pulse Beams (#AA88FF -> #00F0FF)
    const pulseStrength = this.isRagPullActive && this.ragProgress > 0.45 ? 1.2 : 0.3;
    const cPulseStart: [number, number, number] = [0.67 * pulseStrength, 0.53 * pulseStrength, 1.0 * pulseStrength];
    const cPulseEnd: [number, number, number] = [0.0 * pulseStrength, 0.94 * pulseStrength, 1.0 * pulseStrength];

    this.agentPositions.forEach((agPos, key) => {
      if (key.startsWith('@')) {
        const p0 = new THREE.Vector3(0, 0, 0);
        const p3 = agPos;
        const p1 = new THREE.Vector3(agPos.x * 0.33, agPos.y * 0.33 + 30, agPos.z * 0.33);
        const p2 = new THREE.Vector3(agPos.x * 0.66, agPos.y * 0.66 + 20, agPos.z * 0.66);

        sampleCubicBezier(p0, p1, p2, p3, cPulseStart, cPulseEnd, this.segmentsPerCurve, time * 2.0);
      }
    });

    // 3. Agent-to-Agent Synaptic Handoff Beams (#00F0FF Arc Cyan -> #8B5CF6 Violet)
    const cCyan: [number, number, number] = [0.0, 0.94, 1.0];
    const cViolet: [number, number, number] = [0.55, 0.36, 0.96];

    this.warRoomHandoffs.forEach((handoff, hIdx) => {
      const pFrom = this.agentPositions.get(handoff.from);
      const pTo = this.agentPositions.get(handoff.to);
      if (!pFrom || !pTo) return;

      const dist = pFrom.distanceTo(pTo);
      const arch = Math.min(80, Math.max(30, dist * 0.3));

      const p1 = new THREE.Vector3(
        pFrom.x * 0.67 + pTo.x * 0.33,
        Math.max(pFrom.y, pTo.y) + arch,
        pFrom.z * 0.67 + pTo.z * 0.33
      );
      const p2 = new THREE.Vector3(
        pFrom.x * 0.33 + pTo.x * 0.67,
        Math.max(pFrom.y, pTo.y) + arch,
        pFrom.z * 0.33 + pTo.z * 0.67
      );

      sampleCubicBezier(pFrom, p1, p2, pTo, cCyan, cViolet, this.segmentsPerCurve, time * 1.8 + hIdx);
    });

    // Zero out unused vertices
    for (let i = vertexIndex; i < posArray.length; i++) {
      posArray[i] = 0;
      colArray[i] = 0;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  public update(time: number, dt: number): void {
    if (this.isRagPullActive) {
      this.ragProgress += dt * 0.75;
      this.ingestionMaterial.uniforms.uProgress.value = this.ragProgress;
      this.ingestionMaterial.uniforms.uTime.value = time;

      if (this.ragProgress >= 1.0) {
        this.isRagPullActive = false;
        this.ragProgress = 0.0;
      }
    } else {
      this.ingestionMaterial.uniforms.uProgress.value = 0.0;
      this.ingestionMaterial.uniforms.uTime.value = time;
    }

    // Dynamic Bezier pulse animation
    this.rebuildBezierTethers(time);
  }

  public dispose(): void {
    this.beamGeometry.dispose();
    this.beamMaterial.dispose();
    this.ingestionGeometry.dispose();
    this.ingestionMaterial.dispose();
  }
}
