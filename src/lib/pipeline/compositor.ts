/**
 * Video Compositor
 * 合成视频片段与音轨，输出最终漫剧视频
 */

import type { VideoClip, AudioTrack, GenerationConfig } from './types';

export interface CompositorInput {
  projectId: string;
  videoClips: VideoClip[];
  voiceTracks: AudioTrack[];
  bgmTrack?: AudioTrack;
  sfxTracks: AudioTrack[];
  config: GenerationConfig;
}

export interface CompositionResult {
  id: string;
  projectId: string;
  videoUrl: string;
  duration: number;
  resolution: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
}

export async function composeFinalVideo(
  input: CompositorInput
): Promise<CompositionResult> {
  const result: CompositionResult = {
    id: `comp_${input.projectId}`,
    projectId: input.projectId,
    videoUrl: '',
    duration: calculateTotalDuration(input),
    resolution: input.config.videoResolution || '720p',
    status: 'pending',
  };

  const validClips = input.videoClips.filter(
    (clip) => clip.status === 'completed' && clip.videoUrl
  );

  if (validClips.length === 0) {
    result.status = 'failed';
    result.errorMessage = '没有可用的视频片段';
    return result;
  }

  result.status = 'processing';

  try {
    const finalVideo = await composeWithFFmpegWasm(input, validClips);
    result.videoUrl = finalVideo.url;
    result.duration = finalVideo.duration;
    result.status = 'completed';
  } catch (error) {
    console.error('[Compositor] Video composition failed:', error);
    result.status = 'failed';
    result.errorMessage = (error as Error).message;
  }

  return result;
}

async function composeWithFFmpegWasm(
  input: CompositorInput,
  videoClips: VideoClip[]
): Promise<{ url: string; duration: number }> {
  console.log('[Compositor] Using FFmpeg WASM for video composition');
  console.log(`[Compositor] Concatenating ${videoClips.length} video clips`);

  // FFmpeg WASM implementation placeholder
  // In production, this would:
  // 1. Load FFmpeg WASM
  // 2. Download all video clips
  // 3. Concatenate video clips
  // 4. Mix audio tracks
  // 5. Export final video

  await new Promise<void>((resolve) => setTimeout(resolve, 1000));

  return {
    url: `/output/${input.projectId}/final.mp4`,
    duration: calculateTotalDuration(input),
  };
}

function calculateTotalDuration(input: CompositorInput): number {
  let maxDuration = 0;
  for (const clip of input.videoClips) {
    maxDuration += clip.duration || input.config.videoDuration || 5;
  }
  if (input.bgmTrack && input.bgmTrack.duration > maxDuration) {
    maxDuration = input.bgmTrack.duration;
  }
  return maxDuration;
}

export function generateFFmpegCommand(input: CompositorInput): string {
  const { projectId, videoClips, voiceTracks, bgmTrack, sfxTracks } = input;

  const clipPaths = videoClips
    .filter((c) => c.videoUrl)
    .map((c) => `file '${c.videoUrl}'`)
    .join('\n');

  const commands: string[] = [];
  commands.push(`# 合并视频片段`);
  commands.push(`echo "${clipPaths}" > /tmp/${projectId}_clips.txt`);
  commands.push(`ffmpeg -f concat -safe 0 -i /tmp/${projectId}_clips.txt -c copy /tmp/${projectId}_video.mp4`);

  const audioFiles: string[] = [];
  for (const track of voiceTracks) {
    if (track.audioUrl) audioFiles.push(`-i "${track.audioUrl}"`);
  }
  if (bgmTrack?.audioUrl) audioFiles.push(`-i "${bgmTrack.audioUrl}"`);
  for (const track of sfxTracks) {
    if (track.audioUrl) audioFiles.push(`-i "${track.audioUrl}"`);
  }

  if (audioFiles.length > 0) {
    commands.push(`# 混合音频并与视频合并`);
    const audioInput = audioFiles.join(' ');
    commands.push(
      `ffmpeg -i /tmp/${projectId}_video.mp4 ${audioInput} -filter_complex "amix=inputs=${audioFiles.length}:duration=longest" -shortest /tmp/${projectId}_final.mp4`
    );
  } else {
    commands.push(`cp /tmp/${projectId}_video.mp4 /tmp/${projectId}_final.mp4`);
  }

  return commands.join('\n');
}
