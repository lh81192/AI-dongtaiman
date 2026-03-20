/**
 * MiniMax Adapter
 *
 * Implementation of background music generation using MiniMax API.
 * MiniMax provides music generation capabilities for BGM creation.
 */

import type {
  BGMParams,
  AudioResult,
  BGMService,
  MusicStyle,
  AIServiceError,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

export interface MiniMaxConfig {
  apiKey: string;
  baseUrl?: string;
  groupId?: string;
  defaultModel?: string;
}

// ============================================================================
// MiniMax Service Implementation
// ============================================================================

export class MiniMaxAdapter implements BGMService {
  readonly name = 'minimax';
  readonly provider = 'minimax' as const;

  private config: MiniMaxConfig;
  private cacheStyles: MusicStyle[] | null = null;

  constructor(config: MiniMaxConfig) {
    this.config = {
      baseUrl: 'https://api.minimax.chat/v1',
      defaultModel: 'music-01',
      ...config,
    };
  }

  /**
   * Check if the service is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false;
    }
    try {
      const response = await fetch(`${this.config.baseUrl}/user/info`, {
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
      const response = await fetch(`${this.config.baseUrl}/user/info`, {
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
   * Generate background music
   */
  async generate(params: BGMParams): Promise<AudioResult> {
    const startTime = Date.now();

    // Validate required parameters
    if (!params.prompt || params.prompt.trim().length === 0) {
      throw this.createError('INVALID_PROMPT', 'Prompt is required');
    }

    if (params.duration <= 0 || params.duration > 300) {
      throw this.createError('INVALID_DURATION', 'Duration must be between 0 and 300 seconds');
    }

    try {
      // Build the music generation prompt
      const fullPrompt = this.buildPrompt(params);

      const response = await fetch(
        `${this.config.baseUrl}/text-to music/${this.config.defaultModel}`,
        {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: fullPrompt,
            refer_audio: null,
            refer_audio_weight: 0.5,
            model: this.config.defaultModel,
            ...(this.config.groupId && { group_id: this.config.groupId }),
            settings: {
              sample_rate: 44100,
              bitrate: 128000,
              format: params.format || 'mp3',
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw this.createError(
          'GENERATION_FAILED',
          error.base_resp?.status_message || `Generation failed with status ${response.status}`,
          error
        );
      }

      // Parse response - MiniMax returns task_id for async generation
      const data = await response.json();

      if (data.task_id) {
        // Async generation - wait for completion
        return this.waitForCompletion(data.task_id, params, startTime);
      }

      // Synchronous response (rare case)
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const id = `minimax_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      return {
        id,
        url: audioUrl,
        duration: params.duration,
        format: params.format || 'mp3',
        metadata: {
          service: 'minimax',
          prompt: params.prompt,
          genre: params.genre,
          mood: params.mood,
          latency: Date.now() - startTime,
          blobSize: audioBlob.size,
        },
        createdAt: new Date(),
      };
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
    params: BGMParams,
    startTime: number
  ): Promise<AudioResult> {
    const maxAttempts = 60; // 60 * 5s = 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      await this.sleep(5000); // Wait 5 seconds between checks
      attempts++;

      try {
        const response = await fetch(
          `${this.config.baseUrl}/text-to_music/task/query`,
          {
            method: 'POST',
            headers: {
              ...this.getHeaders(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              task_id: taskId,
            }),
          }
        );

        if (!response.ok) {
          continue;
        }

        const data = await response.json();

        if (data.status === 'completed' && data.audio) {
          // Download the audio
          const audioResponse = await fetch(data.audio);
          const audioBlob = await audioResponse.blob();
          const audioUrl = URL.createObjectURL(audioBlob);

          const id = `minimax_${Date.now()}_${Math.random().toString(36).substring(7)}`;

          return {
            id,
            url: audioUrl,
            duration: params.duration,
            format: params.format || 'mp3',
            metadata: {
              service: 'minimax',
              prompt: params.prompt,
              taskId,
              genre: params.genre,
              mood: params.mood,
              latency: Date.now() - startTime,
              blobSize: audioBlob.size,
            },
            createdAt: new Date(),
          };
        } else if (data.status === 'failed') {
          throw this.createError('TASK_FAILED', data.error || 'Music generation failed');
        }
        // If status is 'processing', continue waiting
      } catch {
        // Continue waiting on errors
      }
    }

    throw this.createError('TIMEOUT', 'Music generation timed out');
  }

  /**
   * Build the music generation prompt from parameters
   */
  private buildPrompt(params: BGMParams): string {
    const parts: string[] = [params.prompt];

    // Add genre information
    if (params.genre && params.genre.length > 0) {
      parts.push(`Genre: ${params.genre.join(', ')}`);
    }

    // Add mood information
    if (params.mood && params.mood.length > 0) {
      parts.push(`Mood: ${params.mood.join(', ')}`);
    }

    // Add instrumentation preference
    if (params.instrumental !== undefined) {
      parts.push(params.instrumental ? 'Instrumental' : 'With vocals');
    }

    // Add tempo information
    if (params.tempo) {
      parts.push(`Tempo: ${params.tempo} BPM`);
    }

    // Add key information
    if (params.key) {
      parts.push(`Key: ${params.key}`);
    }

    return parts.join('. ');
  }

  /**
   * Get available music styles/genres
   */
  async getStyles(): Promise<MusicStyle[]> {
    if (this.cacheStyles) {
      return this.cacheStyles;
    }

    // MiniMax music styles
    this.cacheStyles = [
      {
        id: 'pop',
        name: 'Pop',
        genre: ['pop'],
        mood: ['happy', 'energetic', 'uplifting'],
        description: 'Popular mainstream music',
      },
      {
        id: 'electronic',
        name: 'Electronic',
        genre: ['electronic', 'edm'],
        mood: ['energetic', 'modern', 'dynamic'],
        description: 'Electronic dance music',
      },
      {
        id: 'classical',
        name: 'Classical',
        genre: ['classical', 'orchestral'],
        mood: ['elegant', 'formal', 'emotional'],
        description: 'Classical orchestral music',
      },
      {
        id: 'jazz',
        name: 'Jazz',
        genre: ['jazz', 'swing'],
        mood: ['relaxed', 'smooth', 'sophisticated'],
        description: 'Jazz and swing music',
      },
      {
        id: 'rock',
        name: 'Rock',
        genre: ['rock'],
        mood: ['energetic', 'powerful', 'intense'],
        description: 'Rock music',
      },
      {
        id: 'ambient',
        name: 'Ambient',
        genre: ['ambient', 'chill'],
        mood: ['relaxed', 'calm', 'peaceful'],
        description: 'Ambient and chillout music',
      },
      {
        id: 'cinematic',
        name: 'Cinematic',
        genre: ['cinematic', 'soundtrack'],
        mood: ['epic', 'dramatic', 'emotional'],
        description: 'Film and game soundtracks',
      },
      {
        id: 'folk',
        name: 'Folk',
        genre: ['folk', 'acoustic'],
        mood: ['warm', 'nostalgic', 'gentle'],
        description: 'Folk and acoustic music',
      },
    ];

    return this.cacheStyles;
  }

  /**
   * Get HTTP headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
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
      service: 'minimax',
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
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMiniMaxService(config: MiniMaxConfig): MiniMaxAdapter {
  return new MiniMaxAdapter(config);
}
