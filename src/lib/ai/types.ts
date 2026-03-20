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
  readonly provider: 'gpt-sovits' | 'elevenlabs' | 'minimax';

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
