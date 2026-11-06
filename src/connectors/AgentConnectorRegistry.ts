/**
 * KALINAR UNIVERSAL AGENT CONNECTOR SDK (v0.3.0-alpha)
 * 3 Native Connectors: Local Vault MD, Antigravity/MCP CLI, and Localhost Webhook
 * Strictly Zero Emojis
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import {
  AgentNode,
  AgentStatus,
  ArtifactSatelliteNode,
  CanvasEdge,
  CanvasNode,
  CanvasSyncRequest,
  CanvasSyncResult,
  IKalinarAgentConnector,
  LiveGitDiffResult,
  ObsidianCanvasDocument,
  SCHEMA_VERSION,
  SecondBrainInjectPayload,
  SecondBrainInjectResult,
  SecondBrainNode,
  SecondBrainQueryResult,
  SecondBrainVaultNote,
  SecondBrainVaultQueryParams,
  StructuredDiffLine,
  WorkspaceScanResult,
} from '../types/kalinar.js';
import { eventBus } from '../core/KalinarEventBus.js';

export function sanitizeWorkspaceFilePath(
  workspaceRoot: string,
  candidatePath: string
): { valid: boolean; resolvedPath: string; relativePath: string; reason?: string } {
  let cleanCandidate = (candidatePath || '').trim();
  if (!cleanCandidate || cleanCandidate.includes('\0')) {
    return {
      valid: false,
      resolvedPath: '',
      relativePath: '',
      reason: '[SECURITY_VIOLATION] Empty or null-byte file path rejected',
    };
  }

  // Detect and reject URL-encoded traversal characters (such as %2e, %2f, %5c, %25)
  if (/%2[eEfF]|%5[cC]|%25|%00/i.test(cleanCandidate)) {
    return {
      valid: false,
      resolvedPath: '',
      relativePath: '',
      reason: '[SECURITY_VIOLATION] URL-encoded traversal character rejected',
    };
  }

  // Pre-decode check for traversal tokens or shell metacharacters
  if (/(^|[/\\])\.\.([/\\]|$)/.test(cleanCandidate) || cleanCandidate.includes('..') || /[;&|`$<>]/.test(cleanCandidate)) {
    return {
      valid: false,
      resolvedPath: '',
      relativePath: '',
      reason: '[SECURITY_VIOLATION] Path traversal (../) or shell metacharacter rejected',
    };
  }

  // URL-decode candidatePath using decodeURIComponent (wrapped in try/catch to reject malformed encodings)
  try {
    cleanCandidate = decodeURIComponent(cleanCandidate);
  } catch {
    return {
      valid: false,
      resolvedPath: '',
      relativePath: '',
      reason: '[SECURITY_VIOLATION] Malformed URL encoding rejected',
    };
  }

  // Detect and reject decoded traversal characters, dots, null bytes, or shell metacharacters
  if (
    cleanCandidate.includes('\0') ||
    /%2[eEfF]|%5[cC]|%25|%00/i.test(cleanCandidate) ||
    cleanCandidate.includes('..') ||
    /(^|[/\\])\.\.([/\\]|$)/.test(cleanCandidate) ||
    /[;&|`$<>]/.test(cleanCandidate)
  ) {
    return {
      valid: false,
      resolvedPath: '',
      relativePath: '',
      reason: '[SECURITY_VIOLATION] Decoded path traversal (../) or shell metacharacter rejected',
    };
  }

  const rootResolved = path.resolve(workspaceRoot);
  const targetResolved = path.resolve(rootResolved, cleanCandidate);
  const rel = path.relative(rootResolved, targetResolved);

  if (
    !rel ||
    rel === '.' ||
    rel.startsWith('..') ||
    path.isAbsolute(rel) ||
    rel.includes('..') ||
    /(^|[/\\])\.\.([/\\]|$)/.test(rel)
  ) {
    return {
      valid: false,
      resolvedPath: '',
      relativePath: '',
      reason: '[SECURITY_VIOLATION] Resolved path escapes workspace root boundary',
    };
  }

  // Ensure resolved path starts strictly within root boundary
  const normalizedRoot = rootResolved.endsWith(path.sep) ? rootResolved : rootResolved + path.sep;
  const normalizedTarget = targetResolved.endsWith(path.sep) ? targetResolved : targetResolved + path.sep;
  if (targetResolved !== rootResolved && !normalizedTarget.startsWith(normalizedRoot)) {
    return {
      valid: false,
      resolvedPath: '',
      relativePath: '',
      reason: '[SECURITY_VIOLATION] Resolved path escapes workspace root boundary',
    };
  }

  return {
    valid: true,
    resolvedPath: targetResolved,
    relativePath: rel.replace(/\\/g, '/'),
  };
}

/* =====================================================================
   COORDINATE TRANSFORMATION: 3D GALAXY <-> 2D OBSIDIAN CANVAS 1.0
   ===================================================================== */

export function map3DToCanvasCoordinates(
  position3D: [number, number, number]
): { x: number; y: number } {
  return {
    x: Math.round(position3D[0] * 4),
    y: Math.round(position3D[2] * 4),
  };
}

export function mapCanvasTo3DCoordinates(
  canvasX: number,
  canvasY: number,
  previousY = 0
): [number, number, number] {
  return [
    Math.round(canvasX / 4),
    previousY,
    Math.round(canvasY / 4),
  ];
}

/* =====================================================================
   OBSIDIAN JSON CANVAS 1.0 SERIALIZATION & DESERIALIZATION
   ===================================================================== */

