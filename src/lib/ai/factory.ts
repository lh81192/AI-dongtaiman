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
  GenerativeService,
  GenerativeTextParams,
  GenerativeImageParams,
  GenerativeTextResult,
  GenerativeImageResult,
} from './types';

import { GPTSoVITSAdapter, type GPTSoVITSConfig } from './adapters/gpt-sovits';
import {
  ElevenLabsVoiceAdapter,
  ElevenLabsSFXAdapter,
  type ElevenLabsConfig,
} from './adapters/elevenlabs';
import { MiniMaxAdapter, type MiniMaxConfig, createMiniMaxUnifiedService } from './adapters/minimax';
import { OpenAICompatibleAdapter, type OpenAICompatibleConfig } from './adapters/openai-compatible';
import { GeminiCompatibleAdapter, type GeminiCompatibleConfig } from './adapters/gemini-compatible';
import { SeedanceAdapter, type SeedanceConfig, createSeedanceService } from './adapters/seedance';
import { createOpenAICompatibleService } from './adapters/openai-compatible';
import { createGeminiCompatibleService } from './adapters/gemini-compatible';
import { db } from '../db';

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
   * Get a generative AI service instance
   */
  getGenerativeService(provider: 'openai-compatible' | 'gemini-compatible' | 'seedance'): GenerativeService {
    const cacheKey = `generative:${provider}`;

    if (serviceCache.has(cacheKey)) {
      return serviceCache.get(cacheKey) as GenerativeService;
    }

    let service: GenerativeService;

    switch (provider) {
      case 'openai-compatible':
        if (!this.config.openaiCompatible) {
          throw new Error('OpenAI-compatible API not configured');
        }
        service = new OpenAICompatibleAdapter(this.config.openaiCompatible);
        break;

      case 'gemini-compatible':
        if (!this.config.geminiCompatible) {
          throw new Error('Gemini-compatible API not configured');
        }
        service = new GeminiCompatibleAdapter(this.config.geminiCompatible);
        break;

      case 'seedance':
        if (!this.config.seedance) {
          throw new Error('Seedance not configured');
        }
        service = new SeedanceAdapter(this.config.seedance);
        break;

      default:
        throw new Error(`Unknown generative provider: ${provider}`);
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
   * Generate text using default or specified provider
   */
  async generateText(
    params: GenerativeTextParams & { provider?: 'openai-compatible' | 'gemini-compatible' }
  ): Promise<GenerativeTextResult> {
    const provider = params.provider || 'openai-compatible';
    const service = this.getGenerativeService(provider);
    return service.generateText(params);
  }

  /**
   * Generate image using default or specified provider
   */
  async generateImage(
    params: GenerativeImageParams & { provider?: 'openai-compatible' | 'gemini-compatible' }
  ): Promise<GenerativeImageResult> {
    const provider = params.provider || 'openai-compatible';
    const service = this.getGenerativeService(provider);
    return service.generateImage(params);
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

    // Check OpenAI-compatible
    if (this.config.openaiCompatible) {
      try {
        const service = this.getGenerativeService('openai-compatible');
        results.openaiCompatible = await service.healthCheck();
      } catch {
        results.openaiCompatible = { status: 'unhealthy' };
      }
    }

    // Check Gemini-compatible
    if (this.config.geminiCompatible) {
      try {
        const service = this.getGenerativeService('gemini-compatible');
        results.geminiCompatible = await service.healthCheck();
      } catch {
        results.geminiCompatible = { status: 'unhealthy' };
      }
    }

    // Check Seedance
    if (this.config.seedance) {
      try {
        const service = this.getGenerativeService('seedance');
        results.seedance = await service.healthCheck();
      } catch {
        results.seedance = { status: 'unhealthy' };
      }
    }

    return results;
  }

  /**
   * Check if a specific service is available
   */
  async isServiceAvailable(type: 'voice' | 'bgm' | 'sfx' | 'generative', provider: string): Promise<boolean> {
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
        case 'generative':
          service = this.getGenerativeService(provider as 'openai-compatible' | 'gemini-compatible' | 'seedance');
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
      openaiCompatible: !!this.config.openaiCompatible,
      geminiCompatible: !!this.config.geminiCompatible,
      seedance: !!this.config.seedance,
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

/**
 * Create a text generation request
 */
export function createTextGenerationRequest(params: Partial<GenerativeTextParams>): GenerativeTextParams {
  return {
    prompt: params.prompt || '',
    model: params.model,
    maxTokens: params.maxTokens || 2048,
    temperature: params.temperature ?? 0.7,
    topP: params.topP,
    n: params.n || 1,
    ...params,
  };
}

/**
 * Create an image generation request
 */
export function createImageGenerationRequest(params: Partial<GenerativeImageParams>): GenerativeImageParams {
  return {
    prompt: params.prompt || '',
    model: params.model,
    width: params.width || 1024,
    height: params.height || 1024,
    n: params.n || 1,
    format: params.format || 'url',
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
    openaiCompatible: process.env.OPENAI_COMPATIBLE_API_URL
      ? {
          apiUrl: process.env.OPENAI_COMPATIBLE_API_URL,
          apiKey: process.env.OPENAI_COMPATIBLE_API_KEY,
          defaultModel: process.env.OPENAI_COMPATIBLE_DEFAULT_MODEL,
        }
      : undefined,
    geminiCompatible: process.env.GEMINI_COMPATIBLE_API_URL
      ? {
          apiUrl: process.env.GEMINI_COMPATIBLE_API_URL,
          apiKey: process.env.GEMINI_COMPATIBLE_API_KEY,
          defaultModel: process.env.GEMINI_COMPATIBLE_DEFAULT_MODEL,
        }
      : undefined,
    seedance: process.env.SEEDANCE_API_URL
      ? {
          apiUrl: process.env.SEEDANCE_API_URL,
          apiKey: process.env.SEEDANCE_API_KEY,
          defaultModel: process.env.SEEDANCE_DEFAULT_MODEL,
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

// ============================================================================
// User Configuration Support
// ============================================================================

/**
 * 从用户配置创建 AI 服务实例
 */
export async function createServiceFromUserConfig(configId: string, userId: string) {
  const config = db.prepare(`
    SELECT * FROM user_model_configs WHERE id = ? AND user_id = ? AND enabled = 1
  `).get(configId, userId) as any;

  if (!config) {
    throw new Error('Model configuration not found or disabled');
  }

  const { protocol, provider_type } = config;

  switch (protocol) {
    case 'openai':
      // ElevenLabs audio provider
      if (config.provider_id === 'elevenlabs' && provider_type === 'audio') {
        return createElevenLabsService({
          apiKey: config.api_key,
          baseUrl: config.api_url,
        });
      }
      // Generic OpenAI-compatible
      return createOpenAICompatibleService({
        apiUrl: config.api_url,
        apiKey: config.api_key,
        defaultModel: config.model_ids?.[0],
      });

    case 'gemini':
    case 'google':
      return createGeminiCompatibleService({
        apiUrl: config.api_url,
        apiKey: config.api_key,
        defaultModel: config.model_ids?.[0],
      });

    case 'seedance':
      return createSeedanceService({
        apiUrl: config.api_url,
        apiKey: config.api_key,
      });

    case 'domestic':
      // 国产协议根据类型选择适配器
      if (provider_type === 'video' && config.provider_id === 'cogvideo') {
        return createGeminiCompatibleService({
          apiUrl: config.api_url,
          apiKey: config.api_key,
          defaultModel: config.model_ids?.[0],
        });
      }
      // MiniMax 音频 (TTS / BGM / SFX)
      if (config.provider_id === 'minimax-tts' || config.provider_id === 'minimax-audio') {
        return createMiniMaxUnifiedService({
          apiKey: config.api_key,
          baseUrl: config.api_url,
        });
      }
      // 默认使用 OpenAI 兼容格式
      return createOpenAICompatibleService({
        apiUrl: config.api_url,
        apiKey: config.api_key,
        defaultModel: config.model_ids?.[0],
      });

    default:
      throw new Error(`Unsupported protocol: ${protocol}`);
  }
}

/**
 * 获取用户指定类型的默认配置
 */
export function getDefaultConfig(userId: string, providerType: 'text' | 'image' | 'video' | 'audio') {
  const config = db.prepare(`
    SELECT * FROM user_model_configs
    WHERE user_id = ? AND provider_type = ? AND enabled = 1 AND is_default = 1
  `).get(userId, providerType);

  return config as any;
}

/**
 * 获取用户所有启用的配置
 */
export function getEnabledConfigs(userId: string, providerType?: 'text' | 'image' | 'video') {
  let query = 'SELECT * FROM user_model_configs WHERE user_id = ? AND enabled = 1';
  const params: string[] = [userId];

  if (providerType) {
    query += ' AND provider_type = ?';
    params.push(providerType);
  }

  query += ' ORDER BY is_default DESC, created_at DESC';

  return db.prepare(query).all(...params) as any[];
}
