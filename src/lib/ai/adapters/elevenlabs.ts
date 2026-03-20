/**
 * ElevenLabs Adapter
 *
 * Implementation of voice synthesis and sound effects using ElevenLabs API.
 * ElevenLabs provides high-quality voice synthesis and AI-powered SFX generation.
 */

import type {
  VoiceParams,
  SFXParams,
  AudioResult,
  VoiceService,
  SFXService,
  VoiceModel,
  AIServiceError,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

export interface ElevenLabsConfig {
  apiKey: string;
  baseUrl?: string;
  voiceIds?: string[];
  sfxEnabled?: boolean;
  defaultVoiceId?: string;
  defaultModelId?: string;
}

// ============================================================================
// ElevenLabs Service Implementation (Voice)
// ============================================================================

export class ElevenLabsVoiceAdapter implements VoiceService {
  readonly name = 'elevenlabs-voice';
  readonly provider = 'elevenlabs' as const;

  private config: ElevenLabsConfig;
  private cacheVoices: VoiceModel[] | null = null;

  constructor(config: ElevenLabsConfig) {
    this.config = {
      baseUrl: 'https://api.elevenlabs.io/v1',
      defaultModelId: 'eleven_monolingual_v1',
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
      const response = await fetch(`${this.config.baseUrl}/user`, {
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
      const response = await fetch(`${this.config.baseUrl}/user`, {
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

    const voiceId = params.voiceId || this.config.defaultVoiceId;
    if (!voiceId) {
      throw this.createError('INVALID_VOICE', 'Voice ID is required');
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: params.text,
            model_id: this.config.defaultModelId,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: params.emotion ? 0.5 : 0,
              speed: params.speed || 1.0,
              pitch: params.pitch ? params.pitch / 12 : 0,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw this.createError(
          'SYNTHESIS_FAILED',
          error.error?.message || `Synthesis failed with status ${response.status}`,
          error
        );
      }

      // Get audio data as blob
      const audioBlob = await response.blob();

      // Generate unique ID
      const id = `elevenlabs_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create object URL for the audio (in real app, upload to storage)
      const audioUrl = URL.createObjectURL(audioBlob);

      return {
        id,
        url: audioUrl,
        duration: this.estimateDuration(params.text, params.speed),
        format: 'mp3',
        metadata: {
          service: 'elevenlabs',
          voiceId,
          modelId: this.config.defaultModelId,
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
   * Get available voice models
   */
  async getVoices(): Promise<VoiceModel[]> {
    if (this.cacheVoices) {
      return this.cacheVoices;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/voices`, {
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
      const voices = (data.voices || []).map((voice: {
        voice_id: string;
        name: string;
        category: string;
        description?: string;
      }) => ({
        id: voice.voice_id,
        name: voice.name,
        language: 'multi',
        gender: voice.category === 'male' ? 'male' : voice.category === 'female' ? 'female' : 'neutral',
        description: voice.description,
      }));

      this.cacheVoices = voices;

      return voices;
    } catch (error) {
      if (this.isAIServiceError(error)) {
        throw error;
      }
      return this.getDefaultVoices();
    }
  }

  /**
   * Get default voices
   */
  private getDefaultVoices(): VoiceModel[] {
    return [
      {
        id: 'rachel',
        name: 'Rachel',
        language: 'en',
        gender: 'female',
        description: 'Clear and confident voice',
      },
      {
        id: 'domi',
        name: 'Domi',
        language: 'en',
        gender: 'female',
        description: 'Warm and friendly voice',
      },
      {
        id: 'arnold',
        name: 'Arnold',
        language: 'en',
        gender: 'male',
        description: 'Deep and authoritative voice',
      },
      {
        id: 'adam',
        name: 'Adam',
        language: 'en',
        gender: 'male',
        description: 'Conversational and natural voice',
      },
    ];
  }

  /**
   * Get HTTP headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'xi-api-key': this.config.apiKey,
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
      service: 'elevenlabs',
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
// ElevenLabs SFX Adapter
// ============================================================================

export class ElevenLabsSFXAdapter implements SFXService {
  readonly name = 'elevenlabs-sfx';
  readonly provider = 'elevenlabs' as const;

  private config: ElevenLabsConfig;
  private cacheCategories: string[] | null = null;

  constructor(config: ElevenLabsConfig) {
    this.config = {
      baseUrl: 'https://api.elevenlabs.io/v1',
      ...config,
    };
  }

  /**
   * Check if the service is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey || !this.config.sfxEnabled) {
      return false;
    }
    return true;
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number }> {
    const startTime = Date.now();
    try {
      // ElevenLabs SFX uses different endpoint
      const response = await fetch(
        `${this.config.baseUrl}/sound-generation/health`,
        {
          method: 'GET',
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(10000),
        }
      );
      const latency = Date.now() - startTime;
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        latency,
      };
    } catch {
      // If endpoint doesn't exist, assume healthy
      return { status: 'healthy', latency: Date.now() - startTime };
    }
  }

  /**
   * Generate sound effects
   */
  async generate(params: SFXParams): Promise<AudioResult> {
    const startTime = Date.now();

    // Validate required parameters
    if (!params.prompt || params.prompt.trim().length === 0) {
      throw this.createError('INVALID_PROMPT', 'Prompt is required');
    }

    if (params.duration <= 0 || params.duration > 30) {
      throw this.createError('INVALID_DURATION', 'Duration must be between 0 and 30 seconds');
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}/sound-generation`,
        {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: params.prompt,
            duration: params.duration,
            category: params.category,
            intensity: params.intensity || 0.5,
            format: params.format || 'mp3',
            loop: params.loop || false,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw this.createError(
          'GENERATION_FAILED',
          error.error?.message || `Generation failed with status ${response.status}`,
          error
        );
      }

      // Get audio data as blob
      const audioBlob = await response.blob();

      // Generate unique ID
      const id = `elevenlabs_sfx_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create object URL for the audio
      const audioUrl = URL.createObjectURL(audioBlob);

      return {
        id,
        url: audioUrl,
        duration: params.duration,
        format: params.format || 'mp3',
        metadata: {
          service: 'elevenlabs-sfx',
          prompt: params.prompt,
          category: params.category,
          intensity: params.intensity,
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
   * Get available sound effect categories
   */
  async getCategories(): Promise<string[]> {
    if (this.cacheCategories) {
      return this.cacheCategories;
    }

    // ElevenLabs SFX categories
    this.cacheCategories = [
      'nature',
      'urban',
      'industrial',
      'human',
      'animal',
      'weather',
      'other',
    ];

    return this.cacheCategories;
  }

  /**
   * Get HTTP headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'xi-api-key': this.config.apiKey,
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
      service: 'elevenlabs',
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
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createElevenLabsVoiceService(config: ElevenLabsConfig): ElevenLabsVoiceAdapter {
  return new ElevenLabsVoiceAdapter(config);
}

export function createElevenLabsSFXService(config: ElevenLabsConfig): ElevenLabsSFXAdapter {
  return new ElevenLabsSFXAdapter(config);
}