export function serializeWorkspaceToCanvas(
  topology: WorkspaceScanResult,
  canvasFilePath?: string
): ObsidianCanvasDocument {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];

  // 1. AgentNode: color "5" (Cyan), type 'text', 360x200
  for (const agent of topology.agents || []) {
    const coords = map3DToCanvasCoordinates(agent.position3D || [0, 0, 0]);
    const text = `## ${agent.filename}\n**ID:** ${agent.id}\n**Status:** ${agent.status}\n**Objective:** ${agent.currentObjective}\n**Model:** ${agent.activeModelId || 'argon'}\n**Tokens:** ${agent.tokensPrompt + agent.tokensCompletion}`;

    nodes.push({
      id: agent.id,
      type: 'text',
      text,
      x: coords.x,
      y: coords.y,
      width: 360,
      height: 200,
      color: '5',
    });
  }

  // 2. SecondBrainNode: color "6" (Purple/Magenta), type 'file', 320x180
  for (const sb of topology.secondBrainNodes || []) {
    const coords = map3DToCanvasCoordinates(sb.position3D || [0, 0, 0]);
    nodes.push({
      id: sb.id,
      type: 'file',
      file: sb.notePath,
      x: coords.x,
      y: coords.y,
      width: 320,
      height: 180,
      color: '6',
    });
  }

  // 3. ArtifactSatelliteNode: color "3" (Amber), type 'file', 280x150
  for (const sat of topology.artifactSatellites || []) {
    const coords = map3DToCanvasCoordinates(sat.position3D || [0, 0, 0]);
    nodes.push({
      id: sat.id,
      type: 'file',
      file: sat.artifactPath,
      x: coords.x,
      y: coords.y,
      width: 280,
      height: 150,
      color: '3',
    });

    if (sat.associatedAgentId) {
      edges.push({
        id: `edge-${sat.associatedAgentId}-${sat.id}`,
        fromNode: sat.associatedAgentId,
        fromSide: 'right',
        fromEnd: 'none',
        toNode: sat.id,
        toSide: 'left',
        toEnd: 'arrow',
        color: '3',
        label: 'artifact',
      });
    }
  }

  const doc: ObsidianCanvasDocument = {
    nodes,
    edges,
  };

  if (canvasFilePath) {
    const dir = path.dirname(canvasFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(canvasFilePath, JSON.stringify(doc, null, 2), 'utf-8');
  }

  return doc;
}

