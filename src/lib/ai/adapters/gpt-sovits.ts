/**
 * GPT-SoVITS Adapter
 *
 * Implementation of voice synthesis using GPT-SoVITS API.
 * GPT-SoVITS is an open-source voice cloning and synthesis model.
 */

import type {
  VoiceParams,
  AudioResult,
  VoiceService,
  VoiceModel,
  AIServiceError,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

export interface GPTSoVITSConfig {
  apiUrl: string;
  apiKey?: string;
  modelId?: string;
  defaultLanguage?: string;
  defaultSpeed?: number;
}

// ============================================================================
// GPT-SoVITS Service Implementation
// ============================================================================

export class GPTSoVITSAdapter implements VoiceService {
  readonly name = 'gpt-sovits';
  readonly provider = 'gpt-sovits' as const;

  private config: GPTSoVITSConfig;
  private cacheVoices: VoiceModel[] | null = null;

  constructor(config: GPTSoVITSConfig) {
    this.config = {
      defaultLanguage: 'auto',
      defaultSpeed: 1.0,
      ...config,
    };
  }

  /**
   * Check if the service is available
   */
  async isAvailable(): Promise<boolean> {
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
   * Synthesize speech from text
   */
  async synthesize(params: VoiceParams): Promise<AudioResult> {
    const startTime = Date.now();

    // Validate required parameters
    if (!params.text || params.text.trim().length === 0) {
      throw this.createError('INVALID_TEXT', 'Text content is required');
    }

    if (!params.voiceId) {
      throw this.createError('INVALID_VOICE', 'Voice ID is required');
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/tts`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: params.text,
          voice_id: params.voiceId,
          language: params.language || this.config.defaultLanguage,
          speed: params.speed || this.config.defaultSpeed,
          pitch: params.pitch || 0,
          volume: params.volume || 1.0,
          emotion: params.emotion,
          format: params.format || 'mp3',
          sample_rate: params.sampleRate || 24000,
          model_id: this.config.modelId,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw this.createError(
          'SYNTHESIS_FAILED',
          error.message || `Synthesis failed with status ${response.status}`,
          error
        );
      }

      // Parse response
      const data = await response.json();

      // Generate unique ID
      const id = `gptsovits_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      return {
        id,
        url: data.audio_url || data.url || '',
        duration: data.duration || this.estimateDuration(params.text, params.speed),
        format: params.format || 'mp3',
        metadata: {
          service: 'gpt-sovits',
          voiceId: params.voiceId,
          language: params.language || this.config.defaultLanguage,
          speed: params.speed || this.config.defaultSpeed,
          latency: Date.now() - startTime,
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
   * Get available voice models
   */
  async getVoices(): Promise<VoiceModel[]> {
    if (this.cacheVoices) {
      return this.cacheVoices;
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/voices`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw this.createError(
          'FETCH_VOICES_FAILED',
          `Failed to fetch voices with status ${response.status}`
        );
      }

      const data = await response.json();
      const voices = data.voices || data || [];
      this.cacheVoices = voices;
      return voices;
    } catch (error) {
      if (this.isAIServiceError(error)) {
        throw error;
      }
      // Return default voices if API fails
      return this.getDefaultVoices();
    }
  }

  /**
   * Get default built-in voices
   */
  private getDefaultVoices(): VoiceModel[] {
    return [
      {
        id: 'default_male',
        name: 'Default Male',
        language: 'en',
        gender: 'male',
        description: 'Default male voice',
      },
      {
        id: 'default_female',
        name: 'Default Female',
        language: 'en',
        gender: 'female',
        description: 'Default female voice',
      },
    ];
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
      service: 'gpt-sovits',
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
   * Estimate duration based on text length and speed
   */
  private estimateDuration(text: string, speed: number = 1.0): number {
    // Average speaking rate: ~150 words per minute at speed 1.0
    const wordsPerMinute = 150;
    const wordCount = text.split(/\s+/).length;
    const baseDuration = (wordCount / wordsPerMinute) * 60;
    return baseDuration / speed;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGPTSoVITSService(config: GPTSoVITSConfig): GPTSoVITSAdapter {
  return new GPTSoVITSAdapter(config);
}
