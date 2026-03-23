/**
 * Pipeline Types
 * AI 漫剧生成管线类型定义
 */

/**
 * 对白条目
 */
export interface Dialogue {
  speaker: string;
  text: string;
  emotion?: 'happy' | 'sad' | 'angry' | 'neutral' | 'excited' | 'calm';
  tone?: 'whisper' | 'shout' | 'normal' | 'question' | 'exclamation';
}

/**
 * 镜头类型
 */
export type CameraType =
  | 'close-up'      // 特写
  | 'medium-shot'   // 中景
  | 'wide-shot'     // 全景
  | 'over-shoulder' // 过肩镜头
  | 'two-shot'      // 双人镜头
  | 'panoramic'     // 全景
  | 'POV';          // 主观视角

/**
 * 场景分析结果
 */
export interface SceneAnalysis {
  sceneId: string;
  pageIndex: number;
  sceneDescription: string;
  setting: string;
  timeOfDay?: string;
  cameraType: CameraType;
  cameraMovement?: 'static' | 'pan' | 'zoom' | 'tilt';
  characterActions: string[];
  characterEmotions: Record<string, string>;
  dialogues: Dialogue[];
  mood: 'happy' | 'sad' | 'tense' | 'romantic' | 'action' | 'mysterious' | 'neutral';
  visualStyle?: string;
  videoPrompt: string;
  negativePrompt?: string;
  firstFrameDescription: string;
  lastFrameDescription: string;
}

/**
 * 生成管线步骤
 */
export type PipelineStep =
  | 'parsing'
  | 'analyzing'
  | 'generating-frames'
  | 'generating-video'
  | 'generating-audio'
  | 'synthesizing'
  | 'completed';

/**
 * 管线的当前状态
 */
export interface PipelineState {
  projectId: string;
  currentStep: PipelineStep;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  totalScenes: number;
  processedScenes: number;
  currentSceneId?: string;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * 关键帧
 */
export interface KeyFrame {
  id: string;
  sceneId: string;
  frameType: 'first' | 'last';
  imageUrl?: string;
  prompt: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

/**
 * 视频片段
 */
export interface VideoClip {
  id: string;
  sceneId: string;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  videoUrl?: string;
  duration: number;
  prompt: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  modelUsed?: string;
}

/**
 * 音频轨
 */
export interface AudioTrack {
  id: string;
  projectId: string;
  sceneId?: string;
  trackType: 'voice' | 'bgm' | 'sfx';
  audioUrl?: string;
  duration: number;
  prompt?: string;
  voiceId?: string;
  modelUsed?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

/**
 * 生成配置
 */
export interface GenerationConfig {
  textModelConfigId?: string;
  textModel?: string;
  imageModelConfigId?: string;
  imageModel?: string;
  videoModelConfigId?: string;
  videoModel?: string;
  voiceModelConfigId?: string;
  voiceModel?: string;
  defaultVoiceId?: string;
  bgmModelConfigId?: string;
  sfxModelConfigId?: string;
  videoDuration: number;
  videoResolution: '480p' | '720p' | '1080p';
  videoAspectRatio: '16:9' | '9:16' | '1:1';
  bgmVolume: number;
  voiceVolume: number;
  sfxVolume: number;
}
