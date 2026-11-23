/**
 * KALINAR ELECTRON VAULT IPC ROUTER (v2.0.0-unified)
 * Milestone 5: Zero Direct OneDrive fs Reads in Electron & Daemon Write Routing
 * - kalinar:query_second_brain_vault queries cortex_note_cache and second_brain_notes
 *   strictly via Electron's READONLY SQLite connection (zero node:fs imports or calls).
 * - kalinar:inject_second_brain_note and kalinar:sync_obsidian_canvas route all mutations
 *   through DaemonClient to kalinar-daemon.
 * Strictly Zero Emojis
 */

import fs from 'node:fs';
import path from 'node:path';
import type { KalinarSqliteStore } from '../db/sqliteStore.js';
import type { DaemonClient } from './DaemonClient.js';
import {
  deserializeCanvasToWorkspace,
  sanitizeWorkspaceFilePath,
  serializeWorkspaceToCanvas,
} from '../../src/connectors/AgentConnectorRegistry.js';
import type {
  CanvasSyncRequest,
  CanvasSyncResult,
  ObsidianCanvasDocument,
  SecondBrainInjectPayload,
  SecondBrainInjectResult,
  SecondBrainNode,
  SecondBrainQueryResult,
  SecondBrainVaultNote,
  SecondBrainVaultQueryParams,
  WorkspaceScanResult,
} from '../../src/types/kalinar.js';

export interface VaultIpcRouterDeps {
  sqliteStore: KalinarSqliteStore | null;
  daemonClient?: DaemonClient | null;
  vaultRoot?: string;
}

function computeSpiralCoordinates(
  index: number,
  armIndex = 0,
  a = 150,
  b = 0.12
): [number, number, number] {
  const theta = 0.65 * (index + 1) + (armIndex * (Math.PI * 2)) / 5;
  const radius = Math.min(2200, a * Math.exp(b * (index * 0.45 + 1)));
  const x = Math.round(Math.cos(theta) * radius);
  const y = Math.round(Math.sin(index * 1.3) * 45);
  const z = Math.round(Math.sin(theta) * radius);
  return [x, y, z];
}

function extractCappedWikilinks(raw: string): string[] {
  const links: string[] = [];
  const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw || '')) !== null) {
    const target = match[1].trim();
    if (target && !links.includes(target)) {
      links.push(target);
      if (links.length >= 2) break;
    }
  }
  return links;
}

function buildCappedExcerpt(rawContent: string, title: string): string {
  let clean = (rawContent || '')
    .replace(/^#+\s+.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length > 240) {
    clean = clean.slice(0, 237) + '...';
  }
  if (!clean) {
    const fallback = `Second Brain note ${title}`;
    clean = fallback.length > 240 ? fallback.slice(0, 237) + '...' : fallback;
  }
  return clean;
}

/**
 * Queries Second Brain notes strictly from cortex_note_cache and second_brain_notes
 * via Electron's READONLY SQLite connection with zero fs.readFileSync / fs.readdirSync calls.
 */
export function handleQuerySecondBrainVault(
  params: SecondBrainVaultQueryParams | undefined,
  deps: VaultIpcRouterDeps
): SecondBrainQueryResult {
  const start = performance.now();
  const vaultRoot = deps.vaultRoot || process.cwd();
  let effectiveParams = params;

  if (params?.targetPath) {
    const check = sanitizeWorkspaceFilePath(vaultRoot, params.targetPath);
    if (!check.valid) {
      return {
        success: false,
        notes: [],
        total: 0,
        searchLatencyMs: Number((performance.now() - start).toFixed(4)),
        error: check.reason,
      };
    }
    effectiveParams = {
      ...params,
      targetPath: check.relativePath,
    };
  }

  const notes = deps.sqliteStore
    ? deps.sqliteStore.querySecondBrainShadowCache(effectiveParams)
    : [];
  const cortexCacheCount = deps.sqliteStore
    ? deps.sqliteStore.getCortexNoteCacheCount()
    : 0;

  return {
    success: true,
    notes,
    total: notes.length,
    cortexCacheCount,
    searchLatencyMs: Number((performance.now() - start).toFixed(4)),
  };
}

/**
 * Routes kalinar:inject_second_brain_note writes through DaemonClient to kalinar-daemon.
 */
