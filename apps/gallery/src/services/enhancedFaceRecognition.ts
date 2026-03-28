/**
 * Enhanced Face Recognition Service
 * Advanced facial recognition with clustering, similarity search, and auto-tagging
 */

import { EventEmitter } from 'events';
import { Photo } from '../types';

interface FaceDescriptor {
  id: string;
  photoId: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  descriptor: Float32Array; // 128-dimensional face embedding
  confidence: number;
  landmarks?: { x: number; y: number }[]; // Facial landmarks
}

interface PersonCluster {
  id: string;
  faceIds: string[];
  representativeFaceId: string;
  photoIds: string[];
  name?: string;
  autoTagged: boolean;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SearchResult {
  photo: Photo;
  faceId: string;
  similarity: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

interface RecognitionConfig {
  similarityThreshold: number; // 0-1, default 0.6
  minConfidence: number; // 0-1, default 0.5
  maxFacesPerPhoto: number;
  clusteringAlgorithm: 'dbscan' | 'kmeans' | 'hierarchical';
  enableAutoClustering: boolean;
}

class EnhancedFaceRecognitionService extends EventEmitter {
  private faces: Map<string, FaceDescriptor> = new Map();
  private personClusters: Map<string, PersonCluster> = new Map();
  private config: RecognitionConfig;
  private photoIndex: Map<string, Set<string>> = new Map(); // photoId -> faceIds

  constructor(config?: Partial<RecognitionConfig>) {
    super();
    this.config = {
      similarityThreshold: 0.6,
      minConfidence: 0.5,
      maxFacesPerPhoto: 20,
      clusteringAlgorithm: 'dbscan',
      enableAutoClustering: true,
      ...config
    };
  }

  /**
   * Detect and extract faces from a photo
   */
  async detectFaces(photo: Photo, imageData: ImageData): Promise<FaceDescriptor[]> {
    // In real implementation, this would use TensorFlow.js Face API
    // For now, simulating detection
    const detectedFaces: FaceDescriptor[] = [];
    
    // Simulate detecting 1-5 faces per photo
    const faceCount = Math.floor(Math.random() * 5) + 1;
    
    for (let i = 0; i < faceCount; i++) {
      const faceId = `face_${photo.id}_${i}_${Date.now()}`;
      const face: FaceDescriptor = {
        id: faceId,
        photoId: photo.id,
        boundingBox: {
          x: Math.random() * 0.7,
          y: Math.random() * 0.7,
          width: 0.2 + Math.random() * 0.15,
          height: 0.25 + Math.random() * 0.2
        },
        descriptor: this.generateRandomDescriptor(),
        confidence: 0.6 + Math.random() * 0.4,
        landmarks: this.generateLandmarks()
      };
      
      this.faces.set(faceId, face);
      
      // Index by photo
      if (!this.photoIndex.has(photo.id)) {
        this.photoIndex.set(photo.id, new Set());
      }
      this.photoIndex.get(photo.id)!.add(faceId);
      
      detectedFaces.push(face);
    }
    
    this.emit('faces:detected', photo.id, detectedFaces);
    
    // Auto-cluster if enabled
    if (this.config.enableAutoClustering) {
      await this.clusterFaces();
    }
    
    return detectedFaces;
  }

  /**
   * Generate random face descriptor (for simulation)
   */
  private generateRandomDescriptor(): Float32Array {
    const descriptor = new Float32Array(128);
    for (let i = 0; i < 128; i++) {
      descriptor[i] = Math.random() * 2 - 1;
    }
    // Normalize
    const norm = Math.sqrt(descriptor.reduce((sum, v) => sum + v * v, 0));
    return descriptor.map(v => v / norm);
  }

  /**
   * Generate facial landmarks (for simulation)
   */
  private generateLandmarks(): { x: number; y: number }[] {
    // Generate 68 facial landmarks
    const landmarks: { x: number; y: number }[] = [];
    for (let i = 0; i < 68; i++) {
      landmarks.push({
        x: 0.3 + Math.random() * 0.4,
        y: 0.3 + Math.random() * 0.4
      });
    }
    return landmarks;
  }

  /**
   * Calculate Euclidean distance between two face descriptors
   */
  private calculateDistance(desc1: Float32Array, desc2: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
      const diff = desc1[i] - desc2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Calculate similarity score (0-1, higher is more similar)
   */
  private calculateSimilarity(desc1: Float32Array, desc2: Float32Array): number {
    const distance = this.calculateDistance(desc1, desc2);
    // Convert distance to similarity (closer = more similar)
    return Math.max(0, 1 - distance / 2);
  }

  /**
   * Search for similar faces
   */
  async searchSimilarFaces(
    queryFaceId: string,
    options?: {
      threshold?: number;
      maxResults?: number;
      excludeSamePhoto?: boolean;
    }
  ): Promise<SearchResult[]> {
    const queryFace = this.faces.get(queryFaceId);
    if (!queryFace) return [];

    const threshold = options?.threshold || this.config.similarityThreshold;
    const maxResults = options?.maxResults || 50;
    const excludeSamePhoto = options?.excludeSamePhoto ?? true;

    const results: SearchResult[] = [];

    for (const [faceId, face] of this.faces) {
      if (faceId === queryFaceId) continue;
      if (excludeSamePhoto && face.photoId === queryFace.photoId) continue;

      const similarity = this.calculateSimilarity(queryFace.descriptor, face.descriptor);
      
      if (similarity >= threshold) {
        results.push({
          photo: { id: face.photoId } as Photo, // Would fetch full photo
          faceId: face.id,
          similarity,
          boundingBox: face.boundingBox
        });
      }
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);
    
    return results.slice(0, maxResults);
  }

  /**
   * Search by uploading a reference image
   */
  async searchByImage(imageData: ImageData, options?: {
    threshold?: number;
    maxResults?: number;
  }): Promise<SearchResult[]> {
    // Detect face in uploaded image
    const tempFace: FaceDescriptor = {
      id: 'temp_query',
      photoId: 'temp',
      boundingBox: { x: 0, y: 0, width: 1, height: 1 },
      descriptor: this.generateRandomDescriptor(), // Would extract from image
      confidence: 1
    };

    const results: SearchResult[] = [];
    const threshold = options?.threshold || this.config.similarityThreshold;

    for (const [faceId, face] of this.faces) {
      const similarity = this.calculateSimilarity(tempFace.descriptor, face.descriptor);
      
      if (similarity >= threshold) {
        results.push({
          photo: { id: face.photoId } as Photo,
          faceId: face.id,
          similarity,
          boundingBox: face.boundingBox
        });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, options?.maxResults || 50);
  }

  /**
   * Cluster faces into person groups
   */
  async clusterFaces(): Promise<PersonCluster[]> {
    const faces = Array.from(this.faces.values());
    const clusters: PersonCluster[] = [];

    if (this.config.clusteringAlgorithm === 'dbscan') {
      // DBSCAN clustering
      const visited = new Set<string>();
      
      for (const face of faces) {
        if (visited.has(face.id)) continue;
        
        const neighbors = this.findNeighbors(face, faces, 0.5);
        
        if (neighbors.length >= 3) { // Min points for cluster
          const cluster = this.expandCluster(face, neighbors, faces, visited);
          clusters.push(cluster);
        }
      }
    } else {
      // Simple distance-based clustering
      const unclustered = new Set(faces.map(f => f.id));
      
      while (unclustered.size > 0) {
        const seedId = unclustered.values().next().value;
        const seed = this.faces.get(seedId)!;
        
        const clusterFaces: FaceDescriptor[] = [seed];
        unclustered.delete(seedId);
        
        for (const faceId of Array.from(unclustered)) {
          const face = this.faces.get(faceId)!;
          const similarity = this.calculateSimilarity(seed.descriptor, face.descriptor);
          
          if (similarity >= this.config.similarityThreshold) {
            clusterFaces.push(face);
            unclustered.delete(faceId);
          }
        }
        
        if (clusterFaces.length >= 2) {
          clusters.push(this.createCluster(clusterFaces));
        }
      }
    }

    // Update person clusters
    for (const cluster of clusters) {
      this.personClusters.set(cluster.id, cluster);
    }

    this.emit('faces:clustered', clusters);
    return clusters;
  }

  /**
   * Find neighbors for DBSCAN
   */
  private findNeighbors(
    face: FaceDescriptor,
    allFaces: FaceDescriptor[],
    epsilon: number
  ): FaceDescriptor[] {
    return allFaces.filter(f => {
      if (f.id === face.id) return false;
      const distance = this.calculateDistance(face.descriptor, f.descriptor);
      return distance <= epsilon;
    });
  }

  /**
   * Expand cluster for DBSCAN
   */
  private expandCluster(
    coreFace: FaceDescriptor,
    neighbors: FaceDescriptor[],
    allFaces: FaceDescriptor[],
    visited: Set<string>
  ): PersonCluster {
    const clusterFaces: FaceDescriptor[] = [coreFace];
    visited.add(coreFace.id);
    
    const queue = [...neighbors];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      
      clusterFaces.push(current);
      
      const currentNeighbors = this.findNeighbors(current, allFaces, 0.5);
      if (currentNeighbors.length >= 3) {
        queue.push(...currentNeighbors.filter(n => !visited.has(n.id)));
      }
    }
    
    return this.createCluster(clusterFaces);
  }

  /**
   * Create person cluster from faces
   */
  private createCluster(faces: FaceDescriptor[]): PersonCluster {
    const faceIds = faces.map(f => f.id);
    const photoIds = [...new Set(faces.map(f => f.photoId))];
    
    // Find representative face (highest confidence, most central)
    const representativeFace = faces.reduce((best, current) => {
      if (current.confidence > best.confidence) return current;
      return best;
    });
    
    const cluster: PersonCluster = {
      id: `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      faceIds,
      representativeFaceId: representativeFace.id,
      photoIds,
      autoTagged: true,
      confidence: faces.reduce((sum, f) => sum + f.confidence, 0) / faces.length,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return cluster;
  }

  /**
   * Name a person cluster
   */
  nameCluster(clusterId: string, name: string): boolean {
    const cluster = this.personClusters.get(clusterId);
    if (!cluster) return false;
    
    cluster.name = name;
    cluster.autoTagged = false;
    cluster.updatedAt = new Date();
    
    this.emit('cluster:named', cluster);
    return true;
  }

  /**
   * Merge two clusters
   */
  mergeClusters(clusterId1: string, clusterId2: string): PersonCluster | null {
    const cluster1 = this.personClusters.get(clusterId1);
    const cluster2 = this.personClusters.get(clusterId2);
    
    if (!cluster1 || !cluster2) return null;
    
    const merged: PersonCluster = {
      id: clusterId1,
      faceIds: [...cluster1.faceIds, ...cluster2.faceIds],
      representativeFaceId: cluster1.representativeFaceId,
      photoIds: [...new Set([...cluster1.photoIds, ...cluster2.photoIds])],
      name: cluster1.name || cluster2.name,
      autoTagged: false,
      confidence: (cluster1.confidence + cluster2.confidence) / 2,
      createdAt: cluster1.createdAt,
      updatedAt: new Date()
    };
    
    this.personClusters.set(clusterId1, merged);
    this.personClusters.delete(clusterId2);
    
    this.emit('clusters:merged', merged);
    return merged;
  }

  /**
   * Get all photos of a specific person
   */
  getPersonPhotos(clusterId: string): Photo[] {
    const cluster = this.personClusters.get(clusterId);
    if (!cluster) return [];
    
    // Return placeholder photos - would fetch from database
    return cluster.photoIds.map(id => ({ id } as Photo));
  }

  /**
   * Get face stats for a photo
   */
  getPhotoFaceStats(photoId: string): {
    faceCount: number;
    hasMultiplePeople: boolean;
    personClusters: string[];
  } {
    const faceIds = this.photoIndex.get(photoId);
    if (!faceIds) return { faceCount: 0, hasMultiplePeople: false, personClusters: [] };
    
    const faces = Array.from(faceIds).map(id => this.faces.get(id)!);
    
    // Find unique person clusters
    const clusterIds = new Set<string>();
    for (const [clusterId, cluster] of this.personClusters) {
      if (cluster.photoIds.includes(photoId)) {
        clusterIds.add(clusterId);
      }
    }
    
    return {
      faceCount: faces.length,
      hasMultiplePeople: clusterIds.size > 1,
      personClusters: Array.from(clusterIds)
    };
  }

  /**
   * Get all person clusters
   */
  getPersonClusters(): PersonCluster[] {
    return Array.from(this.personClusters.values())
      .sort((a, b) => b.photoIds.length - a.photoIds.length);
  }

  /**
   * Get recognition statistics
   */
  getStats(): {
    totalFaces: number;
    totalPersons: number;
    averageFacesPerPhoto: number;
    unnamedPersons: number;
    namedPersons: number;
  } {
    const totalPhotos = this.photoIndex.size;
    const totalFaces = this.faces.size;
    const totalPersons = this.personClusters.size;
    
    const namedPersons = Array.from(this.personClusters.values())
      .filter(c => c.name && !c.autoTagged).length;
    
    return {
      totalFaces,
      totalPersons,
      averageFacesPerPhoto: totalPhotos > 0 ? totalFaces / totalPhotos : 0,
      unnamedPersons: totalPersons - namedPersons,
      namedPersons
    };
  }

  /**
   * Export face data
   */
  exportData(): {
    faces: FaceDescriptor[];
    clusters: PersonCluster[];
  } {
    return {
      faces: Array.from(this.faces.values()),
      clusters: Array.from(this.personClusters.values())
    };
  }

  /**
   * Import face data
   */
  importData(data: { faces: FaceDescriptor[]; clusters: PersonCluster[] }): void {
    this.faces.clear();
    this.personClusters.clear();
    this.photoIndex.clear();
    
    for (const face of data.faces) {
      this.faces.set(face.id, face);
      
      if (!this.photoIndex.has(face.photoId)) {
        this.photoIndex.set(face.photoId, new Set());
      }
      this.photoIndex.get(face.photoId)!.add(face.id);
    }
    
    for (const cluster of data.clusters) {
      this.personClusters.set(cluster.id, cluster);
    }
    
    this.emit('data:imported', this.getStats());
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.faces.clear();
    this.personClusters.clear();
    this.photoIndex.clear();
    this.emit('data:cleared');
  }
}

// Export singleton
export const enhancedFaceRecognition = new EnhancedFaceRecognitionService();
export type { FaceDescriptor, PersonCluster, SearchResult, RecognitionConfig };
