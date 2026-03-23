/**
 * AI Service Types for AI 漫剧生成平台
 *
 * Defines the interfaces and types for various AI audio services:
 * - Voice synthesis (GPT-SoVITS, ElevenLabs)
 * - BGM generation (MiniMax)
 * - Sound effects (ElevenLabs)
 */

// ============================================================================
// Base Types
// ============================================================================

/**
 * Common result type for all AI service operations
 */
export interface AudioResult {
  /** Unique identifier for the generated audio */
  id: string;
  /** URL or path to the generated audio file */
  url: string;
  /** Duration in seconds */
  duration: number;
  /** Format of the audio (mp3, wav, etc.) */
  format: 'mp3' | 'wav' | 'ogg';
  /** Metadata about the generation */
  metadata?: Record<string, unknown>;
  /** Timestamp when the audio was generated */
  createdAt: Date;
}

/**
 * Error type for AI service failures
 */
export interface AIServiceError {
  code: string;
  message: string;
  service: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Voice Parameters (for voice synthesis services like GPT-SoVITS, ElevenLabs)
// ============================================================================

export interface VoiceParams {
  /** Text content to synthesize */
  text: string;
  /** Voice model ID to use */
  voiceId: string;
  /** Language of the text (auto-detected if not specified) */
  language?: string;
  /** Speech speed (0.5 - 2.0, default 1.0) */
  speed?: number;
  /** Pitch adjustment (-12 to +12 semitones) */
  pitch?: number;
  /** Volume (0.0 - 1.0) */
  volume?: number;
  /** Emotion/style of the voice */
  emotion?: string;
  /** Output format */
  format?: 'mp3' | 'wav' | 'ogg';
  /** Sample rate (Hz) */
  sampleRate?: number;
}

// ============================================================================
// BGM Parameters (for background music generation like MiniMax)
// ============================================================================

export interface BGMParams {
  /** Description of the desired BGM style/mood */
  prompt: string;
  /** Duration in seconds */
  duration: number;
  /** Genre or style tags */
  genre?: string[];
  /** Mood tags (happy, sad, energetic, etc.) */
  mood?: string[];
  /** Instrumental or with vocals */
  instrumental?: boolean;
  /** Tempo (BPM) */
  tempo?: number;
  /** Key of the music */
  key?: string;
  /** Output format */
  format?: 'mp3' | 'wav' | 'ogg';
  /** Volume of the BGM (0.0 - 1.0) */
  volume?: number;
}

// ============================================================================
// SFX Parameters (for sound effects like ElevenLabs)
// ============================================================================

export interface SFXParams {
  /** Description of the sound effect */
  prompt: string;
  /** Duration in seconds */
  duration: number;
  /** Category of sound effect */
  category?: 'nature' | 'urban' | 'industrial' | 'human' | 'animal' | 'weather' | 'other';
  /** Intensity/energy level (0.0 - 1.0) */
  intensity?: number;
  /** Output format */
  format?: 'mp3' | 'wav' | 'ogg';
  /** Whether to loop the sound */
  loop?: boolean;
}

// ============================================================================
// AI Service Interface
// ============================================================================

/**
 * Base interface for all AI audio services
 */
export interface AIService {
  /** Unique identifier for the service */
  readonly name: string;
  /** Service provider/type */
  readonly provider: 'gpt-sovits' | 'elevenlabs' | 'minimax' | 'video' | 'openai-compatible' | 'gemini-compatible' | 'seedance';

  /**
   * Check if the service is available and properly configured
   */
  isAvailable(): Promise<boolean>;

  /**
   * Health check for the service
   */
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number }>;
}

/**
 * Voice synthesis service interface
 */
export interface VoiceService extends AIService {
  readonly provider: 'gpt-sovits' | 'elevenlabs';

  /**
   * Synthesize speech from text
   */
  synthesize(params: VoiceParams): Promise<AudioResult>;

  /**
   * Get available voice models
   */
  getVoices(): Promise<VoiceModel[]>;
}

/**
 * BGM generation service interface
 */
export interface BGMService extends AIService {
  readonly provider: 'minimax';

  /**
   * Generate background music
   */
  generate(params: BGMParams): Promise<AudioResult>;

  /**
   * Get available music styles/genres
   */
  getStyles(): Promise<MusicStyle[]>;
}

/**
 * Sound effects service interface
 */
export interface SFXService extends AIService {
  readonly provider: 'elevenlabs';

  /**
   * Generate sound effects
   */
  generate(params: SFXParams): Promise<AudioResult>;