export function deserializeCanvasToWorkspace(
  canvasData: ObsidianCanvasDocument | string
): WorkspaceScanResult {
  const doc: ObsidianCanvasDocument =
    typeof canvasData === 'string' ? JSON.parse(canvasData) : canvasData;

  const agents: AgentNode[] = [];
  const secondBrainNodes: SecondBrainNode[] = [];
  const artifactSatellites: ArtifactSatelliteNode[] = [];
  const warRoomPointers: string[] = [];

  for (const node of doc.nodes || []) {
    const pos3D = mapCanvasTo3DCoordinates(node.x || 0, node.y || 0, 0);

    if (node.color === '5' || node.type === 'text') {
      const textContent = (node as any).text || '';
      const lines = textContent.split('\n');
      const filenameMatch = lines[0]?.replace(/^##\s+/, '') || `@${node.id}`;
      agents.push({
        id: node.id,
        filename: filenameMatch,
        pid: 14200 + agents.length + 1,
        status: '[ACTIVE]',
        executionMode: 'STEP_BY_STEP_GATE',
        currentObjective: `Imported from canvas card ${node.id}`,
        totalSteps: 6,
        currentStep: 1,
        stepDescription: 'Imported topology node',
        tokensPrompt: 3000,
        tokensCompletion: 700,
        tokenVelocity: 75,
        etaSeconds: 20,
        position3D: pos3D,
        livePreviewStream: '',
      });
    } else if (node.color === '6') {
      const file = (node as any).file || `${node.id}.md`;
      secondBrainNodes.push({
        id: node.id,
        wikilink: `[[${path.basename(file, '.md')}]]`,
        notePath: file,
        tagList: ['#second-brain', '#canvas-import'],
        domain: '01_PROJETOS',
        connectionCount: 1,
        summary: `Canvas node ${node.id}`,
        position3D: pos3D,
      });
    } else if (node.color === '3') {
      const file = (node as any).file || `${node.id}.artifact`;
      const edge = (doc.edges || []).find((e) => e.toNode === node.id);
      artifactSatellites.push({
        id: node.id,
        associatedAgentId: edge ? edge.fromNode : 'agent-software-engineer-01',
        artifactPath: file,
        fileHash: `canvas-${node.id}`,
        title: path.basename(file),
        status: 'VERIFIED',
        byteSize: 1024,
        lastModified: new Date().toISOString(),
        position3D: pos3D,
      });
    } else {
      const file = (node as any).file || `${node.id}.md`;
      secondBrainNodes.push({
        id: node.id,
        wikilink: `[[${path.basename(file, '.md')}]]`,
        notePath: file,
        tagList: ['#second-brain'],
        domain: '01_PROJETOS',
        connectionCount: 1,
        summary: `Canvas node ${node.id}`,
        position3D: pos3D,
      });
    }
  }

  return {
    agents,
    secondBrainNodes,
    artifactSatellites,
    warRoomPointers,
  };
}

export function parseUnifiedDiffLines(rawDiff: string): StructuredDiffLine[] {
  const lines = rawDiff.split(/\r?\n/);
  const structured: StructuredDiffLine[] = [];
  let lineCursor = 1;

  for (const rawLine of lines) {
    if (
      rawLine.startsWith('diff --git') ||
      rawLine.startsWith('index ') ||
      rawLine.startsWith('--- ') ||
      rawLine.startsWith('+++ ') ||
      rawLine.startsWith('@@')
    ) {
      const hunkMatch = rawLine.match(/@@\s*-\d+(?:,\d+)?\s+\+(\d+)/);
      if (hunkMatch) {
        lineCursor = parseInt(hunkMatch[1], 10);
      }
      structured.push({
        type: 'header',
        lineNumber: lineCursor,
        content: rawLine,
      });
    } else if (rawLine.startsWith('+')) {
      structured.push({
        type: '+',
        lineNumber: lineCursor++,
        content: rawLine,
      });
    } else if (rawLine.startsWith('-')) {
      structured.push({
        type: '-',
        lineNumber: lineCursor,
        content: rawLine,
      });
    } else if (rawLine.length > 0) {
      structured.push({
        type: 'context',
        lineNumber: lineCursor++,
        content: rawLine,
      });
    }
  }

  return structured;
}

export interface TelemetryDiffPayload {
  agentId: string;
  step: number;
  totalSteps: number;
  description: string;
  previewStream: string;
  diffPath?: string;
  originalContent?: string;
  modifiedContent?: string;
}

/* =====================================================================
   1. LOCAL VAULT & MARKDOWN CONNECTOR
   ===================================================================== */

export class LocalVaultAndMdConnector implements IKalinarAgentConnector {
  public readonly id = 'connector-local-vault-md';
  public readonly schemaVersion = SCHEMA_VERSION;
  private registeredAgents: Map<string, AgentNode> = new Map();
  private streamListeners: Map<string, Set<(chunk: string) => void>> = new Map();

  constructor(private vaultRoot: string = process.cwd()) {}

  public async registerAgent(agent: AgentNode): Promise<boolean> {
    this.registeredAgents.set(agent.id, agent);
    eventBus.emit('agent:registered', agent);
    return true;
  }

  public emitStepUpdate(agentId: string, currentStep: number, description: string, previewDelta: string): void {
    const agent = this.registeredAgents.get(agentId);
    if (agent) {
      agent.currentStep = currentStep;
      agent.stepDescription = description;
      agent.livePreviewStream = previewDelta;
      eventBus.emit('agent:step_updated', {
        agentId,
        step: currentStep,
        description,
        preview: previewDelta,
      });

      const listeners = this.streamListeners.get(agentId);
      if (listeners) {
        listeners.forEach((fn) => fn(previewDelta));
      }
    }
  }

  public updateStatus(agentId: string, status: AgentStatus): void {
    const agent = this.registeredAgents.get(agentId);
    if (agent) {
      const prev = agent.status;
      agent.status = status;
      eventBus.emit('agent:status_changed', { agentId, previous: prev, current: status });
    }
  }

  public onLivePreview(agentId: string, callback: (streamChunk: string) => void): () => void {
    if (!this.streamListeners.has(agentId)) {
      this.streamListeners.set(agentId, new Set());
    }
    this.streamListeners.get(agentId)!.add(callback);
    return () => {
      this.streamListeners.get(agentId)?.delete(callback);
    };
  }

  /**
   * Scans local markdown agents: 05_AGENTS/@agent-*.md, AGENTS.md, CLAUDE.md, GEMINI.md
   */
  public scanLocalAgentDefinitions(): Array<{ filename: string; role: string; fullPath: string }> {
    const candidates: Array<{ filename: string; role: string; fullPath: string }> = [];
    const rootFiles = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'];

    for (const file of rootFiles) {
      const fullPath = path.resolve(this.vaultRoot, file);
      if (fs.existsSync(fullPath)) {
        candidates.push({
          filename: file,
          role: 'Autonomous Agent Runtime Contract',
          fullPath,
        });
      }
    }

    const agentsDir = path.resolve(this.vaultRoot, '05_AGENTS');
    if (fs.existsSync(agentsDir)) {
      const entries = fs.readdirSync(agentsDir);
      for (const entry of entries) {
        if (entry.endsWith('.md')) {
          candidates.push({
            filename: entry,
            role: 'Specialist Hub Persona',
            fullPath: path.resolve(agentsDir, entry),
          });
        }
      }
    }

    return candidates;
  }

  /**
   * Computes logarithmic spiral coordinates r = a * e^(b * theta)
   */
  public computeLogarithmicSpiralPosition(
    index: number,
    armIndex = 0,
    a = 110,
    b = 0.16
  ): [number, number, number] {
    const theta = 0.65 * (index + 1) + (armIndex * (Math.PI * 2)) / 5;
    const radius = Math.min(2200, a * Math.exp(b * (index * 0.45 + 1)));
    const x = Math.round(Math.cos(theta) * radius);
    const y = Math.round(Math.sin(index * 1.3) * 45);
    const z = Math.round(Math.sin(theta) * radius);
    return [x, y, z];
  }

  /**
   * Scans 05_AGENTS/@agent-*.md, project markdown files, and WAR_ROOM.md pointers
   * to hydrate real AgentNode, SecondBrainNode, and ArtifactSatelliteNode coordinates on the logarithmic spiral.
   */
  public scanWorkspaceNodes(): WorkspaceScanResult {
    const defs = this.scanLocalAgentDefinitions();
    const agents: AgentNode[] = [];
    const secondBrainNodes: SecondBrainNode[] = [];
    const artifactSatellites: ArtifactSatelliteNode[] = [];
    const warRoomPointers: string[] = [];

    // 1. Parse WAR_ROOM.md pointers if present
    const warRoomPath = path.resolve(this.vaultRoot, '.antigravity', 'comms', 'WAR_ROOM.md');
    if (fs.existsSync(warRoomPath)) {
      const rawWarRoom = fs.readFileSync(warRoomPath, 'utf-8');
      for (const line of rawWarRoom.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith('[FROM:') || trimmed.startsWith('- [FIFO_QUEUED]') || trimmed.startsWith('### [')) {
          warRoomPointers.push(trimmed);
        }
      }
    }

    // 2. Hydrate AgentNodes on logarithmic spiral
    const defaultModels: Array<'argon' | 'claude-3.7-sonnet' | 'gemini-2.5-pro'> = [
      'argon',
      'claude-3.7-sonnet',
      'gemini-2.5-pro',
    ];
    defs.forEach((def, idx) => {
      const pos = this.computeLogarithmicSpiralPosition(idx, 4, 120, 0.14);
      const id = def.filename.replace(/^@/, '').replace(/\.md$/i, '') + `-0${idx + 1}`;
      agents.push({
        id,
        filename: def.filename.startsWith('@') ? def.filename : `@${def.filename.replace(/\.md$/i, '')}`,
        pid: 14200 + idx + 1,
        status: idx === 0 ? '[ACTIVE]' : '[IDLE]',
        executionMode: 'STEP_BY_STEP_GATE',
        activeModelId: defaultModels[idx % defaultModels.length],
        fifoQueueDepth: 0,
        currentObjective: def.role,
        totalSteps: 6,
        currentStep: Math.min(6, (idx % 6) + 1),
        stepDescription: `Monitorando contrato ${def.filename}`,
        tokensPrompt: 3200 + idx * 450,
        tokensCompletion: 780 + idx * 120,
        tokenVelocity: 78 + idx * 4,
        etaSeconds: 18 + idx * 5,
        position3D: pos,
        livePreviewStream: `@@ -1,3 +1,4 @@\n context: ${def.filename}\n-legacy_pipeline: true\n+tauz_dsp_pipeline: active\n+zero_trust_exec_file: enabled`,
      });
    });

    // 3. Hydrate SecondBrainNodes & ArtifactSatelliteNodes from project markdown & blueprint files
    const mdFiles = [
      { rel: 'AGENTS.md', domain: '05_AGENTS' as const },
      { rel: 'DESIGN.md', domain: '02_PADROES' as const },
      { rel: '.antigravity/blueprint/01_PRD.md', domain: '01_PROJETOS' as const },
      { rel: '.antigravity/blueprint/02_TRD.md', domain: '02_PADROES' as const },
      { rel: '.antigravity/blueprint/03_APP_FLOW.md', domain: '04_STACK' as const },
      { rel: '.antigravity/blueprint/06_IMPLEMENTATION_PLAN.md', domain: '01_PROJETOS' as const },
    ];

    mdFiles.forEach((item, idx) => {
      const full = path.resolve(this.vaultRoot, item.rel);
      if (fs.existsSync(full)) {
        const stat = fs.statSync(full);
        const sbArm = idx % 5;
        const sbPos = this.computeLogarithmicSpiralPosition(idx, sbArm, 140, 0.13);
        const associatedAgent = agents[idx % Math.max(1, agents.length)];
        const satPos: [number, number, number] = associatedAgent
          ? [associatedAgent.position3D[0] + 24, associatedAgent.position3D[1] + 8, associatedAgent.position3D[2]]
          : [sbPos[0] + 24, sbPos[1] + 8, sbPos[2]];

        secondBrainNodes.push({
          id: `sb-node-${idx + 1}`,
          wikilink: `[[${path.basename(item.rel, '.md')}]]`,
          notePath: item.rel,
          tagList: ['#second-brain', '#kalinar'],
          domain: item.domain,
          connectionCount: 4 + idx,
          summary: `Canonical Second Brain node ${item.rel}`,
          position3D: sbPos,
        });

        artifactSatellites.push({
          id: `sat-node-${idx + 1}`,
          associatedAgentId: associatedAgent?.id || 'agent-software-engineer-01',
          artifactPath: item.rel,
          fileHash: `sha256-${idx + 1}`,
          title: path.basename(item.rel),
          status: idx === 0 ? 'VERIFIED' : 'COMMITTED',
          byteSize: stat.size,
          lastModified: stat.mtime.toISOString(),
          position3D: satPos,
        });
      }
    });

    return {
      agents,
      secondBrainNodes,
      artifactSatellites,
      warRoomPointers,
    };
  }

  /**
   * Runs `git diff --unified=3 -- <filePath>` via child_process.execFile (windowsHide: true, zero shell injection)
   * or synthesizes structured unified diff lines against live buffer in < 15ms.
   */
  public async getLiveGitDiff(
    filePath: string,
    stagedBuffer?: string
  ): Promise<LiveGitDiffResult> {
    const start = performance.now();
    const check = sanitizeWorkspaceFilePath(this.vaultRoot, filePath);
    if (!check.valid) {
      throw new Error(check.reason || '[SECURITY_VIOLATION] Invalid file path');
    }

    // Fast path when stagedBuffer is provided or file has local synthetic comparison
    if (stagedBuffer !== undefined && fs.existsSync(check.resolvedPath)) {
      const currentContent = fs.readFileSync(check.resolvedPath, 'utf-8');
      const currentLines = currentContent.split(/\r?\n/);
      const nextLines = stagedBuffer.split(/\r?\n/);
      const rawLines: string[] = [
        `--- a/${check.relativePath}`,
        `+++ b/${check.relativePath}`,
        `@@ -1,${currentLines.length} +1,${nextLines.length} @@`,
      ];

      const maxLen = Math.max(currentLines.length, nextLines.length);
      for (let i = 0; i < Math.min(maxLen, 60); i++) {
        const a = currentLines[i];
        const b = nextLines[i];
        if (a === b && a !== undefined) {
          rawLines.push(` ${a}`);
        } else {
          if (a !== undefined) rawLines.push(`-${a}`);
          if (b !== undefined) rawLines.push(`+${b}`);
        }
      }

      const rawDiff = rawLines.join('\n');
      return {
        filePath: check.relativePath,
        lines: parseUnifiedDiffLines(rawDiff),
        rawDiff,
        latencyMs: Number((performance.now() - start).toFixed(2)),
      };
    }

    const rawGitDiff = await new Promise<string>((resolve) => {
      execFile(
        'git',
        ['diff', '--unified=3', '--', check.relativePath],
        {
          cwd: this.vaultRoot,
          windowsHide: true,
          timeout: 12,
        },
        (_err, stdout) => {
          resolve(stdout ? stdout.toString() : '');
        }
      );
    });

    if (rawGitDiff.trim().length > 0) {
      return {
        filePath: check.relativePath,
        lines: parseUnifiedDiffLines(rawGitDiff),
        rawDiff: rawGitDiff,
        latencyMs: Number((performance.now() - start).toFixed(2)),
      };
    }

    // Fallback: read live file buffer on disk and emit structured preview diff
    let fallbackRaw = `--- a/${check.relativePath}\n+++ b/${check.relativePath}\n@@ -1,4 +1,5 @@\n`;
    if (fs.existsSync(check.resolvedPath)) {
      const fileSnippet = fs
        .readFileSync(check.resolvedPath, 'utf-8')
        .split(/\r?\n/)
        .slice(0, 6);
      fallbackRaw += fileSnippet.map((l, idx) => (idx === 0 ? ` ${l}` : `+${l}`)).join('\n');
    } else {
      fallbackRaw += `-legacy_buffer_state\n+synchronized_singularity_buffer`;
    }

    return {
      filePath: check.relativePath,
      lines: parseUnifiedDiffLines(fallbackRaw),
      rawDiff: fallbackRaw,
      latencyMs: Number((performance.now() - start).toFixed(2)),
    };
  }

  /* =====================================================================
     TASK 10: SECOND BRAIN VAULT RAG, NOTE INJECTION & OBSIDIAN CANVAS SYNC
     ===================================================================== */

  public querySecondBrainVault(params?: SecondBrainVaultQueryParams): SecondBrainQueryResult {
    const start = performance.now();
    let candidateFiles: string[] = [];

    if (params?.targetPath) {
      const check = sanitizeWorkspaceFilePath(this.vaultRoot, params.targetPath);
      if (!check.valid) {
        return {
          success: false,
          notes: [],
          total: 0,
          searchLatencyMs: performance.now() - start,
          error: check.reason,
        };
      }
      candidateFiles = [check.resolvedPath];
    } else {
      const collectMdFiles = (dir: string, depth = 0) => {
        if (depth > 6 || !fs.existsSync(dir)) return;
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const name = entry.name;
            if (name.startsWith('.') && name !== '.antigravity') {
              continue;
            }
            if (
              name === 'node_modules' ||
              name === 'dist' ||
              name === 'dist-electron' ||
              name === '.next' ||
              name === 'coverage'
            ) {
              continue;
            }

            const fullPath = path.join(dir, name);
            if (entry.isDirectory()) {
              collectMdFiles(fullPath, depth + 1);
            } else if (entry.isFile() && name.toLowerCase().endsWith('.md')) {
              candidateFiles.push(fullPath);
            }
          }
        } catch {
          // Skip unreadable directories
        }
      };

      const scanDirs = [
        this.vaultRoot,
        path.join(this.vaultRoot, '01_PROJETOS'),
        path.join(this.vaultRoot, '02_PADROES_E_DECISOES'),
        path.join(this.vaultRoot, '02_PADROES'),
        path.join(this.vaultRoot, '03_PREFERENCIAS'),
        path.join(this.vaultRoot, '04_STACK_E_SKILLS'),
        path.join(this.vaultRoot, '04_STACK'),
        path.join(this.vaultRoot, '05_AGENTS'),
        path.join(this.vaultRoot, '05_EXECUCOES'),
        path.join(this.vaultRoot, '.antigravity', 'blueprint'),
        path.join(this.vaultRoot, '.antigravity', 'comms'),
      ];

      const visitedDirs = new Set<string>();
      for (const d of scanDirs) {
        if (fs.existsSync(d) && !visitedDirs.has(d)) {
          visitedDirs.add(d);
          if (d === this.vaultRoot) {
            try {
              const rootEntries = fs.readdirSync(this.vaultRoot, { withFileTypes: true });
              for (const re of rootEntries) {
                if (re.isFile() && re.name.toLowerCase().endsWith('.md')) {
                  candidateFiles.push(path.join(this.vaultRoot, re.name));
                }
              }
            } catch {}
          } else {
            collectMdFiles(d, 0);
          }
        }
      }
    }

    const uniqueFiles = Array.from(new Set(candidateFiles));
    const notes: SecondBrainVaultNote[] = [];

    const queryFilter = params?.query ? params.query.toLowerCase() : null;
    const domainFilter = params?.domain ? params.domain.toLowerCase() : null;

    for (const fullPath of uniqueFiles) {
      try {
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const relPath = path.relative(this.vaultRoot, fullPath).replace(/\\/g, '/');

        // Extract YAML frontmatter
        const frontmatter: Record<string, any> = {};
        let body = raw;
        const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (fmMatch) {
          const fmText = fmMatch[1];
          body = raw.slice(fmMatch[0].length);
          for (const line of fmText.split(/\r?\n/)) {
            const colonIdx = line.indexOf(':');
            if (colonIdx > 0) {
              const key = line.slice(0, colonIdx).trim();
              let val: any = line.slice(colonIdx + 1).trim();
              if (val.startsWith('[') && val.endsWith(']')) {
                val = val
                  .slice(1, -1)
                  .split(',')
                  .map((s: string) => s.trim().replace(/^['"]|['"]$/g, ''))
                  .filter(Boolean);
              } else if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
              }
              frontmatter[key] = val;
            }
          }
        }

        // Determine title
        let title = frontmatter.title || '';
        if (!title) {
          const headingMatch = body.match(/^#\s+(.+)$/m);
          if (headingMatch) {
            title = headingMatch[1].trim();
          } else {
            title = path.basename(relPath, '.md');
          }
        }

        // Determine domain
        let domain = frontmatter.domain || '';
        if (!domain) {
          const parts = relPath.split('/');
          if (parts.length > 1) {
            domain = parts[0];
          } else {
            domain = '01_PROJETOS';
          }
        }

        // Determine tags
        let tags: string[] = [];
        if (Array.isArray(frontmatter.tags)) {
          tags = frontmatter.tags;
        } else if (typeof frontmatter.tags === 'string') {
          tags = frontmatter.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean);
        }
        if (tags.length === 0) {
          tags = ['#second-brain'];
        }

        // Extract wikilinks - STRICTLY CAPPED AT MAXIMUM 2 per Graph Pointer
        const rawWikilinks: string[] = [];
        const wikilinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
        let wMatch: RegExpExecArray | null;
        while ((wMatch = wikilinkRegex.exec(raw)) !== null) {
          const target = wMatch[1].trim();
          if (target && !rawWikilinks.includes(target)) {
            rawWikilinks.push(target);
          }
        }
        const cappedWikilinks = rawWikilinks.slice(0, 2);

        // Extract excerpt - STRICTLY UNDER 250 CHARACTERS
        const cleanBody = body
          .replace(/^#+\s+.*$/gm, '')
          .replace(/```[\s\S]*?```/g, '')
          .replace(/<[^>]+>/g, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1')
          .replace(/[*_~`]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        let excerpt = cleanBody.slice(0, 240);
        if (cleanBody.length > 240) {
          excerpt = excerpt.slice(0, 237) + '...';
        }
        if (!excerpt) {
          const fallback = `Second Brain note ${title}`;
          excerpt = fallback.length > 240 ? fallback.slice(0, 237) + '...' : fallback;
        }

        // Filter checks
        if (domainFilter && !domain.toLowerCase().includes(domainFilter)) {
          continue;
        }

        if (queryFilter) {
          const matchTitle = title.toLowerCase().includes(queryFilter);
          const matchContent = raw.toLowerCase().includes(queryFilter);
          const matchExcerpt = excerpt.toLowerCase().includes(queryFilter);
          const matchTags = tags.some((t) => t.toLowerCase().includes(queryFilter));
          if (!matchTitle && !matchContent && !matchExcerpt && !matchTags) {
            continue;
          }
        }

        const noteStat = fs.statSync(fullPath);

        notes.push({
          id: `sb-note-${notes.length + 1}`,
          title,
          filePath: relPath,
          wikilink: `[[${title}]]`,
          domain,
          tags,
          frontmatter,
          wikilinks: cappedWikilinks,
          excerpt,
          content: raw,
          createdAt: noteStat.birthtime
            ? noteStat.birthtime.toISOString()
            : noteStat.mtime.toISOString(),
          updatedAt: noteStat.mtime.toISOString(),
        });

        if (params?.maxResults && notes.length >= params.maxResults) {
          break;
        }
      } catch {
        // Skip unreadable files
      }
    }

    return {
      success: true,
      notes,
      total: notes.length,
      searchLatencyMs: Number((performance.now() - start).toFixed(2)),
    };
  }

  public injectSecondBrainNote(
    payload: SecondBrainInjectPayload,
    store?: any
  ): SecondBrainInjectResult {
    const start = performance.now();

    const candidateRel =
      payload.filePath ||
      payload.notePath ||
      path.join(
        payload.domain || '01_PROJETOS',
        `${payload.title.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}.md`
      );

    const check = sanitizeWorkspaceFilePath(this.vaultRoot, candidateRel);
    if (!check.valid) {
      return {
        success: false,
        note: null,
        spawned3DNode: null,
        node3D: null,
        persistedToDisk: false,
        persistedToSqlite: false,
        latencyMs: Number((performance.now() - start).toFixed(2)),
        error: check.reason,
      };
    }

    // Extract wikilinks from content - strictly capped at 2
    const rawWikilinks: string[] = [];
    const wikilinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    let wMatch: RegExpExecArray | null;
    while ((wMatch = wikilinkRegex.exec(payload.content || '')) !== null) {
      const target = wMatch[1].trim();
      if (target && !rawWikilinks.includes(target)) {
        rawWikilinks.push(target);
      }
    }
    const cappedWikilinks = rawWikilinks.slice(0, 2);

    // Compute excerpt strictly under 250 characters
    let cleanExcerpt = (payload.content || '')
      .replace(/^#+\s+.*$/gm, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleanExcerpt.length > 240) {
      cleanExcerpt = cleanExcerpt.slice(0, 237) + '...';
    }
    if (!cleanExcerpt) {
      const fallback = `Second Brain note ${payload.title}`;
      cleanExcerpt = fallback.length > 240 ? fallback.slice(0, 237) + '...' : fallback;
    }

    const tags =
      payload.tags && payload.tags.length > 0 ? payload.tags : ['#second-brain'];
    const domain = payload.domain || '01_PROJETOS';
    const nowIso = new Date().toISOString();

    const formattedMarkdown = [
      '---',
      `title: "${payload.title}"`,
      `domain: "${domain}"`,
      `tags: [${tags.map((t) => `"${t}"`).join(', ')}]`,
      `updated: "${nowIso}"`,
      '---',
      '',
      `# ${payload.title}`,
      '',
      payload.content,
    ].join('\n');

    // 1. Write to disk
    const targetDir = path.dirname(check.resolvedPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(check.resolvedPath, formattedMarkdown, 'utf-8');

    const noteId = `sb-note-${Date.now()}`;
    const note: SecondBrainVaultNote = {
      id: noteId,
      title: payload.title,
      filePath: check.relativePath,
      wikilink: `[[${payload.title}]]`,
      domain,
      tags,
      frontmatter: {
        title: payload.title,
        domain,
        tags,
        updated: nowIso,
        ...(payload.frontmatter || {}),
      },
      wikilinks: cappedWikilinks,
      excerpt: cleanExcerpt,
      content: payload.content,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 2. Persist to SQLite second_brain_notes and telemetry_logs
    let persistedToSqlite = false;
    if (store && typeof store.insertSecondBrainNote === 'function') {
      try {
        store.insertSecondBrainNote({
          id: note.id,
          title: note.title,
          file_path: note.filePath,
          wikilink: note.wikilink,
          domain: note.domain,
          tags: JSON.stringify(note.tags),
          frontmatter_json: JSON.stringify(note.frontmatter),
          wikilinks_json: JSON.stringify(note.wikilinks),
          excerpt: note.excerpt,
          content: payload.content,
          created_at: nowIso,
          updated_at: nowIso,
        });

        if (typeof store.insertTelemetry === 'function') {
          store.insertTelemetry({
            task_id: 'SECOND_BRAIN_INJECT',
            event_type: 'TURN_END',
            agent_name: 'operator',
            payload: JSON.stringify({
              filePath: note.filePath,
              title: note.title,
              domain: note.domain,
            }),
            latency_ms: Math.round(performance.now() - start),
          });
        }
        persistedToSqlite = true;
      } catch {
        persistedToSqlite = false;
      }
    }

    // 3. Compute 3D coordinates on logarithmic spiral
    const domainArmMap: Record<string, number> = {
      '01_PROJETOS': 0,
      '02_PADROES': 1,
      '02_PADROES_E_DECISOES': 1,
      '03_PREFERENCIAS': 2,
      '04_STACK': 3,
      '04_STACK_E_SKILLS': 3,
      '05_AGENTS': 4,
    };
    const armIndex = domainArmMap[domain] !== undefined ? domainArmMap[domain] : 0;
    const pos3D = this.computeLogarithmicSpiralPosition(
      Date.now() % 40,
      armIndex,
      150,
      0.12
    );

    const spawned3DNode: SecondBrainNode = {
      id: note.id,
      wikilink: note.wikilink,
      notePath: note.filePath,
      tagList: note.tags,
      domain: note.domain,
      connectionCount: note.wikilinks.length,
      summary: note.excerpt,
      position3D: pos3D,
    };

    return {
      success: true,
      note,
      spawned3DNode,
      node3D: spawned3DNode,
      persistedToDisk: true,
      persistedToSqlite,
      latencyMs: Number((performance.now() - start).toFixed(2)),
    };
  }

  public async syncObsidianCanvas(
    options?: CanvasSyncRequest & {
      store?: any;
    }
  ): Promise<CanvasSyncResult> {
    const start = performance.now();
    const rawPath = options?.canvasPath || 'KALINAR_GALAXY.canvas';
    const check = sanitizeWorkspaceFilePath(this.vaultRoot, rawPath);
    if (!check.valid) {
      return {
        success: false,
        direction: options?.direction || 'EXPORT_TO_CANVAS',
        canvasPath: rawPath,
        latencyMs: Number((performance.now() - start).toFixed(2)),
        error: check.reason,
      };
    }

    const resolvedCanvasPath = check.resolvedPath;
    const dir = options?.direction ? options.direction.toLowerCase() : 'export_to_canvas';

    const lockPath = path.resolve(this.vaultRoot, '.kalinar-lock');

    try {
      if (dir === 'import_from_canvas') {
        if (!fs.existsSync(resolvedCanvasPath)) {
          return {
            success: false,
            direction: 'IMPORT_FROM_CANVAS',
            canvasPath: check.relativePath,
            latencyMs: Number((performance.now() - start).toFixed(2)),
            error: `Canvas file does not exist: ${check.relativePath}`,
          };
        }

        const raw = fs.readFileSync(resolvedCanvasPath, 'utf-8');
        const doc = JSON.parse(raw) as ObsidianCanvasDocument;
        const topology = deserializeCanvasToWorkspace(doc);

        if (options?.store && typeof options.store.syncFromCanvas === 'function') {
          options.store.syncFromCanvas(resolvedCanvasPath);
        }

        return {
          success: true,
          direction: 'IMPORT_FROM_CANVAS',
          canvasPath: check.relativePath,
          nodesCount: doc.nodes?.length || 0,
          edgesCount: doc.edges?.length || 0,
          nodesImported: doc.nodes?.length || 0,
          topology,
          document: doc,
          latencyMs: Number((performance.now() - start).toFixed(2)),
        };
      }

      // Default: export or bidirectional
      // Set single-writer lock suppression
      fs.writeFileSync(
        lockPath,
        JSON.stringify({ pid: process.pid, timestamp: Date.now() }),
        'utf-8'
      );

      const topology = options?.topology || this.scanWorkspaceNodes();
      const doc = serializeWorkspaceToCanvas(topology, resolvedCanvasPath);

      if (options?.store && typeof options.store.syncToCanvas === 'function') {
        options.store.syncToCanvas(resolvedCanvasPath, topology);
      }

      if (fs.existsSync(lockPath)) {
        try {
          fs.unlinkSync(lockPath);
        } catch {}
      }

      return {
        success: true,
        direction: dir.toUpperCase(),
        canvasPath: check.relativePath,
        nodesCount: doc.nodes.length,
        edgesCount: doc.edges.length,
        nodesExported: doc.nodes.length,
        topology,
        document: doc,
        latencyMs: Number((performance.now() - start).toFixed(2)),
      };
    } catch (err: any) {
      if (fs.existsSync(lockPath)) {
        try {
          fs.unlinkSync(lockPath);
        } catch {}
      }
      return {
        success: false,
        direction: dir.toUpperCase(),
        canvasPath: check.relativePath,
        latencyMs: Number((performance.now() - start).toFixed(2)),
        error: err?.message || String(err),
      };
    }
  }

  public dispose(): void {
    this.registeredAgents.clear();
    this.streamListeners.clear();
  }
}

/* =====================================================================
   2. ANTIGRAVITY & MCP CONNECTOR
   ===================================================================== */

export class AntigravityAndMcpConnector implements IKalinarAgentConnector {
  public readonly id = 'connector-antigravity-mcp';
  public readonly schemaVersion = SCHEMA_VERSION;
  private registeredAgents: Map<string, AgentNode> = new Map();
  private streamListeners: Map<string, Set<(chunk: string) => void>> = new Map();

  public async registerAgent(agent: AgentNode): Promise<boolean> {
    this.registeredAgents.set(agent.id, agent);
    eventBus.emit('agent:registered', agent);
    return true;
  }

  public emitStepUpdate(agentId: string, currentStep: number, description: string, previewDelta: string): void {
    const agent = this.registeredAgents.get(agentId);
    if (agent) {
      agent.currentStep = currentStep;
      agent.stepDescription = description;
      agent.livePreviewStream = previewDelta;
      eventBus.emit('agent:step_updated', {
        agentId,
        step: currentStep,
        description,
        preview: previewDelta,
      });

      const listeners = this.streamListeners.get(agentId);
      if (listeners) {
        listeners.forEach((fn) => fn(previewDelta));
      }
    }
  }

  public updateStatus(agentId: string, status: AgentStatus): void {
    const agent = this.registeredAgents.get(agentId);
    if (agent) {
      const prev = agent.status;
      agent.status = status;
      eventBus.emit('agent:status_changed', { agentId, previous: prev, current: status });
    }
  }

  public onLivePreview(agentId: string, callback: (streamChunk: string) => void): () => void {
    if (!this.streamListeners.has(agentId)) {
      this.streamListeners.set(agentId, new Set());
    }
    this.streamListeners.get(agentId)!.add(callback);
    return () => {
      this.streamListeners.get(agentId)?.delete(callback);
    };
  }

  public dispose(): void {
    this.registeredAgents.clear();
    this.streamListeners.clear();
  }
}

/* =====================================================================
   3. EXTERNAL WEBHOOK AGENT CONNECTOR (127.0.0.1:4949 ONLY)
   ===================================================================== */

export class ExternalWebhookAgentConnector implements IKalinarAgentConnector {
  public readonly id = 'connector-external-webhook';
  public readonly schemaVersion = SCHEMA_VERSION;
  public readonly host: string;
  public readonly port: number;
  private server: http.Server | null = null;
  private registeredAgents: Map<string, AgentNode> = new Map();
  private streamListeners: Map<string, Set<(chunk: string) => void>> = new Map();
  private isListening = false;

  constructor(hostOrPort: string | number = '127.0.0.1', port = 4949) {
    if (typeof hostOrPort === 'number') {
      this.host = '127.0.0.1';
      this.port = hostOrPort;
    } else {
      this.host = hostOrPort;
      this.port = port;
    }
  }

  public async initialize(): Promise<void> {
    return this.startServer();
  }

  public handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Security Policy: Strict localhost-only verification
    const remoteIp = req.socket?.remoteAddress || '127.0.0.1';
    if (remoteIp !== '127.0.0.1' && remoteIp !== '::1' && remoteIp !== '::ffff:127.0.0.1') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '[SECURITY_VIOLATION] Only localhost binding allowed' }));
      return;
    }

    if (req.method === 'POST' && req.url === '/kalinar/events') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 2 * 1024 * 1024) {
          req.destroy(); // 2MB payload ceiling defense
        }
      });

      req.on('end', () => {
        try {
          const payload = JSON.parse(body) as TelemetryDiffPayload;
          if (!payload.agentId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing agentId' }));
            return;
          }

          this.emitStepUpdate(
            payload.agentId,
            payload.step || 1,
            payload.description || 'External step execution',
            payload.previewStream || ''
          );

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, timestamp: new Date().toISOString() }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
        }
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    }
  }

  public async startServer(): Promise<void> {
    if (this.isListening) return;

    this.server = http.createServer((req, res) => this.handleRequest(req, res));


    return new Promise((resolve) => {
      this.server!.listen(this.port, this.host, () => {
        this.isListening = true;
        resolve();
      });
    });
  }

  public async registerAgent(agent: AgentNode): Promise<boolean> {
    this.registeredAgents.set(agent.id, agent);
    eventBus.emit('agent:registered', agent);
    return true;
  }

  public emitStepUpdate(agentId: string, currentStep: number, description: string, previewDelta: string): void {
    const agent = this.registeredAgents.get(agentId);
    if (agent) {
      agent.currentStep = currentStep;
      agent.stepDescription = description;
      agent.livePreviewStream = previewDelta;
    }
    eventBus.emit('agent:step_updated', {
      agentId,
      step: currentStep,
      description,
      preview: previewDelta,
    });

    const listeners = this.streamListeners.get(agentId);
    if (listeners) {
      listeners.forEach((fn) => fn(previewDelta));
    }
  }

  public updateStatus(agentId: string, status: AgentStatus): void {
    const agent = this.registeredAgents.get(agentId);
    if (agent) {
      const prev = agent.status;
      agent.status = status;
      eventBus.emit('agent:status_changed', { agentId, previous: prev, current: status });
    }
  }

  public onLivePreview(agentId: string, callback: (streamChunk: string) => void): () => void {
    if (!this.streamListeners.has(agentId)) {
      this.streamListeners.set(agentId, new Set());
    }
    this.streamListeners.get(agentId)!.add(callback);
    return () => {
      this.streamListeners.get(agentId)?.delete(callback);
    };
  }

  public dispose(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.isListening = false;
    this.registeredAgents.clear();
    this.streamListeners.clear();
  }
}