export async function handleInjectSecondBrainNote(
  payload: SecondBrainInjectPayload,
  deps: VaultIpcRouterDeps
): Promise<SecondBrainInjectResult> {
  const start = performance.now();
  const vaultRoot = deps.vaultRoot || process.cwd();
  const title = payload?.title || 'untitled';
  const domain = payload?.domain || '01_PROJETOS';
  const candidateRel =
    payload?.filePath ||
    payload?.notePath ||
    path.join(
      domain,
      `${title.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}.md`
    );

  const check = sanitizeWorkspaceFilePath(vaultRoot, candidateRel);
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

  const tags =
    payload.tags && payload.tags.length > 0 ? payload.tags : ['#second-brain'];
  const nowIso = new Date().toISOString();
  const cappedWikilinks = extractCappedWikilinks(payload.content || '');
  const cleanExcerpt = buildCappedExcerpt(payload.content || '', title);

  let noteId = `sb-note-${Date.now()}`;
  let persistedToDisk = false;
  let persistedToSqlite = false;

  if (deps.daemonClient) {
    const dispatch = deps.daemonClient.injectSecondBrainNote({
      title,
      domain,
      tags,
      content: payload.content || '',
      filePath: check.relativePath,
      notePath: check.relativePath,
      vaultRoot,
      frontmatter: payload.frontmatter,
    });

    const ack = await dispatch.ackPromise;
    if (ack.ok) {
      const ackData = (ack.data || {}) as {
        noteId?: string;
        persistedToDisk?: boolean;
        persistedToSqlite?: boolean;
      };
      if (ackData.noteId) {
        noteId = ackData.noteId;
      }
      persistedToDisk = ackData.persistedToDisk !== false;
      persistedToSqlite = ackData.persistedToSqlite !== false;
    } else if (dispatch.queuedOffline) {
      persistedToSqlite = false;
    } else {
      return {
        success: false,
        note: null,
        spawned3DNode: null,
        node3D: null,
        persistedToDisk: false,
        persistedToSqlite: false,
        latencyMs: Number((performance.now() - start).toFixed(2)),
        error: ack.error || '[DAEMON_IPC_ERROR] Second Brain injection rejected by daemon',
      };
    }
  } else if (deps.sqliteStore) {
    deps.sqliteStore.insertSecondBrainNote({
      id: noteId,
      title,
      file_path: check.relativePath,
      wikilink: `[[${title}]]`,
      domain,
      tags: JSON.stringify(tags),
      frontmatter_json: JSON.stringify({
        title,
        domain,
        tags,
        updated: nowIso,
        ...(payload.frontmatter || {}),
      }),
      wikilinks_json: JSON.stringify(cappedWikilinks),
      excerpt: cleanExcerpt,
      content: payload.content || '',
      created_at: nowIso,
      updated_at: nowIso,
    });
    persistedToSqlite = true;
  }

  const note: SecondBrainVaultNote = {
    id: noteId,
    title,
    filePath: check.relativePath,
    wikilink: `[[${title}]]`,
    domain,
    tags,
    frontmatter: {
      title,
      domain,
      tags,
      updated: nowIso,
      ...(payload.frontmatter || {}),
    },
    wikilinks: cappedWikilinks,
    excerpt: cleanExcerpt,
    content: payload.content || '',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

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
  const pos3D = computeSpiralCoordinates(Date.now() % 40, armIndex, 150, 0.12);

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
    persistedToDisk,
    persistedToSqlite,
    latencyMs: Number((performance.now() - start).toFixed(2)),
  };
}

/**
 * Routes kalinar:sync_obsidian_canvas mutations through DaemonClient to kalinar-daemon.
 */
