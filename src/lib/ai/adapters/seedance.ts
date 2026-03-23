/**
 * Seedance Protocol Adapter
 *
 * Implementation of video generation services using Seedance API.
 * Seedance is a high-quality video generation model for AI 漫剧 (AI drama/video) content.
 */

import type {
  AIServiceError,
  AIService,
  AudioResult,
  GenerativeService,
  GenerativeTextParams,
  GenerativeTextResult,
  GenerativeImageParams,
  GenerativeImageResult,
  GenerativeModel,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

export interface SeedanceConfig {
  /** Base URL for the API */
  apiUrl: string;
  /** API key for authentication */
  apiKey?: string;
  /** Default model to use */
  defaultModel?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Default video duration in seconds */
  defaultDuration?: number;
}

// ============================================================================
// Seedance Types
// ============================================================================

/**
 * Video generation parameters
 */
export interface VideoGenerationParams {
  /** Text prompt for video generation */
  prompt: string;
  /** Negative prompt (what to avoid) */
  negativePrompt?: string;
  /** Model to use */
  model?: string;
  /** Video duration in seconds (1-30) */
  duration?: number;
  /** Video width in pixels */
  width?: number;
  /** Video height in pixels */
  height?: number;
  /** Number of frames per second */
  fps?: number;
  /** Number of videos to generate */
  numVideos?: number;
  /** Seed for reproducibility */
  seed?: number;
  /** Guidance scale */
  guidanceScale?: number;
  /** Motion intensity */
  motionIntensity?: number;
  /** Additional provider-specific parameters */
  extraParams?: Record<string, unknown>;
}

/**
 * Video generation result
 */
export interface VideoGenerationResult {
  /** Unique identifier for the generated video */
  id: string;
  /** URL or path to the generated video file */
  url: string;
  /** Video format */
  format: 'mp4' | 'webm' | 'mov';
  /** Video width in pixels */
  width: number;
  /** Video height in pixels */
  height: number;
  /** Duration in seconds */
  duration: number;
  /** Frames per second */
  fps: number;
  /** File size in bytes */
  fileSize?: number;
  /** Model that generated the video */
  model: string;
  /** Seed used for generation */
  seed?: number;
  /** Metadata about the generation */
  metadata?: Record<string, unknown>;
  /** Timestamp when the video was generated */
  createdAt: Date;
}

/**
 * Video generation job status
 */
export type VideoJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Video generation job info
 */
export interface VideoJob {
  id: string;
  status: VideoJobStatus;
  progress: number;
  result?: VideoGenerationResult;
  error?: AIServiceError;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Seedance Service Implementation
// ============================================================================

export class SeedanceAdapter implements AIService, GenerativeService {
  readonly name = 'seedance';
  readonly provider = 'seedance' as const;

  private config: SeedanceConfig;
  private jobs: Map<string, VideoJob> = new Map();

  constructor(config: SeedanceConfig) {
    this.config = {
      timeout: 300000, // 5 minutes default
      defaultDuration: 5,
      defaultModel: 'seedance-1.0',
      ...config,
    };
  }

  /**
   * Check if the service is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.config.apiUrl) {
      return false;
    }
    try {
      const response = await fetch(`${this.config.apiUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number }> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${this.config.apiUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(10000),
      });
      const latency = Date.now() - startTime;
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        latency,
      };
    } catch {
      return { status: 'unhealthy' };
    }
  }

  /**
   * Generate video from prompt
   */
  async generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const startTime = Date.now();

    // Validate required parameters
    if (!params.prompt || params.prompt.trim().length === 0) {
      throw this.createError('INVALID_PROMPT', 'Prompt is required');
    }

    const duration = params.duration ?? this.config.defaultDuration ?? 5;
    if (duration < 1 || duration > 30) {
      throw this.createError('INVALID_DURATION', 'Duration must be between 1 and 30 seconds');
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/video/generate`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: params.prompt,
          negative_prompt: params.negativePrompt,
          model: params.model || this.config.defaultModel,
          duration: duration,
          width: params.width || 1280,
          height: params.height || 720,
          fps: params.fps || 24,
          num_videos: params.numVideos || 1,
          seed: params.seed ?? Math.floor(Math.random() * 2147483647),
          guidance_scale: params.guidanceScale ?? 7.5,
          motion_intensity: params.motionIntensity ?? 1.0,
          ...params.extraParams,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw this.createError(
          'VIDEO_GENERATION_FAILED',
          error.message || error.error || `Video generation failed with status ${response.status}`,
          error
        );
      }

      const data = await response.json();

      // Check if the response contains a task_id for async generation
      if (data.task_id) {
        return this.waitForCompletion(data.task_id, params, startTime);
      }

      // Synchronous response
      return this.parseVideoResult(data, params, startTime);
    } catch (error) {
      if (this.isAIServiceError(error)) {
        throw error;
      }
      throw this.createError('NETWORK_ERROR', `Network error: ${(error as Error).message}`);
    }
  }

  /**
   * Wait for async task completion
   */
  private async waitForCompletion(
    taskId: string,
    params: VideoGenerationParams,
    startTime: number
  ): Promise<VideoGenerationResult> {
    const maxAttempts = 120; // 120 * 5s = 10 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      await this.sleep(5000); // Wait 5 seconds between checks
      attempts++;

      try {
        const response = await fetch(`${this.config.apiUrl}/video/task/status`, {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ task_id: taskId }),
        });

        if (!response.ok) {
          continue;
        }

        const data = await response.json();

        if (data.status === 'completed' && data.result) {
          return this.parseVideoResult(data.result, params, startTime);
        } else if (data.status === 'failed') {
          throw this.createError('TASK_FAILED', data.error || 'Video generation failed');
        }
        // If status is 'processing' or 'pending', continue waiting
      } catch {
        // Continue waiting on errors
      }
    }

    throw this.createError('TIMEOUT', 'Video generation timed out');
  }

  /**
   * Parse video result from API response
   */
  private parseVideoResult(
    data: Record<string, unknown>,
    params: VideoGenerationParams,
    startTime: number
  ): VideoGenerationResult {
    return {
      id: data.id as string || `seedance_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      url: data.url as string || data.video_url as string || '',
      format: (data.format as 'mp4' | 'webm' | 'mov') || 'mp4',
      width: data.width as number || params.width || 1280,
      height: data.height as number || params.height || 720,
      duration: data.duration as number || params.duration || this.config.defaultDuration || 5,
      fps: data.fps as number || params.fps || 24,
      fileSize: data.file_size as number || data.fileSize as number,
      model: data.model as string || params.model || this.config.defaultModel || 'seedance',
      seed: data.seed as number || params.seed,
      metadata: {
        service: 'seedance',
        provider: this.config.apiUrl,
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        latency: Date.now() - startTime,
        generationTime: data.generation_time,
      },
      createdAt: new Date(),
    };
  }

  /**
   * Start an async video generation job
   */
  async generateVideoAsync(params: VideoGenerationParams): Promise<string> {
    const jobId = `seedance_job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const job: VideoJob = {
      id: jobId,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // Start processing in background
    this.processJob(jobId, params).catch(error => {
      const existingJob = this.jobs.get(jobId);
      if (existingJob) {
        existingJob.status = 'failed';
        existingJob.error = error as AIServiceError;
        existingJob.updatedAt = new Date();
      }
    });

    return jobId;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<VideoJob | null> {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Process video generation job
   */
  private async processJob(jobId: string, params: VideoGenerationParams): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      job.progress = 10;
      job.updatedAt = new Date();

      // Generate the video
      const result = await this.generateVideo(params);

      job.progress = 100;
      job.status = 'completed';
      job.result = result;
      job.updatedAt = new Date();
    } catch (error) {
      job.status = 'failed';
      job.error = error as AIServiceError;
      job.updatedAt = new Date();
    }
  }

  /**
   * Get supported video resolutions
   */
  getSupportedResolutions(): { width: number; height: number; name: string }[] {
    return [
      { width: 640, height: 360, name: '360p' },
      { width: 854, height: 480, name: '480p' },
      { width: 1280, height: 720, name: '720p (HD)' },
      { width: 1920, height: 1080, name: '1080p (Full HD)' },
      { width: 1024, height: 1024, name: 'Square 1:1' },
      { width: 1080, height: 1920, name: 'Vertical 9:16' },
    ];
  }

  /**
   * Get supported video durations
   */
  getSupportedDurations(): number[] {
    return [1, 2, 3, 4, 5, 10, 15, 30];
  }

  /**
   * Get HTTP headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }

  /**
   * Create an AIServiceError
   */
  private createError(
    code: string,
    message: string,
    details?: Record<string, unknown>
  ): AIServiceError {
    return {
      code,
      message,
      service: 'seedance',
      details,
    };
  }

  /**
   * Check if error is AIServiceError
   */
  private isAIServiceError(error: unknown): error is AIServiceError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'service' in error
    );
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Text generation is not supported by Seedance (video-only service)
   */
  async generateText(_params: GenerativeTextParams): Promise<GenerativeTextResult> {
    throw this.createError('NOT_SUPPORTED', 'Text generation is not supported by Seedance');
  }

  /**
   * Image generation is not supported by Seedance (video-only service)
   */
  async generateImage(_params: GenerativeImageParams): Promise<GenerativeImageResult> {
    throw this.createError('NOT_SUPPORTED', 'Image generation is not supported by Seedance');
  }

  /**
   * Get available video models for Seedance
   */
  async getModels(): Promise<GenerativeModel[]> {
    return [];
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSeedanceService(config: SeedanceConfig): SeedanceAdapter {
  return new SeedanceAdapter(config);
}