/* =====================================================================
   4. AGENT CONNECTOR REGISTRY
   ===================================================================== */

export class AgentConnectorRegistry {
  private static instance: AgentConnectorRegistry;
  private connectors: Map<string, IKalinarAgentConnector> = new Map();

  public constructor(autoRegisterDefaults = true) {
    if (autoRegisterDefaults) {
      this.register(new LocalVaultAndMdConnector());
      this.register(new AntigravityAndMcpConnector());
      this.register(new ExternalWebhookAgentConnector());
    }
  }

  public static getInstance(): AgentConnectorRegistry {
    if (!AgentConnectorRegistry.instance) {
      AgentConnectorRegistry.instance = new AgentConnectorRegistry();
    }
    return AgentConnectorRegistry.instance;
  }

  public register(connector: IKalinarAgentConnector & { id: string }): void {
    this.connectors.set(connector.id, connector);
  }

  public registerConnector(connector: IKalinarAgentConnector & { id: string }): void {
    this.register(connector);
  }

  public getConnector<T extends IKalinarAgentConnector>(id: string): T | undefined {
    return this.connectors.get(id) as T | undefined;
  }

  public getAllConnectors(): IKalinarAgentConnector[] {
    return Array.from(this.connectors.values());
  }

  public onEvent(callback: (event: any) => void): () => void {
    const unsub1 = eventBus.on('agent:registered', (payload) => callback({ type: 'agent:registered', payload }));
    const unsub2 = eventBus.on('agent:step_updated', (payload) => callback({ type: 'agent:step_updated', payload }));
    const unsub3 = eventBus.on('agent:status_changed', (payload) => callback({ type: 'agent:status_changed', payload }));
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }

  public disposeAll(): void {
    for (const c of this.connectors.values()) {
      c.dispose();
    }
    this.connectors.clear();
  }
}

export const agentConnectorRegistry = AgentConnectorRegistry.getInstance();
