/**
 * AI Service Factory
 *
 * Factory for creating and managing AI service instances.
 * Provides a unified interface for accessing voice, BGM, and SFX services.
 */

import type {
  AIService,
  AIServiceConfig,
  VoiceService,
  BGMService,
  SFXService,
  VoiceParams,
  BGMParams,
  SFXParams,
  AudioResult,
} from './types';

import { GPTSoVITSAdapter, type GPTSoVITSConfig } from './adapters/gpt-sovits';
import {
  ElevenLabsVoiceAdapter,
  ElevenLabsSFXAdapter,
  type ElevenLabsConfig,
} from './adapters/elevenlabs';
import { MiniMaxAdapter, type MiniMaxConfig } from './adapters/minimax';

// ============================================================================
// Factory State
// ============================================================================

/**
 * Singleton instance of the factory
 */
let factoryInstance: AIServiceFactory | null = null;

/**
 * Service instances cache
 */
const serviceCache: Map<string, AIService> = new Map();

// ============================================================================
// Factory Class
// ============================================================================

export class AIServiceFactory {
  private config: AIServiceConfig;
  private initialized: boolean = false;

  constructor(config: AIServiceConfig) {
    this.config = config;
  }

  /**
   * Get or create the singleton factory instance
   */
  static getInstance(config?: AIServiceConfig): AIServiceFactory {
    if (!factoryInstance && config) {
      factoryInstance = new AIServiceFactory(config);
    }
    if (!factoryInstance) {
      throw new Error('AIServiceFactory not initialized. Provide config to getInstance().');
    }
    return factoryInstance;
  }

  /**
   * Initialize the factory with configuration
   */
  static initialize(config: AIServiceConfig): AIServiceFactory {
    factoryInstance = new AIServiceFactory(config);
    serviceCache.clear();
    return factoryInstance;
  }

  /**
   * Reset the factory (useful for testing)
   */
  static reset(): void {
    factoryInstance = null;
    serviceCache.clear();
  }

  /**
   * Get a voice service instance
   */
  getVoiceService(provider: 'gpt-sovits' | 'elevenlabs'): VoiceService {
    const cacheKey = `voice:${provider}`;

    if (serviceCache.has(cacheKey)) {
      return serviceCache.get(cacheKey) as VoiceService;
    }

    let service: VoiceService;

    switch (provider) {
      case 'gpt-sovits':
        if (!this.config.gptSovits) {
          throw new Error('GPT-SoVITS not configured');
        }
        service = new GPTSoVITSAdapter(this.config.gptSovits);
        break;

      case 'elevenlabs':
        if (!this.config.elevenlabs) {
          throw new Error('ElevenLabs not configured');
        }
        service = new ElevenLabsVoiceAdapter(this.config.elevenlabs);
        break;

      default:
        throw new Error(`Unknown voice provider: ${provider}`);
    }

    serviceCache.set(cacheKey, service);
    return service;
  }

  /**
   * Get a BGM service instance
   */
  getBGMService(provider: 'minimax'): BGMService {
    const cacheKey = `bgm:${provider}`;

    if (serviceCache.has(cacheKey)) {
      return serviceCache.get(cacheKey) as BGMService;
    }

    let service: BGMService;

    switch (provider) {
      case 'minimax':
        if (!this.config.minimax) {
          throw new Error('MiniMax not configured');
        }
        service = new MiniMaxAdapter(this.config.minimax);
        break;

      default:
        throw new Error(`Unknown BGM provider: ${provider}`);
    }

    serviceCache.set(cacheKey, service);
    return service;
  }

  /**
   * Get an SFX service instance
   */
  getSFXService(provider: 'elevenlabs'): SFXService {
    const cacheKey = `sfx:${provider}`;

    if (serviceCache.has(cacheKey)) {
      return serviceCache.get(cacheKey) as SFXService;
    }

    let service: SFXService;

    switch (provider) {
      case 'elevenlabs':
        if (!this.config.elevenlabs) {
          throw new Error('ElevenLabs not configured');
        }
        service = new ElevenLabsSFXAdapter(this.config.elevenlabs);
        break;

      default:
        throw new Error(`Unknown SFX provider: ${provider}`);
    }

    serviceCache.set(cacheKey, service);
    return service;
  }

  /**
   * Synthesize voice using default or specified provider
   */
  async synthesizeVoice(
    params: VoiceParams & { provider?: 'gpt-sovits' | 'elevenlabs' }
  ): Promise<AudioResult> {
    const provider = params.provider || 'elevenlabs';
    const service = this.getVoiceService(provider);
    return service.synthesize(params);
  }

