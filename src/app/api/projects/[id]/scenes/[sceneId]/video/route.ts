import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateVideoClip } from '@/lib/pipeline/video-generator';
import type { GenerationConfig, SceneAnalysis, KeyFrame } from '@/lib/pipeline/types';

interface RouteParams {
  params: Promise<{ id: string; sceneId: string }>;
}

interface SceneRow {
  id: string;
  project_id: string;
  page_index: number;
  image_path: string;
  raw_text: string | null;
  scene_description: string | null;
  camera_type: string | null;
  character_actions: string | null;
  dialogues: string | null;
  mood: string | null;
  visual_style: string | null;
  frames_status: string;
  sequence_index: number;
}

// POST /api/projects/[id]/scenes/[sceneId]/video — Generate video clip from key frames
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id, sceneId } = await params;

    // 1. Verify project ownership
    const project = db
      .prepare('SELECT id, user_id FROM projects WHERE id = ?')
      .get(id) as { id: string; user_id: string } | undefined;

    if (!project) {
      return NextResponse.json({ error: '作品不存在' }, { status: 404 });
    }

    if (project.user_id !== session.user.id) {
      return NextResponse.json({ error: '无权限访问该作品' }, { status: 403 });
    }

    // 2. Read scene from scenes table
    const scene = db
      .prepare('SELECT * FROM scenes WHERE id = ? AND project_id = ?')
      .get(sceneId, id) as SceneRow | undefined;

    if (!scene) {
      return NextResponse.json({ error: '分镜不存在' }, { status: 404 });
    }

    // 3. Scene must have frames_status = 'completed'
    if (scene.frames_status !== 'completed') {
      return NextResponse.json(
        { error: '请先生成首尾帧，再生成视频' },
        { status: 400 }
      );
    }

    // 4. Read key_frames records for this scene
    const frameRows = db
      .prepare(
        `SELECT id, scene_id, frame_type, image_url, prompt, status
           FROM key_frames
          WHERE scene_id = ?
          ORDER BY frame_type`
      )
      .all(sceneId) as {
      id: string;
      scene_id: string;
      frame_type: string;
      image_url: string | null;
      prompt: string | null;
      status: string;
    }[];

    const firstFrameRow = frameRows.find((f) => f.frame_type === 'first');
    const lastFrameRow = frameRows.find((f) => f.frame_type === 'last');

    if (!firstFrameRow || !lastFrameRow) {
      return NextResponse.json(
        { error: '首尾帧数据不完整，请先生成首尾帧' },
        { status: 400 }
      );
    }

    // Build KeyFrame objects
    const firstFrame: KeyFrame = {
      id: firstFrameRow.id,
      sceneId: sceneId,
      frameType: 'first',
      imageUrl: firstFrameRow.image_url ?? undefined,
      prompt: firstFrameRow.prompt ?? '',
      status: firstFrameRow.status as KeyFrame['status'],
    };

    const lastFrame: KeyFrame = {
      id: lastFrameRow.id,
      sceneId: sceneId,
      frameType: 'last',
      imageUrl: lastFrameRow.image_url ?? undefined,
      prompt: lastFrameRow.prompt ?? '',
      status: lastFrameRow.status as KeyFrame['status'],
    };

    // 5. Build GenerationConfig by querying user_model_configs for video
    const modelConfigRow = db
      .prepare(
        `SELECT id, model_ids FROM user_model_configs
          WHERE user_id = ? AND provider_type = 'video' AND enabled = 1 LIMIT 1`
      )
      .get(session.user.id) as { id: string; model_ids: string } | undefined;

    let videoModelConfigId: string | undefined;
    let videoModel: string | undefined;

    if (modelConfigRow) {
      videoModelConfigId = modelConfigRow.id;
      try {
        const modelIds = JSON.parse(modelConfigRow.model_ids);
        videoModel = Array.isArray(modelIds) ? modelIds[0] : undefined;
      } catch {}
    }

    const config: GenerationConfig = {
      videoModelConfigId,
      videoModel,
      videoDuration: 5,
      videoResolution: '720p',
      videoAspectRatio: '16:9',
      bgmVolume: 0.3,
      voiceVolume: 1.0,
      sfxVolume: 0.5,
    };

    // 6. Build SceneAnalysis from DB scene record
    let characterActions: string[] = [];
    let dialogues: { speaker: string; text: string }[] = [];

    try {
      if (scene.character_actions) {
        characterActions = JSON.parse(scene.character_actions);
      }
    } catch {}

    try {
      if (scene.dialogues) {
        dialogues = JSON.parse(scene.dialogues);
      }
    } catch {}

    const sceneAnalysis: SceneAnalysis = {
      sceneId: scene.id,
      pageIndex: scene.page_index,
      sceneDescription: scene.scene_description ?? '',
      setting: scene.raw_text ?? '',
      cameraType: (scene.camera_type as SceneAnalysis['cameraType']) ?? 'medium-shot',
      characterActions,
      characterEmotions: {},
      dialogues: dialogues.map((d) => ({
        speaker: d.speaker,
        text: d.text,
        emotion: 'neutral' as const,
        tone: 'normal' as const,
      })),
      mood: (scene.mood as SceneAnalysis['mood']) ?? 'neutral',
      visualStyle: scene.visual_style ?? '日漫风格',
      videoPrompt: '',
      firstFrameDescription: firstFrame.prompt,
      lastFrameDescription: lastFrame.prompt,
    };

    // 7. Call generateVideoClip()
    const clip = await generateVideoClip({
      scene: sceneAnalysis,
      firstFrame,
      lastFrame,
      config,
      userId: session.user.id,
    });

    // 8. Save VideoClip to video_clips table
    db.prepare(
      `INSERT OR REPLACE INTO video_clips (id, scene_id, video_url, duration, prompt, status, model_used)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      clip.id,
      sceneId,
      clip.videoUrl ?? null,
      clip.duration,
      clip.prompt,
      clip.status,
      clip.modelUsed ?? null
    );

    // 9. Return clip
    return NextResponse.json({
      clip: {
        id: clip.id,
        videoUrl: clip.videoUrl ?? '',
        duration: clip.duration,
        status: clip.status,
      },
    });
  } catch (error) {
    console.error('Generate video clip error:', error);
    return NextResponse.json({ error: '生成视频片段失败' }, { status: 500 });
  }
}

// GET /api/projects/[id]/scenes/[sceneId]/video — Get current video clip status
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id, sceneId } = await params;

    // Verify project ownership
    const project = db
      .prepare('SELECT id, user_id FROM projects WHERE id = ?')
      .get(id) as { id: string; user_id: string } | undefined;

    if (!project) {
      return NextResponse.json({ error: '作品不存在' }, { status: 404 });
    }

    if (project.user_id !== session.user.id) {
      return NextResponse.json({ error: '无权限访问该作品' }, { status: 403 });
    }

    // Query video_clips for this scene
    const clipRow = db
      .prepare(
        `SELECT id, scene_id, video_url, duration, prompt, status, model_used
           FROM video_clips
          WHERE scene_id = ?
          ORDER BY created_at DESC
          LIMIT 1`
      )
      .get(sceneId) as {
      id: string;
      scene_id: string;
      video_url: string | null;
      duration: number | null;
      prompt: string | null;
      status: string;
      model_used: string | null;
    } | undefined;

    if (!clipRow) {
      return NextResponse.json({ clip: null });
    }

    return NextResponse.json({
      clip: {
        id: clipRow.id,
        videoUrl: clipRow.video_url ?? '',
        duration: clipRow.duration ?? 5,
        status: clipRow.status,
      },
    });
  } catch (error) {
    console.error('Get video clip error:', error);
    return NextResponse.json({ error: '获取视频片段状态失败' }, { status: 500 });
  }
}
