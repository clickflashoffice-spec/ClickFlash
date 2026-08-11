// backend/services/VectorIndexService.ts
import type { DatabaseManager } from '../database/db';
import type { Logger } from '../utils/logger';
import path from "path";
import fs from "fs";
import { DATA_DIR } from "../config/constants";

const BINARY_INDEX_FILE = path.join(DATA_DIR, "face_vectors.bin");
const JSON_INDEX_FILE = path.join(DATA_DIR, "face_vectors.json");

const MAGIC_BYTES = Buffer.from("CFVI"); // ClickFlash Vector Index
const VERSION = 2;
const VECTOR_DIM = 128;
const SUPPORTED_VECTOR_DIMS = new Set([VECTOR_DIM, 512]);

interface VectorIndexItem {
  id: string;
  title: string;
  vector: Float32Array;
}

class VPTreeNode {
  constructor(
    public pivot: Float32Array,
    public id: string, // photoId
    public title: string, // faceId
    public radius: number,
    public inside: VPTreeNode | null = null,
    public outside: VPTreeNode | null = null,
  ) {}
}

export class VectorIndexService {
  private static instance: VectorIndexService;
  private root: VPTreeNode | null = null;
  private db: DatabaseManager;
  private logger: Logger;
  private isInitialized = false;
  private isDirty = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  private constructor(db: DatabaseManager, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  public static getInstance(
    db: DatabaseManager,
    logger: Logger,
  ): VectorIndexService {
    if (!VectorIndexService.instance) {
      VectorIndexService.instance = new VectorIndexService(db, logger);
    }
    return VectorIndexService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (fs.existsSync(BINARY_INDEX_FILE)) {
        this.logger.info("[VectorIndex] Loading binary index from disk...");
        this.loadBinary();
        this.isInitialized = true;
      } else if (fs.existsSync(JSON_INDEX_FILE)) {
        this.logger.info(
          "[VectorIndex] Legacy JSON index detected; rebuilding normalized index from database...",
        );
        await this.rebuildFromDb();
      } else {
        await this.rebuildFromDb();
      }
    } catch (error: unknown) {
      this.logger.error("[VectorIndex] Initialization failed. Rebuilding...", {
        error: error instanceof Error ? error.message : String(error),
      });
      await this.rebuildFromDb();
    }
  }

  public async rebuildFromDb(): Promise<void> {
    this.logger.info(
      "[VectorIndex] Rebuilding index from photo_faces table...",
    );
    const faces = this.db.query<{
      id: string;
      photoId: string;
      descriptor: string;
    }>("SELECT id, photoId, descriptor FROM photo_faces");

    const items = faces.map((face): VectorIndexItem => {
      const parsedDescriptor: unknown = JSON.parse(face.descriptor);
      if (
        !Array.isArray(parsedDescriptor) ||
        !parsedDescriptor.every((value): value is number => typeof value === "number")
      ) {
        throw new Error(`Face ${face.id} has an invalid descriptor`);
      }

      return {
        id: face.photoId,
        title: face.id,
        vector: VectorIndexService.normalizeL2(parsedDescriptor),
      };
    });

    const dimensions = new Set(items.map((item) => item.vector.length));
    if (dimensions.size > 1) {
      throw new Error(
        `Cannot build one VP-tree from mixed face-vector dimensions: ${[...dimensions].join(", ")}`,
      );
    }

    this.root = this.buildVPTree(items);
    this.isInitialized = true;
    this.isDirty = false;
    this.logger.info(`[VectorIndex] Rebuilt index with ${items.length} faces.`);
    this.save();
  }