  /**
   * Generate BGM using default or specified provider
   */
  async generateBGM(
    params: BGMParams & { provider?: 'minimax' }
  ): Promise<AudioResult> {
    const provider = params.provider || 'minimax';
    const service = this.getBGMService(provider);
    return service.generate(params);
  }

  /**
   * Generate SFX using default or specified provider
   */
  async generateSFX(
    params: SFXParams & { provider?: 'elevenlabs' }
  ): Promise<AudioResult> {
    const provider = params.provider || 'elevenlabs';
    const service = this.getSFXService(provider);
    return service.generate(params);
  }

  /**
   * Check health of all configured services
   */
  async healthCheckAll(): Promise<Record<string, { status: 'healthy' | 'unhealthy'; latency?: number }>> {
    const results: Record<string, { status: 'healthy' | 'unhealthy'; latency?: number }> = {};

    // Check GPT-SoVITS
    if (this.config.gptSovits) {
      try {
        const service = this.getVoiceService('gpt-sovits');
        results.gptSovits = await service.healthCheck();
      } catch {
        results.gptSovits = { status: 'unhealthy' };
      }
    }

    // Check ElevenLabs
    if (this.config.elevenlabs) {
      try {
        const service = this.getVoiceService('elevenlabs');
        results.elevenlabs = await service.healthCheck();
      } catch {
        results.elevenlabs = { status: 'unhealthy' };
      }
    }

    // Check MiniMax
    if (this.config.minimax) {
      try {
        const service = this.getBGMService('minimax');
        results.minimax = await service.healthCheck();
      } catch {
        results.minimax = { status: 'unhealthy' };
      }
    }

    return results;
  }

  /**
   * Check if a specific service is available
   */
  async isServiceAvailable(type: 'voice' | 'bgm' | 'sfx', provider: string): Promise<boolean> {
    try {
      let service: AIService;

      switch (type) {
        case 'voice':
          service = this.getVoiceService(provider as 'gpt-sovits' | 'elevenlabs');
          break;
        case 'bgm':
          service = this.getBGMService(provider as 'minimax');
          break;
        case 'sfx':
          service = this.getSFXService(provider as 'elevenlabs');
          break;
      }

      return service.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Get configuration status
   */
  getConfigStatus(): Record<string, boolean> {
    return {
      gptSovits: !!this.config.gptSovits,
      elevenlabs: !!this.config.elevenlabs,
      minimax: !!this.config.minimax,
    };
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a voice synthesis request
 */
export function createVoiceRequest(params: Partial<VoiceParams>): VoiceParams {
  return {
    text: params.text || '',
    voiceId: params.voiceId || '',
    language: params.language || 'auto',
    speed: params.speed || 1.0,
    pitch: params.pitch || 0,
    volume: params.volume || 1.0,
    format: params.format || 'mp3',
    ...params,
  };
}

/**
 * Create a BGM generation request
 */
export function createBGMRequest(params: Partial<BGMParams>): BGMParams {
  return {
    prompt: params.prompt || '',
    duration: params.duration || 30,
    genre: params.genre || [],
    mood: params.mood || [],
    instrumental: params.instrumental ?? true,
    format: params.format || 'mp3',
    volume: params.volume || 0.8,
    ...params,
  };
}

/**
 * Create an SFX generation request
 */
export function createSFXRequest(params: Partial<SFXParams>): SFXParams {
  return {
    prompt: params.prompt || '',
    duration: params.duration || 5,
    category: params.category || 'other',
    intensity: params.intensity || 0.5,
    format: params.format || 'mp3',
    loop: params.loop || false,
    ...params,
  };
}

// ============================================================================
// Default Configuration from Environment
// ============================================================================

/**
 * Create configuration from environment variables
 */
export function createConfigFromEnv(): AIServiceConfig {
  return {
    gptSovits: process.env.GPT_SOVITS_API_URL
      ? {
          apiUrl: process.env.GPT_SOVITS_API_URL,
          apiKey: process.env.GPT_SOVITS_API_KEY,
          modelId: process.env.GPT_SOVITS_MODEL_ID,
        }
      : undefined,
    elevenlabs: process.env.ELEVENLABS_API_KEY
      ? {
          apiKey: process.env.ELEVENLABS_API_KEY,
          sfxEnabled: process.env.ELEVENLABS_SFX_ENABLED === 'true',
        }
      : undefined,
    minimax: process.env.MINIMAX_API_KEY
      ? {
          apiKey: process.env.MINIMAX_API_KEY,
          groupId: process.env.MINIMAX_GROUP_ID,
        }
      : undefined,
  };
}

/**
 * Initialize factory from environment variables
 */
export function initializeFromEnv(): AIServiceFactory {
  const config = createConfigFromEnv();
  return AIServiceFactory.initialize(config);
}
