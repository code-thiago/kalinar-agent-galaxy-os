/**
 * KALINAR SPATIAL OCTREE LOD (FLOW-GALAXY-LOD-01)
 * High-performance hierarchical spatial partitioner for 50,000 InstancedMesh galaxy nodes.
 * Evaluates visibility and level-of-detail in < 4ms across 5 Second Brain domains.
 * Strictly Zero Emojis
 */

import * as THREE from 'three';

export interface OctreeLODBreakdown {
  lod0: number; // Near: High resolution (distance < 800)
  lod1: number; // Mid: Standard pinpoint (800 <= distance < 1800)
  lod2: number; // Far: Distant cosmic dust (distance >= 1800)
}

export interface OctreeLODResult {
  visibleCount: number;
  culledCount: number;
  executionTimeMs: number;
  lodBreakdown: OctreeLODBreakdown;
  visibleIndices: Uint32Array;
}

export interface OctreeNodeConfig {
  maxDepth?: number;
  maxPerLeaf?: number;
}

class OctreeNode {
  public bounds: THREE.Box3;
  public sphere: THREE.Sphere;
  public children: OctreeNode[] | null = null;
  public indices: number[] = [];
  public depth: number;
  public domainCounts: Record<string, number> = {};

  constructor(bounds: THREE.Box3, depth: number) {
    this.bounds = bounds;
    this.depth = depth;

    // Precompute bounding sphere for rapid frustum intersection tests
    this.sphere = new THREE.Sphere();
    bounds.getBoundingSphere(this.sphere);
  }

  public isLeaf(): boolean {
    return this.children === null;
  }

  public subdivide(): void {
    const min = this.bounds.min;
    const max = this.bounds.max;
    const mid = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);

    this.children = [];
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        for (let z = 0; z < 2; z++) {
          const childMin = new THREE.Vector3(
            x === 0 ? min.x : mid.x,
            y === 0 ? min.y : mid.y,
            z === 0 ? min.z : mid.z
          );
          const childMax = new THREE.Vector3(
            x === 0 ? mid.x : max.x,
            y === 0 ? mid.y : max.y,
            z === 0 ? mid.z : max.z
          );
          this.children.push(new OctreeNode(new THREE.Box3(childMin, childMax), this.depth + 1));
        }
      }
    }
  }
}

export class SpatialOctreeLOD {
  private root: OctreeNode;
  private maxDepth: number;
  private maxPerLeaf: number;
  private totalNodes: number = 0;
  private scratchFrustum: THREE.Frustum = new THREE.Frustum();
  private scratchMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private visibilityBuffer: Uint32Array = new Uint32Array(0);
  private positions: Float32Array | null = null;
  private domains: string[] | null = null;

  constructor(config: OctreeNodeConfig = {}) {
    this.maxDepth = config.maxDepth ?? 4;
    this.maxPerLeaf = config.maxPerLeaf ?? 1024;
    const worldExtent = 3500;
    const worldBounds = new THREE.Box3(
      new THREE.Vector3(-worldExtent, -600, -worldExtent),
      new THREE.Vector3(worldExtent, 600, worldExtent)
    );
    this.root = new OctreeNode(worldBounds, 0);
  }

  /**
   * Builds the spatial octree hierarchy from packed Float32Array positions
   * positions: [x0, y0, z0, x1, y1, z1, ...] length = nodeCount * 3
   */
  public build(positions: Float32Array, domains: string[]): void {
    this.positions = positions;
    this.domains = domains;
    this.totalNodes = Math.floor(positions.length / 3);
    this.visibilityBuffer = new Uint32Array(this.totalNodes);

    for (let i = 0; i < this.totalNodes; i++) {
      const x = positions[i * 3 + 0];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      const domain = domains[i] || '01_PROJETOS';
      this.insertPoint(this.root, i, x, y, z, domain);
    }
  }