  private buildVPTree(items: VectorIndexItem[]): VPTreeNode | null {
    if (items.length === 0) return null;

    const index = Math.floor(Math.random() * items.length);
    const pivot = items[index];
    items.splice(index, 1);

    if (items.length === 0) {
      return new VPTreeNode(pivot.vector, pivot.id, pivot.title, 0);
    }

    const distances = items.map((item) =>
      this.euclideanDistance(pivot.vector, item.vector),
    );
    const median = this.getMedian(distances);

    const insideItems: VectorIndexItem[] = [];
    const outsideItems: VectorIndexItem[] = [];

    for (let i = 0; i < items.length; i++) {
      if (distances[i] < median) {
        insideItems.push(items[i]);
      } else {
        outsideItems.push(items[i]);
      }
    }

    return new VPTreeNode(
      pivot.vector,
      pivot.id,
      pivot.title,
      median,
      this.buildVPTree(insideItems),
      this.buildVPTree(outsideItems),
    );
  }

  public static normalizeL2(
    vector: number[] | Float32Array,
    expectedDim: number = vector.length,
    epsilon: number = 1e-12,
  ): Float32Array {
    if (!SUPPORTED_VECTOR_DIMS.has(expectedDim)) {
      throw new RangeError(`Unsupported face-vector dimension: ${expectedDim}`);
    }
    if (vector.length !== expectedDim) {
      throw new RangeError(
        `Expected a ${expectedDim}D face vector, received ${vector.length}D`,
      );
    }

    let squaredNorm = 0;
    for (let index = 0; index < expectedDim; index++) {
      const value = vector[index];
      if (!Number.isFinite(value)) {
        throw new TypeError(`Face vector contains a non-finite value at index ${index}`);
      }
      squaredNorm += value * value;
    }

    const norm = Math.sqrt(squaredNorm);
    if (!Number.isFinite(norm) || norm <= epsilon) {
      throw new RangeError("Face vector must have a finite, non-zero L2 norm");
    }

    const normalized = new Float32Array(expectedDim);
    for (let index = 0; index < expectedDim; index++) {
      normalized[index] = vector[index] / norm;
    }
    return normalized;
  }

  public search(
    queryVector: number[] | Float32Array,
    limit: number = 20,
    threshold: number = 0.8366,
  ): string[] {
    if (!this.root) return [];

    const typedQuery = VectorIndexService.normalizeL2(
      queryVector,
      this.root.pivot.length,
    );

    // Max-priority queue for top K results
    const results = new MaxHeap<{ id: string; distance: number }>(
      limit,
      (a, b) => b.distance - a.distance,
    );

    let currentThreshold = threshold;
    const stack: VPTreeNode[] = [this.root];

    while (stack.length > 0) {
      const node = stack.pop()!;
      const dist = this.euclideanDistance(node.pivot, typedQuery);

      if (dist < currentThreshold) {
        results.push({ id: node.id, distance: dist });
        if (results.isFull()) {
          currentThreshold = Math.min(
            currentThreshold,
            results.peek()!.distance,
          );
        }
      }

      // VP-Tree pruning logic
      const insideFirst = dist < node.radius;

      if (insideFirst) {
        if (node.outside && dist + currentThreshold >= node.radius) {
          stack.push(node.outside);
        }
        if (node.inside && dist - currentThreshold <= node.radius) {
          stack.push(node.inside);
        }
      } else {
        if (node.inside && dist - currentThreshold <= node.radius) {
          stack.push(node.inside);
        }
        if (node.outside && dist + currentThreshold >= node.radius) {
          stack.push(node.outside);
        }
      }
    }

    return results
      .toArray()
      .sort((a, b) => a.distance - b.distance)
      .map((r) => r.id);
  }

  private euclideanDistance(v1: Float32Array, v2: Float32Array): number {
    if (v1.length !== v2.length) {
      throw new RangeError(
        `Cannot compare ${v1.length}D and ${v2.length}D face vectors`,
      );
    }
    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
      const diff = v1[i] - v2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private getMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted[middle];
  }

