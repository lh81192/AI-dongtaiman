/**
 * Generation Service
 * 编排整个 AI 漫剧生成管线
 */

import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { parseEPUB } from '@/lib/epub/parser';
import type { EPUBParseResult } from '@/lib/epub/types';
import { analyzeScene } from '@/lib/pipeline/scene-analyzer';
import type { SceneAnalysis, GenerationConfig, PipelineState } from '@/lib/pipeline/types';
import { generateKeyFrames } from '@/lib/pipeline/frame-generator';
import { generateVideoClip } from '@/lib/pipeline/video-generator';
import { generateAllAudio } from '@/lib/pipeline/audio-generator';
import { composeFinalVideo } from '@/lib/pipeline/compositor';

export interface GenerationServiceInput {
  projectId: string;
  epubFile: File;
  config: GenerationConfig;
  userId: string;
}

export interface GenerationProgress {
  step: string;
  progress: number;
  current: number;
  total: number;
  message: string;
}

export async function runGenerationPipeline(
  input: GenerationServiceInput,
  onProgress?: (progress: GenerationProgress) => void
): Promise<{ videoUrl: string; scenes: SceneAnalysis[] }> {
  const { projectId, epubFile, config, userId } = input;

  try {
    // Step 1: Parse EPUB
    onProgress?.({
      step: 'parsing',
      progress: 0,
      current: 0,
      total: 100,
      message: '正在解析 EPUB 文件...',
    });

    const epubResult = await parseEPUB(epubFile);

    // Save cover
    if (epubResult.metadata.cover) {
      db.prepare(`
        UPDATE projects
        SET cover_image = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(epubResult.metadata.cover, projectId);
    }

    // Step 2: Analyze scenes
    const scenes: SceneAnalysis[] = [];
    const pagesWithImages = epubResult.pages.filter((p) => p.images.length > 0);

    for (let i = 0; i < pagesWithImages.length; i++) {
      const page = pagesWithImages[i];

      onProgress?.({
        step: 'analyzing',
        progress: Math.round((i / pagesWithImages.length) * 20),
        current: i + 1,
        total: pagesWithImages.length,
        message: `正在分析第 ${i + 1}/${pagesWithImages.length} 页...`,
      });

      const previousDescription = i > 0 ? scenes[i - 1].sceneDescription : undefined;

      const scene = await analyzeScene({
        pageIndex: i,
        imageUrl: page.images[0]?.src,
        rawText: page.text,
        previousSceneDescription: previousDescription,
        config,
        userId,
      });

      scenes.push(scene);
      saveSceneToDb(projectId, scene, page);
    }

    // Step 3: Generate key frames
    onProgress?.({
      step: 'generating-frames',
      progress: 25,
      current: 0,
      total: scenes.length,
      message: '正在生成关键帧...',
    });

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const originalImageUrl = pagesWithImages[scene.pageIndex]?.images[0]?.src;

      await generateKeyFrames({
        scene,
        nextScene: scenes[i + 1],
        config,
        userId,
        originalImageUrl,
      });

      onProgress?.({
        step: 'generating-frames',
        progress: 25 + Math.round((i / scenes.length) * 20),
        current: i + 1,
        total: scenes.length,
        message: `生成关键帧 ${i + 1}/${scenes.length}...`,
      });
    }

    // Step 4: Generate video clips
    onProgress?.({
      step: 'generating-video',
      progress: 45,
      current: 0,
      total: scenes.length,
      message: '正在生成视频片段...',
    });

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const firstFrame = {
        id: `kf_first_${scene.sceneId}`,
        sceneId: scene.sceneId,
        frameType: 'first' as const,
        imageUrl: pagesWithImages[scene.pageIndex]?.images[0]?.src,
        prompt: scene.firstFrameDescription,
        status: 'completed' as const,
      };
      const lastFrame = {
        id: `kf_last_${scene.sceneId}`,
        sceneId: scene.sceneId,
        frameType: 'last' as const,
        prompt: scene.lastFrameDescription,
        status: 'completed' as const,
      };

      await generateVideoClip({ scene, firstFrame, lastFrame, config, userId });

      onProgress?.({
        step: 'generating-video',
        progress: 45 + Math.round((i / scenes.length) * 25),
        current: i + 1,
        total: scenes.length,
        message: `生成视频 ${i + 1}/${scenes.length}...`,
      });
    }

    // Step 5: Generate audio
    onProgress?.({
      step: 'generating-audio',
      progress: 70,
      current: 0,
      total: 3,
      message: '正在生成配音、BGM、音效...',
    });

    await generateAllAudio({ projectId, scenes, config, userId });

    onProgress?.({
      step: 'generating-audio',
      progress: 85,
      current: 3,
      total: 3,
      message: '音频生成完成',
    });

    // Step 6: Compose final video
    onProgress?.({
      step: 'synthesizing',
      progress: 90,
      current: 0,
      total: 1,
      message: '正在合成最终视频...',
    });

    const videoClips = getVideoClipsFromDb(projectId);
    const audioTracks = getAudioTracksFromDb(projectId);

    const compositionResult = await composeFinalVideo({
      projectId,
      videoClips,
      voiceTracks: audioTracks.filter((t) => t.track_type === 'voice'),
      bgmTrack: audioTracks.find((t) => t.track_type === 'bgm'),
      sfxTracks: audioTracks.filter((t) => t.track_type === 'sfx'),
      config,
    });

    db.prepare(`
      UPDATE projects
      SET status = ?, video_url = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      compositionResult.status === 'completed' ? 'completed' : 'failed',
      compositionResult.videoUrl,
      projectId
    );

    onProgress?.({
      step: 'completed',
      progress: 100,
      current: 1,
      total: 1,
      message: '生成完成！',
    });

    return {
      videoUrl: compositionResult.videoUrl,
      scenes,
    };
  } catch (error) {
    console.error('[GenerationService] Pipeline failed:', error);

    db.prepare(`
      UPDATE projects
      SET status = 'failed', updated_at = datetime('now')
      WHERE id = ?
    `).run(projectId);

    throw error;
  }
}

function saveSceneToDb(projectId: string, scene: SceneAnalysis, page: { images: { src: string }[]; text: string }): void {
  const id = generateId();
  db.prepare(`
    INSERT INTO scenes
    (id, project_id, page_index, image_path, raw_text, scene_description, camera_type, character_actions, dialogues, mood, sequence_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    projectId,
    scene.pageIndex,
    page.images[0]?.src || '',
    page.text,
    scene.sceneDescription,
    scene.cameraType,
    JSON.stringify(scene.characterActions),
    JSON.stringify(scene.dialogues),
    scene.mood,
    scene.pageIndex
  );
}

function getVideoClipsFromDb(projectId: string): any[] {
  const scenes = db.prepare(`
    SELECT id FROM scenes WHERE project_id = ? ORDER BY sequence_index
  `).all(projectId) as { id: string }[];

  return scenes.map((scene) => ({
    id: generateId(),
    sceneId: scene.id,
    videoUrl: null,
    duration: 5,
    prompt: '',
    status: 'completed',
  }));
}

function getAudioTracksFromDb(projectId: string): any[] {
  return db.prepare(`
    SELECT * FROM audio_tracks WHERE project_id = ?
  `).all(projectId) as any[];
}

export function getPipelineStatus(projectId: string): PipelineState | null {
  const status = db.prepare(`
    SELECT * FROM pipeline_status WHERE project_id = ?
  `).get(projectId) as any;

  if (!status) return null;

  return {
    projectId: status.project_id,
    currentStep: status.current_step,
    status: status.status,
    progress: Math.round((status.processed_scenes / status.total_scenes) * 100) || 0,
    totalScenes: status.total_scenes,
    processedScenes: status.processed_scenes,
    errorMessage: status.error_message,
    startedAt: status.started_at ? new Date(status.started_at) : undefined,
    completedAt: status.completed_at ? new Date(status.completed_at) : undefined,
  };
}
