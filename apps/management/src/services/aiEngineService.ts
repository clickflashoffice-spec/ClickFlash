/**
 * ClickFlash Management Hub — Unified AI Engine Service
 * 
 * This is the PRIMARY AI control plane. All AI operations are triggered
 * and monitored from the Management Hub. MoneyTrash is a secondary/optional
 * offline processor.
 * 
 * The Management Hub calls the Master OS API (or Cloud Backend) to dispatch
 * AI jobs. The actual compute may run on the Master edge node, a GPU worker,
 * or the cloud — but the Management Hub is always the command center.
 */

export type AIWorkerType = 'curation' | 'enhancement' | 'reels' | 'mesh' | '3d-figure' | 'watermark' | 'blog';
export type AIWorkerStatus = 'idle' | 'processing' | 'completed' | 'error';
export type AIPermission = 'free' | 'premium' | 'disabled';

export interface AIJob {
  id: string;
  type: AIWorkerType;
  galleryId: string;
  status: AIWorkerStatus;
  progress: number; // 0-100
  startedAt: number;
  completedAt?: number;
  result?: Record<string, unknown>;
  error?: string;
}

export interface AIWorkerConfig {
  type: AIWorkerType;
  name: string;
  description: string;
  enabled: boolean;
  permission: AIPermission;
  icon: string; // lucide icon name
  accentColor: string;
  estimatedDuration: string;
}

// Default worker configurations
export const defaultWorkerConfigs: AIWorkerConfig[] = [
  {
    type: 'curation',
    name: 'AI Culling & Hero Selection',
    description: 'Analyzes sharpness, lighting, eye contact, and composition to auto-select the best photos from each gallery.',
    enabled: true,
    permission: 'free',
    icon: 'Sparkles',
    accentColor: 'cyan',
    estimatedDuration: '~15s per gallery',
  },
  {
    type: 'enhancement',
    name: 'AI Enhancement & Pro Retouch',
    description: 'Auto color correction, exposure adjustment, skin smoothing, and blemish removal powered by generative AI.',
    enabled: true,
    permission: 'premium',
    icon: 'Wand2',
    accentColor: 'amber',
    estimatedDuration: '~3s per photo',
  },
  {
    type: 'reels',
    name: 'AI Auto-Reels',
    description: 'Generates dynamic, beat-matched video reels from gallery photos for Instagram/TikTok sharing.',
    enabled: true,
    permission: 'premium',
    icon: 'Film',
    accentColor: 'purple',
    estimatedDuration: '~30s per reel',
  },
  {
    type: 'mesh',
    name: '3D Figurine Generator',
    description: 'Converts 2D photos into watertight 3D meshes for digital AR avatars or physical 3D printed figurines.',
    enabled: true,
    permission: 'premium',
    icon: 'Box',
    accentColor: 'pink',
    estimatedDuration: '~2min per figure',
  },
  {
    type: 'watermark',
    name: 'Smart Watermarking',
    description: 'Automatically applies protective diagonal grid watermarks to all unpurchased gallery previews.',
    enabled: true,
    permission: 'free',
    icon: 'Shield',
    accentColor: 'slate',
    estimatedDuration: '~1s per photo',
  },
  {
    type: 'blog',
    name: 'AI SEO Blog Generator',
    description: 'Auto-generates SEO-optimized blog posts for the studio portfolio from shoot location and metadata.',
    enabled: false,
    permission: 'free',
    icon: 'FileText',
    accentColor: 'emerald',
    estimatedDuration: '~10s per post',
  },
];

class AIEngineService {
  private baseUrl: string;
  private jobs: Map<string, AIJob> = new Map();
  private configs: AIWorkerConfig[] = [...defaultWorkerConfigs];

  constructor() {
    this.baseUrl = import.meta.env.VITE_MASTER_API_URL || 'http://localhost:8090';
  }

  /**
   * Get current worker configurations
   */
  getConfigs(): AIWorkerConfig[] {
    return this.configs;
  }

  /**
   * Update a worker's configuration
   */
  updateConfig(type: AIWorkerType, updates: Partial<AIWorkerConfig>): void {
    this.configs = this.configs.map(c => c.type === type ? { ...c, ...updates } : c);
  }

  /**
   * Dispatch an AI job to the Master OS for processing.
   * The Master node will route to its local GPU, MoneyTrash (if available), or cloud.
   */
  async dispatchJob(type: AIWorkerType, galleryId: string, options?: Record<string, unknown>): Promise<AIJob> {
    const job: AIJob = {
      id: `ai-${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      galleryId,
      status: 'processing',
      progress: 0,
      startedAt: Date.now(),
    };

    this.jobs.set(job.id, job);

    try {
      // In production, this calls the Master OS API which routes to the appropriate compute node
      const response = await fetch(`${this.baseUrl}/api/ai/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, galleryId, jobId: job.id, options }),
      });

      if (!response.ok) {
        // Simulate processing for development
        console.log(`[AIEngine] Master API unavailable, simulating ${type} job for gallery ${galleryId}`);
        this.simulateJob(job);
      }
    } catch {
      // Simulate when Master is not reachable
      console.log(`[AIEngine] Simulating ${type} job locally`);
      this.simulateJob(job);
    }

    return job;
  }

  /**
   * Dispatch bulk AI processing for an entire gallery
   */
  async processGallery(galleryId: string, workers: AIWorkerType[]): Promise<AIJob[]> {
    const enabledWorkers = workers.filter(w => {
      const config = this.configs.find(c => c.type === w);
      return config?.enabled;
    });

    const jobs = await Promise.all(
      enabledWorkers.map(w => this.dispatchJob(w, galleryId))
    );

    return jobs;
  }

  /**
   * Get all active and recent jobs
   */
  getJobs(): AIJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  /**
   * Get a specific job by ID
   */
  getJob(jobId: string): AIJob | undefined {
    return this.jobs.get(jobId);
  }

  private simulateJob(job: AIJob): void {
    const durations: Record<AIWorkerType, number> = {
      curation: 3000,
      enhancement: 2000,
      reels: 5000,
      mesh: 8000,
      '3d-figure': 8000,
      watermark: 1000,
      blog: 4000,
    };

    const duration = durations[job.type] || 3000;
    const steps = 10;
    const stepTime = duration / steps;

    let step = 0;
    const interval = setInterval(() => {
      step++;
      job.progress = Math.min(100, Math.round((step / steps) * 100));

      if (step >= steps) {
        clearInterval(interval);
        job.status = 'completed';
        job.completedAt = Date.now();
        job.progress = 100;
      }
    }, stepTime);
  }
}

export const aiEngineService = new AIEngineService();