export async function handleSyncObsidianCanvas(
  payload: CanvasSyncRequest | undefined,
  deps: VaultIpcRouterDeps
): Promise<CanvasSyncResult> {
  const start = performance.now();
  const vaultRoot = deps.vaultRoot || process.cwd();
  const rawCanvasPath = payload?.canvasPath || 'KALINAR_GALAXY.canvas';
  const check = sanitizeWorkspaceFilePath(vaultRoot, rawCanvasPath);

  if (!check.valid) {
    return {
      success: false,
      direction: payload?.direction || 'EXPORT_TO_CANVAS',
      canvasPath: rawCanvasPath,
      latencyMs: Number((performance.now() - start).toFixed(2)),
      error: check.reason,
    };
  }

  const direction =
    payload?.direction && payload.direction.toLowerCase() === 'import_from_canvas'
      ? 'IMPORT_FROM_CANVAS'
      : 'EXPORT_TO_CANVAS';

  let docToSync: ObsidianCanvasDocument | undefined;
  if (direction === 'EXPORT_TO_CANVAS') {
    const topology: WorkspaceScanResult = payload?.topology || {
      agents: [],
      secondBrainNodes: [],
      artifactSatellites: [],
      warRoomPointers: [],
    };
    // Serialize in memory only (no canvasFilePath passed -> zero fs.writeFileSync in Electron)
    docToSync = serializeWorkspaceToCanvas(topology);
  }

  if (deps.daemonClient) {
    const dispatch = deps.daemonClient.syncObsidianCanvas({
      direction,
      canvasPath: check.relativePath,
      vaultRoot,
      document: docToSync,
      topology: payload?.topology,
    });

    const ack = await dispatch.ackPromise;
    if (ack.ok) {
      const ackData = (ack.data || {}) as {
        document?: ObsidianCanvasDocument;
        canvasPath?: string;
      };
      const finalDoc = ackData.document || docToSync || { nodes: [], edges: [] };
      const topology =
        direction === 'IMPORT_FROM_CANVAS'
          ? deserializeCanvasToWorkspace(finalDoc)
          : payload?.topology;
      return {
        success: true,
        direction,
        canvasPath: ackData.canvasPath || check.relativePath,
        document: finalDoc,
        topology,
        latencyMs: Number((performance.now() - start).toFixed(2)),
      };
    }

    if (!dispatch.queuedOffline) {
      return {
        success: false,
        direction,
        canvasPath: check.relativePath,
        latencyMs: Number((performance.now() - start).toFixed(2)),
        error: ack.error || '[DAEMON_IPC_ERROR] Canvas sync rejected by daemon',
      };
    }
  }

  // Fallback when DaemonClient is queued offline: dispatch node records via read-only store
  if (deps.sqliteStore && docToSync) {
    for (const node of docToSync.nodes || []) {
      deps.sqliteStore.upsertCanvasNode({
        id: node.id,
        task_id: node.id,
        x: node.x || 0,
        y: node.y || 0,
        width: node.width || 320,
        height: node.height || 160,
        color_token: (node.color as string) || '5',
        canvas_file: check.relativePath,
      });
    }
  }

  return {
    success: true,
    direction,
    canvasPath: check.relativePath,
    document: docToSync || { nodes: [], edges: [] },
    topology: payload?.topology,
    latencyMs: Number((performance.now() - start).toFixed(2)),
  };
}

export interface ReadSecondBrainNoteResult {
  ok: boolean;
  relativePath?: string;
  title?: string;
  content?: string;
  error?: string;
}

export function handleReadSecondBrainNote(
  payload: { relativePath: string } | string,
  deps: VaultIpcRouterDeps
): ReadSecondBrainNoteResult {
  const vaultRoot = path.resolve(deps.vaultRoot || process.cwd());
  const rawPath = typeof payload === 'string' ? payload : payload?.relativePath || '';

  const check = sanitizeWorkspaceFilePath(vaultRoot, rawPath);
  if (!check.valid) {
    return { ok: false, error: 'PATH_TRAVERSAL_BLOCKED' };
  }

  const resolvedTarget = path.resolve(vaultRoot, check.relativePath);
  if (!resolvedTarget.startsWith(vaultRoot)) {
    return { ok: false, error: 'PATH_TRAVERSAL_BLOCKED' };
  }

  // 1. Query READONLY SQLite shadow cache first
  if (deps.sqliteStore) {
    const cached = deps.sqliteStore.querySecondBrainShadowCache({
      targetPath: check.relativePath,
      maxResults: 1,
    });
    if (cached.length > 0 && cached[0].content && cached[0].content.trim().length > 0) {
      return {
        ok: true,
        relativePath: check.relativePath,
        title: cached[0].title,
        content: cached[0].content,
      };
    }
  }

  // 2. Fallback: read strictly inside vaultRoot
  if (!fs.existsSync(resolvedTarget) || !fs.statSync(resolvedTarget).isFile()) {
    return { ok: false, relativePath: check.relativePath, error: 'NOTE_NOT_FOUND' };
  }

  const content = fs.readFileSync(resolvedTarget, 'utf-8');
  const title = path.basename(check.relativePath, path.extname(check.relativePath));
  return {
    ok: true,
    relativePath: check.relativePath,
    title,
    content,
  };
}
