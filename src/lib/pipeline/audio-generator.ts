/**
 * Audio Generator
 * 生成配音、BGM、音效
 */

import { createServiceFromUserConfig, getDefaultConfig } from '@/lib/ai/factory';
import type { SceneAnalysis, AudioTrack, GenerationConfig, Dialogue } from './types';

export interface AudioGeneratorInput {
  projectId: string;
  scenes: SceneAnalysis[];
  config: GenerationConfig;
  userId: string;
}

export async function generateAllAudio(input: AudioGeneratorInput): Promise<{
  voiceTracks: AudioTrack[];
  bgmTrack?: AudioTrack;
  sfxTracks: AudioTrack[];
}> {
  const { projectId, scenes, config, userId } = input;
  const voiceTracks = await generateVoiceTracks(projectId, scenes, config, userId);
  const bgmTrack = await generateBGM(projectId, scenes, config, userId);
  const sfxTracks = await generateSFX(projectId, scenes, config, userId);
  return { voiceTracks, bgmTrack, sfxTracks };
}

async function generateVoiceTracks(
  projectId: string,
  scenes: SceneAnalysis[],
  config: GenerationConfig,
  userId: string
): Promise<AudioTrack[]> {
  const tracks: AudioTrack[] = [];
  for (const scene of scenes) {
    if (scene.dialogues.length === 0) continue;
    for (const dialogue of scene.dialogues) {
      const track: AudioTrack = {
        id: `voice_${scene.sceneId}_${tracks.length}`,
        projectId,
        sceneId: scene.sceneId,
        trackType: 'voice',
        duration: estimateDialogueDuration(dialogue.text),
        voiceId: dialogue.speaker || config.defaultVoiceId,
        modelUsed: config.voiceModel,
        status: 'pending',
      };
      try {
        const voiceService = await createVoiceService(config, userId);
        if (voiceService && 'synthesize' in voiceService) {
          track.status = 'generating';
          const result = await (voiceService as any).synthesize({
            text: dialogue.text,
            voiceId: dialogue.speaker || config.defaultVoiceId,
            emotion: dialogue.emotion,
          });
          track.audioUrl = result?.url;
          track.duration = result?.duration ?? track.duration;
          track.status = 'completed';
        }
      } catch (error) {
        console.warn('[AudioGenerator] Voice synthesis failed:', error);
        track.status = 'failed';
      }
      tracks.push(track);
    }
  }
  return tracks;
}

async function generateBGM(
  projectId: string,
  scenes: SceneAnalysis[],
  config: GenerationConfig,
  userId: string
): Promise<AudioTrack | undefined> {
  const moodSet = new Set(scenes.map((s) => s.mood));
  const moods = Array.from(moodSet);
  const primaryMood = moods[0] || 'neutral';
  const track: AudioTrack = {
    id: `bgm_${projectId}`,
    projectId,
    trackType: 'bgm',
    duration: estimateTotalDuration(scenes),
    modelUsed: config.bgmModelConfigId,
    status: 'pending',
  };
  try {
    const bgmService = await createBGMService(config, userId);
    if (bgmService && 'generate' in bgmService) {
      track.status = 'generating';
      const result = await (bgmService as any).generate({
        prompt: `适合 ${primaryMood} 氛围的背景音乐`,
        duration: track.duration,
        mood: [primaryMood],
      });
      track.audioUrl = result?.url;
      track.status = 'completed';
    }
  } catch (error) {
    console.warn('[AudioGenerator] BGM generation failed:', error);
    track.status = 'failed';
  }
  return track;
}

async function generateSFX(
  projectId: string,
  scenes: SceneAnalysis[],
  config: GenerationConfig,
  userId: string
): Promise<AudioTrack[]> {
  const tracks: AudioTrack[] = [];
  for (const scene of scenes) {
    const sfxPrompt = extractSFXPrompt(scene);
    if (!sfxPrompt) continue;
    const track: AudioTrack = {
      id: `sfx_${scene.sceneId}_${tracks.length}`,
      projectId,
      sceneId: scene.sceneId,
      trackType: 'sfx',
      prompt: sfxPrompt,
      duration: 2,
      modelUsed: config.sfxModelConfigId,
      status: 'pending',
    };
    try {
      const sfxService = await createSFXService(config, userId);
      if (sfxService && 'generate' in sfxService) {
        track.status = 'generating';
        const result = await (sfxService as any).generate({
          prompt: sfxPrompt,
          duration: track.duration,
        });
        track.audioUrl = result?.url;
        track.status = 'completed';
      }
    } catch (error) {
      console.warn('[AudioGenerator] SFX generation failed:', error);
      track.status = 'failed';
    }
    tracks.push(track);
  }
  return tracks;
}

function estimateDialogueDuration(text: string): number {
  const charCount = text.length;
  return Math.max(1, Math.ceil(charCount / 150 * 60));
}

function estimateTotalDuration(scenes: SceneAnalysis[]): number {
  let total = 0;
  for (const scene of scenes) {
    for (const dialogue of scene.dialogues) {
      total += estimateDialogueDuration(dialogue.text);
    }
    if (scene.dialogues.length === 0) {
      total += 3;
    }
  }
  return Math.max(30, total);
}

function extractSFXPrompt(scene: SceneAnalysis): string | null {
  const keywords: Record<string, string[]> = {
    door: ['门声', '开门', '关门'],
    phone: ['电话响', '手机铃声'],
    nature: ['鸟鸣', '风声', '雨声'],
    city: ['车声', '人声', '城市噪音'],
    impact: ['撞击声', '爆炸声'],
  };
  const description = scene.sceneDescription.toLowerCase();
  for (const [category, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (description.includes(word)) {
        return word;
      }
    }
  }
  return null;
}

async function createVoiceService(config: GenerationConfig, userId: string): Promise<any | null> {
  try {
    const configId = config.voiceModelConfigId || getDefaultConfig(userId, 'text')?.id;
    if (!configId) return null;
    return await createServiceFromUserConfig(configId, userId);
  } catch {
    return null;
  }
}

async function createBGMService(config: GenerationConfig, userId: string): Promise<any | null> {
  try {
    const configId = config.bgmModelConfigId || getDefaultConfig(userId, 'text')?.id;
    if (!configId) return null;
    return await createServiceFromUserConfig(configId, userId);
  } catch {
    return null;
  }
}

async function createSFXService(config: GenerationConfig, userId: string): Promise<any | null> {
  try {
    const configId = config.sfxModelConfigId || getDefaultConfig(userId, 'text')?.id;
    if (!configId) return null;
    return await createServiceFromUserConfig(configId, userId);
  } catch {
    return null;
  }
}