  public addFace(
    photoId: string,
    faceId: string,
    vector: number[] | Float32Array,
  ): void {
    const typedVector = VectorIndexService.normalizeL2(
      vector,
      this.root?.pivot.length ?? vector.length,
    );
    const newNode = new VPTreeNode(typedVector, photoId, faceId, 0);
    if (!this.root) {
      this.root = newNode;
    } else {
      this.insertRecursive(this.root, newNode);
    }
    this.isDirty = true;
    this.scheduleAutoSave();
  }

  private scheduleAutoSave(): void {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveIfDirty();
      this.saveTimeout = null;
    }, 30000);
  }

  public saveIfDirty(): void {
    if (!this.isDirty) return;
    this.logger.info("[VectorIndex] Auto-saving dirty index...");
    this.save();
  }

  private insertRecursive(parent: VPTreeNode, newNode: VPTreeNode): void {
    const dist = this.euclideanDistance(parent.pivot, newNode.pivot);
    if (dist < parent.radius) {
      if (!parent.inside) {
        parent.inside = newNode;
      } else {
        this.insertRecursive(parent.inside, newNode);
      }
    } else {
      if (!parent.outside) {
        parent.outside = newNode;
      } else {
        this.insertRecursive(parent.outside, newNode);
      }
    }
  }

  public save(): void {
    if (!this.root) return;
    try {
      this.saveBinary();
      this.isDirty = false;
    } catch (error: unknown) {
      this.logger.error("[VectorIndex] Failed to save", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private saveBinary(): void {
    if (!this.root) return;

    const nodes: VPTreeNode[] = [];
    const flatList = (node: VPTreeNode | null) => {
      if (!node) return;
      nodes.push(node);
      flatList(node.inside);
      flatList(node.outside);
    };
    flatList(this.root);

    const nodeMap = new Map<VPTreeNode, number>();
    nodes.forEach((n, i) => nodeMap.set(n, i));

    // Alignment: 1 flag + 24 id + 24 title + 3 PADDING = 52 (multiple of 4)
    // 52 + 8 radius = 60 (multiple of 4)
    // 60 + 512 pivot = 572 (multiple of 4)
    // 572 + 4 inside + 4 outside = 580 (multiple of 4)
    const dim = this.root.pivot.length || VECTOR_DIM;
    const PADDING_SIZE = 3;
    const nodeSize = 1 + 24 + 24 + PADDING_SIZE + 8 + dim * 4 + 4 + 4;

    const buffer = Buffer.alloc(
      MAGIC_BYTES.length + 2 + 4 + 4 + nodes.length * nodeSize,
    );

    let offset = 0;
    MAGIC_BYTES.copy(buffer, offset);
    offset += MAGIC_BYTES.length;
    buffer.writeUInt16LE(VERSION, offset);
    offset += 2;
    buffer.writeUInt32LE(nodes.length, offset);
    offset += 4;
    buffer.writeUInt32LE(dim, offset);
    offset += 4;

    for (const node of nodes) {
      buffer.writeUInt8(1, offset);
      offset += 1;
      buffer.write(node.id.padEnd(24, "\0"), offset, 24, "ascii");
      offset += 24;
      buffer.write(node.title.padEnd(24, "\0"), offset, 24, "ascii");
      offset += 24;

      // Alignment padding
      buffer.fill(0, offset, offset + PADDING_SIZE);
      offset += PADDING_SIZE;

      buffer.writeDoubleLE(node.radius, offset);
      offset += 8;

      const pivotBuffer = Buffer.from(
        node.pivot.buffer,
        node.pivot.byteOffset,
        node.pivot.byteLength,
      );
      pivotBuffer.copy(buffer, offset);
      offset += pivotBuffer.length;

      const insideIdx = node.inside ? nodeMap.get(node.inside)! : -1;
      const outsideIdx = node.outside ? nodeMap.get(node.outside)! : -1;

      buffer.writeInt32LE(insideIdx, offset);
      offset += 4;
      buffer.writeInt32LE(outsideIdx, offset);
      offset += 4;
    }

    fs.writeFileSync(BINARY_INDEX_FILE, buffer);
    this.logger.info(
      `[VectorIndex] Saved binary index: ${nodes.length} nodes (dim=${dim}), ${(buffer.length / 1024 / 1024).toFixed(2)} MB`,
    );
  }

  private loadBinary(): void {
    const buffer = fs.readFileSync(BINARY_INDEX_FILE);
    let offset = 0;

    const magic = buffer.toString("ascii", offset, offset + MAGIC_BYTES.length);
    if (magic !== MAGIC_BYTES.toString("ascii"))
      throw new Error("Invalid magic bytes");
    offset += MAGIC_BYTES.length;

    const version = buffer.readUInt16LE(offset);
    offset += 2;
    if (version !== VERSION) throw new Error("Unsupported index version");

    const nodeCount = buffer.readUInt32LE(offset);
    offset += 4;
    const dim = buffer.readUInt32LE(offset);
    offset += 4;
    if (dim !== 128 && dim !== 512) throw new Error(`Invalid vector dimension: ${dim}`);

    const nodes: VPTreeNode[] = [];
    const relationships: { inside: number; outside: number }[] = [];

    for (let i = 0; i < nodeCount; i++) {
      offset += 1; // flag
      const id = buffer
        .toString("ascii", offset, offset + 24)
        .replace(/\0/g, "");
      offset += 24;
      const title = buffer
        .toString("ascii", offset, offset + 24)
        .replace(/\0/g, "");
      offset += 24;

      offset += 3; // padding

      const radius = buffer.readDoubleLE(offset);
      offset += 8;

      // Extract float array from buffer safely
      const pivot = new Float32Array(dim);
      for (let d = 0; d < dim; d++) {
        pivot[d] = buffer.readFloatLE(offset);
        offset += 4;
      }

      const insideIdx = buffer.readInt32LE(offset);
      offset += 4;
      const outsideIdx = buffer.readInt32LE(offset);
      offset += 4;

      nodes.push(new VPTreeNode(pivot, id, title, radius));
      relationships.push({ inside: insideIdx, outside: outsideIdx });
    }

    // Reconstruct tree
    nodes.forEach((node, i) => {
      const rel = relationships[i];
      if (rel.inside !== -1) node.inside = nodes[rel.inside];
      if (rel.outside !== -1) node.outside = nodes[rel.outside];
    });

    this.root = nodes.length > 0 ? nodes[0] : null;
    this.logger.info(
      `[VectorIndex] Loaded ${nodes.length} nodes from binary index.`,
    );
  }
}

/**
 * Simple MaxHeap for keeping top results efficiently.
 */
class MaxHeap<T> {
  private data: T[] = [];
  constructor(
    private maxSize: number,
    private compare: (a: T, b: T) => number,
  ) {}

  push(item: T): void {
    if (this.data.length < this.maxSize) {
      this.data.push(item);
      this.bubbleUp(this.data.length - 1);
    } else if (this.compare(item, this.data[0]) > 0) {
      this.data[0] = item;
      this.bubbleDown(0);
    }
  }

  isFull(): boolean {
    return this.data.length >= this.maxSize;
  }

  peek(): T | undefined {
    return this.data[0];
  }

  toArray(): T[] {
    return this.data;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.data[index], this.data[parent]) <= 0) break;
      [this.data[index], this.data[parent]] = [
        this.data[parent],
        this.data[index],
      ];
      index = parent;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      let largest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (
        left < this.data.length &&
        this.compare(this.data[left], this.data[largest]) > 0
      )
        largest = left;
      if (
        right < this.data.length &&
        this.compare(this.data[right], this.data[largest]) > 0
      )
        largest = right;

      if (largest === index) break;
      [this.data[index], this.data[largest]] = [
        this.data[largest],
        this.data[index],
      ];
      index = largest;
    }
  }
}