  private insertPoint(
    node: OctreeNode,
    index: number,
    x: number,
    y: number,
    z: number,
    domain: string
  ): void {
    node.domainCounts[domain] = (node.domainCounts[domain] || 0) + 1;

    if (node.isLeaf()) {
      if (node.indices.length < this.maxPerLeaf || node.depth >= this.maxDepth) {
        node.indices.push(index);
        return;
      }
      node.subdivide();
      const existing = node.indices;
      node.indices = [];
      if (this.positions && this.domains) {
        for (let j = 0; j < existing.length; j++) {
          const idx = existing[j];
          const ex = this.positions[idx * 3 + 0];
          const ey = this.positions[idx * 3 + 1];
          const ez = this.positions[idx * 3 + 2];
          const ed = this.domains[idx] || '01_PROJETOS';
          this.insertIntoChildren(node, idx, ex, ey, ez, ed);
        }
      }
    }

    this.insertIntoChildren(node, index, x, y, z, domain);
  }

  private insertIntoChildren(
    node: OctreeNode,
    index: number,
    x: number,
    y: number,
    z: number,
    domain: string
  ): void {
    if (!node.children) return;
    for (let c = 0; c < node.children.length; c++) {
      const child = node.children[c];
      if (
        x >= child.bounds.min.x &&
        x <= child.bounds.max.x &&
        y >= child.bounds.min.y &&
        y <= child.bounds.max.y &&
        z >= child.bounds.min.z &&
        z <= child.bounds.max.z
      ) {
        this.insertPoint(child, index, x, y, z, domain);
        return;
      }
    }
    // Fallback: boundary point
    this.insertPoint(node.children[0], index, x, y, z, domain);
  }

  /**
   * Evaluates Spatial Octree LOD culling against camera frustum and view distance.
   * Target latency: < 4ms for 50,000 nodes.
   */
  public evaluateLOD(
    camera: THREE.PerspectiveCamera,
    customFrustum?: THREE.Frustum
  ): OctreeLODResult {
    const startTime = performance.now();

    let frustum: THREE.Frustum;
    if (customFrustum) {
      frustum = customFrustum;
    } else {
      this.scratchMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      this.scratchFrustum.setFromProjectionMatrix(this.scratchMatrix);
      frustum = this.scratchFrustum;
    }

    const cameraPos = camera.position;
    let visibleCount = 0;
    let culledCount = 0;
    const lodBreakdown: OctreeLODBreakdown = { lod0: 0, lod1: 0, lod2: 0 };

    const stack: OctreeNode[] = [this.root];

    while (stack.length > 0) {
      const node = stack.pop()!;

      // Frustum culling check via precomputed bounding sphere
      if (!frustum.intersectsSphere(node.sphere)) {
        const nodePoints = this.countNodePoints(node);
        culledCount += nodePoints;
        continue;
      }

      if (node.isLeaf()) {
        const dist = cameraPos.distanceTo(node.sphere.center);
        let targetLod: 'lod0' | 'lod1' | 'lod2';
        if (dist < 800) {
          targetLod = 'lod0';
        } else if (dist < 1800) {
          targetLod = 'lod1';
        } else {
          targetLod = 'lod2';
        }

        const count = node.indices.length;
        lodBreakdown[targetLod] += count;

        for (let i = 0; i < count; i++) {
          this.visibilityBuffer[visibleCount++] = node.indices[i];
        }
      } else if (node.children) {
        for (let c = 0; c < node.children.length; c++) {
          stack.push(node.children[c]);
        }
      }
    }

    const executionTimeMs = performance.now() - startTime;

    return {
      visibleCount,
      culledCount,
      executionTimeMs,
      lodBreakdown,
      visibleIndices: this.visibilityBuffer.subarray(0, visibleCount),
    };
  }

  private countNodePoints(node: OctreeNode): number {
    if (node.isLeaf()) {
      return node.indices.length;
    }
    let total = 0;
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        total += this.countNodePoints(node.children[i]);
      }
    }
    return total;
  }

  public getTotalNodes(): number {
    return this.totalNodes;
  }

  public dispose(): void {
    this.visibilityBuffer = new Uint32Array(0);
  }
}
