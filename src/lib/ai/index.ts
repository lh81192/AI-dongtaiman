/**
 * AI Services Index
 *
 * Central export point for all AI service adapters and factory functions.
 */

// Types
export * from './types';

// Adapters
export { GPTSoVITSAdapter, createGPTSoVITSService } from './adapters/gpt-sovits';
export {
  ElevenLabsVoiceAdapter,
  ElevenLabsSFXAdapter,
  createElevenLabsVoiceService,
  createElevenLabsSFXService,
} from './adapters/elevenlabs';
export { MiniMaxAdapter, createMiniMaxService } from './adapters/minimax';

// Video Synthesizer
export {
  VideoSynthesizer,
  createVideoSynthesizer,
  createAudioTrack,
  createVisualElement,
  createVideoSettings,
} from './video-synthesizer';
export type {
  VideoCompositionParams,
  AudioTrack,
  VisualElement,
  VisualEffect,
  VideoSettings,
  VideoResult,
  VideoJob,
  VideoJobStatus,
  VideoSynthesizerConfig,
} from './video-synthesizer';

// Factory
export {
  AIServiceFactory,
  createVoiceRequest,
  createBGMRequest,
  createSFXRequest,
  createConfigFromEnv,
  initializeFromEnv,
} from './factory';