  /**
   * Get available sound effect categories
   */
  getCategories(): Promise<string[]>;
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Voice model information
 */
export interface VoiceModel {
  id: string;
  name: string;
  language: string;
  gender?: 'male' | 'female' | 'neutral';
  ageRange?: string;
  description?: string;
}

/**
 * Music style information
 */
export interface MusicStyle {
  id: string;
  name: string;
  genre: string[];
  mood: string[];
  description?: string;
}

// ============================================================================
// Service Configuration
// ============================================================================

/**
 * Configuration for AI services
 */
export interface AIServiceConfig {
  /** GPT-SoVITS configuration */
  gptSovits?: {
    apiUrl: string;
    apiKey?: string;
    modelId?: string;
  };
  /** ElevenLabs configuration */
  elevenlabs?: {
    apiKey: string;
    voiceIds?: string[];
    sfxEnabled?: boolean;
  };
  /** MiniMax configuration */
  minimax?: {
    apiKey: string;
    groupId?: string;
  };
  /** OpenAI-compatible API configuration */
  openaiCompatible?: {
    apiUrl: string;
    apiKey?: string;
    defaultModel?: string;
  };
  /** Gemini-compatible API configuration */
  geminiCompatible?: {
    apiUrl: string;
    apiKey?: string;
    defaultModel?: string;
  };
  /** Seedance API configuration */
  seedance?: {
    apiUrl: string;
    apiKey?: string;
    defaultModel?: string;
  };
}

/**
 * Type guards for service types
 */
export function isVoiceService(service: AIService): service is VoiceService {
  return 'synthesize' in service;
}

export function isBGMService(service: AIService): service is BGMService {
  return 'generate' in service && service.provider === 'minimax';
}

export function isSFXService(service: AIService): service is SFXService {
  return 'generate' in service && service.provider === 'elevenlabs';
}

// ============================================================================
// Generative AI Service (for text, image, video generation - OpenAI, Gemini, Seedance)
// ============================================================================

/**
 * Generative AI parameters for text generation
 */
export interface GenerativeTextParams {
  /** Text prompt */
  prompt: string;
  /** Model to use */
  model?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for randomness (0.0 - 2.0) */
  temperature?: number;
  /** Top-p sampling parameter */
  topP?: number;
  /** Number of responses to generate */
  n?: number;
  /** Stop sequences */
  stop?: string[];
  /** Additional provider-specific parameters */
  extraParams?: Record<string, unknown>;
}

/**
 * Generative AI parameters for image generation
 */
export interface GenerativeImageParams {
  /** Image prompt */
  prompt: string;
  /** Model to use */
  model?: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
  /** Number of images to generate */
  n?: number;
  /** Output format */
  format?: 'url' | 'base64';
  /** Style preset */
  style?: string;
  /** Additional provider-specific parameters */
  extraParams?: Record<string, unknown>;
}

/**
 * Generative AI result for text generation
 */
export interface GenerativeTextResult {
  /** Unique identifier for the generated text */
  id: string;
  /** Generated text content */
  text: string;
  /** Model that generated the text */
  model: string;
  /** Usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Metadata about the generation */
  metadata?: Record<string, unknown>;
  /** Timestamp when the text was generated */
  createdAt: Date;
}

/**
 * Generative AI result for image generation
 */
export interface GenerativeImageResult {
  /** Unique identifier for the generated image */
  id: string;
  /** URL or base64 of the generated image */
  url: string;
  /** Image format */
  format: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Model that generated the image */
  model: string;
  /** Metadata about the generation */
  metadata?: Record<string, unknown>;
  /** Timestamp when the image was generated */
  createdAt: Date;
}

/**
 * Generative AI service interface
 */
export interface GenerativeService extends AIService {
  readonly provider: 'openai-compatible' | 'gemini-compatible' | 'seedance';

  /**
   * Generate text from prompt
   */
  generateText(params: GenerativeTextParams): Promise<GenerativeTextResult>;

  /**
   * Generate image from prompt
   */
  generateImage(params: GenerativeImageParams): Promise<GenerativeImageResult>;

  /**
   * Get available models for this provider
   */
  getModels(): Promise<GenerativeModel[]>;
}

/**
 * Generative model information
 */
export interface GenerativeModel {
  id: string;
  name: string;
  type: 'text' | 'image' | 'video' | 'multimodal';
  provider: 'openai-compatible' | 'gemini-compatible' | 'seedance';
  description?: string;
  capabilities?: string[];
  maxTokens?: number;
}

/**
 * Type guard for GenerativeService
 */
export function isGenerativeService(service: AIService): service is GenerativeService {
  return 'generateText' in service;
}
